# REVIEW — Wave 5 (W05)

- **Wave:** W05 — Providers + OpenRouter + vault (D3)
- **Data:** 2026-09-17
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](719359e9-802b-47b4-81ad-c1747abe3595), [trust-auditor](2ea6edc0-875b-41ef-bad0-98ccab575d67)
- **Branch / HEAD (freeze):** `main` / `3268b954a79c299770266310ef67fcd164f1252d` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Adapters Anthropic, Gemini, Groq, custom OpenAI-compatible | pass | `anthropic-adapter.ts`, `gemini-adapter.ts`, `groq-adapter.ts`, `registry.ts` `custom` |
| OpenRouter first-class (list, stream, pricing) | pass | slug + headers; catálogo local (ADR-W05-002); `usage.cost` → receipt quando a API devolve |
| Tela Providers: conectar, máscara, remover, testar, status | pass | `settings-view.tsx`; resultado do teste na lista |
| Multi-key por provider (label) | pass | `saveProviderKey` label livre; picker `slug · label · mask` |
| Picker: context, vision, tools, preço | pass | `home-view.tsx` + catálogo; tools badge pós-review |
| Capability gating (esconder vision) | pass | badge só se `model.vision` |
| temperature, max tokens, system extra | pass | IPC `chat:send` + sessão persistida (`getWorkspaceSession` pós-review) |
| Key nunca reexibida; rotate = apagar + criar | pass | DTO máscara; save sempre insere linha nova |
| Teste de conexão grava health sample | pass | `provider-health.ts` → `recordHealthSample` |
| DoD: ≥2 providers (um OpenRouter), testar, conversar | pass (código) / residual UAT | e2e mock + Settings lista OpenRouter; UAT com chaves reais não corrido |
| Key nunca em SQLite nem no renderer | pass | `repos.test.ts`; URL custom rejeita userinfo/query de credencial |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável (typecheck/lint/test; e2e send/stop/regenerate + OpenRouter na Settings)
- [x] Sem feature de onda posterior (sem RAG/MCP/agents, artifacts, caps UI, FTS populate)
- [x] Hook `health_samples` passou a ser escrito; `spend_caps` continua unused (W7)
- [x] D3: OpenRouter first-class, nativos permanecem

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs/`better-sqlite3`
- [x] IPC Zod em `secrets:test`, `baseUrl`/`endpointUrl`, params de send
- [x] Sem secret no DTO de teste/list; save continua one-shot W01
- [x] Sem fallback silencioso de modelo (slug desconhecido / modelo fora do catálogo falha)
- [x] HubApi alinhado shared / preload / renderer
- [x] Migration 0003 `custom`; `user_version` 3
- [x] i18n pt-BR + en
- [x] Abort / interrupted / crash-safe intactos (`costUsd` no resultado do stream)
- [x] Caps N/A — W7 deve hard-stopar todos os modos de `chat:send`

**Falhas**

- [x] Custom sem URL / key em falta: erro, não hang
- [x] Teste de conexão timeout 15s; falha grava sample `ok=0`
- [x] Windows-first; macOS não exercitado

**Testes**

- [x] Registry slugs; OpenRouter headers; Anthropic/Gemini fixtures; `usage.cost`; receipts preferem custo da API; URL com userinfo rejeitada; redaction Gemini/Groq; sessão com params
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] typecheck + lint + test após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W05-001..004 + índice

**Produto**

- [x] Settings ensina a guardar + testar; empty de conversa inalterado
- [x] Health/status do teste em texto (ms + código), não só cor

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `receipts.ts` / `openai-adapter.ts` / `adapter.ts` | D3: receipts ignoravam `usage.cost` da API | **fixed** — evento `costUsd`; OpenRouter pede `usage.include`; `composeReceipt` prefere custo reportado |
| High | `ipc-schemas.ts` / `repos.ts` / `settings-view.tsx` | `baseUrl` aceitava userinfo/`api_key` no query → SQLite + DOM | **fixed** — `customBaseUrlSchema` + `assertSafeEndpointUrl`; DTO não ecoa URL insegura |
| High | `packages/security/src/redact.ts` | `AIza…` / `gsk_…` não eram redigidos | **fixed** — padrões + teste |
| Medium | `repos.ts` `getWorkspaceSession` | Params W5 gravados pelo App e descartados no getter | **fixed** — record + roundtrip |
| Medium | `home-view.tsx` | Catálogo `tools` não aparecia no picker | **fixed** — badge como vision |
| Medium | `repos.ts` `listProviderKeys` | Lista forçava máscara `sk-…` em Gemini/Groq | **fixed** — `maskListedKey` por slug |
| Medium | `openai-adapter.ts` custom `testConnection` | Ping `gpt-4o-mini` quebra Ollama/local | **fixed** — custom testa `GET /models` |
| Medium | `provider-health.ts` | Sem teste do handler IPC | **accepted** — db grava sample; Zod rejeita `secret` no resultado |
| Medium | e2e / UAT | DoD “conversar com cada um” não exercitado com chaves reais | **accepted** — mesmo residual W04; e2e é mock |
| Low | `repos.ts` `status` | Continua `active` após teste falhado | **accepted** — UI mostra o último teste; persistir `invalid` é W7 |
| Low | `openrouter-adapter.ts` | Sem listagem remota `/models` | **accepted** — ADR-W05-002 |
| Low | `capabilities()` | Sempre `tools: false` vs catálogo | **accepted** — picker usa o catálogo |
| Low | `settings-view.tsx` | Label default `"default"` sem i18n | **accepted** |
| Low | Groq sem fixture próprio | Wrapper OpenAI-compatible | **accepted** |
| Out-of-wave | `chat-session.ts` | Caps não hard-stopam send | **out-of-wave** — W7 |
| Out-of-wave | status bar | Samples escritos, UI de health é W7 | **out-of-wave** |
| Out-of-wave | `[hub:packet]` log | Corpo da conversa no stdout (W2) | **accepted** — residual STATUS |

## Correlações

- W6: `extraSystem` já entra no compiler; sessão agora round-tripa temperature/maxTokens/extraSystem.
- W7: `health_samples` alimenta a status bar; chat ainda não grava sample na falha de send; caps devem cobrir todos os modos de `chat:send`; custo OpenRouter pode vir da API.
- W8: wizard pode reutilizar `secrets:save` / `secrets:test` com OpenRouter em destaque.
- Ollama posterior: `custom` + `GET /models` no teste.

## Riscos residuais

- UAT com duas chaves reais (OpenRouter + nativo) e restart da janela Electron não corridos (e2e usa mock).
- Redaction ainda não cobre todos os formatos colados na conversa (melhorou Gemini/Groq).
- Caps (W7) ainda não hard-stopam send.
- Chat failures não escrevem `health_samples` (só o botão Testar).
- `messages.update` IPC ainda muta user in-place.
- macOS não exercitado.

## ADRs

- `docs/ADR/ADR-W05-001-adapter-registry.md`
- `docs/ADR/ADR-W05-002-openrouter-first-class.md`
- `docs/ADR/ADR-W05-003-custom-base-url-settings.md` (atualizado no review: sem credenciais na URL)
- `docs/ADR/ADR-W05-004-connection-test-health-samples.md`

## Patches

- Freeze (o que os reviewers viram): `docs/reviews/W05/DIFF.patch`
- Após High/Medium: `docs/reviews/W05/DIFF-post-review.patch` (working tree vs HEAD; inclui freeze + correções, porque a onda ainda não estava commitada)
