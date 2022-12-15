import Address from "@/models/address.js";
import { BigNumber, ethers } from "ethers";
import { Event } from "@/models/Event.js";
import { Database } from "better-sqlite3";

export class List extends Event {
  static BLOCK_COLUMN = "openstore_list_block";
  static TABLE_NAME = "openstore_list";

  static parse(event: ethers.Event): List[] {
    return [
      new List(
        event.blockNumber,
        event.transactionHash,
        event.logIndex,
        new Address(event.address),
        event.args!.listingId as BigNumber,
        new Address(event.args!.seller as string),
        new Address(event.args!.appAddress as string)
      ),
    ];
  }

  static insertBulk(
    db: Database,
    events: List[],
    ctx: Map<string, { contract: Address; id: BigNumber }>
  ): void {
    const stmt = db.prepare(
      `INSERT INTO ${List.TABLE_NAME} (
        block_number,
        log_index,
        tx_hash,
        listing_id,
        seller,
        app_address,
        token_contract,
        token_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING`
    );

    for (const event of events) {
      stmt.run(
        event.blockNumber,
        event.logIndex,
        event.transactionHash,
        event.listingId._hex,
        event.seller.toString(),
        event.appAddress.toString(),
        ctx.get(event.listingId._hex)!.contract.toString(),
        ctx.get(event.listingId._hex)!.id._hex
      );
    }
  }

  constructor(
    blockNumber: number,
    transactionHash: string,
    logIndex: number,
    contract: Address,
    public readonly listingId: BigNumber,
    public readonly seller: Address,
    public readonly appAddress: Address
  ) {
    super(blockNumber, transactionHash, logIndex, contract);
  }
}
