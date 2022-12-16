import config from "@/config.js";
import { Database } from "better-sqlite3";
import BetterSqlite3 from "better-sqlite3";

export function open(trace: boolean = false): Database {
  const path = config.db.url.host + config.db.url.pathname;
  // console.debug("Opening database connection", path);

  const db = new BetterSqlite3(path, {
    verbose: trace ? console.log : undefined,
  });

  db.pragma("journal_mode = WAL");

  return db;
}

const db: Database = open();

export default db;
