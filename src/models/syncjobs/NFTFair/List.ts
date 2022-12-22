import { NFTFair__factory } from "@fancysoft/contracts/typechain";
import { ListEvent } from "@fancysoft/contracts/typechain/contracts/NFTFair";
import db from "@/services/db";
import { provider } from "@/services/eth";
import { Address, Bytes, Hash } from "@fancysofthq/supabase";
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
            Hash.from(event.transactionHash).bytes,
            Address.from(event.address).bytes,

            Address.from(event.args.operator).bytes,
            Address.from(event.args.app).bytes,
            Bytes.from(event.args.listingId).bytes,
            Address.from(event.args.token.contractAddress).bytes,
            Bytes.from(event.args.token.tokenId._hex).bytes,
            Address.from(event.args.seller).bytes,
            Bytes.from(event.args.price._hex).bytes,
            Bytes.from(event.args.stockSize._hex).bytes
          );
        }
      },
      cancel
    );
  }
}
