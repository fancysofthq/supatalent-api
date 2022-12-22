import { NFTFair__factory } from "@fancysoft/contracts/typechain";
import { PurchaseEvent } from "@fancysoft/contracts/typechain/contracts/NFTFair";
import db from "@/services/db";
import { provider } from "@/services/eth";
import { Address, Bytes, Hash } from "@fancysofthq/supabase";
import { sync, Job } from "@/shared/sync";
import { Config } from "../Config";

/**
 * ```sol
 * event Purchase(
 *     address operator,
 *     address indexed app,
 *     bytes32 indexed listingId,
 *     address indexed buyer,
 *     uint256 tokenAmount,
 *     address sendTo,
 *     uint256 income,
 *     address royaltyAddress,
 *     uint256 royaltyValue,
 *     uint256 appFee,
 *     uint256 sellerProfit
 * );
 * ```
 */
export class NFTFairPurchaseJob implements Job {
  readonly eventTable = "nftfair_purchase";

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
      contract.filters.Purchase(),
      (db, events: PurchaseEvent[]) => {
        const stmt = db.prepare(
          `INSERT INTO ${this.eventTable} (
            block_number,
            log_index,
            tx_hash,
            contract_address,

            operator,
            app,
            listing_id,
            buyer,
            token_amount,
            send_to,
            income,
            royalty_address,
            royalty_value,
            app_fee,
            seller_profit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            Address.from(event.args.buyer).bytes,
            Bytes.from(event.args.tokenAmount._hex).bytes,
            Address.from(event.args.sendTo).bytes,
            Bytes.from(event.args.income._hex).bytes,
            Address.from(event.args.royaltyAddress).bytes,
            Bytes.from(event.args.royaltyValue._hex).bytes,
            Bytes.from(event.args.appFee._hex).bytes,
            Bytes.from(event.args.sellerProfit._hex).bytes
          );
        }
      },
      cancel
    );
  }
}
