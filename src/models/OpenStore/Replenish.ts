import Address from "@/models/Address.js";
import { BigNumber, ethers } from "ethers";
import { Event } from "@/models/Event.js";
import { Database } from "better-sqlite3";

export class Replenish extends Event {
  static BLOCK_COLUMN = "openstore_replenish_block";
  static TABLE_NAME = "openstore_replenish";

  static parse(event: ethers.Event): Replenish[] {
    return [
      new Replenish(
        event.blockNumber,
        event.transactionHash,
        event.logIndex,
        new Address(event.address),
        event.args!.listingId as BigNumber,
        event.args!.newPrice as BigNumber,
        event.args!.tokenAmount as BigNumber
      ),
    ];
  }

  static insertBulk(db: Database, events: Replenish[]): void {
    const stmt = db.prepare(
      `INSERT INTO ${Replenish.TABLE_NAME} (
        block_number,
        log_index,
        tx_hash,
        listing_id,
        new_price,
        token_amount
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING`
    );

    for (const event of events) {
      stmt.run(
        event.blockNumber,
        event.logIndex,
        event.transactionHash,
        event.listingId._hex,
        event.newPrice._hex,
        event.tokenAmount._hex
      );
    }
  }

  constructor(
    blockNumber: number,
    transactionHash: string,
    logIndex: number,
    contract: Address,
    public readonly listingId: BigNumber,
    public readonly newPrice: BigNumber,
    public readonly tokenAmount: BigNumber
  ) {
    super(blockNumber, transactionHash, logIndex, contract);
  }
}
