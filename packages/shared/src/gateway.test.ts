import { describe, expect, it } from "vitest";
import {
  chatEventSchema,
  chatSendInputSchema,
  estimateCostUsd,
  findCatalogModel,
  packetV0Schema,
  receiptDtoSchema,
} from "./index";

describe("packet v0", () => {
  it("accepts a version-1 packet without extra keys", () => {
    const packet = packetV0Schema.parse({
      version: 1,
      system: "Be brief.",
      messages: [{ role: "user", content: "hi" }],
      tokenEstimate: 3,
      excluded: [],
    });
    expect(packet.version).toBe(1);
  });

  it("rejects a packet with extra keys", () => {
    expect(() =>
      packetV0Schema.parse({
        version: 1,
        system: "",
        messages: [],
        tokenEstimate: 0,
        excluded: [],
        apiKey: "sk-testfixtureABCDEFGH",
      }),
    ).toThrow();
  });
});

describe("model catalog", () => {
  it("prices gpt-4o-mini from the local catalog", () => {
    const model = findCatalogModel("gpt-4o-mini", "openai");
    expect(model).not.toBeNull();
    if (!model) {
      return;
    }
    expect(estimateCostUsd(model, 1_000_000, 1_000_000)).toBe("0.750000");
  });
});

describe("chat contracts", () => {
  it("rejects extra keys on chat send", () => {
    expect(() =>
      chatSendInputSchema.parse({
        mode: "send",
        conversationId: "11111111-1111-4111-8111-111111111111",
        providerKeyId: "22222222-2222-4222-8222-222222222222",
        model: "gpt-4o-mini",
        content: "hello",
        secret: "sk-testfixtureABCDEFGH",
      }),
    ).toThrow();
  });

  it("accepts a continue send without content", () => {
    const parsed = chatSendInputSchema.parse({
      mode: "continue",
      conversationId: "11111111-1111-4111-8111-111111111111",
      providerKeyId: "22222222-2222-4222-8222-222222222222",
      model: "gpt-4o-mini",
    });
    expect(parsed.mode).toBe("continue");
  });

  it("requires messageId for regenerate", () => {
    expect(() =>
      chatSendInputSchema.parse({
        mode: "regenerate",
        conversationId: "11111111-1111-4111-8111-111111111111",
        providerKeyId: "22222222-2222-4222-8222-222222222222",
        model: "gpt-4o-mini",
      }),
    ).toThrow();
  });

  it("accepts an edit send with content and messageId", () => {
    const parsed = chatSendInputSchema.parse({
      mode: "edit",
      conversationId: "11111111-1111-4111-8111-111111111111",
      providerKeyId: "22222222-2222-4222-8222-222222222222",
      model: "gpt-4o-mini",
      messageId: "33333333-3333-4333-8333-333333333333",
      content: "rewritten",
    });
    expect(parsed.mode).toBe("edit");
  });

  it("parses a chunk event", () => {
    const event = chatEventSchema.parse({
      type: "chunk",
      runId: "11111111-1111-4111-8111-111111111111",
      messageId: "22222222-2222-4222-8222-222222222222",
      text: "Hi",
    });
    expect(event.type).toBe("chunk");
  });

  it("parses a receipt without a secret field", () => {
    const receipt = receiptDtoSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      messageId: "22222222-2222-4222-8222-222222222222",
      provider: "openai",
      model: "gpt-4o-mini",
      tokensIn: 10,
      tokensOut: 4,
      latencyMs: 120,
      costUsd: "0.000001",
      errorCode: null,
      createdAt: "2026-09-16T00:00:00.000Z",
    });
    expect(receipt.provider).toBe("openai");
    expect("secret" in receipt).toBe(false);
  });
});
