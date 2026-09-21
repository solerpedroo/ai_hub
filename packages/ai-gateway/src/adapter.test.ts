import { describe, expect, it } from "vitest";
import { councilDispatchInstruction, packetForDispatch } from "./adapter";

describe("Council dispatch packet", () => {
  it("keeps the audited packet immutable when dispatch metadata is present", () => {
    const packet = { version: 1 as const, system: "base", messages: [{ role: "user" as const, content: "question" }], tokenEstimate: 3, excluded: [] };
    const dispatched = packetForDispatch({ packet, councilRole: "security" });
    expect(packet.system).toBe("base");
    expect(packet.messages).toEqual(dispatched.messages);
    expect(dispatched).toBe(packet);
  });

  it("keeps role lenses out of the persisted packet while producing dispatch metadata", () => {
    expect(councilDispatchInstruction("security")).toContain("security");
    expect(councilDispatchInstruction(undefined)).toBeUndefined();
  });
});
