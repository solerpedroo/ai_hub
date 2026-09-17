# REVIEW — Wave 2 (W02)

- **Wave:** W02 — AI Gateway + crash-safe streaming + receipts + Compiler v0
- **Data:** 2026-09-16
- **Reviewer:** agent (síntese). Independentes: `wave-reviewer`, `trust-auditor`
- **Branch / HEAD:** `main` / `1359e85e143748e20e29fd67a9e868d100473e7e`
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Mensagem de teste OpenAI (key no Keychain) faz stream na UI de debug | pass (wired) | `chat-session.ts` + `home-view.tsx` debug strip; secret só via `getProviderSecret` no main; fixtures SSE sem rede |
| Abort persiste parcial | pass | Flush em `consumeCrashSafeStream`; abort durante SSE → `GatewayError("aborted")` (`sse.ts`); status `aborted` se `run.abort.signal.aborted` |
| Reabrir mostra `interrupted` | pass | `persistence.ts` → `interruptOrphanStreams`; teste em `repos.test.ts` |
| Receipt gravado | pass | Skeleton no create da assistant + upsert no complete/erro/crash; `error_code` na migration 0002 |
| Packet v0 inspecionável sem secrets | pass | Log `[hub:packet]` com `redactSecrets`; IPC/UI recebem `inspectablePacket` |

Sub-tasks: `ProviderAdapter` em `packages/ai-gateway/src/adapter.ts`; OpenAI `fetch`+SSE; compiler v0; receipts + catálogo `packages/shared/src/model-catalog.json`; taxonomia em `gateway.ts` + `mapStatus`; crash-safe 48/200 ms; Vitest fixtures.

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável (typecheck/lint/test; UAT live Keychain não corrido neste gate)
- [x] Sem feature de onda posterior (sem chat core, OpenRouter adapter, RAG/MCP/agents, UI W7)
- [x] Hooks: `error_code`, unique `message_id` em receipts; packet `version: 1`
- [x] D1/D10/D12 engines desta onda; continue no mesmo request = W3 (ADR-W02-003)

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs/`better-sqlite3`/keytar; catalog só em shared
- [x] IPC Zod `chat:send` / `chat:abort` / `chat:event` (preload + main)
- [x] Sem secret em SQLite/IPC/receipt/packet schema; Authorization só no fetch do main
- [x] Sem fallback silencioso (modelo desconhecido e provider ≠ openai falham)
- [x] `HubApi.chat` alinhado shared / preload / renderer
- [x] Migration 0002, sem `CREATE TABLE` ad hoc
- [x] i18n pt-BR + en
- [x] Abort / interrupted / crash-safe após o High fix
- [x] Spend caps N/A (W7 deve enforçar neste `chat:send`)

**Falhas**

- [x] Erros de stream: taxonomia no evento `error.code`; send pré-stream: i18n genérica
- [x] Empty conversation / sem chave: UI de debug
- [x] Windows-first; macOS não exercitado

**Testes**

- [x] Compiler, receipts, crash-safe, SSE abort/timeout, OpenAI fixtures (auth/quota/rate_limit/overflow/abort-during-body/redact 401), db orphan+receipt
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` ok após fixes (shared 14, security 8, db 9, gateway 19)
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W02-001..004 + índice

**Produto**

- [x] Debug strip ensina: nota → chave OpenAI → enviar / parar
- [x] Receipt/status em texto, não só cor

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `packages/ai-gateway/src/sse.ts`, `openai-adapter.ts`, `chat-session.ts` | Abort/timeout a meio do SSE viravam `unknown`/`interrupted` | **fixed** — cancel do reader + classificação abort vs timeout; catch do send usa `run.abort.signal.aborted`; testes SSE e abort-during-body |
| Medium | `packages/db/src/repos.ts` `interruptOrphanStreams` | Receipt de crash era stub nulo | **fixed** — skeleton provider/model no create; upsert; unique index `message_id`; interrupt preserva provider/model |
| Medium | `openai-adapter.test.ts` / sessão | Taxonomia incompleta; abort-during-SSE em falta | **fixed** — 429, overflow, 401 com secret, abort no body, SSE unit |
| Medium | `home-view.tsx` packet `<pre>` | Preview sem redaction | **fixed** — `inspectablePacket` no main antes do IPC (renderer não importa `@ai-hub/security`) |
| Medium | `crash-safe.ts` | Usage descartado no throw | **fixed** — `GatewayStreamError` transporta content + tokens parciais |
| Medium | `openai-adapter.ts` `mapStatus` | Corpo OpenAI 401 podia ecoar `sk-…` no `GatewayError` | **fixed** — `redactSecrets` na mensagem; fixture com secret no body |
| Low | `openai-adapter.ts` `testConnection` | Existe, sem IPC/UI | **accepted** — DoD é o stream; W8 wizard |
| Low | `App.tsx` `runId` | Trocar de conversa esconde Stop | **accepted** — W3 session restore |
| Low | `pt-BR.json` receipt | Template em inglês | **fixed** |
| Low | `message_receipts` sem unique | Risco de duplicar na W7 | **fixed** — unique index na 0002 |
| Low | `chat-session.ts` log packet | `console.info` incondicional; plaintext da conversa no stdout | **accepted** — DoD pede log de debug; redaction ligada |
| Low | `chat:abort` | Qualquer sender com `runId` | **accepted** — app single-window W2 |
| Out-of-wave | D10 continue / composer W3 | Notas com `parentId: null` | **out-of-wave** — ADR-W02-003 |
| Out-of-wave | OpenRouter / receipts UI / caps | Adapter só OpenAI; caps W7 neste send path | **out-of-wave** |

Nenhum Blocker em aberto. High e Medium do gate corrigidos.

## Correlações

- W3: reutiliza `chat:*`, statuses, flush, packet+receipt no DTO; precisa encadear `parentId` e Stop por conversa.
- W5: novo adapter no mesmo contrato; não esconder OpenRouter como `baseUrl`.
- W7: caps devem hard-stop `sendChat`; catálogo e `cost_usd` já existem; unique receipt por mensagem.
- W8: `testConnection` pronto para o wizard.
- W10: packet `version: 1` strict; bump, não fork.

## Riscos residuais

- App Electron com chave real no Credential Manager **não** foi exercitada neste gate (mesmo gap W00/W01).
- macOS Keychain não exercitado.
- Dev CSP `unsafe-eval` (ADR-W00-003).
- Redaction regex não cobre todos os formatos de chave colados na conversa.
- `DIFF-post-review.patch` vs HEAD nos ficheiros do gate (onda uncommitted; não é interdiff byte-a-byte do freeze).

## ADRs

- [ADR-W02-001-provider-adapter-fetch.md](../../ADR/ADR-W02-001-provider-adapter-fetch.md)
- [ADR-W02-002-compiler-packet-v0.md](../../ADR/ADR-W02-002-compiler-packet-v0.md)
- [ADR-W02-003-crash-safe-stream.md](../../ADR/ADR-W02-003-crash-safe-stream.md)
- [ADR-W02-004-gateway-errors-and-receipts.md](../../ADR/ADR-W02-004-gateway-errors-and-receipts.md)

## Patches

- [DIFF.patch](./DIFF.patch) — freeze do que foi revisado
- [DIFF-post-review.patch](./DIFF-post-review.patch) — correções High/Medium do gate
