# REVIEW — Wave 7 (W07)

- **Wave:** W07 — Receipts UI + spend caps + provider health
- **Data:** 2026-09-17
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](a94c867a-1ce8-416f-8f99-a48cde3fe2ad), [trust-auditor](025c00c8-c148-4f8e-9074-c0df0fa6c52d)
- **Branch / HEAD (freeze):** `main` / `35e568b752e8fb31a60fc15e9bb0d80fbd0062a6` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Receipt visível em toda assistant message (modelo, tokens, ms, custo) | pass | `message-bubble.tsx`; linha com provider/model/tokens/latência/custo/`createdAt` |
| Detalhe do receipt (modal) sem secrets | pass | dialog `receipt-dialog`; e2e abre/fecha; snapshot debug sem headers |
| Agregado de custo na conversa e no projeto (header) | pass | `sumReceiptCostUsd` em micros; headers em `home-view.tsx` |
| Spend caps: request / dia / global | pass | `spend-caps.ts` + `spend-guard.ts`; UI Settings; unique `spend_caps.scope` (0005) |
| Aviso 80% / hard-stop 100%; allow-once com log local | pass | warn/block; `allowOnce` + audit em settings JSON; e2e cap 0 + allow-once |
| Estimativa pré-envio quando há preço no catálogo | pass | preview + `pendingContent`/`maxTokens`; composer |
| Status bar: health por provider (latência, erros, último status) | pass (pós-review) | `status.health.item` + `errorRate` em texto |
| Retry com backoff; timeout; rate limit UX | pass | `withTransientRetry` timeout/rate_limit/network, pré-delta, 400ms×3^n |
| Fallback explícito (nunca silencioso); sugestão usa health | pass | `suggestFallbackProvider`; dialog; main não troca adapter |
| Tela Debug (meta, retries, sem auth) | pass | snapshot in-memory; e2e `debug-snapshot` |
| Tratamento: modelo inexistente, overflow, quota, offline | pass | taxonomia `GatewayError` + i18n; abort não conta health |
| DoD: rede off / key inválida → UX clara; cap bloqueia; receipt bate provider; health reflete falha; fallback pede confirmação | pass (código) / residual UAT real | e2e mock (cap + receipt + debug); adapters mapeiam auth/network/quota; UAT com chaves reais não corrido |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código (não só TODO)
- [x] DoD demonstrável: typecheck desktop; lint desktop/shared/db/gateway; shared 48; db 19; gateway 37; e2e 9/9
- [x] Sem feature de onda posterior (sem RAG/MCP/agents/onboarding/installer)
- [x] Caps projeto/provider ficam W18 (D7 núcleo request/day/global nesta onda)
- [x] D7 núcleo, D11, D12 UI implementados

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs/`better-sqlite3`; keys só máscara
- [x] IPC Zod: `spendCaps:*`, `health:list`, `costs:summary`, `debug:getLatest`, preview extra `pendingContent`/`maxTokens`
- [x] Debug snapshot sem Authorization/headers/packet/keys (ADR-W07-004)
- [x] Sem fallback silencioso; main nunca troca adapter (ADR-W07-003)
- [x] HubApi alinhado shared / preload / renderer
- [x] Migration 0005 unique `spend_caps.scope`; `user_version` 5
- [x] i18n pt-BR + en (caps, health, fallback, receipt, debug)
- [x] Abort / crash-safe intactos; abort não grava health de falha (ADR-W07-002)
- [x] Caps hard-stopam `chat:send` (palette/regenerate/compact passam por `sendToModel`)

**Falhas**

- [x] Cap 0 bloqueia persistência; composer permanece; allow-once envia
- [x] Auth/network/quota/unknown model → erro i18n, não hang
- [x] Windows-first; macOS não exercitado

**Testes**

- [x] spend-caps (missing=unlimited, `"0"` bloqueia); health window; retry só transiente pré-delta; soma micros; e2e cap 0 + allow-once + receipt/debug
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] typecheck + lint + test após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W07-001..005 + índice

**Produto**

- [x] Cap/health/receipt em texto, não só cor
- [x] Empty/settings ensinam caps; fallback dialog com estimativa do modelo sugerido (pós-review)

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `status-bar.tsx` | D11: `errorRate` calculado e não mostrado | **fixed** — `status.health.errors` com % |
| High | `packet-preview.ts` / `ipc-schemas.ts` / `App.tsx` | Preview “deste envio” omitia draft do composer e `maxTokens` | **fixed** — `pendingContent` sintético + `maxTokens` no estimate |
| Medium | `repos.ts` `sumReceiptCostUsd` | Soma SQL REAL distorce micros em TEXT | **fixed** — parse micros em JS |
| Medium | `retry.ts` | Loop transiente sem teste do retry | **fixed** — `retry.test.ts` com `delayMs: 0` |
| Medium | `message-bubble.tsx` | D12 data só no modal | **fixed** — `createdAt` na linha + modal |
| Medium | `App.tsx` fallback | Dialog sem estimativa do modelo sugerido | **fixed** — `fallbackPreview` + `fallback.estimate` |
| Medium | `e2e/send.spec.ts` | Cap 0 sem allow-once | **fixed** — clique `cap-allow-once` e assistant mock |
| Medium (trust) | `App.tsx` | Confirm fallback sem custo | **fixed** — mesmo preview |
| Low | Gemini quota mapping | 429 Gemini pode cair em `rate_limit` vs `quota` | **accepted** — residual adapter; retry só transiente |
| Low | `chat-session.ts` | `allowOnce` vem do renderer (após hard-stop visível) | **accepted** — audit local; sem auto-retry |
| Low | `chat-session.ts` `[hub:packet]` | Log de packet (W2) | **accepted** — residual STATUS; redactSecrets |
| Low | custom / uncatalogued | Sem preço → skip request cap + hint | **accepted** — ADR-W07-001 |
| Low | override JSON | Extra keys ignoradas no append | **accepted** — strip no write |
| Out-of-wave | caps por projeto/provider | D7 aceite completo | **out-of-wave** — W18 |
| — | `repos.ts` `iso` | Gate: helpers micros substituíram `iso` | **fixed** no delta — função restaurada; 19 db + typecheck verdes |

## Correlações

- **W8:** onboarding/wizard e overlay futuro devem usar o mesmo `chat:send` (caps + health + receipts). Auto-redaction de `sk-` no composer é W8.
- **W18:** caps por projeto/provider e dashboard; núcleo request/day/global já hard-stopa.
- **W10 / D1:** packet preview agora inclui o texto pendente; export packet continua sem keys.
- **Send paths:** palette, regenerate, compact, allow-once e fallback confirm passam por `sendToModel` / `chat:send`.

## Riscos residuais

- UAT com chaves reais / rede off / key inválida não corridos nesta máquina (e2e usa mock).
- Caps de projeto/provider ainda não existem (W18).
- Custom / uncatalogued: sem preço no catálogo não há request-cap por estimativa.
- Estimativa de output usa `maxTokens` ou 1024 (ADR-W07-001).
- Gemini 429 pode classificar-se como `rate_limit` (retry) em vez de `quota`.
- macOS não exercitado.
- Dev CSP com `unsafe-eval` (ADR-W00-003).
- Busca W6 continua O(n); FTS5 vazio.
- Zustand ainda não introduzido.

## ADRs

- `docs/ADR/ADR-W07-001-spend-caps-hard-stop.md`
- `docs/ADR/ADR-W07-002-health-from-chat.md`
- `docs/ADR/ADR-W07-003-explicit-fallback.md`
- `docs/ADR/ADR-W07-004-debug-meta-no-auth.md`
- `docs/ADR/ADR-W07-005-retry-transient-only.md`

## Patches

- Freeze (o que os reviewers viram): `docs/reviews/W07/DIFF.patch`
- Após High/Medium: `docs/reviews/W07/DIFF-post-review.patch` (working tree vs HEAD nos arquivos tocados no gate; inclui freeze + correções, porque a onda ainda não estava commitada)

## Delta (pós-review)

Fixes não estruturais o suficiente para `REVIEW-delta.md` separado: errorRate na status bar; preview com draft/`maxTokens`; soma micros; teste de retry; data no receipt; estimativa no fallback; e2e allow-once; restore de `iso()`. Re-typecheck desktop; shared 48 / db 19 / gateway 37; lint desktop/shared/db/gateway; e2e 9/9.
