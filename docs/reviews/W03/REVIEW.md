# REVIEW — Wave 3 (W03)

- **Wave:** W03 — Chat core (linear)
- **Data:** 2026-09-16
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](2f951710-ff15-491f-ac6f-33ca2676a921), [trust-auditor](eaca8f19-a1d7-4009-8e0b-a07441f706ac)
- **Branch / HEAD (freeze):** `main` / `d86293ae97a83ce75410e299c20aeea03a924c8d` (`4a20fb8..HEAD`)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Escrever → stream → markdown | pass | Composer + bolha `react-markdown` GFM/highlight; e2e send → `Hello from mock` |
| Stop | pass (após High) | Abort deixa `data-status=aborted` sem `workspace.error.chat`; e2e Stop |
| Reabrir no mesmo ponto, inclusive interrupted | pass | Sessão em `settings` `workspace-session`; `interruptOrphanStreams` no boot (W2); continue = novo send com parcial |
| Sub-tasks (lista, composer, copy, regenerate linear, edit linear, estados, a11y, Playwright) | pass | Ver checklist; abort distinto de error após o gate |

Sub-tasks no código: `home-view.tsx` lista/histórico; `chat-composer.tsx` Enter/Shift+Enter/Esc/Stop; markdown em `message-markdown.tsx`; regenerate/edit em `App.tsx` + `deleteMessagesFrom`; restore em `get/setWorkspaceSession`; Playwright `e2e/send.spec.ts`.

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável (typecheck/lint/test + Playwright mock; UAT com chave real não corrida)
- [x] Sem feature de onda posterior (sem árvore W4, OpenRouter W5, RAG/MCP/agents)
- [x] Hooks: `parent_id`/`branch_id` copiados; `deleteMessagesFrom` linear (W4 deve trocar)
- [x] D10 continue = novo send (ADR-W02-003 / ADR-W03-002)

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs/`better-sqlite3`/keytar
- [x] IPC Zod: `messages.update` / `messages.deleteFrom` / `settings.getSession` / `settings.setSession` (preload + main)
- [x] Sem secret em sessão/IPC de chat; `providerKeyId` rejeitado no schema da sessão
- [x] Sem fallback silencioso de modelo
- [x] HubApi alinhado shared / preload / renderer
- [x] Sem migration nova (settings key reuse)
- [x] i18n pt-BR + en (incluindo placeholder da bolha vazia)
- [x] Abort / interrupted / crash-safe; Stop não pinta falha
- [x] Caps N/A — W7 deve hard-stopar este `chat:send` (e o mock)

**Falhas**

- [x] Abort: estado `aborted` + Continuar; erro de rede continua `workspace.error.chat`
- [x] Empty / sem chave / sem conversa: empty states
- [x] Windows-first; macOS não exercitado

**Testes**

- [x] Zod content nulo, sessão, delete linear, mock stream/abort, Playwright send + Stop
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter @ai-hub/desktop test:e2e` após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W03-001..005 + índice

**Produto**

- [x] Empty state ensina a escrever e Enter
- [x] Status/receipt em texto, não só cor; code block com fundo escuro (contraste do highlight)

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `App.tsx` | Abort (`error`/`aborted`) mostrava `workspace.error.chat` | **fixed** — `code === "aborted"` não seta erro; bolha `aborted`; e2e Stop |
| High | `App.tsx` | Trocar conversa/projeto zerava `runId` sem abort; Stop sumia e send bloqueava | **fixed** — run `{ runId, conversationId }`; abort ao sair; Stop só na conversa do run |
| Medium | `mock-adapter.ts`, `e2e/send.spec.ts` | Mock instantâneo; e2e só cobria send feliz | **fixed** — pausa 400 ms abortável; spec de Stop |
| Medium | `message-markdown.tsx` | Highlight `github-dark` sobre `bg-muted` no tema claro | **fixed** — `<pre>` `bg-zinc-900` |
| Medium | `home-view.tsx` | Composer ativo durante edit | **fixed** — `onEditingChange` desativa o composer |
| Medium | `index.ts` / persistence / chat-session | `AI_HUB_E2E=1` num instalador empacotado ligaria mock + MemorySecretStore | **fixed** — `isE2eMode()` exige `!app.isPackaged` |
| Medium | `chat-session.ts` | Sem teste de integração continue vs regenerate no orchestrator | **accepted** — db `deleteMessagesFrom` + mock abort cobrem os contratos; sendChat vive no main Electron |
| Medium | `e2e/send.spec.ts` | Sem flag, Playwright poderia abrir o `userData` real | **accepted** — e2e sempre seta `AI_HUB_E2E`; empacotado ignora a flag; residual se alguém lançar `out/main` sem env |
| Low | `message-bubble.tsx` | Placeholder `"…"` sem i18n | **fixed** |
| Low | `message-bubble.tsx` | Regenerar só em `complete` | **fixed** — também em `interrupted`/`aborted` |
| Low | `index.ts` | Temp `userData` e2e não é apagado | **accepted** |
| Low | `message-markdown.tsx` | `rehype-highlight` depois do sanitize | **accepted** — sem `rehype-raw` |
| Low | `chat-session.ts` | Log `[hub:packet]` (W2) | **accepted** |
| Low | `App.tsx` | Zustand não introduzido | **accepted** — residual vs stack travada |
| Out-of-wave | `chat-session.ts` | Caps não hard-stopam send | **out-of-wave** — W7 |
| Out-of-wave | UI | Sem irmãos/OpenRouter/RAG | **out-of-wave** — W4/W5 |

Delta do gate (não estrutural o suficiente para `REVIEW-delta.md`): Stop/run-por-conversa, `isE2eMode`, mock com pausa, e2e Stop.

## Correlações

- **W4:** `deleteMessagesFrom` apaga do nó até o fim por `createdAt`. Regenerar/editar **não** podem continuar assim com irmãos. `branch_id` só é copiado.
- **W5:** header e restore assumem OpenAI ativo; sessão não guarda `providerKeyId`.
- **W7:** todos os sends passam por `sendChat` (incluindo continue/regenerate/edit e o mock). Caps devem aplicar-se aqui.
- **W15:** markdown GFM+sanitize reutilizável (ADR-W03-001).
- Preload CJS empacotado com `zod` não deve voltar a ser ESM externalizado (ADR-W03-005).

## Riscos residuais

- Janela Electron com chave real no Credential Manager **não** foi o caminho do e2e (mock).
- macOS não exercitado.
- Dev CSP `unsafe-eval` (ADR-W00-003).
- ABI `better-sqlite3`: `pnpm test` no db vs Electron.
- Redaction regex incompleta para chaves coladas no chat.
- Caps (W7) ainda não hard-stopam `chat:send`.
- Zustand ainda não foi introduzido.
- Lançar `out/main/index.js` unpackaged com `AI_HUB_E2E=1` ainda entra no mock (intencional para CI).

## ADRs

- [ADR-W03-001-react-markdown-gfm.md](../../ADR/ADR-W03-001-react-markdown-gfm.md)
- [ADR-W03-002-linear-edit-and-regenerate.md](../../ADR/ADR-W03-002-linear-edit-and-regenerate.md)
- [ADR-W03-003-session-restore-settings.md](../../ADR/ADR-W03-003-session-restore-settings.md)
- [ADR-W03-004-e2e-mock-adapter.md](../../ADR/ADR-W03-004-e2e-mock-adapter.md)
- [ADR-W03-005-sandboxed-cjs-preload.md](../../ADR/ADR-W03-005-sandboxed-cjs-preload.md)

## Patches

- [DIFF.patch](./DIFF.patch) — freeze `4a20fb8..d86293a` (o que foi revisado)
- [DIFF-post-review.patch](./DIFF-post-review.patch) — correções High/Medium do gate
