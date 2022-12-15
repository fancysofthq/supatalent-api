import Address from "@/models/address.js";
import { BigNumber, ethers } from "ethers";
import { Event } from "@/models/Event.js";
import { Database } from "better-sqlite3";

export class Mint extends Event {
  static BLOCK_COLUMN = "talent_mint_block";
  static TABLE_NAME = "talent_mint";

  static parse(event: ethers.Event): Mint[] {
    return [
      new Mint(
        event.blockNumber,
        event.transactionHash,
        event.logIndex,
        new Address(event.address),
        event.args!.id as BigNumber,
        event.args!.finalize,
        new Date((event.args!.expiresAt as number) * 1000)
      ),
    ];
  }

  static insertBulk(
    db: Database,
    events: Mint[],
    ctx: Map<string, { author: Address; codec: number }>
  ): void {
    const stmt = db.prepare(
      `INSERT INTO ${Mint.TABLE_NAME} (
        block_number,
        log_index,
        tx_hash,
        id,
        finalized,
        expires_at,
        author,
        codec
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING`
    );

    for (const event of events) {
      stmt.run(
        event.blockNumber,
        event.logIndex,
        event.transactionHash,
        event.id._hex,
        event.finalize ? 1 : 0,
        event.expiresAt.valueOf(),
        ctx.get(event.id._hex)!.author.toString(),
        ctx.get(event.id._hex)!.codec
      );
    }
  }

  constructor(
    blockNumber: number,
    transactionHash: string,
    logIndex: number,
    contract: Address,
    public readonly id: BigNumber,
    public readonly finalize: boolean,
    public readonly expiresAt: Date
  ) {
    super(blockNumber, transactionHash, logIndex, contract);
  }
}
