import { NFTFair__factory } from "@fancysoft/contracts/typechain";
import { ReplenishEvent } from "@fancysoft/contracts/typechain/contracts/NFTFair";
import db from "@/services/db";
import { provider } from "@/services/eth";
import { Address, Bytes, Hash } from "@fancysofthq/supabase";
import { sync, Job } from "@/shared/sync";
import { Config } from "../Config";

/**
 * ```sol
 * event Replenish(
 *     address operator,
 *     address indexed app,
 *     bytes32 indexed listingId,
 *     uint256 amount
 * );
 * ```
 */
export class NFTFairReplenishJob implements Job {
  readonly eventTable = "nftfair_replenish";

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
      contract.filters.Replenish(),
      (db, events: ReplenishEvent[]) => {
        const stmt = db.prepare(
          `INSERT INTO ${this.eventTable} (
            block_number,
            log_index,
            tx_hash,
            contract_address,

            operator,
            app,
            listing_id,
            amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
            Bytes.from(event.args.amount._hex).bytes
          );
        }
      },
      cancel
    );
  }
}
