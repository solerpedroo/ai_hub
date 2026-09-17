import { describe, expect, it } from "vitest";
import {
  conversationExportDocumentSchema,
  emptyIpcPayloadSchema,
  ipcAckResultSchema,
  messageCreateInputSchema,
  messageDtoSchema,
  messageUpdateInputSchema,
  providerKeyDtoSchema,
  secretsSaveInputSchema,
  secretsTestResultSchema,
  windowIsMaximizedResultSchema,
  workspaceSessionSchema,
} from "./ipc-schemas";

describe("emptyIpcPayloadSchema", () => {
  it("accepts an empty object", () => {
    expect(emptyIpcPayloadSchema.parse({})).toEqual({});
  });

  it("rejects extra keys", () => {
    expect(() => emptyIpcPayloadSchema.parse({ extra: true })).toThrow();
  });
});

describe("windowIsMaximizedResultSchema", () => {
  it("accepts booleans only", () => {
    expect(windowIsMaximizedResultSchema.parse(true)).toBe(true);
    expect(windowIsMaximizedResultSchema.parse(false)).toBe(false);
    expect(() => windowIsMaximizedResultSchema.parse("true")).toThrow();
  });
});

describe("ipcAckResultSchema", () => {
  it("accepts undefined or null ack", () => {
    expect(ipcAckResultSchema.parse(undefined)).toBeUndefined();
    expect(ipcAckResultSchema.parse(null)).toBeNull();
  });
});

describe("messageCreateInputSchema", () => {
  it("allows a null parent for a linear thread", () => {
    const parsed = messageCreateInputSchema.parse({
      conversationId: "11111111-1111-4111-8111-111111111111",
      role: "user",
      content: "hello",
      parentId: null,
      branchId: null,
    });
    expect(parsed.parentId).toBeNull();
  });
});

describe("messageUpdateInputSchema", () => {
  it("rejects extra keys", () => {
    expect(() =>
      messageUpdateInputSchema.parse({
        id: "11111111-1111-4111-8111-111111111111",
        content: "edited",
        secret: "sk-testfixtureABCDEFGH",
      }),
    ).toThrow();
  });
});

describe("workspaceSessionSchema", () => {
  it("accepts a restore payload without a provider key id", () => {
    const parsed = workspaceSessionSchema.parse({
      projectId: "11111111-1111-4111-8111-111111111111",
      conversationId: "22222222-2222-4222-8222-222222222222",
      model: "gpt-4o-mini",
    });
    expect(parsed.model).toBe("gpt-4o-mini");
    expect("providerKeyId" in parsed).toBe(false);
  });

  it("rejects extra keys so secrets cannot piggyback on session", () => {
    expect(() =>
      workspaceSessionSchema.parse({
        projectId: null,
        conversationId: null,
        model: "gpt-4o-mini",
        providerKeyId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toThrow();
  });
});

describe("conversationExportDocumentSchema", () => {
  it("rejects extra keys so secrets cannot piggyback on an export", () => {
    expect(() =>
      conversationExportDocumentSchema.parse({
        version: 1,
        mode: "active",
        exportedAt: "2026-09-17T00:00:00.000Z",
        conversation: {
          id: "11111111-1111-4111-8111-111111111111",
          projectId: null,
          title: "Chat",
          createdAt: "2026-09-17T00:00:00.000Z",
          updatedAt: "2026-09-17T00:00:00.000Z",
        },
        branchLabels: {},
        messages: [],
        apiKey: "sk-testfixtureABCDEFGH",
      }),
    ).toThrow();
  });
});

describe("messageDtoSchema", () => {
  it("requires isActiveBranch", () => {
    expect(() =>
      messageDtoSchema.parse({
        id: "11111111-1111-4111-8111-111111111111",
        conversationId: "22222222-2222-4222-8222-222222222222",
        parentId: null,
        branchId: "33333333-3333-4333-8333-333333333333",
        role: "user",
        content: "hi",
        status: "complete",
        createdAt: "2026-09-17T00:00:00.000Z",
        receipt: null,
      }),
    ).toThrow();
  });
});

describe("secretsSaveInputSchema", () => {
  it("rejects extra keys so secrets cannot piggyback on unknown fields", () => {
    expect(() =>
      secretsSaveInputSchema.parse({
        providerSlug: "openai",
        label: "work",
        secret: "sk-testfixtureABCDEFGH",
        extra: true,
      }),
    ).toThrow();
  });

  it("requires a base URL only for custom providers", () => {
    expect(() =>
      secretsSaveInputSchema.parse({
        providerSlug: "custom",
        label: "local",
        secret: "sk-testfixtureABCDEFGH",
      }),
    ).toThrow();
    expect(() =>
      secretsSaveInputSchema.parse({
        providerSlug: "openai",
        label: "work",
        secret: "sk-testfixtureABCDEFGH",
        baseUrl: "https://api.openai.com/v1",
      }),
    ).toThrow();
    const parsed = secretsSaveInputSchema.parse({
      providerSlug: "custom",
      label: "local",
      secret: "sk-testfixtureABCDEFGH",
      baseUrl: "http://127.0.0.1:8080/v1",
    });
    expect(parsed.baseUrl).toBe("http://127.0.0.1:8080/v1");
  });

  it("rejects custom URLs that embed credentials", () => {
    expect(() =>
      secretsSaveInputSchema.parse({
        providerSlug: "custom",
        label: "local",
        secret: "sk-testfixtureABCDEFGH",
        baseUrl: "https://user:KEY@127.0.0.1/v1",
      }),
    ).toThrow();
    expect(() =>
      secretsSaveInputSchema.parse({
        providerSlug: "custom",
        label: "local",
        secret: "sk-testfixtureABCDEFGH",
        baseUrl: "http://127.0.0.1:8080/v1?api_key=secret",
      }),
    ).toThrow();
  });
});

describe("secretsTestResultSchema", () => {
  it("never accepts a secret field", () => {
    expect(() =>
      secretsTestResultSchema.parse({
        ok: true,
        latencyMs: 12,
        errorCode: null,
        secret: "sk-testfixtureABCDEFGH",
      }),
    ).toThrow();
  });
});

describe("providerKeyDtoSchema", () => {
  const base = {
    id: "11111111-1111-4111-8111-111111111111",
    providerSlug: "openai",
    label: "work",
    last4: "stuv",
    status: "active" as const,
    endpointUrl: null,
    createdAt: "2026-09-15T00:00:00.000Z",
  };

  it("accepts a masked key", () => {
    expect(providerKeyDtoSchema.parse({ ...base, maskedKey: "sk-…stuv" }).maskedKey).toBe("sk-…stuv");
  });

  it("rejects a full secret posed as maskedKey", () => {
    expect(() =>
      providerKeyDtoSchema.parse({ ...base, maskedKey: "sk-abcdefghijklmnopqrstuv" }),
    ).toThrow();
  });
});
