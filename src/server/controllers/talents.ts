import db from "@/services/db.js";
import Router from "@koa/router";
import { CID } from "multiformats/cid";
import { digest } from "multiformats";
import { talentContract, nftFairContract } from "@/services/eth.js";
import { Address, Bytes, Hash } from "@/models/Bytes.js";
import { BigNumber, ethers, utils } from "ethers";
import config from "@/config.js";

export default function setupTalentsController(router: Router) {
  router.get("/v1/talents", async (ctx, next) => {
    ctx.set("Cache-Control", "public, max-age=60");

    const from = ctx.query.from
      ? new Address(ctx.query.from as string)
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
        .map((row) => ({
          cid: CID.createV1(
            row.content_codec,
            digest.create(row.multihash_codec, new Bytes(row.content_id).bytes)
          ).toString(),
        }));
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
        .map((row) => ({
          cid: CID.createV1(
            row.content_codec,
            digest.create(row.multihash_codec, new Bytes(row.content_id).bytes)
          ).toString(),
        }));
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

    const id = new Bytes(cid.multihash.digest);

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

    ctx.body = {
      cid: cid.toString(),
      author: new Address(author).toString(),
      claimEvent: {
        blockNumber: claimedEventBlockNumber,
        logIndex: claimedEventLogIndex,
        txHash: new Hash(claimedEventTxHash).toString(),
      },
      royalty, // 0-1
      finalized,
      expiredAt,
      editions: editions._hex,
    };

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

    const id = new Bytes(cid.multihash.digest);

    // Mint events, that is transfers from zero.
    const mints = db
      .prepare(
        `SELECT
          block_number,
          log_index,
          tx_hash,
          operator,
          "to",
          value
        FROM ierc1155_transfer
        WHERE contract_address = ? AND "from" = ? AND id = ?`
      )
      .all(config.eth.talentAddress.bytes, Address.zero.bytes, id.bytes)
      .filter((row: any) => row.block_number)
      .map((row: any) => ({
        blockNumber: row.block_number,
        logIndex: row.log_index,
        txHash: new Hash(row.tx_hash).toString(),
        type: "talent_mint",
        operator: new Address(row.operator).toString(),
        to: new Address(row.to).toString(),
        value: BigNumber.from(row.value)._hex,
      }));

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
      .map((row: any) => ({
        blockNumber: row.block_number,
        logIndex: row.log_index,
        txHash: new Hash(row.tx_hash).toString(),
        type: "talent_list",
        listingId: new Bytes<32>(row.listing_id).toString(),
        seller: new Address(row.seller).toString(),
        price: BigNumber.from(row.price)._hex,
        stockSize: BigNumber.from(row.stock_size)._hex,
      }));

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
      .map((row: any) => ({
        blockNumber: row.block_number,
        logIndex: row.log_index,
        txHash: new Hash(row.tx_hash).toString(),
        type: "talent_purchase",
        listingId: new Bytes<32>(row.listing_id).toString(),
        buyer: new Address(row.buyer).toString(),
        tokenAmount: BigNumber.from(row.token_amount)._hex,
        income: BigNumber.from(row.income)._hex,
      }));

    console.debug(purchases);

    // Transfers.
    const transfers = db
      .prepare(
        `SELECT
          block_number,
          log_index,
          tx_hash,
          "from",
          "to",
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
      .map((row: any) => ({
        blockNumber: row.block_number,
        logIndex: row.log_index,
        txHash: new Hash(row.tx_hash).toString(),
        type: "talent_transfer",
        from: new Address(row.from).toString(),
        to: new Address(row.to).toString(),
        value: BigNumber.from(row.value)._hex,
      }));

    const events = [mints, lists, purchases, transfers].flat();

    // Cache for 30 seconds (approx. 2 blocks).
    ctx.set("Cache-Control", "public, max-age=30");

    ctx.body = events.sort((a, b) =>
      b.blockNumber === a.blockNumber
        ? b.logIndex - a.logIndex
        : b.blockNumber - a.blockNumber
    );
  });
}
