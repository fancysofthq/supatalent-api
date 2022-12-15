import config from "../config.js";
import { ethers } from "ethers";
import { timeout } from "@/utils.js";
import { IpftRedeemableFactory } from "@/../contracts/IpftRedeemableFactory.js";
import { OpenStoreFactory } from "@/../contracts/OpenStoreFactory.js";

console.log("Connecting to JSON-RPC provider at", config.eth.rpcUrl);
const provider = new ethers.providers.JsonRpcProvider(config.eth.rpcUrl);
await timeout(1000, provider.ready, "Provider not ready");

const blockNumber = await provider.getBlockNumber();
console.log("Current block number:", blockNumber);

export { provider };

const talentContract = IpftRedeemableFactory.connect(
  config.eth.talentAddress.toString(),
  provider
);

const openStoreContract = OpenStoreFactory.connect(
  config.eth.openStoreAddress.toString(),
  provider
);

export { talentContract, openStoreContract };

// TODO: Store confirmed txes, disallow re-use.
export async function confirmTx(
  txHash: string,
  from: string,
  to: string,
  requiredConfirmations: number
): Promise<void> {
  const tx = await provider.getTransaction(txHash);

  if (!tx) throw new Error("Invalid transaction");

  if (
    tx.to?.toUpperCase() !== to.toUpperCase() ||
    tx.from?.toUpperCase() !== from.toUpperCase()
  ) {
    throw new Error("Invalid transaction");
  }

  if (tx.confirmations < requiredConfirmations) {
    throw new Error("Not enough confirmations");
  }
}
