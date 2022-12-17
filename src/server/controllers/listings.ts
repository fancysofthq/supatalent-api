import db from "@/services/db.js";
import Router from "@koa/router";
import { CID } from "multiformats/cid";
import { getProvider } from "@/services/eth.js";
import config from "@/config.js";
import { ethers } from "ethers";
import { OpenStoreFactory } from "@/../contracts/OpenStoreFactory.js";

export type ShortListingDTO = {
  id: string;
};

export type ListingDTO = {
  id: string; // BigNumber hex
  seller: string;
  token: {
    contract: string;
    id: string; // BigNumber hex
  };
  stockSize: string; // BigNumber hex
  price: string; // BigNumber hex
};

export default function setupListingsController(router: Router) {
  router.get("/v1/listings", async (ctx, next) => {
    ctx.set("Cache-Control", "public, max-age=60");

    if (ctx.query.talentCid) {
      let talentCid: CID;

      try {
        talentCid = CID.parse(ctx.query.talentCid as string);
      } catch (e) {
        ctx.throw(400, "Malformed CID");
        return;
      }

      ctx.body = db
        .prepare(
          `SELECT listing_id
          FROM openstore_list
          WHERE app_address = ? AND token_contract = ? AND token_id = ?
          ORDER BY block_number DESC`
        )
        .all(
          config.eth.appAddress.toString(),
          config.eth.talentAddress.toString(),
          "0x" + Buffer.from(talentCid.multihash.digest).toString("hex")
        )
        .map(
          (row): ShortListingDTO => ({
            id: row.listing_id,
          })
        );
    } else {
      ctx.throw(400, "Missing talentCid query parameter");
    }

    next();
  });

  router.get("/v1/listings/:id", async (ctx, next) => {
    ctx.set("Cache-Control", "public, max-age=60");

    const provider = await getProvider();

    const openStoreContract = OpenStoreFactory.connect(
      config.eth.openStoreAddress.toString(),
      provider
    );

    const listing = await openStoreContract.getListing(ctx.params.id);

    if (listing.seller === ethers.constants.AddressZero) {
      ctx.throw(404, "Listing not found");
      return;
    }

    const dto: ListingDTO = {
      id: ctx.params.id,
      seller: listing.seller,
      token: {
        contract: listing.token.contrakt,
        id: listing.token.id._hex,
      },
      stockSize: listing.stockSize._hex,
      price: listing.price._hex,
    };

    ctx.body = dto;

    next();
  });
}
