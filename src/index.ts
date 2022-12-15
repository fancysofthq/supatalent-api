import config from "./config.js";
import server from "./server/index.js";
import sync from "./logic/sync.js";

sync(() => false);

server.listen(config.server.port, config.server.host, () => {
  console.log(
    `Server listening at http://${config.server.host}:${config.server.port}`
  );
});
