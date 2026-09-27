import { describe, expect, it } from "vitest";
import { syncConfigureInputSchema, syncSnapshotSchema } from "./sync";

const categories = { projects: true, conversations: true, settings: false, packets: false, skills: false };
const timestamp = "2026-09-27T12:00:00.000Z";

describe("sync contracts", () => {
  it("requires a sufficiently long pairing phrase and exact categories", () => {
    expect(() => syncConfigureInputSchema.parse({ enabled: true, categories, pairingPhrase: "too-short" })).toThrow();
    expect(syncConfigureInputSchema.parse({ enabled: true, categories, pairingPhrase: "a pairing phrase with sixteen characters" })).toEqual({ enabled: true, categories, pairingPhrase: "a pairing phrase with sixteen characters" });
  });

  it("rejects relay data that is not a complete, bounded snapshot", () => {
    const snapshot = {
      version: 1,
      generatedAt: timestamp,
      projects: [],
      conversations: [],
      messages: [],
      packets: [],
      skills: [],
    };
    expect(syncSnapshotSchema.parse(snapshot)).toEqual(snapshot);
    expect(() => syncSnapshotSchema.parse({ ...snapshot, providerKeys: [] })).toThrow();
    expect(() => syncSnapshotSchema.parse({ ...snapshot, generatedAt: "not-a-date" })).toThrow();
  });
});
