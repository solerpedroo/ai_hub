import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptUtf8, encryptUtf8, EnvelopeError } from "./envelope";

describe("envelope AES-256-GCM", () => {
  it("round-trips unicode text", () => {
    const key = randomBytes(32);
    const plain = "projeto: こんにちは — secret draft";
    const cipher = encryptUtf8(plain, key);
    expect(cipher.startsWith("v1.")).toBe(true);
    expect(cipher).not.toContain(plain);
    expect(decryptUtf8(cipher, key)).toBe(plain);
  });

  it("fails closed on the wrong key", () => {
    const cipher = encryptUtf8("hello", randomBytes(32));
    expect(() => decryptUtf8(cipher, randomBytes(32))).toThrow(EnvelopeError);
  });

  it("round-trips an empty string used for streaming placeholders", () => {
    const key = randomBytes(32);
    expect(decryptUtf8(encryptUtf8("", key), key)).toBe("");
  });

  it("rejects truncated payloads", () => {
    expect(() => decryptUtf8("v1.abc", randomBytes(32))).toThrow(EnvelopeError);
  });
});
