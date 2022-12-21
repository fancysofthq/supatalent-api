import * as dotenv from "dotenv";
import { Address, Hash } from "@/models/Bytes";
dotenv.config();

class DB {
  constructor(readonly url: URL) {}
}

class Server {
  constructor(readonly host: string, readonly port: number) {}
}

class Eth {
  constructor(
    readonly rpcUrl: string,
    readonly appAddress: Address,
    readonly talentAddress: Address,
    readonly talentTx: Hash,
    readonly nftFairAddress: Address,
    readonly nftFairTx: Hash
  ) {}
}

class Config {
  constructor(
    readonly db: DB,
    readonly server: Server,
    readonly jwtSecret: string,
    readonly web3StorageToken: string,
    readonly eth: Eth
  ) {}
}

function requireEnv(id: string): string {
  if (process.env[id]) return process.env[id]!;
  else throw `Missing env var ${id}`;
}

const config = new Config(
  new DB(new URL(requireEnv("DATABASE_URL"))),
  new Server(requireEnv("SERVER_HOST"), parseInt(requireEnv("SERVER_PORT"))),
  requireEnv("JWT_SECRET"),
  requireEnv("WEB3_STORAGE_TOKEN"),
  new Eth(
    requireEnv("ETH_RPC_URL"),
    new Address(requireEnv("ETH_APP_ADDRESS")),
    new Address(requireEnv("ETH_TALENT_ADDRESS")),
    new Hash(requireEnv("ETH_TALENT_TX")),
    new Address(requireEnv("ETH_NFTFAIR_ADDRESS")),
    new Hash(requireEnv("ETH_NFTFAIR_TX"))
  )
);

export default config;
