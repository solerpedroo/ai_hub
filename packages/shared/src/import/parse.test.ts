import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseImportBytes } from "./parse";
import { IMPORT_ATTACHMENT_PLACEHOLDER } from "./types";
import { unzipUtf8Files } from "./zip";

function zipStore(name: string, text: string): Uint8Array {
  const payload = Buffer.from(text, "utf8");
  const compressed = deflateRawSync(payload);
  const nameBytes = Buffer.from(name, "utf8");
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(payload.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, nameBytes, compressed]);
}

const chatgptFixture = [
  {
    id: "conv-1",
    title: "Alpha thread",
    create_time: 1_700_000_000,
    update_time: 1_700_000_100,
    current_node: "n3",
    mapping: {
      n0: { id: "n0", parent: null, message: null },
      n1: {
        id: "n1",
        parent: "n0",
        message: {
          author: { role: "user" },
          create_time: 1_700_000_000,
          content: { content_type: "text", parts: ["Hello from ChatGPT"] },
        },
      },
      n2: {
        id: "n2",
        parent: "n1",
        message: {
          author: { role: "assistant" },
          create_time: 1_700_000_010,
          content: { content_type: "text", parts: ["Hi there"] },
        },
      },
      n3: {
        id: "n3",
        parent: "n2",
        message: {
          author: { role: "user" },
          create_time: 1_700_000_020,
          content: {
            content_type: "text",
            parts: ["See this", { content_type: "image_asset_pointer", asset_pointer: "file-1" }],
          },
        },
      },
    },
  },
];

const claudeFixture = [
  {
    uuid: "claude-1",
    name: "Claude thread",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:01:00.000Z",
    chat_messages: [
      {
        uuid: "m1",
        sender: "human",
        text: "Review this",
        created_at: "2024-01-01T00:00:00.000Z",
        attachments: [{ name: "spec.pdf" }],
      },
      {
        uuid: "m2",
        sender: "assistant",
        content: [
          { type: "thinking", thinking: "secret chain" },
          { type: "text", text: "Looks good" },
        ],
        created_at: "2024-01-01T00:00:30.000Z",
      },
    ],
  },
];

const geminiFixture = [
  {
    header: "Gemini",
    title: "What is TypeScript?",
    titleUrl: "https://gemini.google.com/app/abc123",
    time: "2024-06-01T12:00:00.000Z",
    products: ["Gemini Apps"],
    subtitles: [{ name: "A typed superset of JavaScript." }],
  },
  {
    header: "Gemini",
    title: "And Java?",
    titleUrl: "https://gemini.google.com/app/abc123",
    time: "2024-06-01T12:01:00.000Z",
    products: ["Gemini Apps"],
    subtitles: [{ name: "A different language." }],
  },
];

describe("vendor import parsers", () => {
  it("walks the ChatGPT active path and placeholders attachments", () => {
    const parsed = parseImportBytes("chatgpt", Buffer.from(JSON.stringify(chatgptFixture), "utf8"));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.externalId).toBe("conv-1");
    expect(parsed[0]?.messages.map((item) => item.role)).toEqual(["user", "assistant", "user"]);
    expect(parsed[0]?.messages[2]?.content).toContain(IMPORT_ATTACHMENT_PLACEHOLDER);
    expect(parsed[0]?.messages[2]?.skippedAttachment).toBe(true);
  });

  it("parses Claude chat_messages and skips thinking blocks", () => {
    const parsed = parseImportBytes("claude", Buffer.from(JSON.stringify(claudeFixture), "utf8"));
    expect(parsed[0]?.messages).toHaveLength(2);
    expect(parsed[0]?.messages[1]?.content).toBe("Looks good");
    expect(parsed[0]?.messages[0]?.content).toContain(IMPORT_ATTACHMENT_PLACEHOLDER);
  });

  it("groups Gemini activity rows by titleUrl", () => {
    const parsed = parseImportBytes("gemini", Buffer.from(JSON.stringify(geminiFixture), "utf8"));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.externalId).toBe("abc123");
    expect(parsed[0]?.messages).toHaveLength(4);
  });

  it("reads conversations.json from a deflated zip", () => {
    const archive = zipStore("conversations.json", JSON.stringify(chatgptFixture));
    expect(unzipUtf8Files(archive)[0]?.name).toBe("conversations.json");
    const parsed = parseImportBytes("chatgpt", archive);
    expect(parsed[0]?.title).toBe("Alpha thread");
  });

  it("rejects HTML takeout", () => {
    expect(() => parseImportBytes("gemini", Buffer.from("<!DOCTYPE html><html></html>", "utf8"))).toThrow(
      /HTML Takeout/,
    );
  });

  it("walks ChatGPT mapping without current_node by picking a leaf", () => {
    const parsed = parseImportBytes(
      "chatgpt",
      Buffer.from(
        JSON.stringify([
          {
            id: "conv-leaf",
            title: "No current node",
            mapping: {
              root: { id: "root", parent: null, message: null },
              leaf: {
                id: "leaf",
                parent: "root",
                message: {
                  author: { role: "user" },
                  create_time: 1_700_000_000,
                  content: { content_type: "text", parts: ["Fallback path"] },
                },
              },
            },
          },
        ]),
        "utf8",
      ),
    );
    expect(parsed[0]?.messages[0]?.content).toBe("Fallback path");
  });

  it("parses JSON with a UTF-8 BOM", () => {
    const json = JSON.stringify(chatgptFixture);
    const parsed = parseImportBytes("chatgpt", Buffer.from(`\uFEFF${json}`, "utf8"));
    expect(parsed[0]?.externalId).toBe("conv-1");
  });

  it("keeps only the ChatGPT current_node branch when siblings exist", () => {
    const parsed = parseImportBytes(
      "chatgpt",
      Buffer.from(
        JSON.stringify([
          {
            id: "branched",
            title: "Branched",
            current_node: "keep",
            mapping: {
              root: { id: "root", parent: null, message: null },
              user: {
                id: "user",
                parent: "root",
                message: {
                  author: { role: "user" },
                  create_time: 1_700_000_000,
                  content: { content_type: "text", parts: ["Choose"] },
                },
              },
              drop: {
                id: "drop",
                parent: "user",
                message: {
                  author: { role: "assistant" },
                  create_time: 1_700_000_001,
                  content: { content_type: "text", parts: ["Inactive sibling"] },
                },
              },
              keep: {
                id: "keep",
                parent: "user",
                message: {
                  author: { role: "assistant" },
                  create_time: 1_700_000_002,
                  content: { content_type: "text", parts: ["Active sibling"] },
                },
              },
            },
          },
        ]),
        "utf8",
      ),
    );
    expect(parsed[0]?.messages.map((item) => item.content)).toEqual(["Choose", "Active sibling"]);
  });

  it("parses a single Claude conversation object", () => {
    const parsed = parseImportBytes("claude", Buffer.from(JSON.stringify(claudeFixture[0]), "utf8"));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.externalId).toBe("claude-1");
  });
});
