import { Database } from "better-sqlite3";
import { ethers } from "ethers";
import pRetry from "p-retry";
import { Hash } from "@/models/Bytes";
import { timer } from "@/utils";
import {
  TypedEvent,
  TypedEventFilter,
} from "@fancysoft/contracts/typechain/common";

export interface Job {
  readonly eventTable: string;
  run(cancel: () => boolean): Promise<void>;
}

const BATCH_SIZE = 5760; // Approximately 24 hours

export async function sync<T extends TypedEvent>(
  db: Database,
  syncTable: string,
  historicalBlockColumn: string,
  realtimeBlockColumn: string,
  eventTableColumn: string,
  eventTable: string,
  contract: ethers.Contract,
  contractDeployTx: Hash,
  eventFilter: TypedEventFilter<T>,
  insert: (db: Database, events: T[]) => void,
  cancel: () => boolean
) {
  const deployBlock = (
    await contract.provider.getTransaction(contractDeployTx.toString())
  ).blockNumber;
  if (!deployBlock) throw new Error("Contract deploy block not found");

  const currentBlock = await contract.provider.getBlockNumber();

  console.info("Syncing", contract.address, "for", eventTable);

  await Promise.all([
    syncHistorical(
      db,
      syncTable,
      historicalBlockColumn,
      eventTableColumn,
      eventTable,
      contract,
      eventFilter,
      deployBlock,
      currentBlock,
      insert
    ),
    syncRealtime(
      db,
      syncTable,
      realtimeBlockColumn,
      eventTableColumn,
      eventTable,
      contract,
      eventFilter,
      currentBlock,
      insert,
      cancel
    ),
  ]);
}

async function syncHistorical(
  db: Database,
  syncTable: string,
  historicalBlockColumn: string,
  eventTableColumn: string,
  eventTable: string,
  contract: ethers.Contract,
  filter: ethers.EventFilter,
  deployBlock: number,
  currentBlock: number,
  insert: (db: Database, events: ethers.Event[]) => void
) {
  const getHistoricalBlockStmt = db
    .prepare(
      `SELECT ${historicalBlockColumn}
      FROM ${syncTable}
      WHERE ${eventTableColumn} = '${eventTable}'`
    )
    .pluck();

  const setHistoricalBlockStmt = db.prepare(
    `UPDATE ${syncTable}
    SET ${historicalBlockColumn} = ?
    WHERE ${eventTableColumn} = '${eventTable}'`
  );

  let historicalBlock = getHistoricalBlockStmt.get() as number | undefined;

  let from = historicalBlock || deployBlock;
  let to = Math.min(from + BATCH_SIZE, currentBlock);

  while (from < to) {
    const events = await pRetry(() => contract.queryFilter(filter, from, to));

    db.transaction(() => {
      insert(db, events);
      setHistoricalBlockStmt.run(to);
    })();

    from = to;
    to = Math.min(from + BATCH_SIZE, currentBlock);
  }
}

async function syncRealtime(
  db: Database,
  syncTable: string,
  realtimeBlockColumn: string,
  eventTableColumn: string,
  eventTable: string,
  contract: ethers.Contract,
  filter: ethers.EventFilter,
  currentBlock: number,
  insert: (db: Database, events: ethers.Event[]) => void,
  cancel: () => boolean
) {
  const getRealtimeBlockStmt = db
    .prepare(
      `SELECT ${realtimeBlockColumn}
      FROM ${syncTable}
      WHERE ${eventTableColumn} = '${eventTable}'`
    )
    .pluck();

  const setRealtimeBlockStmt = db.prepare(
    `UPDATE ${syncTable}
    SET ${realtimeBlockColumn} = ?
    WHERE ${eventTableColumn} = '${eventTable}'`
  );

  contract.on(filter, (...data) => {
    const e: ethers.Event = data[data.length - 1];

    db.transaction(() => {
      const realtimeBlock =
        (getRealtimeBlockStmt.get() as number | undefined) || currentBlock;

      if (e.blockNumber < realtimeBlock) {
        console.warn("Received event from past block", e);
        return;
      }

      insert(db, [e]);
      setRealtimeBlockStmt.run(e.blockNumber);
    })();
  });

  while (!cancel()) {
    await timer(1000);
  }

  contract.removeAllListeners(filter);
}
