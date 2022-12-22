import { Address, Hash } from "@fancysofthq/supabase";

export type Config = {
  contractAddress: Address;
  contractDeployTx: Hash;
};
