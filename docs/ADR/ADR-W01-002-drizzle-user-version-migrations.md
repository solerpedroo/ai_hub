# ADR-W01-002-drizzle-user-version-migrations

- **Status:** accepted
- **Onda:** W01
- **Data:** 2026-09-15
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano pede Drizzle + migrations versionadas, sem `CREATE TABLE` ad hoc no fluxo da app.

## Decisão

- Schema Drizzle em `packages/db` alinhado ao SQL.
- Migrations: constante versionada em `packages/db/src/migrations.ts` (`MIGRATIONS` + `MIGRATION_0001_SQL`), aplicada por um migrator que usa `PRAGMA user_version` **dentro de uma transação**.
- Runtime: `better-sqlite3` no **main**. Native modules são dependências de `apps/desktop` e ficam externalizados no electron-vite.

Não gerar pasta `meta/` do drizzle-kit nesta onda (evita snapshot ruidoso). A fonte da verdade do DDL é o array `MIGRATIONS` em `packages/db/src/migrations.ts` — não uma pasta `migrations/*.sql`.

## Alternativas consideradas

- **drizzle-kit generate + journal:** padrão da casa, mais ficheiros agora.
- **CREATE TABLE no boot:** proibido pelo plano.
- **Ficheiros `.sql` soltos em `src/migrations/`:** electron-vite teria de copiar assets; a constante TS viaja com o bundle do main.

## Consequências

- Próximas ondas acrescentam `MIGRATION_0002_SQL` (ou o equivalente) ao array e incrementam `user_version`.
- `better-sqlite3` é nativo: `pnpm test` no pacote `db` restaura o ABI do Node se o binário estiver no ABI do Electron; `pnpm dev` recompila para o Electron (~5s). Não dá para servir os dois ABIs com um único binário hoisted.
- Rebuild nativo (`electron-rebuild`) continua necessário no Windows antes de abrir a janela.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 1)
- `docs/reviews/W01/REVIEW.md`
