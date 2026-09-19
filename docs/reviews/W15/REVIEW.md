# REVIEW — Wave 15 (W15)

- **Wave:** W15 — Prompt Library + Playground
- **Data:** 2026-09-19
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](4acdffb6-8b61-4d0d-a345-3a2acd10b4f2), [trust-auditor](4a23ed8a-d45b-4b01-8f86-b7431795fb59); delta [wave-reviewer](c7ae8cf3-98c7-4824-bfa6-9baa165ccbdb)
- **Branch / HEAD (freeze):** `main` / `850855fba6287643c0f42ab54a5073ea402837f9` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Library com pastas | pass | `prompts.folder` development/studies/work; i18n Desenvolvimento/Estudos/Trabalho |
| Variáveis `{{project}}` `{{language}}` `{{goal}}` | pass | `interpolatePrompt`; `prompt-vars.ts`; testes `prompts.test.ts` |
| Inserir no composer; `@prompt` | pass | `prompts:resolve` + `composerInsert`; fora de `MENTION_STUB_TYPES` |
| Playground N modelos lado a lado | pass | 2 colunas UI; schema 2–4; N× `sendChat` |
| Salvar vencedor | pass | `saveWinner` → `prompts:create`; e2e “Winner” |
| Factory code review / debug / resumo / professor | pass | `FACTORY_PROMPTS`; seed `prompt-factory-seeded` |
| **DoD:** playground 2 modelos; vencedor salvo; variáveis no projeto ativo | pass | e2e `prompts.spec.ts` 3.0s (pós-fix); insert cola “E2E” |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks em código
- [x] DoD: typecheck desktop + e2e prompts
- [x] Sem artifacts, skills reais, MCP, agentes, Council
- [x] `@skill` continua stub
- [x] Sem D* desta onda além do plano W15

**Trust e correlações**

- [x] Renderer sem fs/net/SDKs; cifra e keys só no main
- [x] IPC novo Zod nos dois sentidos (`prompts:*`, `playground:run`)
- [x] Corpos de `@prompt` omitidos no packet da UI (`Library prompt:`)
- [x] Sem fallback silencioso; playground avalia N× caps (`evaluatePlaygroundCaps`) e cada coluna passa por `sendChat`
- [x] DTOs shared/main/renderer
- [x] Migration 10 no mesmo PR
- [x] i18n pt-BR + en
- [x] Abort/crash-safe intactos (`waitForChatRun` / `playgroundBusy`)
- [x] Novo send path não fura teto: fail-closed se estimate `null` com cap USD; latch síncrono contra corridas

**Falhas**

- [x] Cap/overflow/auth: playground mapeia `SpendCapError`; overflow limpa convos
- [x] Empty DB: seed factory uma vez; listas vazias se seed falhar
- [x] Windows-first

**Testes e qualidade**

- [x] Contratos: interpolate, factory folders, Zod prompt/playground, repos encrypted+hide playground, compiler slice, packet-ui, evaluatePlaygroundCaps N×
- [x] Sem providers reais
- [x] Sem testes apagados
- [x] Typecheck desktop + shared; e2e prompts após fixes
- [x] `docs/reviews/W15/` + ADRs W15-001…003

**Produto**

- [x] Empty state das colunas; erros em texto
- [x] Pastas e factory com labels, não só cor

## Findings

| Severidade | Ficheiro | Resumo | Status |
|---|---|---|---|
| High | `playground.ts` / `spend-caps.ts` | Preflight N× saltava se um estimate era `null`; sem teste | **fixed** — `evaluatePlaygroundCaps` fail-closed + testes |
| High | `playground.ts` / `chat-session.ts` | `sendChat` devolve antes do stream; segundo run via o mesmo budget | **fixed** — `playgroundBusy` síncrono até `waitForChatRun` |
| Medium | `prompts-view.tsx` | Falha de cap opaca | **fixed** — `parseSpendCapError` |
| Medium | `prompts-view.tsx` | Default 2 slots iguais com 1 key | **fixed** — modelos distintos |
| Medium | `playground.ts` | Conv os criados antes de auth/preview; órfãos no overflow | **fixed** — auth primeiro; cleanup se não streaming |
| Medium | `home-view.tsx` | `@prompt` não casava labels i18n | **fixed** — filter/label factory i18n |
| Medium | `prompts-view.tsx` | Sem `privacyMode` → auto memory/RAG no playground | **fixed** — herda o modo do composer |
| Medium | `playground.ts` | Latch só depois do `await` de auth | **fixed** — latch no início da função |
| Medium | `prompts-view.tsx` | `chat.onEvent` error da home poluía o playground | **fixed** — filtra `runId` / messageId |
| Medium | `mentions.ts` | Sem unit test do resolver `@prompt` | **accepted** (mesmo residual W13; e2e insert cobre variáveis) |
| Low | `prompts-view.tsx` | UI só 2 slots (schema até 4) | **accepted** |
| Low | `saveWinner` | Grava o output, não o template | **accepted** (DoD/e2e) |
| Low | `removePrompt` IPC | Permite apagar factory (UI esconde) | **accepted** |
| Low | `waitForChatRun` | Poll sem timeout | **accepted** |
| Out-of-wave | `mentions.ts` | `@skill` stub | **out-of-wave** |
| Out-of-wave | `repos.ts` | Sem GC de conversas playground | **accepted** (ADR-W15-003) |

## Correlações

- W7/W18: playground soma N× no preflight e receipts entram em `sumReceiptCostUsd`. Caps projeto/provider continuam W18.
- W13: ADR-W13-002 superseded só para `@prompt`.
- W14: playground agora respeita `privacyMode` do composer (strict exclui memória/RAG nas colunas).
- W16/W17/W24: sem canvas, skills reais, MCP ou orquestração. `conversations.kind` é o gancho para não poluir a sidebar.

## Riscos residuais

- Conversas `kind=playground` acumulam na DB até o user/app limpar.
- `waitForChatRun` sem timeout se um run ficar órfão no mapa.
- Segundo `playground:run` enquanto o primeiro ainda faz `getProviderSecret` já está bloqueado pelo latch; UI `running` ainda cai quando o IPC devolve (streams podem continuar) — segundo clique vira `playground:busy`.
- Títulos factory em inglês na DB; UI/i18n no picker.
- e2e com mock, não chaves reais N×.

## ADRs

- `docs/ADR/ADR-W15-001-prompt-library-encrypted.md`
- `docs/ADR/ADR-W15-002-prompt-variables-and-mention.md`
- `docs/ADR/ADR-W15-003-playground-n-sends-caps.md`
- Índice: `docs/ADR/README.md`
- Relacionados: ADR-W13-002 (superseded `@prompt`), ADR-W14-002 (nota `@prompt`)

## Patches

- Freeze: `docs/reviews/W15/DIFF.patch`
- Pós-review: `docs/reviews/W15/DIFF-post-review.patch`
- Delta: `docs/reviews/W15/REVIEW-delta.md`
