import db from "@/services/db.js";
import Router from "@koa/router";
import { CID } from "multiformats/cid";
import { talentContract } from "@/services/eth.js";
import { Address, Bytes, Hash } from "@/models/Bytes.js";
import config from "@/config.js";
import { BigNumber } from "ethers";

export default function setupAccountsController(router: Router) {
  router.get("/v1/accounts/:address/talentBalance/:cid", async (ctx, next) => {
    if (typeof ctx.params.address !== "string")
      ctx.throw(400, "Invalid address");
    const address = new Address(ctx.params.address);

    if (typeof ctx.params.cid !== "string") ctx.throw(400, "Invalid CID");
    let cid: CID;
    try {
      cid = CID.parse(ctx.params.cid);
    } catch (e) {
      ctx.throw(400, "Invalid CID");
      return;
    }

    // Set cache to 30 seconds (approx. two blocks).
    ctx.set("Cache-Control", "max-age=30");

    // TODO: Query transfer events instead.
    ctx.body = (
      await talentContract.balanceOf(address.toString(), cid.multihash.digest)
    )._hex;
  });

  router.get("/v1/accounts/:address/activity", async (ctx, next) => {
    if (typeof ctx.params.address !== "string")
      ctx.throw(400, "Invalid address");
    const address = new Address(ctx.params.address);

    // Select all listings created by this address.
    // Full listing information is not included in the response.
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
        WHERE contract_address = ? AND app = ? AND seller = ?`
      )
      .all(
        config.eth.nftFairAddress.bytes,
        config.eth.appAddress.bytes,
        address.bytes
      )
      .filter((row: any) => row.block_number) // Remove empty rows.
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

    // Select all purchases made by this address.
    const purchases = db
      .prepare(
        `SELECT
          block_number,
          log_index,
          tx_hash,
          listing_id,
          token_amount,
          income
        FROM nftfair_purchase
        WHERE contract_address = ? AND app = ? AND buyer = ?`
      )
      .all(
        config.eth.nftFairAddress.bytes,
        config.eth.appAddress.bytes,
        address.bytes
      )
      .filter((row: any) => row.block_number) // Remove empty rows.
      .map((row: any) => ({
        blockNumber: row.block_number,
        logIndex: row.log_index,
        txHash: new Hash(row.tx_hash).toString(),
        type: "talent_purchase",
        listingId: new Bytes<32>(row.listing_id).toString(),
        tokenAmount: BigNumber.from(row.token_amount)._hex,
        income: BigNumber.from(row.income)._hex,
      }));

    // Transfers to or from (excluding minting and burning).
    const transfers = db
      .prepare(
        `SELECT
          block_number,
          log_index,
          sub_index,
          tx_hash,
          "from",
          "to",
          id,
          value
        FROM ierc1155_transfer
        WHERE
          contract_address = ? AND
          "from" != ? AND
          "from" != ? AND
          "to" != ? AND
          "to" != ? AND
          "to" != ? AND
          ("from" == ? OR "to" == ?)`
      )
      .all(
        config.eth.talentAddress.bytes,
        Address.zero.bytes,
        config.eth.nftFairAddress.bytes,
        Address.zero.bytes,
        config.eth.nftFairAddress.bytes,
        config.eth.talentAddress.bytes,
        address.bytes,
        address.bytes
      )
      .filter((row: any) => row.block_number) // Remove empty rows.
      .map((row: any) => ({
        blockNumber: row.block_number,
        logIndex: row.log_index,
        subIndex: row.sub_index,
        txHash: new Hash(row.tx_hash).toString(),
        type: "talent_transfer",
        from: new Address(row.from).toString(),
        to: new Address(row.to).toString(),
        id: BigNumber.from(row.id)._hex,
        value: BigNumber.from(row.value)._hex,
      }));

    const events = [lists, purchases, transfers].flat();

    // Set cache to 30 seconds (approx. 2 blocks).
    ctx.set("Cache-Control", "public, max-age=30");

    ctx.body = events.sort((a, b) =>
      b.blockNumber === a.blockNumber
        ? b.logIndex - a.logIndex
        : b.blockNumber - a.blockNumber
    );
  });
}
