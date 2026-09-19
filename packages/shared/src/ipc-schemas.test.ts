import { describe, expect, it } from "vitest";
import {
  appPrefsSchema,
  conversationExportDocumentSchema,
  debugSnapshotSchema,
  emptyIpcPayloadSchema,
  importReportSchema,
  importStartInputSchema,
  ipcAckResultSchema,
  messageCreateInputSchema,
  messageDtoSchema,
  messageUpdateInputSchema,
  packetPreviewInputSchema,
  packetPreviewResultSchema,
  packetsImportInputSchema,
  providerKeyDtoSchema,
  projectCreateInputSchema,
  projectDtoSchema,
  searchHitSchema,
  searchInputSchema,
  secretsSaveInputSchema,
  secretsTestResultSchema,
  windowIsMaximizedResultSchema,
  workspaceSessionSchema,
  filesIngestPathsInputSchema,
  filesRemoveInputSchema,
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
          tags: [],
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
        pinned: false,
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

describe("project and search contracts", () => {
  it("accepts a full project DTO and rejects credentials in color", () => {
    const parsed = projectDtoSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Alpha",
      color: "#2563eb",
      instructions: "Stay terse.",
      preferredModel: "gpt-4o-mini",
      preferredProvider: "openai",
      createdAt: "2026-09-17T00:00:00.000Z",
      updatedAt: "2026-09-17T00:00:00.000Z",
    });
    expect(parsed.instructions).toBe("Stay terse.");
    expect(() =>
      projectCreateInputSchema.parse({ name: "Alpha", color: "not-a-color" }),
    ).toThrow();
  });

  it("caps search query length", () => {
    expect(() => searchInputSchema.parse({ query: "a".repeat(201) })).toThrow();
    expect(searchInputSchema.parse({ query: "  needle  " }).query).toBe("needle");
  });

  it("rejects extra keys and overlong snippets on search hits", () => {
    const hit = {
      conversationId: "11111111-1111-4111-8111-111111111111",
      projectId: null,
      conversationTitle: "Kickoff",
      messageId: null,
      snippet: "needle",
    };
    expect(searchHitSchema.parse(hit).snippet).toBe("needle");
    expect(() => searchHitSchema.parse({ ...hit, apiKey: "sk-testfixtureABCDEFGH" })).toThrow();
    expect(() => searchHitSchema.parse({ ...hit, snippet: "x".repeat(401) })).toThrow();
  });
});

describe("import start payload", () => {
  it("rejects a filesystem path piggybacked on start", () => {
    expect(() =>
      importStartInputSchema.parse({
        ticket: "11111111-1111-4111-8111-111111111111",
        source: "chatgpt",
        projectId: null,
        path: "C:\\\\secrets\\\\export.json",
      }),
    ).toThrow();
  });

  it("rejects conversation titles and vendor ids on import reports", () => {
    expect(() =>
      importReportSchema.parse({
        ok: 0,
        skipped: 0,
        errors: [{ reason: "failed", title: "sk-live", externalId: "conv-1" }],
        attachmentsSkipped: 0,
        total: 1,
      }),
    ).toThrow();
    expect(
      importReportSchema.parse({
        ok: 0,
        skipped: 0,
        errors: [{ reason: "empty" }],
        attachmentsSkipped: 0,
        total: 1,
      }).errors,
    ).toEqual([{ reason: "empty" }]);
  });
});

describe("wave 7 contracts", () => {
  it("rejects secrets on a debug snapshot", () => {
    const snapshot = {
      at: "2026-09-17T00:00:00.000Z",
      provider: "openai",
      model: "gpt-4o-mini",
      retries: 1,
      lastErrorCode: "timeout" as const,
      tokenEstimate: 40,
      estimatedCostUsd: "0.000010",
      capDecision: "ok" as const,
      capScope: null,
      overflow: false,
    };
    expect(debugSnapshotSchema.parse(snapshot).provider).toBe("openai");
    expect(() => debugSnapshotSchema.parse({ ...snapshot, authorization: "Bearer sk-test" })).toThrow();
  });

  it("requires estimate and cap fields on packet preview", () => {
    const parsed = packetPreviewResultSchema.parse({
      tokenEstimate: 12,
      contextWindow: 128000,
      overflow: false,
      compacted: false,
      excludedCount: 0,
      estimatedCostUsd: "0.000001",
      capWarnings: ["request"],
      capBlocked: null,
      included: [{ kind: "message", id: null, label: "hello", tokens: 2 }],
      omitted: [],
      destinationModel: "gpt-4o-mini",
      destinationProvider: "openai",
      privacyMode: "standard",
      appliedPacketId: null,
    });
    expect(parsed.capWarnings).toEqual(["request"]);
    expect(parsed.included).toHaveLength(1);
    expect(() =>
      packetPreviewResultSchema.parse({
        tokenEstimate: 12,
        contextWindow: 128000,
        overflow: false,
        compacted: false,
        excludedCount: 0,
      }),
    ).toThrow();
    expect(() =>
      packetPreviewInputSchema.parse({
        conversationId: "11111111-1111-4111-8111-111111111111",
        model: "gpt-4o-mini",
        providerSlug: "openai",
        pendingContent: "Hello",
        maxTokens: 256,
        secret: "sk-testfixtureABCDEFGH",
      }),
    ).toThrow();
  });
});

describe("wave 10 packet contracts", () => {
  it("rejects a filesystem path on packet import", () => {
    expect(() =>
      packetsImportInputSchema.parse({
        ticket: "11111111-1111-4111-8111-111111111111",
        projectId: "22222222-2222-4222-8222-222222222222",
        path: "C:\\\\secrets\\\\packet.json",
      }),
    ).toThrow();
  });
});

describe("wave 8 contracts", () => {
  it("rejects extra keys on app prefs", () => {
    const prefs = {
      onboardingComplete: false,
      crashReporterOptIn: false,
      lastUpdateCheckAt: null,
      lastUpdateStatus: "idle" as const,
      lastWizardTtftMs: null,
    };
    expect(appPrefsSchema.parse(prefs).crashReporterOptIn).toBe(false);
    expect(() => appPrefsSchema.parse({ ...prefs, apiKey: "sk-test" })).toThrow();
  });
});

describe("wave 12 file contracts", () => {
  it("rejects extra keys on ingest paths and remove", () => {
    const ingest = {
      projectId: null,
      items: [{ path: "C:\\\\docs\\\\spec.pdf", name: "spec.pdf" }],
    };
    expect(filesIngestPathsInputSchema.parse(ingest).items).toHaveLength(1);
    expect(() => filesIngestPathsInputSchema.parse({ ...ingest, extra: true })).toThrow();
    const remove = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", projectId: null };
    expect(filesRemoveInputSchema.parse(remove).projectId).toBeNull();
    expect(() => filesRemoveInputSchema.parse({ ...remove, extra: true })).toThrow();
  });
});
