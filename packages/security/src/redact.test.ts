import { describe, expect, it } from "vitest";
import { last4OfSecret, maskSecret, redactSecrets, safeErrorMessage } from "./redact";

describe("redactSecrets", () => {
  it("strips OpenAI-shaped keys and Bearer tokens", () => {
    const input = "Authorization: Bearer abc.def.ghi sk-testfixtureABCDEFGH1234 leftover";
    const redacted = redactSecrets(input);
    expect(redacted).not.toContain("sk-testfixture");
    expect(redacted).not.toContain("Bearer abc");
    expect(redacted).toContain("[REDACTED]");
  });

  it("strips unlabeled Gemini and Groq keys", () => {
    const gemini = "AIzaSyTestfixtureGeminiKey99";
    const groq = "gsk_testfixtureGROQKEY99";
    expect(redactSecrets(`echo ${gemini}`)).not.toContain(gemini);
    expect(redactSecrets(`echo ${groq}`)).not.toContain(groq);
  });
});

describe("maskSecret", () => {
  it("masks with last four characters", () => {
    expect(maskSecret("sk-abcdefghijklmnopqrstuv")).toBe("sk-…stuv");
    expect(last4OfSecret("sk-abcdefghijklmnopqrstuv")).toBe("stuv");
  });
});

describe("safeErrorMessage", () => {
  it("redacts secrets inside Error messages", () => {
    const message = safeErrorMessage(new Error("bad key sk-livefixtureXXXX9999"));
    expect(message).not.toContain("sk-livefixture");
    expect(message).toContain("[REDACTED]");
  });
});
