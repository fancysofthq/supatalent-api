import { NFTFair__factory } from "@fancysoft/contracts/typechain";
import { ListEvent } from "@fancysoft/contracts/typechain/contracts/NFTFair";
import db from "@/services/db";
import { provider } from "@/services/eth";
import { Address, Bytes, Hash } from "@/models/Bytes";
import { sync, Job } from "@/shared/sync";
import { Config } from "../Config";

/**
 * ```sol
 * event List(
 *     address operator,
 *     address indexed app,
 *     bytes32 listingId,
 *     Token token,
 *     Token indexed tokenIndex,
 *     address indexed seller,
 *     uint256 price,
 *     uint256 stockSize
 * );
 * ```
 */
export class NFTFairListJob implements Job {
  readonly eventTable = "nftfair_list";

  constructor(public readonly config: Config) {}

  async run(cancel: () => boolean) {
    const contract = NFTFair__factory.connect(
      this.config.contractAddress.toString(),
      provider
    );

    sync(
      db,
      "sync_jobs",
      "historical_block",
      "realtime_block",
      "event_table",
      this.eventTable,
      contract,
      this.config.contractDeployTx,
      contract.filters.List(),
      (db, events: ListEvent[]) => {
        const stmt = db.prepare(
          `INSERT INTO ${this.eventTable} (
            block_number,
            log_index,
            tx_hash,
            contract_address,

            operator,
            app,
            listing_id,
            token_contract,
            token_id,
            seller,
            price,
            stock_size
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT DO NOTHING`
        );

        for (const event of events) {
          stmt.run(
            event.blockNumber,
            event.logIndex,
            new Hash(event.transactionHash).bytes,
            new Address(event.address).bytes,

            new Address(event.args.operator).bytes,
            new Address(event.args.app).bytes,
            new Bytes(event.args.listingId).bytes,
            new Address(event.args.token.contractAddress).bytes,
            new Bytes(event.args.token.tokenId._hex).bytes,
            new Address(event.args.seller).bytes,
            new Bytes(event.args.price._hex).bytes,
            new Bytes(event.args.stockSize._hex).bytes
          );
        }
      },
      cancel
    );
  }
}
