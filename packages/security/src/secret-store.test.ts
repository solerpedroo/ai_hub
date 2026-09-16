import { describe, expect, it } from "vitest";
import { MemorySecretStore, loadOrCreateMasterKey, providerKeyAccount } from "./secret-store";

describe("MemorySecretStore", () => {
  it("creates a 32-byte master key once", async () => {
    const store = new MemorySecretStore();
    const first = await loadOrCreateMasterKey(store);
    const second = await loadOrCreateMasterKey(store);
    expect(first.length).toBe(32);
    expect(Buffer.compare(first, second)).toBe(0);
  });

  it("namespaces provider key accounts", () => {
    expect(providerKeyAccount("abc")).toBe("provider-key:abc");
  });
});
