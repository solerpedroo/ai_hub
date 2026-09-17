# REVIEW — Wave 4 (W04)

- **Wave:** W04 — Conversation branching (D4)
- **Data:** 2026-09-17
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](95927bb7-7021-49c2-a305-9c5644de0e10), [trust-auditor](deac91d5-b2c5-4c7b-9010-732d0997b4a9)
- **Branch / HEAD (freeze):** `main` / `783a2c5b3348e1fade88b60a5b56630a66435e22`
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Modelo `parent_id` / `branch_id` / `is_active_branch` | pass | Schema W1; `createMessage` ativa irmãos; DTO `isActiveBranch` |
| Regenerar cria irmão; UI N alternativas | pass | `chat-session` `mode: "regenerate"`; `sibling-nav`; e2e `2 / 2` |
| Editar user cria ramo; antigo permanece | pass | `mode: "edit"`; teste db fork de user |
| Navegar irmãos sem perder o outro | pass | `activatePathThrough` + flags nos irmãos |
| Painel Árvore (nós, nome, jump) | pass | `conversation-tree.tsx`; labels em settings |
| Composer no ramo ativo | pass | `send` usa leaf de `activePath` no main |
| Compiler só no path ativo | pass | `compileActivePath` em send/continue/edit; regenerate fatia até o pai |
| Export ramo + árvore JSON | pass | IPC main + `selectExportMessages`; Zod documento v1 |
| Testes 3 ramos, switch, persistência | pass | `repos.test.ts` reopen em ficheiro |
| DoD: duas respostas no mesmo ponto, voltar, continuar sem perder | pass | wired + e2e regenerate; UAT com chave real não corrida |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável (typecheck/lint/test; e2e send/stop/regenerate)
- [x] Sem feature de onda posterior (sem OpenRouter W5, RAG/MCP/agents, artifacts)
- [x] Hooks W1 usados; `deleteMessagesFrom` agora é subgrafo, e o canal IPC foi removido
- [x] D4 / D10: continue/regenerate continuam novo send (ADR-W04-002)

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs/`better-sqlite3`
- [x] IPC Zod nos canais novos (`activate`, export, labels) e `chat:send` discriminado
- [x] Sem secret no export/packet DTO; `redactSecrets` no ficheiro gravado
- [x] Sem fallback silencioso de modelo
- [x] HubApi alinhado shared / preload / renderer
- [x] Sem migration nova
- [x] i18n pt-BR + en
- [x] Abort / interrupted / crash-safe intactos
- [x] Caps N/A — W7 deve hard-stopar todos os modos de `chat:send`

**Falhas**

- [x] Empty / sem chave: edit/regenerate/continue escondidos sem key
- [x] Export cancelado não grava; saved mostra só o basename no DOM
- [x] Windows-first; macOS não exercitado

**Testes**

- [x] Grafo 3 ramos + reopen; fork user; delete subgrafo não apaga irmão; `selectExportMessages`; Zod `edit`; compiler path ativo; e2e regenerate
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W04-001..004 + índice; W03-002 superseded

**Produto**

- [x] Árvore ensina a saltar; empty de mensagens inalterado
- [x] Alternativas em texto (`N / M`), não só cor

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `repos.ts` `deleteMessagesFrom` + IPC | Wipe por `createdAt` apagava irmãos posteriores; canal ainda no renderer | **fixed** — delete só o subgrafo; `messages:deleteFrom` removido do Hub API / preload / main |
| Medium | `conversation-export.ts` | Sem teste active vs tree | **fixed** — `selectExportMessages` + teste em `message-graph.test.ts` |
| Medium | `chat-session.ts` | Send não chamava `compileActivePath` | **fixed** — send/continue/edit usam `compileActivePath` |
| Medium | `e2e/send.spec.ts` / `gateway.test.ts` | `toContainText("2")` frouxo; `mode: "edit"` sem parse test | **fixed** — `toHaveText("2 / 2")`; teste Zod edit |
| Medium | `message-bubble.tsx` | Edit/regenerate visíveis sem chave | **fixed** — exigem `hasKey` |
| Medium | `App.tsx` `onActivate` | Send podia correr no ramo antigo durante activate | **fixed** — `activating` entra em `busy` |
| Medium | `hub-api` `messages.update` | Update in-place ainda no IPC (não usado pela UI) | **accepted** — não toca no provider; residual até haver delete de admin |
| Medium | `repos.ts` labels em settings plaintext | ADR-W04-004 aceita | **accepted** |
| Medium | `redact.ts` + export | Redaction não cobre todos os formatos de chave colados | **accepted** — residual já em STATUS |
| Medium | `chat-session.ts` log `[hub:packet]` | Corpos no log (W2) | **accepted** |
| Low | copy “N alternativas” | UI mostra `1 / 2` | **accepted** — aria-labels falam alternativa |
| Low | Árvore começa fechada | Densidade desktop | **accepted** |
| Low | `listActivePath` duplica `activePath` | db não depende de shared | **accepted** |
| Low | `App.tsx` path absoluto no DOM | **fixed** — basename |
| Out-of-wave | `chat-session.ts` | Caps não hard-stopam send | **out-of-wave** — W7 |

## Correlações

- W5: novos adapters devem continuar a entrar só por `sendChat` (todos os modos).
- W6: `compileActivePath` é o recorte certo para model switch.
- W7: caps no mesmo `sendChat` cobrem regenerate/edit.
- W9: documento export v1 (`parentId`, `branchId`, `isActiveBranch`, labels) é o contrato de import.

## Riscos residuais

- UAT com chave OpenAI real e restart da janela Electron não corridos neste gate (e2e usa mock).
- `messages.update` ainda permite mutar user sem fork se um cliente IPC antigo chamar.
- Labels de ramo em plaintext no SQLite (ADR-W04-004).
- Export/log redaction incompleta para formatos não-`sk-`.
- e2e não cobre edit + switch de irmão + relançar o app.

## ADRs

- `docs/ADR/ADR-W04-001-active-path-is-active-branch.md`
- `docs/ADR/ADR-W04-002-sibling-fork-not-delete.md` (supersede W03-002)
- `docs/ADR/ADR-W04-003-compiler-active-path.md`
- `docs/ADR/ADR-W04-004-export-json-main-process.md`

## Patches

- Freeze: `docs/reviews/W04/DIFF.patch`
- Pós-review: `docs/reviews/W04/DIFF-post-review.patch`
