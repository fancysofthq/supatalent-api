import { NFTFair__factory } from "@fancysofthq/contracts/typechain";
import { WithdrawEvent } from "@fancysofthq/contracts/typechain/contracts/NFTFair";
import db from "@/services/db";
import { provider } from "@/services/eth";
import { Address, Bytes, Hash } from "@/models/Bytes";
import { sync, Job } from "@/shared/sync";
import { Config } from "../Config";

/**
 * ```sol
 * event Withdraw(
 *     address operator,
 *     address indexed app,
 *     bytes32 indexed listingId,
 *     uint256 amount,
 *     address to
 * );
 * ```
 */
export class NFTFairWithdrawJob implements Job {
  readonly eventTable = "nftfair_withdraw";

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
      contract.filters.Withdraw(),
      (db, events: WithdrawEvent[]) => {
        const stmt = db.prepare(
          `INSERT INTO ${this.eventTable} (
            block_number,
            log_index,
            tx_hash,
            contract_address,

            operator,
            app,
            listing_id,
            amount,
            "to"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            new Bytes(event.args.amount._hex).bytes,
            new Address(event.args.to).bytes
          );
        }
      },
      cancel
    );
  }
}
