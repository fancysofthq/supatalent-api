import { IIPNFT__factory } from "@fancysofthq/contracts/typechain";
import { ClaimEvent } from "@fancysofthq/contracts/typechain/@nxsf/ipnft/contracts/IIPNFT";
import db from "@/services/db";
import { provider } from "@/services/eth";
import { Address, Bytes, Hash } from "@/models/Bytes";
import { sync, Job } from "@/shared/sync";
import { Config } from "../Config";

/**
 * ```solidity
 * event Claim(
 *     bytes32 indexed contentId, // Also the token ID, and multihash digest
 *     address indexed contentAuthor,
 *     uint32 contentCodec,
 *     uint32 multihashCodec
 * );
 * ```
 */
export class IIPNFTClaimJob implements Job {
  readonly eventTable = "iipnft_claim";

  constructor(public readonly config: Config) {}

  async run(cancel: () => boolean) {
    const contract = IIPNFT__factory.connect(
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
      contract.filters.Claim(),
      (db, events: ClaimEvent[]) => {
        const stmt = db.prepare(
          `INSERT INTO ${this.eventTable} (
            block_number,
            log_index,
            tx_hash,
            contract_address,

            content_id,
            content_author,
            content_codec,
            multihash_codec
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT DO NOTHING`
        );

        for (const event of events) {
          stmt.run(
            event.blockNumber,
            event.logIndex,
            new Hash(event.transactionHash).bytes,
            new Address(event.address).bytes,

            new Bytes(event.args.contentId).bytes,
            new Address(event.args.contentAuthor).bytes,
            event.args.contentCodec,
            event.args.multihashCodec
          );
        }
      },
      cancel
    );
  }
}
