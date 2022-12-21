import { Address, Hash } from "../Bytes";

export type Config = {
  contractAddress: Address;
  contractDeployTx: Hash;
};
