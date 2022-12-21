import { IERC1155__factory } from "@fancysofthq/contracts/typechain";
import { TransferSingleEvent } from "@fancysofthq/contracts/typechain/@openzeppelin/contracts/token/ERC1155/IERC1155";
import db from "@/services/db";
import { provider } from "@/services/eth";
import { Address, Bytes, Hash } from "@/models/Bytes";
import { sync, Job } from "@/shared/sync";
import { Config } from "../Config";

export class IERC1155TransferSingleJob implements Job {
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
      "realtime_block",
      "event_table",
      this.eventTable,
      contract,
      this.config.contractDeployTx,
      contract.filters.TransferSingle(),
      (db, events: TransferSingleEvent[]) => {
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
          stmt.run(
            event.blockNumber,
            event.logIndex,
            0,
            new Hash(event.transactionHash).bytes,
            new Address(event.address).bytes,

            new Address(event.args.operator).bytes,
            new Address(event.args.from).bytes,
            new Address(event.args.to).bytes,
            new Bytes(event.args.id._hex).bytes,
            new Bytes(event.args.value._hex).bytes
          );
        }
      },
      cancel
    );
  }
}
