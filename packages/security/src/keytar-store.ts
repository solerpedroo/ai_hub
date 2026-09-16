import keytar from "keytar";
import { KEYTAR_SERVICE, type SecretStore } from "./secret-store";

export class KeytarSecretStore implements SecretStore {
  constructor(private readonly service: string = KEYTAR_SERVICE) {}

  async getPassword(account: string): Promise<string | null> {
    return keytar.getPassword(this.service, account);
  }

  async setPassword(account: string, password: string): Promise<void> {
    await keytar.setPassword(this.service, account, password);
  }

  async deletePassword(account: string): Promise<boolean> {
    return keytar.deletePassword(this.service, account);
  }
}
