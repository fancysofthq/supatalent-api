import Address from "@/models/address.js";
import { BigNumber, ethers } from "ethers";
import { Event } from "@/models/Event.js";
import { Database } from "better-sqlite3";

export class Transfer extends Event {
  static BLOCK_SINGLE_COLUMN = "talent_transfer_single_block";
  static BLOCK_BATCH_COLUMN = "talent_transfer_batch_block";
  static TABLE_NAME = "talent_transfer";

  static parseTransferSingle(event: ethers.Event): Transfer[] {
    return [
      new Transfer(
        event.blockNumber,
        event.transactionHash,
        event.logIndex,
        new Address(event.address),
        0,
        new Address(event.args!.operator as string),
        new Address(event.args!.from as string),
        new Address(event.args!.to as string),
        event.args!.id as BigNumber,
        event.args!.value as BigNumber
      ),
    ];
  }

  static parseTransferBatch(event: ethers.Event): Transfer[] {
    return (event.args!.ids as BigNumber[]).map((_, i) => {
      return new Transfer(
        event.blockNumber,
        event.transactionHash,
        event.logIndex,
        new Address(event.address),
        i,
        new Address(event.args!.operator),
        new Address(event.args!.from),
        new Address(event.args!.to as string),
        (event.args!.ids as BigNumber[])[i],
        (event.args!.values as unknown as BigNumber[])[i]
      );
    });
  }

  static insertBulk(db: Database, events: Transfer[]): void {
    const stmt = db.prepare(
      `INSERT INTO ${Transfer.TABLE_NAME} (
        block_number,
        log_index,
        sub_index,
        tx_hash,
        operator,
        "from",
        "to",
        id,
        "value"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING`
    );

    for (const event of events) {
      stmt.run(
        event.blockNumber,
        event.logIndex,
        event.subIndex,
        event.transactionHash,
        event.operator.toString(),
        event.from.toString(),
        event.to.toString(),
        event.id._hex,
        event.value._hex
      );
    }
  }

  constructor(
    blockNumber: number,
    transactionHash: string,
    logIndex: number,
    contract: Address,
    public readonly subIndex: number,
    public readonly operator: Address,
    public readonly from: Address,
    public readonly to: Address,
    public readonly id: BigNumber,
    public readonly value: BigNumber
  ) {
    super(blockNumber, transactionHash, logIndex, contract);
  }
}
