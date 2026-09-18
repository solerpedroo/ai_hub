import { describe, expect, it } from "vitest";
import { packetV0Schema } from "./gateway";
import { portablePacketFromCompile, portablePacketV1Schema } from "./portable-packet";

const payload = packetV0Schema.parse({
  version: 1,
  system: "Stay brief.",
  messages: [{ role: "user", content: "continue the task" }],
  tokenEstimate: 8,
  excluded: [],
});

describe("portable packet v1", () => {
  it("accepts a version-1 envelope wrapping packet v0", () => {
    const packet = portablePacketFromCompile({
      privacyMode: "standard",
      origin: { source: "compile", projectLabel: "Alpha", conversationLabel: "Kickoff" },
      included: [{ kind: "message", id: "11111111-1111-4111-8111-111111111111", label: "continue the task", tokens: 5 }],
      omitted: [],
      payload,
    });
    expect(packet.kind).toBe("aihub.packet");
    expect(packet.version).toBe(1);
    expect(packet.payload.version).toBe(1);
  });

  it("rejects API keys and extra envelope fields", () => {
    const valid = {
      kind: "aihub.packet" as const,
      version: 1 as const,
      privacyMode: "strict" as const,
      origin: { source: "import" as const, projectLabel: "B", conversationLabel: "Task" },
      included: [],
      omitted: [],
      payload,
    };
    expect(portablePacketV1Schema.parse(valid).privacyMode).toBe("strict");
    expect(() => portablePacketV1Schema.parse({ ...valid, apiKey: "sk-testfixtureABCDEFGH" })).toThrow();
    expect(() =>
      portablePacketV1Schema.parse({
        ...valid,
        payload: { ...payload, authorization: "Bearer sk-test" },
      }),
    ).toThrow();
    expect(() => portablePacketV1Schema.parse({ ...valid, version: 2 })).toThrow();
    expect(() => portablePacketV1Schema.parse({ ...valid, kind: "aihub.chat" })).toThrow();
  });
});
