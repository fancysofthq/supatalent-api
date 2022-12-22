import db from "@/services/db";
import Router from "@koa/router";
import { CID } from "multiformats/cid";
import { nftFairContract } from "@/services/eth";
import config from "@/config";
import { Address, Bytes } from "@fancysofthq/supabase";
import { BigNumber } from "ethers";
import { Listing, ListingId } from "../types";

export default function setupListingsController(router: Router) {
  router.get("/v1/listings", async (ctx, next) => {
    if (ctx.query.talentCid) {
      // Get listings for a specific talent.
      //

      let talentCid: CID;

      try {
        talentCid = CID.parse(ctx.query.talentCid as string);
      } catch (e) {
        ctx.throw(400, "Malformed CID");
        return;
      }

      // Set cache to 30 seconds (approx. 2 blocks).
      ctx.set("Cache-Control", "public, max-age=30");

      ctx.body = db
        .prepare(
          `SELECT
            block_number,
            log_index,
            listing_id
          FROM nftfair_list
          WHERE
            contract_address = ? AND
            app = ? AND
            token_contract = ? AND
            token_id = ?
          ORDER BY block_number DESC`
        )
        .all(
          config.eth.nftFairAddress.bytes,
          config.eth.appAddress.bytes,
          config.eth.talentAddress.bytes,
          talentCid.multihash.digest
        )
        .map((row) => new ListingId(Bytes.from<32>(row.listing_id)).toJSON());
    } else {
      ctx.throw(400, "Missing talentCid query parameter");
    }

    next();
  });

  router.get("/v1/listings/:id", async (ctx, next) => {
    // TODO: Make it off-chain.
    const listing = await nftFairContract.getListing(ctx.params.id);

    if (Address.from(listing.config.seller).zero) {
      ctx.throw(404, "Listing not found");
      return;
    }

    // Set cache to 30 seconds (approx. 2 blocks).
    ctx.set("Cache-Control", "public, max-age=30");

    ctx.body = new Listing(
      Bytes.from<32>(ctx.params.id),
      Address.from(listing.config.seller),
      {
        contract: Address.from(listing.token.contractAddress),
        id: BigNumber.from(listing.token.tokenId),
      },
      BigNumber.from(listing.stockSize),
      BigNumber.from(listing.config.price)
    ).toJSON();

    next();
  });
}
