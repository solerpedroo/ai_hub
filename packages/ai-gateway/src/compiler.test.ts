import { describe, expect, it } from "vitest";
import {
  appendMentionsToPacket,
  compileActivePath,
  compilePacket,
  compilePacketDetailed,
  mergePacketWithTail,
} from "./compiler";

describe("compilePacket", () => {
  it("joins project instructions and skips streaming messages", () => {
    const packet = compilePacket({
      projectInstructions: "Stay in Portuguese.",
      extraSystem: "Be brief.",
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: "hello",
          status: "complete",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          role: "assistant",
          content: "partial",
          status: "streaming",
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          role: "assistant",
          content: "hi",
          status: "interrupted",
        },
      ],
    });
    expect(packet.version).toBe(1);
    expect(packet.system).toBe("Stay in Portuguese.\n\nBe brief.");
    expect(packet.messages).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ]);
    expect(packet.excluded).toEqual(["22222222-2222-4222-8222-222222222222"]);
    expect(packet.tokenEstimate).toBe(
      Math.ceil((packet.system.length + "hello".length + "hi".length) / 4),
    );
  });

  it("injects attached files into the system packet and preview slices", () => {
    const detailed = compilePacketDetailed({
      projectInstructions: null,
      extraSystem: null,
      files: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          name: "spec.pdf",
          text: "Section 3: payments",
        },
      ],
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: "resuma a seção 3",
          status: "complete",
        },
      ],
    });
    expect(detailed.packet.system).toContain("Attached file: spec.pdf");
    expect(detailed.packet.system).toContain("Section 3: payments");
    const fileSlice = detailed.included.find((item) => item.kind === "file");
    expect(fileSlice?.label).toBe("Attached file: spec.pdf");
    expect(fileSlice?.label).not.toContain("payments");
  });

  it("appends conversation mentions without putting the body in the slice label", () => {
    const compiled = compilePacket({
      projectInstructions: null,
      extraSystem: null,
      privacyMode: "maximum",
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: "compare with the other thread",
          status: "complete",
        },
      ],
    });
    const withMentions = appendMentionsToPacket(compiled, [
      {
        kind: "conversation",
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        name: "Old thread",
        text: "user: we use PostgreSQL",
      },
    ]);
    expect(withMentions.packet.system).toContain("Mentioned conversation: Old thread");
    expect(withMentions.packet.system).toContain("PostgreSQL");
    expect(withMentions.included[0]?.label).toBe("Mentioned conversation: Old thread");
    expect(withMentions.included[0]?.label).not.toContain("PostgreSQL");
  });

  it("appends project memory and rag slices with filename-only labels", () => {
    const compiled = compilePacket({
      projectInstructions: null,
      extraSystem: null,
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: "qual banco?",
          status: "complete",
        },
      ],
    });
    const withContext = appendMentionsToPacket(compiled, [
      {
        kind: "memory",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "DB",
        text: "usamos PostgreSQL",
      },
      {
        kind: "rag",
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        name: "payments.pdf#c0",
        text: "Section 3 payments use PostgreSQL",
      },
    ]);
    expect(withContext.packet.system).toContain("Project memory: DB");
    expect(withContext.packet.system).toContain("Retrieved chunk: payments.pdf#c0");
    expect(withContext.included[0]?.label).toBe("Project memory: DB");
    expect(withContext.included[0]?.label).not.toContain("usamos");
    expect(withContext.included[1]?.label).not.toContain("Section 3");
  });

  it("appends a library prompt slice without putting the body in the label", () => {
    const compiled = compilePacket({
      projectInstructions: null,
      extraSystem: null,
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: "review this",
          status: "complete",
        },
      ],
    });
    const withPrompt = appendMentionsToPacket(compiled, [
      {
        kind: "prompt",
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        name: "Code review",
        text: "You are a senior code reviewer for E2E.",
      },
    ]);
    expect(withPrompt.packet.system).toContain("Library prompt: Code review");
    expect(withPrompt.included[0]?.label).toBe("Library prompt: Code review");
    expect(withPrompt.included[0]?.label).not.toContain("senior");
  });

  it("appends an applied skill slice without leaking the body into the label", () => {
    const compiled = compilePacket({
      projectInstructions: null,
      extraSystem: null,
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: "review this",
          status: "complete",
        },
      ],
    });
    const withSkill = appendMentionsToPacket(compiled, [
      {
        kind: "skill",
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        name: "Code Review",
        text: "You are a senior code reviewer for E2E.\n## Step 1: Summary\nSummarize.",
      },
    ]);
    expect(withSkill.packet.system).toContain("Applied skill: Code Review");
    expect(withSkill.included[0]?.kind).toBe("skill");
    expect(withSkill.included[0]?.label).toBe("Applied skill: Code Review");
    expect(withSkill.included[0]?.label).not.toContain("senior");
  });

  it("never puts an apiKey field on the packet", () => {
    const packet = compilePacket({
      projectInstructions: null,
      extraSystem: null,
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: "summarize this",
          status: "complete",
        },
      ],
    });
    expect(packet).not.toHaveProperty("apiKey");
    expect(JSON.stringify(packet)).not.toMatch(/sk-/);
  });

  it("compiles only the active path when siblings exist", () => {
    const packet = compileActivePath({
      projectInstructions: null,
      extraSystem: null,
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          parentId: null,
          isActiveBranch: true,
          createdAt: "2026-09-17T00:00:00.000Z",
          role: "user",
          content: "prompt",
          status: "complete",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          parentId: "11111111-1111-4111-8111-111111111111",
          isActiveBranch: false,
          createdAt: "2026-09-17T00:00:01.000Z",
          role: "assistant",
          content: "old",
          status: "complete",
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          parentId: "11111111-1111-4111-8111-111111111111",
          isActiveBranch: true,
          createdAt: "2026-09-17T00:00:02.000Z",
          role: "assistant",
          content: "new",
          status: "complete",
        },
      ],
    });
    expect(packet.messages).toEqual([
      { role: "user", content: "prompt" },
      { role: "assistant", content: "new" },
    ]);
    expect(packet.messages.some((item) => item.content === "old")).toBe(false);
  });

  it("always keeps project instructions when compacting old turns", () => {
    const oldUser = "x".repeat(40);
    const oldAssistant = "y".repeat(40);
    const recent = "fresh question";
    const packet = compilePacket({
      projectInstructions: "Stay in Portuguese.",
      extraSystem: null,
      maxTokenBudget: 20,
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: oldUser,
          status: "complete",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          role: "assistant",
          content: oldAssistant,
          status: "complete",
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          role: "user",
          content: recent,
          status: "complete",
        },
      ],
    });
    expect(packet.system).toBe("Stay in Portuguese.");
    expect(packet.messages.some((item) => item.content === recent)).toBe(true);
    expect(packet.excluded).toContain("11111111-1111-4111-8111-111111111111");
    expect(packet.tokenEstimate).toBeLessThanOrEqual(20);
  });

  it("recompiles the same path for a model switch without a user summary", () => {
    const messages = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        parentId: null,
        isActiveBranch: true,
        createdAt: "2026-09-17T00:00:00.000Z",
        role: "user" as const,
        content: "original prompt",
        status: "complete" as const,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        parentId: "11111111-1111-4111-8111-111111111111",
        isActiveBranch: true,
        createdAt: "2026-09-17T00:00:01.000Z",
        role: "assistant" as const,
        content: "original answer",
        status: "complete" as const,
      },
    ];
    const gpt = compileActivePath({
      projectInstructions: "Project voice.",
      extraSystem: null,
      messages,
    });
    const claude = compileActivePath({
      projectInstructions: "Project voice.",
      extraSystem: null,
      messages,
    });
    expect(gpt).toEqual(claude);
    expect(gpt.system).toBe("Project voice.");
    expect(gpt.messages.map((item) => item.content).join(" ")).not.toMatch(/summar/i);
  });

  it("summarizes inactive branches in system without adding them as turns", () => {
    const packet = compileActivePath({
      projectInstructions: null,
      extraSystem: null,
      privacyMode: "maximum",
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          parentId: null,
          isActiveBranch: true,
          createdAt: "2026-09-17T00:00:00.000Z",
          role: "user",
          content: "prompt",
          status: "complete",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          parentId: "11111111-1111-4111-8111-111111111111",
          isActiveBranch: false,
          createdAt: "2026-09-17T00:00:01.000Z",
          role: "assistant",
          content: "old",
          status: "complete",
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          parentId: "11111111-1111-4111-8111-111111111111",
          isActiveBranch: true,
          createdAt: "2026-09-17T00:00:02.000Z",
          role: "assistant",
          content: "new",
          status: "complete",
        },
      ],
    });
    expect(packet.messages.some((item) => item.content === "old")).toBe(false);
    expect(packet.system).toMatch(/Inactive branches/);
    expect(packet.system).toMatch(/old/);
  });

  it("keeps pinned turns when compacting old messages", () => {
    const pinned = "keep-me-pinned";
    const packet = compilePacket({
      projectInstructions: null,
      extraSystem: null,
      maxTokenBudget: 20,
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: pinned,
          status: "complete",
          pinned: true,
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          role: "assistant",
          content: "y".repeat(80),
          status: "complete",
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          role: "user",
          content: "fresh question",
          status: "complete",
        },
      ],
    });
    expect(packet.messages.some((item) => item.content === pinned)).toBe(true);
    expect(packet.excluded).toContain("22222222-2222-4222-8222-222222222222");
  });

  it("omits project instructions and inactive summaries in strict privacy", () => {
    const packet = compileActivePath({
      projectInstructions: "Secret project voice.",
      extraSystem: "Be terse.",
      privacyMode: "strict",
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          parentId: null,
          isActiveBranch: true,
          createdAt: "2026-09-17T00:00:00.000Z",
          role: "user",
          content: "prompt",
          status: "complete",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          parentId: "11111111-1111-4111-8111-111111111111",
          isActiveBranch: false,
          createdAt: "2026-09-17T00:00:01.000Z",
          role: "assistant",
          content: "old-secret-turn",
          status: "complete",
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          parentId: "11111111-1111-4111-8111-111111111111",
          isActiveBranch: true,
          createdAt: "2026-09-17T00:00:02.000Z",
          role: "assistant",
          content: "new",
          status: "complete",
        },
      ],
    });
    expect(packet.system).toBe("Be terse.");
    expect(packet.system).not.toMatch(/Secret project voice/);
    expect(packet.system).not.toMatch(/old-secret-turn/);
    expect(packet.messages.map((item) => item.content)).toEqual(["prompt", "new"]);
  });

  it("keeps private packets to the active conversation and omits attached files", () => {
    const packet = compilePacket({
      projectInstructions: "private project rule",
      extraSystem: null,
      privacyMode: "private",
      files: [{ id: "file-1", name: "secret.txt", text: "do not share" }],
      messages: [{ id: "m-1", role: "user", content: "only this", status: "complete" }],
    });
    expect(packet.system).not.toContain("private project rule");
    expect(packet.system).not.toContain("secret.txt");
    expect(packet.messages).toEqual([{ role: "user", content: "only this" }]);
  });

  it("merges an applied packet with only the active tail", () => {
    const payload = compilePacket({
      projectInstructions: "Voice.",
      extraSystem: null,
      messages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: "imported prompt",
          status: "complete",
        },
      ],
    });
    const merged = mergePacketWithTail(payload, [
      {
        id: "22222222-2222-4222-8222-222222222222",
        role: "assistant",
        content: "inactive sibling",
        status: "complete",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        role: "user",
        content: "next step",
        status: "complete",
      },
    ]).packet;
    expect(merged.system).toBe("Voice.");
    expect(merged.messages.map((item) => item.content)).toEqual([
      "imported prompt",
      "inactive sibling",
      "next step",
    ]);
  });
});
