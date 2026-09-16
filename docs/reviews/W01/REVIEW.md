# REVIEW — Wave 1 (W01)

- **Wave:** W01 — Trust boundary, DB, segurança
- **Data:** 2026-09-15
- **Reviewer:** agent (síntese). Independentes: `wave-reviewer`, `trust-auditor`, `security-review` (Cursor)
- **Branch / HEAD:** `main` / `6468f31bb54605ce4bb21d34cabf756324642243`
- **`security-review` / Bugbot Cursor:** `security-review` disparado no gate (onda toca keytar/IPC/envelope). Bugbot não pedido.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Criar projeto/conversa sobrevive a restart | pass | `persistence.ts` → `userData/ai-hub.sqlite`; UI create/list; teste `survives close and reopen on a file` em `packages/db/src/repos.test.ts` |
| Keys nunca em SQLite | pass | `provider_keys` sem coluna secret; teste `never writes API secrets into SQLite`; `listProviderKeys` não chama `getPassword` |
| Renderer não importa Node APIs | pass | grep renderer; `tsconfig.web` só `@` + shared; `sandbox` + `contextIsolation` + `nodeIntegration: false` |
| Schema aceita `parent_id` nulo e não-nulo | pass | SQL/Drizzle nullable; teste linear + ramo; Zod `parentId` nullable; ADR-W01-004 |

Sub-tasks do plano: schema com hooks (receipts, tags, caps, health, import_jobs, context_packets) em `packages/db/src/migrations.ts`; migrations `user_version` transacionadas; FTS5 criada e vazia; `@ai-hub/security` (envelope, redact, keytar); preload + Zod nos dois sentidos; repos C/R/D projeto e conversa + create/list mensagem; CSP da W00 mantida.

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável
- [x] Sem feature de onda posterior (sem chat/gateway/RAG/MCP/agents)
- [x] Hooks de schema W4/W7/W9/W10 presentes e não semi-implementados
- [x] Sem D* desta onda para implementar (D4 só modelo de dados)

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs/`better-sqlite3`/keytar
- [x] IPC com Zod (workspace + janela via `registerHandler` após review)
- [x] Sem secrets em log/UI persistente; save one-shot (ADR-W01-003)
- [x] Sem fallback de modelo (não há gateway)
- [x] `HubApi` alinhado shared / preload / renderer
- [x] Migration SQL, sem `CREATE TABLE` ad hoc no boot
- [x] i18n pt-BR + en nas strings novas
- [x] Streaming N/A
- [x] Spend caps N/A (tabela vazia; sem send path de chat)

**Falhas**

- [x] Erro de list/create mostra i18n, não dump de SDK
- [x] Empty state + erro de persistência visível após review
- [x] Windows Credential Manager via keytar; macOS não exercitado

**Testes**

- [x] Contratos: envelope, redact, IPC Zod (incl. máscara), repos (cipher, parent_id, no secret in SQLite, reopen ficheiro, FTS vazia)
- [x] Testes sem providers reais
- [x] Nenhum teste apagado
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` ok após fixes (shared 8, security 8, db 6)
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W01-001..004 + índice

**Produto**

- [x] Empty state ensina a criar projeto na sidebar
- [x] Vault mostra só máscara; campo password limpa após save

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| Medium | `packages/db/src/migrate.ts` | Migration 0001 sem transação | **fixed** — `sqlite.transaction` + `user_version` dentro |
| Medium | `packages/db/src/repos.ts` | Keytar e SQLite não atómicos no save/remove | **fixed** — save compensado com `deletePassword`; remove apaga a linha primeiro |
| Medium | `packages/db/src/repos.test.ts` | DoD de restart só em `:memory:` | **fixed** — reopen em ficheiro temporário |
| Medium | `docs/ADR/ADR-W01-002-*.md` | ADR apontava para pasta `migrations/` inexistente | **fixed** — fonte = `migrations.ts` + array `MIGRATIONS` |
| Medium | `docs/ADR/` | Grafo `parent_id`/`branch_id` sem ADR | **fixed** — `ADR-W01-004` |
| Medium | `apps/desktop/src/preload/index.ts` | `ZodError` no preload podia ecoar `secret` no DevTools | **fixed** — catch → `"Invalid request"` |
| Medium | `apps/desktop/src/renderer/.../home-view.tsx` | Falha de `projects.list` parecia empty state | **fixed** — `role="alert"` no empty |
| Medium | `packages/shared/src/ipc-schemas.ts` | `maskedKey` era `z.string()` livre | **fixed** — exige `…`, max 32; teste rejeita secret completo |
| Medium | `packages/db/src/schema.ts` vs `migrations.ts` | Drift possível (PK composto de `conversation_tags`) | **accepted** — DDL SQL é a fonte; Drizzle para queries W1 |
| Low | `packages/db/src/repos.ts` | CRUD sem Update / delete de mensagem | **accepted** — W3/W4 |
| Low | `home-view.tsx` / `App.tsx` | Composer encadeava `parentId` e rotulava tudo como ramo | **fixed** — W1 grava `parentId: null` (ADR-W01-004) |
| Low | `repos.ts` `listProviderKeys` | Máscara hardcoded `sk-…` para todos os slugs | **accepted** — cosmético; save usa `maskSecret` |
| Low | `redact.ts` | Sem padrões `AIza` / `gsk_` | **accepted** — W2 adapters |
| Low | `eslint.config.js` | Sem `no-restricted-imports` no renderer | **accepted** |
| Low | `apps/desktop/src/main/ipc.ts` | Window IPC fora do helper | **fixed** — `registerHandler` |
| Low | `persistence.ts` | SQLite sem `close` no quit | **accepted** |
| Low | `messages:create` aceita `assistant`/`system` | Proveniência local | **accepted** — hook W2 (security-review L4) |
| Out-of-wave | `is_active_branch` sempre 1 | Hook W4 | **out-of-wave** |
| Out-of-wave | `messages_fts` plaintext vazio | Hook W6; ADR-W01-001 | **out-of-wave** |
| Out-of-wave | Secret no IPC `secrets:save` | ADR-W01-003 | **out-of-wave** |

Nenhum Blocker ou High. `security-review` não reportou Medium exploitável.

## Correlações

- W2: `messages.status` já inclui `streaming \| interrupted \| complete \| aborted`; `message_receipts` existe; conteúdo em envelope.
- W4 / D4: grafo travado em ADR-W01-004; `listMessages` ainda devolve todos os ramos.
- W5: seed OpenRouter + `secrets:*` — o vault reutiliza o canal, não inventa outro.
- W6: FTS5 vazia; popular sem plaintext no disco é decisão dessa onda (ADR-W01-001).
- W7: `spend_caps` / `health_samples` nascem vazias (podem precisar de colunas extra).
- W9 / W10: `import_jobs`, `context_packets.payload_cipher`.
- Native ABI: um binário hoisted de `better-sqlite3` (ADR-W01-002).

## Riscos residuais

- App Electron não foi reaberta neste gate (typecheck/lint/test + bundle W1 anterior).
- macOS Keychain não exercitado.
- Dev CSP `unsafe-eval` (ADR-W00-003).
- `last4` e `keytar_account` são legíveis no `.sqlite` (não são o secret).
- FTS5 em claro continua uma landmine se W6 escrever sem review.
- `DIFF-post-review.patch` vs HEAD nos ficheiros tocados no review (onda ainda uncommitted; não é interdiff puro do freeze).

## ADRs

- [ADR-W01-001-envelope-encryption-at-rest.md](../../ADR/ADR-W01-001-envelope-encryption-at-rest.md)
- [ADR-W01-002-drizzle-user-version-migrations.md](../../ADR/ADR-W01-002-drizzle-user-version-migrations.md)
- [ADR-W01-003-keytar-and-ipc-secrets.md](../../ADR/ADR-W01-003-keytar-and-ipc-secrets.md)
- [ADR-W01-004-message-graph-parent-branch.md](../../ADR/ADR-W01-004-message-graph-parent-branch.md)

## Patches

- [DIFF.patch](./DIFF.patch) — freeze do que foi revisado
- [DIFF-post-review.patch](./DIFF-post-review.patch) — correções Medium/Low do gate
