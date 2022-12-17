import db from "@/services/db.js";
import Router from "@koa/router";
import { CID } from "multiformats/cid";
import { getProvider } from "@/services/eth.js";
import Address from "@/models/Address.js";
import { ethers } from "ethers";
import config from "@/config.js";
import * as Talents from "./talents.js";
import { IpftRedeemableFactory } from "@/../contracts/IpftRedeemableFactory.js";

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

    const provider = await getProvider();

    const talentContract = IpftRedeemableFactory.connect(
      config.eth.talentAddress.toString(),
      provider
    );

    ctx.body = (
      await talentContract.balanceOf(address.toString(), cid.multihash.digest)
    )._hex;
  });

  router.get("/v1/accounts/:address/activity", async (ctx, next) => {
    if (typeof ctx.params.address !== "string")
      ctx.throw(400, "Invalid address");
    const address = new Address(ctx.params.address);

    const provider = await getProvider();

    // List
    const lists: Promise<Talents.EventListDTO[]> = Promise.all(
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
            list.seller = ?`
        )
        .all(config.eth.appAddress.toString(), address.toString())
        .filter((row: any) => row.block_number)
        .map(
          async (row: any): Promise<Talents.EventListDTO> => ({
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
    const purchases: Promise<Talents.EventPurchaseDTO[]> = Promise.all(
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
            purchase.buyer = ?`
        )
        .all(config.eth.appAddress.toString(), address.toString())
        .filter((row: any) => row.block_number)
        .map(
          async (row: any): Promise<Talents.EventPurchaseDTO> => ({
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
    const transfers: Promise<Talents.EventTransferDTO[]> = Promise.all(
      db
        .prepare(
          `SELECT *
          FROM talent_transfer
          WHERE "to" != ? AND "from" == ?`
        )
        .all(ethers.constants.AddressZero, address.toString())
        .filter((row: any) => row.block_number)
        .map(
          async (row: any): Promise<Talents.EventTransferDTO> => ({
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

    const events = (await Promise.all([lists, purchases, transfers])).flat();

    ctx.set("Cache-Control", "public, max-age=60");
    ctx.body = events.sort((a, b) =>
      b.timestamp === a.timestamp
        ? b.logIndex - a.logIndex
        : b.timestamp - a.timestamp
    );
  });
}
