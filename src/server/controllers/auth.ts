import jsonwebtoken from "jsonwebtoken";
import Router from "@koa/router";
import config from "@/config.js";
import koa from "koa";
import Account from "@/models/Address.js";

// TODO: Replace with a home-grown solution.
import Web3Token from "web3-token";

const issuer = config.server.host;

export type AppPayload = jsonwebtoken.JwtPayload & {
  addr: string;
};

export type AppJWT = jsonwebtoken.Jwt & {
  payload: AppPayload;
};

/**
 * Try authenticating with a JWT.
 *
 * @returns Decoded JWT or nothing
 * @throws 401 HTTP error if JWT is present but invalid
 */
export async function authenticate(
  ctx: koa.Context
): Promise<AppJWT | undefined> {
  const jwt = ctx.get("Authorization").match(/^Bearer\s+([\w\.\-=]+)$/)?.[1];
  if (!jwt) return undefined;

  try {
    return jsonwebtoken.verify(jwt, config.jwtSecret, {
      issuer,
      complete: true,
    }) as AppJWT;
  } catch (e) {
    console.error(e);
    ctx.throw(401, "Invalid JWT");
  }
}

/**
 * Authorize an account with a JWT.
 *
 * @param ctx Koa context
 * @param account Address to authorize
 *
 * @returns Decoded JWT
 * @throws 401 or 403 HTTP error
 */
export async function authorize(
  ctx: koa.Context,
  account: Account
): Promise<AppJWT> {
  const jwt = await authenticate(ctx);
  if (!jwt) ctx.throw(401, "Missing JWT");
  if (jwt.payload.addr.toLowerCase() != account.toString().toLowerCase())
    return ctx.throw(403);
  return jwt;
}

/**
 * Setup the auth controller.
 * @param {Router} router
 */
export default function setupAuthController(router: Router) {
  router.get("/v1/auth", async (ctx) => {
    const token = await authenticate(ctx);

    if (!token) {
      ctx.status = 401;
      return;
    }

    ctx.body = token.payload;
  });

  router.post("/v1/auth", async (ctx, next) => {
    const token = ctx.headers.authorization?.match(
      /^Web3-Token\s+([\w=]+)$/
    )?.[1];
    if (!token) return ctx.throw(401);

    // TODO: Have meaningful body?
    const { address, body } = Web3Token.verify(token);

    const jwt = jsonwebtoken.sign({ addr: address }, config.jwtSecret, {
      issuer,
      expiresIn: "7d",
    });

    ctx.body = jwt;
    ctx.status = 201; // Success

    next();
  });
}
