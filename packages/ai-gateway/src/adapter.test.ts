import { describe, expect, it } from "vitest";
import { packetForDispatch } from "./adapter";

describe("Council dispatch packet", () => {
  it("keeps the audited packet immutable while applying a role only at dispatch", () => {
    const packet = { version: 1 as const, system: "base", messages: [{ role: "user" as const, content: "question" }], tokenEstimate: 3, excluded: [] };
    const dispatched = packetForDispatch({ packet, councilRole: "security" });
    expect(packet.system).toBe("base");
    expect(packet.messages).toEqual(dispatched.messages);
    expect(dispatched.system).toContain("Council role: security");
  });
});
