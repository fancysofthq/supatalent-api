import db from "@/services/db.js";
import Router from "@koa/router";
import { keccak256 } from "@multiformats/sha3";
import { CID } from "multiformats/cid";
import { digest } from "multiformats";
import { getProvider } from "@/services/eth.js";
import Address from "@/models/Address.js";
import { ethers, utils } from "ethers";
import config from "@/config.js";
import { IpftRedeemableFactory } from "@/../contracts/IpftRedeemableFactory.js";

export type ShortTalentDTO = {
  cid: string;
};

export type TalentDTO = {
  cid: string;
  createdAt: number; // Timestamp in
  author: string;
  royalty: number; // 0-1

  // Dynamic info
  finalized: boolean;
  expiredAt: number; // Timestamp in seconds
  editions: number; // TODO: BigNumber
};

export type BasicEventDTO = {
  blockNumber: number;
  logIndex: number;
  timestamp: number; // In seconds
  txHash: string;
};

export type EventMintDTO = BasicEventDTO & {
  type: "mint";
  author: string; // Address
  amount: string; // BigNumber hex
};

export type EventListDTO = BasicEventDTO & {
  type: "list";
  listingId: string; // BigNumber hex
  seller: string; // Address
  amount: string; // BigNumber hex
  price: string; // BigNumber hex
};

export type EventPurchaseDTO = BasicEventDTO & {
  type: "purchase";
  listingId: string; // BigNumber hex
  buyer: string; // Address
  tokenAmount: string; // BigNumber hex
  income: string; // BigNumber hex
};

export type EventTransferDTO = BasicEventDTO & {
  type: "transfer";
  from: string; // Address
  to: string; // Address
  value: string; // BigNumber hex
};

export default function setupTalentsController(router: Router) {
  router.get("/v1/talents", async (ctx, next) => {
    ctx.set("Cache-Control", "public, max-age=60");

    const from = ctx.query.from
      ? new Address(ctx.query.from as string)
      : undefined;

    if (from) {
      ctx.body = db
        .prepare(
          `SELECT id, codec
          FROM talent_mint
          WHERE author = ?
          ORDER BY block_number DESC`
        )
        .all(from.toString())
        .map(
          (row): ShortTalentDTO => ({
            cid: CID.createV1(
              row.codec,
              digest.create(
                keccak256.code,
                Buffer.from(row["id"].slice(2), "hex")
              )
            ).toString(),
          })
        );
    } else {
      ctx.body = db
        .prepare(
          `SELECT id, codec
          FROM talent_mint
          ORDER BY block_number DESC`
        )
        .all()
        .map(
          (row): ShortTalentDTO => ({
            cid: CID.createV1(
              row.codec,
              digest.create(
                keccak256.code,
                Buffer.from(row["id"].slice(2), "hex")
              )
            ).toString(),
          })
        );
    }

    next();
  });

  router.get("/v1/talents/:cid", async (ctx, next) => {
    let cid: CID;

    try {
      cid = CID.parse(ctx.params.cid);
    } catch (e) {
      ctx.throw(400, "Invalid CID");
      return;
    }

    const id = "0x" + Buffer.from(cid.multihash.digest).toString("hex");

    const blockNumber = (
      await db
        .prepare(`SELECT block_number FROM talent_mint WHERE id = ?`)
        .get(id)
    )?.block_number;

    if (!blockNumber) ctx.throw(404, "Talent not found");

    const provider = await getProvider();
    const talentContract = IpftRedeemableFactory.connect(
      config.eth.talentAddress.toString(),
      provider
    );

    const [createdAt, author, finalized, expiredAt, royaltyInfo, editions] =
      await Promise.all([
        (await provider.getBlock(blockNumber)).timestamp,
        new Address(await talentContract.authorOf(id)),
        await talentContract.isFinalized(id),
        (await talentContract.expiredAt(id)).toNumber(),
        await talentContract.royaltyInfo(id, ethers.utils.parseEther("1")),
        await talentContract.totalSupply(id),
      ]);

    ctx.set("Cache-Control", "public, max-age=60");

    const dto: TalentDTO = {
      cid: cid.toString(),
      createdAt,
      author: author.toString(),
      royalty: royaltyInfo.royaltyAmount.div(utils.parseEther("1")).toNumber(),
      finalized,
      expiredAt,
      editions: editions.toNumber(),
    };

    ctx.body = dto;

    next();
  });

  router.get("/v1/talents/:cid/history", async (ctx, next) => {
    let cid: CID;

    try {
      cid = CID.parse(ctx.params.cid);
    } catch (e) {
      ctx.throw(400, "Invalid CID");
      return;
    }

    const id = "0x" + Buffer.from(cid.multihash.digest).toString("hex");

    const provider = await getProvider();
    const talentContract = IpftRedeemableFactory.connect(
      config.eth.talentAddress.toString(),
      provider
    );

    // Mint
    const mints: Promise<EventMintDTO[]> = Promise.all(
      db
        .prepare(
          `SELECT
            talent_mint.block_number,
            talent_mint.log_index,
            talent_mint.tx_hash,
            author,
            "value"
          FROM talent_mint
          JOIN talent_transfer
            ON talent_transfer.tx_hash = talent_mint.tx_hash
          WHERE talent_mint.id = ?`
        )
        .all(id)
        .filter((row: any) => row.block_number)
        .map(
          async (row: any): Promise<EventMintDTO> => ({
            blockNumber: row.block_number,
            logIndex: row.log_index,
            timestamp: (await provider.getBlock(row.block_number)).timestamp,
            txHash: row.tx_hash,
            type: "mint",
            author: row.author,
            amount: row.value,
          })
        )
    );

    // List
    const lists: Promise<EventListDTO[]> = Promise.all(
      db
        .prepare(
          `SELECT
            list.listing_id,
            list.block_number,
            list.log_index,
            list.tx_hash,
            list.seller,
            replenish.new_price,
            replenish.token_amount
          FROM openstore_list AS list
          JOIN openstore_replenish AS replenish
            ON
              replenish.listing_id = list.listing_id AND
              replenish.tx_hash = list.tx_hash
          WHERE
            list.app_address = ? AND
            list.token_contract = ? AND
            list.token_id = ?`
        )
        .all(config.eth.appAddress.toString(), talentContract.address, id)
        .filter((row: any) => row.block_number)
        .map(
          async (row: any): Promise<EventListDTO> => ({
            blockNumber: row.block_number,
            logIndex: row.log_index,
            timestamp: (await provider.getBlock(row.block_number)).timestamp,
            txHash: row.tx_hash,
            type: "list",
            listingId: row.listing_id,
            seller: row.seller,
            amount: row.token_amount,
            price: row.new_price,
          })
        )
    );

    // Purchase
    const purchases: Promise<EventPurchaseDTO[]> = Promise.all(
      db
        .prepare(
          `SELECT
            purchase.listing_id,
            purchase.block_number,
            purchase.log_index,
            purchase.tx_hash,
            purchase.buyer,
            purchase.token_amount,
            purchase.income
          FROM openstore_purchase AS purchase
          RIGHT JOIN openstore_list AS list
            ON purchase.listing_id = list.listing_id
          WHERE
            list.app_address = ? AND
            list.token_contract = ? AND
            list.token_id = ?`
        )
        .all(config.eth.appAddress.toString(), talentContract.address, id)
        .filter((row: any) => row.block_number)
        .map(
          async (row: any): Promise<EventPurchaseDTO> => ({
            blockNumber: row.block_number,
            logIndex: row.log_index,
            timestamp: (await provider.getBlock(row.block_number)).timestamp,
            txHash: row.tx_hash,
            type: "purchase",
            listingId: row.listing_id,
            buyer: row.buyer,
            tokenAmount: row.token_amount,
            income: row.income,
          })
        )
    );

    // Transfer
    const transfers: Promise<EventTransferDTO[]> = Promise.all(
      db
        .prepare(
          `SELECT *
          FROM talent_transfer
          WHERE id = ? AND "to" != ? AND "from" != ?`
        )
        .all(id, ethers.constants.AddressZero, ethers.constants.AddressZero)
        .filter((row: any) => row.block_number)
        .map(
          async (row: any): Promise<EventTransferDTO> => ({
            blockNumber: row.block_number,
            logIndex: row.log_index,
            timestamp: (await provider.getBlock(row.block_number)).timestamp,
            txHash: row.tx_hash,
            type: "transfer",
            from: row.from,
            to: row.to,
            value: row.value,
          })
        )
    );

    const events = (
      await Promise.all([mints, lists, purchases, transfers])
    ).flat();

    ctx.set("Cache-Control", "public, max-age=60");
    ctx.body = events.sort((a, b) =>
      b.timestamp === a.timestamp
        ? b.logIndex - a.logIndex
        : b.timestamp - a.timestamp
    );
  });

  // TODO:
  router.get("/v1/talents/:cid/fromListingPrice", async (ctx, next) => {
    let cid: CID;

    try {
      cid = CID.parse(ctx.params.cid);
    } catch (e) {
      ctx.throw(400, "Invalid CID");
      return;
    }

    const id = "0x" + Buffer.from(cid.multihash.digest).toString("hex");

    const provider = await getProvider();
    const talentContract = IpftRedeemableFactory.connect(
      config.eth.talentAddress.toString(),
      provider
    );

    const price = (
      await db
        .prepare(
          `SELECT *
          FROM openstore_list AS list
          JOIN openstore_replenish AS replenish ON
            replenish.rowid = (
              SELECT r1.rowid FROM replenish AS r1
              WHERE r1.listing_id = list.listing_id
              ORDER BY r1.block_number DESC
              LIMIT 1
            )
          WHERE
            app_address = ? AND
            token_contract = ? AND
            token_id = ?
          ORDER BY block_number DESC
          LIMIT 1`
        )
        .get(talentContract.address, id)
    )?.price;

    if (!price) ctx.throw(404, "Talent not found");

    ctx.set("Cache-Control", "public, max-age=60");
    ctx.body = price;
  });
}
