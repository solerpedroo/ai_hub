import { describe, expect, it } from "vitest";
import {
  createMockOpenAIAdapter,
  MOCK_ASSISTANT_TEXT,
  MOCK_MERMAID_TEXT,
  MOCK_SKILL_REVIEW_TEXT,
} from "./mock-adapter";
import { GatewayError } from "./errors";
import type { ProviderAgnosticPacket } from "@ai-hub/shared";

const packet: ProviderAgnosticPacket = {
  version: 1,
  system: "",
  messages: [{ role: "user", content: "hi" }],
  tokenEstimate: 1,
  excluded: [],
};

describe("createMockOpenAIAdapter", () => {
  it("streams the fixture text without calling the network", async () => {
    const adapter = createMockOpenAIAdapter();
    const events: string[] = [];
    for await (const event of adapter.chatStream({
      secret: "sk-e2efixtureABCDEFGH",
      model: "gpt-4o-mini",
      packet,
      signal: new AbortController().signal,
    })) {
      if (event.type === "delta") {
        events.push(event.text);
      }
    }
    expect(events.join("")).toBe(MOCK_ASSISTANT_TEXT);
  });

  it("aborts before yielding when the signal is already aborted", async () => {
    const adapter = createMockOpenAIAdapter();
    const abort = new AbortController();
    abort.abort();
    await expect(async () => {
      for await (const _event of adapter.chatStream({
        secret: "sk-e2efixtureABCDEFGH",
        model: "gpt-4o-mini",
        packet,
        signal: abort.signal,
      })) {
        // drain
      }
    }).rejects.toBeInstanceOf(GatewayError);
  });

  it("aborts during the pause between deltas", async () => {
    const adapter = createMockOpenAIAdapter();
    const abort = new AbortController();
    const events: string[] = [];
    const consume = (async () => {
      for await (const event of adapter.chatStream({
        secret: "sk-e2efixtureABCDEFGH",
        model: "gpt-4o-mini",
        packet,
        signal: abort.signal,
      })) {
        if (event.type === "delta") {
          events.push(event.text);
          abort.abort();
        }
      }
    })();
    await expect(consume).rejects.toBeInstanceOf(GatewayError);
    expect(events.join("")).toBe("Hello");
  });

  it("streams a mermaid fence when asked to draw the architecture", async () => {
    const adapter = createMockOpenAIAdapter();
    const events: string[] = [];
    for await (const event of adapter.chatStream({
      secret: "sk-e2efixtureABCDEFGH",
      model: "gpt-4o-mini",
      packet: {
        ...packet,
        messages: [{ role: "user", content: "desenhe a arquitetura deste fluxo" }],
      },
      signal: new AbortController().signal,
    })) {
      if (event.type === "delta") {
        events.push(event.text);
      }
    }
    expect(events.join("")).toBe(MOCK_MERMAID_TEXT);
    expect(events.join("")).toContain("```mermaid");
  });

  it("streams a structured review when an applied skill is in the system", async () => {
    const adapter = createMockOpenAIAdapter();
    const events: string[] = [];
    for await (const event of adapter.chatStream({
      secret: "sk-e2efixtureABCDEFGH",
      model: "gpt-4o-mini",
      packet: {
        ...packet,
        system: "Applied skill: Code Review\nFollow Summary, Risks, Suggestions.",
        messages: [{ role: "user", content: "@skill:Code Review @file:diff" }],
      },
      signal: new AbortController().signal,
    })) {
      if (event.type === "delta") {
        events.push(event.text);
      }
    }
    expect(events.join("")).toBe(MOCK_SKILL_REVIEW_TEXT);
    expect(events.join("")).toContain("## Risks");
  });
});
