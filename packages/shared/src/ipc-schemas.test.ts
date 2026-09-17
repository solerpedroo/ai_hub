import { describe, expect, it } from "vitest";
import {
  emptyIpcPayloadSchema,
  ipcAckResultSchema,
  messageCreateInputSchema,
  messageUpdateInputSchema,
  providerKeyDtoSchema,
  secretsSaveInputSchema,
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
});

describe("providerKeyDtoSchema", () => {
  const base = {
    id: "11111111-1111-4111-8111-111111111111",
    providerSlug: "openai",
    label: "work",
    last4: "stuv",
    status: "active" as const,
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
