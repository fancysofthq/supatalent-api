import { IPNFT1155Redeemable__factory } from "@fancysofthq/contracts/typechain";
import { MintEvent } from "@fancysofthq/contracts/typechain/contracts/IPNFT1155Redeemable";
import db from "@/services/db";
import { provider } from "@/services/eth";
import { Address, Bytes, Hash } from "@/models/Bytes";
import { sync, Job } from "@/shared/sync";
import { Config } from "../Config";

/**
 * ```sol
 * /// Emitted upon each minting.
 * event Mint(uint256 indexed id, bool finalize, uint64 expiresAt);
 * ```
 */
export class IPNFT1155RedeemableMintJob implements Job {
  readonly eventTable = "ipft1155redeemable_mint";

  constructor(public readonly config: Config) {}

  async run(cancel: () => boolean) {
    const contract = IPNFT1155Redeemable__factory.connect(
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
      contract.filters.Mint(),
      (db, events: MintEvent[]) => {
        const stmt = db.prepare(
          `INSERT INTO ${this.eventTable} (
            block_number,
            log_index,
            tx_hash,
            contract_address,

            id,
            finalize,
            expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT DO NOTHING`
        );

        for (const event of events) {
          stmt.run(
            event.blockNumber,
            event.logIndex,
            new Hash(event.transactionHash).bytes,
            new Address(event.address).bytes,

            new Bytes(event.args.id._hex).bytes,
            event.args.finalize ? 1 : 0,
            event.args.expiresAt.toNumber()
          );
        }
      },
      cancel
    );
  }
}
