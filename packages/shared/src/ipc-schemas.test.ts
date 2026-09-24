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
  memoryCreateInputSchema,
  promptCreateInputSchema,
  playgroundRunInputSchema,
  artifactDtoSchema,
  artifactExportInputSchema,
  skillCreateInputSchema,
  skillDtoSchema,
  conversationWorkspaceDtoSchema,
  toolReadRequestInputSchema,
  toolReadRequestResultSchema,
  agentPrepareInputSchema,
  agentRunDetailSchema,
  agentIdInputSchema,
  orchestrationPrepareInputSchema,
  researchPrepareInputSchema,
  notesCreateFromMessageInputSchema,
  workspaceTasksFromMessageInputSchema,
  agentNodeDtoSchema,
  developerDiffInputSchema,
  developerReviewInputSchema,
  developerTerminalInputSchema,
  localProviderStatusSchema,
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

describe("developer tool IPC contracts", () => {
  const projectId = "11111111-1111-4111-8111-111111111111";

  it("only accepts the fixed diagnostic command allowlist", () => {
    expect(developerTerminalInputSchema.parse({ projectId, command: "git-status" })).toEqual({ projectId, command: "git-status" });
    expect(() => developerTerminalInputSchema.parse({ projectId, command: "cmd.exe" })).toThrow();
  });

  it("defaults the review intent and rejects extra transport fields", () => {
    expect(developerReviewInputSchema.parse({ projectId, conversationId: "22222222-2222-4222-8222-222222222222", providerKeyId: "33333333-3333-4333-8333-333333333333", model: "test-model" }).intent).toBe("code_review");
    expect(() => developerDiffInputSchema.parse({ projectId, shell: true })).toThrow();
  });
});

describe("local provider IPC contract", () => {
  it("returns only bounded model identities and offline capability", () => {
    expect(localProviderStatusSchema.parse({ available: true, models: [{ id: "llama3.2:latest", label: "llama3.2:latest" }], pdfRagAvailable: true }).models[0]?.id).toBe("llama3.2:latest");
    expect(() => localProviderStatusSchema.parse({ available: true, models: [], pdfRagAvailable: true, secret: "not allowed" })).toThrow();
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
      kind: "conversation" as const,
      conversationId: "11111111-1111-4111-8111-111111111111",
      projectId: null,
      conversationTitle: "Kickoff",
      messageId: null,
      noteId: null,
      taskId: null,
      snippet: "needle",
    };
    expect(searchHitSchema.parse(hit).snippet).toBe("needle");
    expect(() => searchHitSchema.parse({ ...hit, kind: undefined })).toThrow();
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
      privacyMode: "normal",
      firewallPolicy: {
        secret: "mask",
        token: "mask",
        email: "mask",
        cpf: "mask",
        prompt_injection: "block",
      },
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

describe("wave 14 memory and workspace contracts", () => {
  it("accepts a memory create and rejects extra keys", () => {
    const input = {
      projectId: "11111111-1111-4111-8111-111111111111",
      title: "DB",
      body: "usamos PostgreSQL",
      source: "manual" as const,
    };
    expect(memoryCreateInputSchema.parse(input).body).toBe("usamos PostgreSQL");
    expect(() => memoryCreateInputSchema.parse({ ...input, extra: true })).toThrow();
  });

  it("accepts a workspace dto and rejects extra keys", () => {
    const dto = {
      conversationId: "11111111-1111-4111-8111-111111111111",
      summary: "User: qual banco?",
      decisions: ["usamos PostgreSQL"],
      tasks: [],
      pins: [],
    };
    expect(conversationWorkspaceDtoSchema.parse(dto).decisions).toHaveLength(1);
    expect(() => conversationWorkspaceDtoSchema.parse({ ...dto, extra: true })).toThrow();
  });
});

describe("wave 15 prompt and playground contracts", () => {
  it("accepts a prompt create and a two-slot playground run", () => {
    const created = promptCreateInputSchema.parse({
      folder: "development",
      title: "Code review",
      body: "Review {{project}} in {{language}}. Goal: {{goal}}.",
    });
    expect(created.folder).toBe("development");
    expect(() => promptCreateInputSchema.parse({ ...created, extra: true })).toThrow();
    const run = playgroundRunInputSchema.parse({
      projectId: "11111111-1111-4111-8111-111111111111",
      content: "review this function",
      slots: [
        { providerKeyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", model: "gpt-4o-mini" },
        { providerKeyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", model: "claude-sonnet-4-20250514" },
      ],
    });
    expect(run.slots).toHaveLength(2);
    expect(() => playgroundRunInputSchema.parse({ ...run, slots: run.slots.slice(0, 1) })).toThrow();
  });
});

describe("wave 16 artifact contracts", () => {
  it("accepts a mermaid artifact dto and rejects extra keys", () => {
    const dto = {
      id: "11111111-1111-4111-8111-111111111111",
      conversationId: "22222222-2222-4222-8222-222222222222",
      familyId: "33333333-3333-4333-8333-333333333333",
      sourceMessageId: "44444444-4444-4444-8444-444444444444",
      kind: "mermaid",
      title: "Mermaid",
      body: "flowchart LR\n  A --> B",
      language: null,
      version: 1,
      pinned: false,
      createdAt: "2026-09-19T00:00:00.000Z",
    };
    expect(artifactDtoSchema.parse(dto).kind).toBe("mermaid");
    expect(() => artifactDtoSchema.parse({ ...dto, extra: true })).toThrow();
    expect(() =>
      artifactExportInputSchema.parse({
        id: dto.id,
        format: "svg",
        extra: true,
      }),
    ).toThrow();
  });
});

describe("wave 17/22 skill contracts", () => {
  it("keeps v1 DTOs readable and permits only allowlisted tools on create", () => {
    const dto = {
      id: "11111111-1111-4111-8111-111111111111",
      folder: "development",
      title: "Code Review",
      description: "Review a diff",
      prompt: "Review {{project}}",
      preferredModel: null,
      defaultMentions: [],
      steps: [{ id: "summary", title: "Summary", section: "Summarize." }],
      factoryId: "code-review",
      contractVersion: 1,
      createdAt: "2026-09-19T00:00:00.000Z",
      updatedAt: "2026-09-19T00:00:00.000Z",
    };
    expect(skillDtoSchema.parse(dto).title).toBe("Code Review");
    expect(() => skillDtoSchema.parse({ ...dto, extra: true })).toThrow();
    expect(
      skillCreateInputSchema.parse({
        folder: "development",
        title: "Custom",
        description: "A custom skill",
        prompt: "Do the work",
        preferredModel: null,
        defaultMentions: [{ type: "file", query: "diff" }],
        steps: [{ id: "one", title: "One", section: "First section." }],
      }).steps,
    ).toHaveLength(1);
    expect(() => skillCreateInputSchema.parse({ folder: "development", title: "Custom", description: "A custom skill", prompt: "Do the work", preferredModel: null, defaultMentions: [], steps: [], allowedTools: [{ toolId: "shell", operation: "read" }] })).toThrow();
  });
});

describe("wave 22 tool IPC contracts", () => {
  it("accepts only a bounded relative project path and a redacted completed activity", () => {
    const input = {
      projectId: "11111111-1111-4111-8111-111111111111",
      relativePath: "docs/README.md",
    };
    expect(toolReadRequestInputSchema.parse(input)).toEqual(input);
    expect(() => toolReadRequestInputSchema.parse({ ...input, extra: "secret" })).toThrow();
    expect(
      toolReadRequestResultSchema.parse({
        kind: "completed",
        content: "safe output",
        activity: {
          id: "22222222-2222-4222-8222-222222222222",
          projectId: input.projectId,
          toolId: "project-filesystem.read-file",
          operation: "read",
          effect: "read",
          status: "completed",
          argsSummary: "path: docs/README.md",
          resultSummary: "README.md",
          createdAt: "2026-09-21T00:00:00.000Z",
        },
      }).kind,
    ).toBe("completed");
  });
});

describe("wave 23 agent IPC contracts", () => {
  const input = {
    projectId: "11111111-1111-4111-8111-111111111111",
    conversationId: "22222222-2222-4222-8222-222222222222",
    providerKeyId: "33333333-3333-4333-8333-333333333333",
    model: "gpt-4o-mini",
    goal: "Analyze the project.",
    relativePaths: ["README.md", "src/app.ts", "package.json"],
    maxSteps: 6,
    budgetUsd: "1.000000",
    timeoutSeconds: 300,
  };

  it("accepts only a bounded explicit plan before a run starts", () => {
    expect(agentPrepareInputSchema.parse(input).relativePaths).toHaveLength(3);
    expect(() => agentPrepareInputSchema.parse({ ...input, relativePaths: ["../secrets.txt"] })).toThrow();
    expect(() => agentPrepareInputSchema.parse({ ...input, relativePaths: ["C:\\\\secrets.txt"] })).toThrow();
    expect(() => agentPrepareInputSchema.parse({ ...input, maxSteps: 5 })).toThrow();
    expect(() => agentPrepareInputSchema.parse({ ...input, extra: "nope" })).toThrow();
  });

  it("never exposes encrypted step detail through the renderer DTO", () => {
    const dto = {
      id: "44444444-4444-4444-8444-444444444444",
      projectId: input.projectId,
      conversationId: input.conversationId,
      parentRunId: null,
      kind: "single",
      status: "awaiting_confirmation",
      provider: "openai",
      model: input.model,
      goalSummary: input.goal,
      planSummary: "Read the selected files.",
      maxSteps: 6,
      budgetUsd: "1.000000",
      timeoutSeconds: 300,
      reportArtifactId: null,
      createdAt: "2026-09-22T00:00:00.000Z",
      startedAt: null,
      finishedAt: null,
      steps: [],
    };
    expect(agentRunDetailSchema.parse(dto).steps).toEqual([]);
    expect(() => agentRunDetailSchema.parse({ ...dto, providerKeyId: input.providerKeyId })).toThrow();
  });

  it("binds every run control command to its project and conversation", () => {
    const control = {
      id: "44444444-4444-4444-8444-444444444444",
      projectId: input.projectId,
      conversationId: input.conversationId,
    };
    expect(agentIdInputSchema.parse(control)).toEqual(control);
    expect(() => agentIdInputSchema.parse({ id: control.id })).toThrow();
    expect(() => agentIdInputSchema.parse({ ...control, extra: true })).toThrow();
  });
});

describe("wave 24 orchestration IPC contracts", () => {
  it("limits the factory graph to the shared two-node parallelism", () => {
    const input = {
      projectId: "11111111-1111-4111-8111-111111111111",
      conversationId: "22222222-2222-4222-8222-222222222222",
      providerKeyId: "33333333-3333-4333-8333-333333333333",
      model: "gpt-4o-mini", goal: "Analyze the project", relativePaths: ["README.md"], maxSteps: 4,
      budgetUsd: "1.000000", timeoutSeconds: 300, parallelism: 2, budgetMode: "shared" as const,
    };
    expect(orchestrationPrepareInputSchema.parse(input).parallelism).toBe(2);
    expect(() => orchestrationPrepareInputSchema.parse({ ...input, parallelism: 3 })).toThrow();
    expect(() => orchestrationPrepareInputSchema.parse({ ...input, budgetMode: "per_node" })).toThrow();
  });

  it("keeps model selection explicit in every rendered node", () => {
    const node = {
      id: "44444444-4444-4444-8444-444444444444", projectId: "11111111-1111-4111-8111-111111111111", conversationId: "22222222-2222-4222-8222-222222222222", parentRunId: "55555555-5555-4555-8555-555555555555", kind: "orchestrated" as const, role: "explorer" as const, effort: "medium" as const, isModelOverride: false,
      status: "awaiting_confirmation" as const, provider: "openai", model: "gpt-4o-mini", goalSummary: "Analyze", planSummary: "Map", maxSteps: 4, budgetUsd: "0.400000", timeoutSeconds: 300, reportArtifactId: null, createdAt: "2026-09-22T00:00:00.000Z", startedAt: null, finishedAt: null, tokensIn: 0, tokensOut: 0, costUsd: "0.000000",
    };
    expect(agentNodeDtoSchema.parse(node).isModelOverride).toBe(false);
    expect(() => agentNodeDtoSchema.parse({ ...node, providerKeyId: "33333333-3333-4333-8333-333333333333" })).toThrow();
  });
});

describe("wave 27 notes tasks research contracts", () => {
  it("accepts research prepare without relativePaths", () => {
    const input = {
      projectId: "11111111-1111-4111-8111-111111111111",
      conversationId: "22222222-2222-4222-8222-222222222222",
      providerKeyId: "33333333-3333-4333-8333-333333333333",
      model: "gpt-4o-mini",
      goal: "Research JWT auth",
      budgetUsd: "1.000000",
      timeoutSeconds: 300,
    };
    expect(researchPrepareInputSchema.parse(input).goal).toBe("Research JWT auth");
    expect(() => researchPrepareInputSchema.parse({ ...input, relativePaths: ["a.md"] })).toThrow();
  });

  it("accepts note and task search hits", () => {
    expect(
      searchHitSchema.parse({
        kind: "note",
        conversationId: null,
        projectId: "11111111-1111-4111-8111-111111111111",
        conversationTitle: "JWT plan",
        messageId: null,
        noteId: "66666666-6666-4666-8666-666666666666",
        taskId: null,
        snippet: "Login endpoint",
      }).kind,
    ).toBe("note");
    expect(
      searchHitSchema.parse({
        kind: "task",
        conversationId: "22222222-2222-4222-8222-222222222222",
        projectId: "11111111-1111-4111-8111-111111111111",
        conversationTitle: "Create User model",
        messageId: null,
        noteId: null,
        taskId: "77777777-7777-4777-8777-777777777777",
        snippet: "Create User model",
      }).kind,
    ).toBe("task");
  });

  it("validates notes-from-message and tasks-from-message inputs", () => {
    expect(
      notesCreateFromMessageInputSchema.parse({
        projectId: "11111111-1111-4111-8111-111111111111",
        messageId: "88888888-8888-4888-8888-888888888888",
        tags: ["auth"],
      }).tags,
    ).toEqual(["auth"]);
    expect(
      workspaceTasksFromMessageInputSchema.parse({
        conversationId: "22222222-2222-4222-8222-222222222222",
        messageId: "88888888-8888-4888-8888-888888888888",
      }).messageId,
    ).toBe("88888888-8888-4888-8888-888888888888");
  });
});
