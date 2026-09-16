import type Database from "better-sqlite3";
import { MIGRATIONS } from "./migrations";

export function applyMigrations(sqlite: Database.Database): void {
  sqlite.pragma("foreign_keys = ON");
  let current = Number(sqlite.pragma("user_version", { simple: true }));
  for (const migration of MIGRATIONS) {
    if (current >= migration.version) {
      continue;
    }
    sqlite.transaction(() => {
      sqlite.exec(migration.sql);
      sqlite.pragma(`user_version = ${migration.version}`);
    })();
    current = migration.version;
  }
}
