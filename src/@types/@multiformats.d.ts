declare module "@multiformats/sha3" {
  import { Hasher } from "multiformats/hashes/hasher";

  export const sha3224: Hasher<"sha3-224", 23>;
  export const sha3256: Hasher<"sha3-256", 22>;
  export const sha3384: Hasher<"sha3-384", 21>;
  export const sha3512: Hasher<"sha3-512", 20>;
  export const shake128: Hasher<"shake-128", 24>;
  export const shake256: Hasher<"shake-256", 25>;
  export const keccak224: Hasher<"keccak-224", 26>;
  export const keccak256: Hasher<"keccak-256", 27>;
  export const keccak384: Hasher<"keccak-384", 28>;
  export const keccak512: Hasher<"keccak-512", 29>;
}
