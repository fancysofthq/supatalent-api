import { IERC1155__factory } from "@fancysoft/contracts/typechain";
import { TransferBatchEvent } from "@fancysoft/contracts/typechain/@openzeppelin/contracts/token/ERC1155/IERC1155";
import db from "@/services/db";
import { provider } from "@/services/eth";
import { Address, Bytes, Hash } from "@fancysofthq/supabase";
import { sync, Job } from "@/shared/sync";
import { Config } from "../Config";

export class IERC1155TransferBatchJob implements Job {
  readonly eventTable = "ierc1155_transfer";

  constructor(public readonly config: Config) {}

  async run(cancel: () => boolean) {
    const contract = IERC1155__factory.connect(
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
      contract.filters.TransferBatch(),
      (db, events: TransferBatchEvent[]) => {
        const stmt = db.prepare(
          `INSERT INTO ${this.eventTable} (
            block_number,
            log_index,
            sub_index,
            tx_hash,
            contract_address,

            operator,
            "from",
            "to",
            id,
            value
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT DO NOTHING`
        );

        for (const event of events) {
          let i = 0;

          event.args.ids.forEach((id, i) => {
            stmt.run(
              event.blockNumber,
              event.logIndex,
              i,
              Hash.from(event.transactionHash).bytes,
              Address.from(event.address).bytes,

              Address.from(event.args.operator).bytes,
              Address.from(event.args.from).bytes,
              Address.from(event.args.to).bytes,
              Bytes.from(event.args.ids[i]._hex).bytes,
              Bytes.from(event.args.values[i]._hex).bytes
            );
          });
        }
      },
      cancel
    );
  }
}
