import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;

export class EnvelopeError extends Error {
  constructor(message = "Unable to decrypt stored data") {
    super(message);
    this.name = "EnvelopeError";
  }
}

export function assertMasterKey(key: Buffer): void {
  if (key.length !== KEY_BYTES) {
    throw new EnvelopeError("Master key must be 32 bytes");
  }
}

export function encryptUtf8(plain: string, key: Buffer): string {
  assertMasterKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptUtf8(payload: string, key: Buffer): string {
  assertMasterKey(key);
  const parts = payload.split(".");
  const version = parts[0];
  const ivB64 = parts[1];
  const tagB64 = parts[2];
  const dataB64 = parts[3];
  if (parts.length !== 4 || version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new EnvelopeError();
  }
  try {
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    throw new EnvelopeError();
  }
}
