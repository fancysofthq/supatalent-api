import config from "../config.js";
import { ethers } from "ethers";
import { timeout } from "@fancysofthq/supabase/utils/aux";
import pRetry from "p-retry";
import {
  IPNFT1155Redeemable__factory,
  NFTFair__factory,
} from "@fancysoft/contracts/typechain";

let provider: ethers.providers.BaseProvider;

console.log("Connecting to JSON-RPC provider at", config.eth.rpcUrl);
if (config.eth.rpcUrl.startsWith("ws")) {
  provider = new ethers.providers.WebSocketProvider(config.eth.rpcUrl);
} else {
  provider = new ethers.providers.JsonRpcProvider(config.eth.rpcUrl);
}

await timeout(5000, provider.ready, "JSON-RPC provider not ready");

export { provider };

export const talentContract = IPNFT1155Redeemable__factory.connect(
  config.eth.talentAddress.toString(),
  provider
);

export const nftFairContract = NFTFair__factory.connect(
  config.eth.nftFairAddress.toString(),
  provider
);

// TODO: Store confirmed txes, disallow re-use.
export async function confirmTx(
  txHash: string,
  from: string,
  to: string,
  requiredConfirmations: number
): Promise<void> {
  const tx = await pRetry(() => provider.getTransaction(txHash));
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
