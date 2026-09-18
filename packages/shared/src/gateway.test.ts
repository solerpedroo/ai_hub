import { describe, expect, it } from "vitest";
import {
  catalogModelsForProvider,
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

  it("lists OpenRouter as a first-class catalog provider and gates vision", () => {
    const openrouter = catalogModelsForProvider("openrouter");
    expect(openrouter.some((model) => model.id === "openai/gpt-4o-mini")).toBe(true);
    const groq = findCatalogModel("llama-3.1-8b-instant", "groq");
    expect(groq?.vision).toBe(false);
    const gpt = findCatalogModel("gpt-4o", "openai");
    expect(gpt?.vision).toBe(true);
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

  it("accepts temperature, max tokens, and extra system on send", () => {
    const parsed = chatSendInputSchema.parse({
      mode: "send",
      conversationId: "11111111-1111-4111-8111-111111111111",
      providerKeyId: "22222222-2222-4222-8222-222222222222",
      model: "openai/gpt-4o-mini",
      content: "hello",
      temperature: 0.2,
      maxTokens: 256,
      extraSystem: "Be terse.",
    });
    expect(parsed.mode).toBe("send");
    if (parsed.mode !== "send") {
      return;
    }
    expect(parsed.temperature).toBe(0.2);
    expect(parsed.maxTokens).toBe(256);
    expect(parsed.extraSystem).toBe("Be terse.");
  });

  it("accepts compactHistory on send", () => {
    const parsed = chatSendInputSchema.parse({
      mode: "send",
      conversationId: "11111111-1111-4111-8111-111111111111",
      providerKeyId: "22222222-2222-4222-8222-222222222222",
      model: "gpt-4o-mini",
      content: "hello",
      compactHistory: true,
    });
    expect(parsed.compactHistory).toBe(true);
  });

  it("accepts allowOnce on send", () => {
    const parsed = chatSendInputSchema.parse({
      mode: "send",
      conversationId: "11111111-1111-4111-8111-111111111111",
      providerKeyId: "22222222-2222-4222-8222-222222222222",
      model: "gpt-4o-mini",
      content: "hello",
      allowOnce: true,
    });
    expect(parsed.allowOnce).toBe(true);
  });

  it("parses a chat error event with an explicit fallback suggestion and no secret", () => {
    const event = chatEventSchema.parse({
      type: "error",
      runId: "11111111-1111-4111-8111-111111111111",
      messageId: "22222222-2222-4222-8222-222222222222",
      code: "timeout",
      suggestProviderSlug: "openai",
      suggestKeyId: "33333333-3333-4333-8333-333333333333",
      suggestModel: "gpt-4o-mini",
    });
    expect(event.type).toBe("error");
    if (event.type !== "error") {
      return;
    }
    expect(event.suggestProviderSlug).toBe("openai");
    expect("secret" in event).toBe(false);
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
      source: "chat",
    });
    expect(receipt.provider).toBe("openai");
    expect(receipt.source).toBe("chat");
    expect("secret" in receipt).toBe(false);
  });
});
