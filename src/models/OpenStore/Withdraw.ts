import Address from "@/models/Address.js";
import { BigNumber, ethers } from "ethers";
import { Event } from "@/models/Event.js";
import { Database } from "better-sqlite3";

export class Withdraw extends Event {
  static BLOCK_COLUMN = "openstore_withdraw_block";
  static TABLE_NAME = "openstore_withdraw";

  static parse(event: ethers.Event): Withdraw[] {
    return [
      new Withdraw(
        event.blockNumber,
        event.transactionHash,
        event.logIndex,
        new Address(event.address),
        event.args!.listingId as BigNumber,
        new Address(event.args!.to as string),
        event.args!.amount as BigNumber
      ),
    ];
  }

  static insertBulk(db: Database, events: Withdraw[]): void {
    const stmt = db.prepare(
      `INSERT INTO ${Withdraw.TABLE_NAME} (
        block_number,
        log_index,
        tx_hash,
        listing_id,
        "to",
        amount
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING`
    );

    for (const event of events) {
      stmt.run(
        event.blockNumber,
        event.logIndex,
        event.transactionHash,
        event.listingId._hex,
        event.to.toString(),
        event.amount._hex
      );
    }
  }

  constructor(
    blockNumber: number,
    transactionHash: string,
    logIndex: number,
    contract: Address,
    public readonly listingId: BigNumber,
    public readonly to: Address,
    public readonly amount: BigNumber
  ) {
    super(blockNumber, transactionHash, logIndex, contract);
  }
}
