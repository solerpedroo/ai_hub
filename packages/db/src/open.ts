import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { SecretStore } from "@ai-hub/security";
import { applyMigrations } from "./migrate";
import { HubRepos } from "./repos";
import { schema } from "./schema";

export interface OpenHubDatabaseOptions {
  path: string;
  masterKey: Buffer;
  secretStore: SecretStore;
}

export interface HubDatabase {
  sqlite: Database.Database;
  repos: HubRepos;
  close: () => void;
}

export function openHubDatabase(options: OpenHubDatabaseOptions): HubDatabase {
  const sqlite = new Database(options.path);
  applyMigrations(sqlite);
  const db = drizzle(sqlite, { schema });
  const repos = new HubRepos(db, sqlite, options.masterKey, options.secretStore);
  return {
    sqlite,
    repos,
    close: () => sqlite.close(),
  };
}
