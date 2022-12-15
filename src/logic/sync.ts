import config from "../config.js";
import { IpftRedeemableFactory as TalentFactory } from "@/../contracts/IpftRedeemableFactory.js";
import { OpenStoreFactory } from "@/../contracts/OpenStoreFactory.js";
import * as EventDB from "./EventDB.js";
import * as Talent from "@/models/Talent/index.js";
import * as OpenStore from "@/models/OpenStore/index.js";
import * as db from "@/services/db.js";
import { provider } from "@/services/eth.js";
import Address from "@/models/Address.js";
import { BigNumber } from "ethers";

export default async function sync(cancel: () => boolean) {
  await Promise.all([syncTalent(cancel), syncOpenStore(cancel)]);
}

async function syncTalent(cancel: () => boolean) {
  const contract = TalentFactory.connect(
    config.eth.talentAddress.toString(),
    provider
  );

  const deployBlock = (await provider.getTransaction(config.eth.talentTx))
    .blockNumber;
  if (!deployBlock) throw new Error("Talent deploy block not found");

  await Promise.all([
    EventDB.syncEvents<Talent.Transfer, undefined>(
      db.open(),
      Talent.Transfer.BLOCK_SINGLE_COLUMN,
      15 * 1000,
      cancel,
      contract,
      deployBlock,
      contract.filters.TransferSingle(null, null, null, null, null),
      Talent.Transfer.parseTransferSingle,
      async () => undefined,
      Talent.Transfer.insertBulk
    ),
    EventDB.syncEvents<Talent.Transfer, undefined>(
      db.open(),
      Talent.Transfer.BLOCK_BATCH_COLUMN,
      15 * 1000,
      cancel,
      contract,
      deployBlock,
      contract.filters.TransferBatch(null, null, null, null, null),
      Talent.Transfer.parseTransferBatch,
      async () => undefined,
      Talent.Transfer.insertBulk
    ),
    EventDB.syncEvents<
      Talent.Mint,
      Map<string, { author: Address; codec: number }>
    >(
      db.open(),
      Talent.Mint.BLOCK_COLUMN,
      15 * 1000,
      cancel,
      contract,
      deployBlock,
      contract.filters.Mint(null, null, null),
      Talent.Mint.parse,
      async (db, events) => {
        const map = new Map<string, { author: Address; codec: number }>();

        const promises = events.map(async (event) => {
          map.set(event.id._hex, {
            author: new Address(await contract.authorOf(event.id)),
            codec: await contract.codecOf(event.id),
          });
        });

        await Promise.all(promises);
        return map;
      },
      Talent.Mint.insertBulk
    ),
  ]);
}

async function syncOpenStore(cancel: () => boolean) {
  const contract = OpenStoreFactory.connect(
    config.eth.openStoreAddress.toString(),
    provider
  );

  const deployBlock = (await provider.getTransaction(config.eth.openStoreTx))
    .blockNumber;
  if (!deployBlock) throw new Error("OpenStore deploy block not found");

  await Promise.all([
    EventDB.syncEvents<
      OpenStore.List,
      Map<string, { contract: Address; id: BigNumber }>
    >(
      db.open(),
      OpenStore.List.BLOCK_COLUMN,
      15 * 1000,
      cancel,
      contract,
      deployBlock,
      contract.filters.List(null, null, config.eth.appAddress.toString()),
      OpenStore.List.parse,
      async (db, events) => {
        const map = new Map<string, { contract: Address; id: BigNumber }>();

        const promises = events.map(async (event) => {
          const listing = await contract.getListing(event.listingId);
          map.set(event.listingId._hex, {
            contract: new Address(listing.token.contrakt),
            id: listing.token.id,
          });
        });

        await Promise.all(promises);
        return map;
      },
      OpenStore.List.insertBulk
    ),
    EventDB.syncEvents<OpenStore.Replenish, undefined>(
      db.open(),
      OpenStore.Replenish.BLOCK_COLUMN,
      15 * 1000,
      cancel,
      contract,
      deployBlock,
      contract.filters.Replenish(null, null, null),
      OpenStore.Replenish.parse,
      async () => undefined,
      OpenStore.Replenish.insertBulk
    ),
    EventDB.syncEvents<OpenStore.Withdraw, undefined>(
      db.open(),
      OpenStore.Withdraw.BLOCK_COLUMN,
      15 * 1000,
      cancel,
      contract,
      deployBlock,
      contract.filters.Withdraw(null, null, null),
      OpenStore.Withdraw.parse,
      async () => undefined,
      OpenStore.Withdraw.insertBulk
    ),
    EventDB.syncEvents<OpenStore.Purchase, undefined>(
      db.open(),
      OpenStore.Purchase.BLOCK_COLUMN,
      15 * 1000,
      cancel,
      contract,
      deployBlock,
      contract.filters.Purchase(
        null,
        null,
        null,
        null,
        null,
        null,
        config.eth.appAddress.toString(),
        null,
        null
      ),
      OpenStore.Purchase.parse,
      async () => undefined,
      OpenStore.Purchase.insertBulk
    ),
  ]);
}
