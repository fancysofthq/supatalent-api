import Address from "@/models/Address.js";
import { BigNumber, ethers } from "ethers";
import { Event } from "@/models/Event.js";
import { Database } from "better-sqlite3";

export class Purchase extends Event {
  static BLOCK_COLUMN = "openstore_purchase_block";
  static TABLE_NAME = "openstore_purchase";

  static parse(event: ethers.Event): Purchase[] {
    return [
      new Purchase(
        event.blockNumber,
        event.transactionHash,
        event.logIndex,
        new Address(event.address),
        event.args!.listingId as BigNumber,
        new Address(event.args!.buyer as string),
        event.args!.tokenAmount as BigNumber,
        event.args!.income as BigNumber,
        new Address(event.args!.royaltyAddress as string),
        event.args!.royaltyValue as BigNumber,
        new Address(event.args!.appAddress as string),
        event.args!.appFee as BigNumber,
        event.args!.profit as BigNumber
      ),
    ];
  }

  static insertBulk(db: Database, events: Purchase[]): void {
    const stmt = db.prepare(
      `INSERT INTO ${Purchase.TABLE_NAME} (
        block_number,
        log_index,
        tx_hash,
        listing_id,
        buyer,
        token_amount,
        income,
        royalty_address,
        royalty_value,
        app_address,
        app_fee,
        profit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING`
    );

    for (const event of events) {
      stmt.run(
        event.blockNumber,
        event.logIndex,
        event.transactionHash,
        event.listingId._hex,
        event.buyer.toString(),
        event.tokenAmount._hex,
        event.income._hex,
        event.royaltyAddress.toString(),
        event.royaltyValue._hex,
        event.appAddress.toString(),
        event.appFee._hex,
        event.profit._hex
      );
    }
  }

  constructor(
    blockNumber: number,
    transactionHash: string,
    logIndex: number,
    contract: Address,
    public readonly listingId: BigNumber,
    public readonly buyer: Address,
    public readonly tokenAmount: BigNumber,
    public readonly income: BigNumber,
    public readonly royaltyAddress: Address,
    public readonly royaltyValue: BigNumber,
    public readonly appAddress: Address,
    public readonly appFee: BigNumber,
    public readonly profit: BigNumber
  ) {
    super(blockNumber, transactionHash, logIndex, contract);
  }
}
