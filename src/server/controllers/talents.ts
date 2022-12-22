import db from "@/services/db.js";
import Router from "@koa/router";
import { CID } from "multiformats/cid";
import { digest } from "multiformats";
import { talentContract } from "@/services/eth.js";
import { Address, Bytes, Hash } from "@fancysofthq/supabase";
import { BigNumber, ethers, utils } from "ethers";
import config from "@/config.js";
import {
  Event,
  ListEvent,
  PurchaseEvent,
  Talent,
  TalentId,
  TransferEvent,
} from "../types";

export default function setupTalentsController(router: Router) {
  router.get("/v1/talents", async (ctx, next) => {
    ctx.set("Cache-Control", "public, max-age=60");

    const from = ctx.query.from
      ? Address.from(ctx.query.from as string)
      : undefined;

    if (from) {
      // Get all talents claimed by a specific address.
      //

      ctx.body = db
        .prepare(
          `SELECT content_id, content_codec, multihash_codec
          FROM iipnft_claim
          WHERE contract_address = ? AND content_author = ?
          ORDER BY block_number DESC`
        )
        .all(config.eth.talentAddress.bytes, from.bytes)
        .filter((row: any) => row.content_id)
        .map((row) =>
          new TalentId(
            CID.createV1(
              row.content_codec,
              digest.create(
                row.multihash_codec,
                Bytes.from(row.content_id).bytes
              )
            )
          ).toJSON()
        );
    } else {
      // Get all claimed talents.
      //

      ctx.body = db
        .prepare(
          `SELECT content_id, content_codec, multihash_codec
          FROM iipnft_claim
          WHERE contract_address = ?
          ORDER BY block_number DESC`
        )
        .all(config.eth.talentAddress.bytes)
        .filter((row: any) => row.content_id)
        .map((row) =>
          new TalentId(
            CID.createV1(
              row.content_codec,
              digest.create(
                row.multihash_codec,
                Bytes.from(row.content_id).bytes
              )
            )
          ).toJSON()
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

    const id = Bytes.from(cid.multihash.digest);

    const blockNumber = (
      await db
        .prepare(
          `SELECT block_number
          FROM ipft1155redeemable_mint
          WHERE id = ?`
        )
        .get(id.bytes)
    )?.block_number;

    if (!blockNumber) ctx.throw(404, "Talent not found");

    // Get finalized and expiredAt from the latest Mint event.
    const {
      finalize: finalized,
      expires_at: expiredAt,
    }: {
      finalize: boolean;
      expires_at: number;
    } = db
      .prepare(
        `SELECT finalize, expires_at
        FROM ipft1155redeemable_mint
        WHERE contract_address = ? AND id = ?
        ORDER BY block_number DESC
        LIMIT 1`
      )
      .get(config.eth.talentAddress.bytes, id.bytes);

    const {
      block_number: claimedEventBlockNumber,
      log_index: claimedEventLogIndex,
      tx_hash: claimedEventTxHash,
      content_author: author,
    }: {
      block_number: number;
      log_index: number;
      tx_hash: string;
      content_author: string;
    } = db
      .prepare(
        `SELECT block_number, log_index, tx_hash, content_author
        FROM iipnft_claim
        WHERE contract_address = ? AND content_id = ?`
      )
      .get(config.eth.talentAddress.bytes, id.bytes);

    // TODO: Off-chain editions (Transfer events).
    const [editions, royalty] = await Promise.all([
      await talentContract.totalSupply(id.toString()),
      (
        await talentContract.royaltyInfo(
          id.toString(),
          ethers.utils.parseEther("1")
        )
      ).royaltyAmount
        .div(utils.parseEther("1"))
        .toNumber(),
    ]);

    // Set cache to 30 seconds (approx. 2 blocks).
    ctx.set("Cache-Control", "public, max-age=30");

    ctx.body = new Talent(
      cid,
      Address.from(author),
      {
        blockNumber: claimedEventBlockNumber,
        logIndex: claimedEventLogIndex,
        txHash: Hash.from(claimedEventTxHash),
      },
      royalty, // 0-1
      finalized,
      new Date(expiredAt * 1000),
      editions
    ).toJSON();

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

    const id = Bytes.from(cid.multihash.digest);

    // Mint events, that is transfers from zero.
    const mints = db
      .prepare(
        `SELECT
          block_number,
          log_index,
          sub_index,
          tx_hash,
          operator,
          "to",
          id,
          value
        FROM ierc1155_transfer
        WHERE contract_address = ? AND "from" = ? AND id = ?`
      )
      .all(config.eth.talentAddress.bytes, Address.zero.bytes, id.bytes)
      .filter((row: any) => row.block_number)
      .map(
        (row: any) =>
          new TransferEvent(
            row.block_number,
            row.log_index,
            row.sub_index,
            Hash.from(row.tx_hash),
            Address.from(row.operator),
            Address.zero,
            Address.from(row.to),
            BigNumber.from(row.id),
            BigNumber.from(row.value)
          )
      );

    console.debug(mints);

    // List events.
    const lists = db
      .prepare(
        `SELECT
          block_number,
          log_index,
          tx_hash,
          listing_id,
          seller,
          price,
          stock_size
        FROM nftfair_list
        WHERE
          contract_address = ? AND
          app = ? AND
          token_contract = ? AND
          token_id = ?`
      )
      .all(
        config.eth.nftFairAddress.bytes,
        config.eth.appAddress.bytes,
        talentContract.address,
        id.bytes
      )
      .filter((row: any) => row.block_number)
      .map(
        (row: any) =>
          new ListEvent(
            row.block_number,
            row.log_index,
            Hash.from(row.tx_hash),
            Bytes.from<32>(row.listing_id),
            Address.from(row.seller),
            BigNumber.from(row.price),
            BigNumber.from(row.stock_size)
          )
      );

    // Purchase events.
    const purchases = db
      .prepare(
        `SELECT
          nftfair_purchase.block_number,
          nftfair_purchase.log_index,
          nftfair_purchase.tx_hash,
          nftfair_purchase.listing_id,
          nftfair_purchase.buyer,
          nftfair_purchase.token_amount,
          nftfair_purchase.income
        FROM nftfair_purchase
        RIGHT JOIN nftfair_list
          ON nftfair_purchase.listing_id = nftfair_list.listing_id
        WHERE
          nftfair_list.contract_address = ? AND
          nftfair_list.app = ? AND
          nftfair_list.token_contract = ? AND
          nftfair_list.token_id = ?`
      )
      .all(
        config.eth.nftFairAddress.bytes,
        config.eth.appAddress.bytes,
        config.eth.talentAddress.bytes,
        id.bytes
      )
      .filter((row: any) => row.block_number)
      .map(
        (row: any) =>
          new PurchaseEvent(
            row.block_number,
            row.log_index,
            Hash.from(row.tx_hash),
            Bytes.from<32>(row.listing_id),
            Address.from(row.buyer),
            BigNumber.from(row.token_amount),
            BigNumber.from(row.income)
          )
      );

    console.debug(purchases);

    // Transfers.
    const transfers = db
      .prepare(
        `SELECT
          block_number,
          log_index,
          sub_index,
          tx_hash,
          operator,
          "from",
          "to",
          id,
          value
        FROM ierc1155_transfer
        WHERE
          contract_address = ? AND
          id = ? AND
          "to" != ? AND
          "to" != ? AND
          "from" != ? AND
          "from" != ?`
      )
      .all(
        config.eth.talentAddress.bytes,
        id.bytes,
        Address.zero.bytes,
        config.eth.nftFairAddress.bytes,
        Address.zero.bytes,
        config.eth.nftFairAddress.bytes
      )
      .filter((row: any) => row.block_number)
      .map(
        (row: any) =>
          new TransferEvent(
            row.block_number,
            row.log_index,
            row.sub_index,
            Hash.from(row.tx_hash),
            Address.from(row.operator),
            Address.from(row.from),
            Address.from(row.to),
            BigNumber.from(row.id),
            BigNumber.from(row.value)
          )
      );

    const events: Event[] = [mints, lists, purchases, transfers].flat();

    // Cache for 30 seconds (approx. 2 blocks).
    ctx.set("Cache-Control", "public, max-age=30");

    ctx.body = events
      .sort((a, b) =>
        b.blockNumber === a.blockNumber
          ? b.logIndex - a.logIndex
          : b.blockNumber - a.blockNumber
      )
      .map((event) => event.toJSON());
  });
}
