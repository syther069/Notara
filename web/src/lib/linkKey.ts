// One-time keys for send links. The secret lives only in the link's #part (never sent to a server).

import { KeyPair, baseDecode, type KeyPairString } from "near-api-js";

export interface LinkKey {
  /** "ed25519:..." secret key string */
  secret: string;
  /** The NEAR implicit account this key controls: hex of the public key. */
  account: string;
  /** "ed25519:..." public key, e.g. to give a new named account the same key. */
  publicKey: string;
}

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function fromSecret(secret: string): LinkKey {
  const kp = KeyPair.fromString(secret as KeyPairString);
  const publicKey = kp.getPublicKey().toString();
  return { secret, publicKey, account: toHex(baseDecode(publicKey.split(":")[1])) };
}

export const newLinkKey = () => fromSecret(KeyPair.fromRandom("ed25519").toString());

/** The #part of a send link: the base58 secret without the "ed25519:" prefix. */
export const toFragment = (k: LinkKey) => k.secret.slice("ed25519:".length);
export const fromFragment = (hash: string) => fromSecret(`ed25519:${hash.replace(/^#/, "")}`);

/** A new top-level name like "priya" (becomes priya.near): 2+ chars, lowercase letters, digits, - or _ between them. */
export const isValidNewName = (name: string) => /^[a-z\d]+([-_][a-z\d]+)*$/.test(name) && name.length >= 2 && name.length <= 59;

/** Soft expiry: shown to both sides, not enforceable (whoever holds the key controls the money). */
export const SEND_LINK_DAYS = 7;
