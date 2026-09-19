import { describe, expect, it } from "vitest";
import { looksLikePastedSecret, redactPastedSecrets } from "./secret-paste";

describe("secret paste hints", () => {
  it("flags OpenAI-shaped keys and Bearer tokens", () => {
    expect(looksLikePastedSecret("hello sk-testfixtureABCDEFGH leftover")).toBe(true);
    expect(looksLikePastedSecret("Authorization: Bearer abc.def.ghi")).toBe(true);
    expect(looksLikePastedSecret("Just a normal question")).toBe(false);
  });

  it("redacts without leaving the original token", () => {
    const redacted = redactPastedSecrets("use sk-testfixtureABCDEFGH please");
    expect(redacted).not.toContain("sk-testfixture");
    expect(redacted).toContain("[REDACTED]");
  });

  it("redacts PEM blocks, AWS access keys, and GitHub PATs", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nMIIBfixtureKEY\n-----END PRIVATE KEY-----";
    expect(looksLikePastedSecret(pem)).toBe(true);
    expect(redactPastedSecrets(pem)).not.toContain("MIIBfixtureKEY");
    expect(redactPastedSecrets("id AKIATESTFIXTUREKEY12 leftover")).not.toContain("AKIATESTFIXTUREKEY12");
    expect(redactPastedSecrets("token ghp_abcdefghijklmnopqrstuvwxyz")).not.toContain("ghp_abcdefghijklmnop");
  });
});
