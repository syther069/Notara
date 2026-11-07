// One-time keys for send links. The secret lives only in the link's #part (never sent to a server).

import { KeyPair, baseDecode, type KeyPairString } from "near-api-js";

export interface LinkKey {
  /** "ed25519:..." secret key string */
  secret: string;
  /** The NEAR implicit account this key controls: hex of the public key. */
  account: string;
}

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function fromSecret(secret: string): LinkKey {
  const kp = KeyPair.fromString(secret as KeyPairString);
  return { secret, account: toHex(baseDecode(kp.getPublicKey().toString().split(":")[1])) };
}

export const newLinkKey = () => fromSecret(KeyPair.fromRandom("ed25519").toString());

/** The #part of a send link: the base58 secret without the "ed25519:" prefix. */
export const toFragment = (k: LinkKey) => k.secret.slice("ed25519:".length);
export const fromFragment = (hash: string) => fromSecret(`ed25519:${hash.replace(/^#/, "")}`);
