import Router from "@koa/router";
import Koa from "koa";
import cors from "@koa/cors";
import koaBodyparser from "koa-bodyparser";
import koaLogger from "koa-logger";
import setupAccountsController from "./controllers/accounts.js";
import setupAuthController from "./controllers/auth.js";
import setupListingsController from "./controllers/listings.js";
import setupStorageController from "./controllers/storage.js";
import setupTalentsController from "./controllers/talents.js";

const app = new Koa();
const router = new Router();

router.get("/", (ctx) => {
  ctx.body = "Hello, World!";
});

setupAccountsController(router);
setupAuthController(router);
setupListingsController(router);
setupStorageController(router);
setupTalentsController(router);

app
  .use(koaLogger())
  .use(cors())
  .use(koaBodyparser())
  .use(router.routes())
  .use(router.allowedMethods());

export default app;
