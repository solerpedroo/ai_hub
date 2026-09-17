import { describe, expect, it } from "vitest";
import { compileActivePath, compilePacket } from "./compiler";

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
});
