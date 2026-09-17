import { describe, expect, it } from "vitest";
import {
  activePath,
  ancestorsOf,
  childrenOf,
  siblingsOf,
  selectExportMessages,
  upsertActivated,
  type MessageGraphNode,
} from "./message-graph";

function node(
  id: string,
  parentId: string | null,
  isActiveBranch: boolean,
  createdAt: string,
): MessageGraphNode {
  return { id, parentId, isActiveBranch, createdAt };
}

describe("message graph", () => {
  it("walks the active path across three assistant siblings", () => {
    const user = node("u", null, true, "2026-09-17T00:00:00.000Z");
    const a1 = node("a1", "u", false, "2026-09-17T00:00:01.000Z");
    const a2 = node("a2", "u", false, "2026-09-17T00:00:02.000Z");
    const a3 = node("a3", "u", true, "2026-09-17T00:00:03.000Z");
    const messages = [user, a1, a2, a3];
    expect(activePath(messages).map((item) => item.id)).toEqual(["u", "a3"]);
    expect(siblingsOf(messages, "a2").map((item) => item.id)).toEqual(["a1", "a2", "a3"]);
    expect(childrenOf(messages, "u")).toHaveLength(3);
  });

  it("keeps the inactive sibling after switching back", () => {
    const user = node("u", null, true, "2026-09-17T00:00:00.000Z");
    const a1 = node("a1", "u", false, "2026-09-17T00:00:01.000Z");
    const a2 = node("a2", "u", true, "2026-09-17T00:00:02.000Z");
    const switched = upsertActivated([user, a1, a2], a1);
    expect(activePath(switched).map((item) => item.id)).toEqual(["u", "a1"]);
    expect(switched.find((item) => item.id === "a2")?.isActiveBranch).toBe(false);
    expect(switched).toHaveLength(3);
  });

  it("returns ancestors from the node up to the root", () => {
    const root = node("u", null, true, "2026-09-17T00:00:00.000Z");
    const mid = node("a", "u", true, "2026-09-17T00:00:01.000Z");
    const leaf = node("u2", "a", true, "2026-09-17T00:00:02.000Z");
    expect(ancestorsOf([root, mid, leaf], "u2").map((item) => item.id)).toEqual(["u2", "a", "u"]);
  });

  it("exports only the active path or the full tree", () => {
    const user = node("u", null, true, "2026-09-17T00:00:00.000Z");
    const a1 = node("a1", "u", false, "2026-09-17T00:00:01.000Z");
    const a2 = node("a2", "u", true, "2026-09-17T00:00:02.000Z");
    const messages = [user, a1, a2];
    expect(selectExportMessages("active", messages).map((item) => item.id)).toEqual(["u", "a2"]);
    expect(selectExportMessages("tree", messages).map((item) => item.id)).toEqual(["u", "a1", "a2"]);
  });
});
