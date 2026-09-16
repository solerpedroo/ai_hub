import { randomBytes } from "node:crypto";

export const KEYTAR_SERVICE = "ai-hub";
export const DB_MASTER_KEY_ACCOUNT = "db-master-key";

export interface SecretStore {
  getPassword(account: string): Promise<string | null>;
  setPassword(account: string, password: string): Promise<void>;
  deletePassword(account: string): Promise<boolean>;
}

export class MemorySecretStore implements SecretStore {
  private readonly values = new Map<string, string>();

  async getPassword(account: string): Promise<string | null> {
    return this.values.get(account) ?? null;
  }

  async setPassword(account: string, password: string): Promise<void> {
    this.values.set(account, password);
  }

  async deletePassword(account: string): Promise<boolean> {
    return this.values.delete(account);
  }
}

export async function loadOrCreateMasterKey(store: SecretStore): Promise<Buffer> {
  const existing = await store.getPassword(DB_MASTER_KEY_ACCOUNT);
  if (existing) {
    const key = Buffer.from(existing, "base64");
    if (key.length !== 32) {
      throw new Error("Stored master key is not 32 bytes");
    }
    return key;
  }
  const key = randomBytes(32);
  await store.setPassword(DB_MASTER_KEY_ACCOUNT, key.toString("base64"));
  return key;
}

export function providerKeyAccount(keyId: string): string {
  return `provider-key:${keyId}`;
}
