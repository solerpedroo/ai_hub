# W27 — Revisão de Research, Study, Notes, Tasks

- Data: 2026-09-23
- Branch/HEAD: `main` / `e40ec5e`
- Estado do gate: **fechado**; DoD de produto cumprido; Blocker/High de código corrigidos; artefatos persistidos.
- Revisores independentes: `wave-reviewer` (`1c60ce63-784d-49be-8e16-626605aca07d`), `trust-auditor` (`7c76909e-7195-4f47-a8ac-4506c449ada3`).

## DoD

| Item | Resultado | Evidência |
|---|---|---|
| Research Mode: plano → fontes → síntese → relatório citável | **Pass** | `research-runner.ts` (`graphVersion: 2`, LOCAL SOURCES); writer em `agent-runner.ts` → artifact `"Research report"`; UI `runMode=research` |
| Study Mode: professor / examinador / tutor / avaliador | **Pass** | factory skills `study-*` em `skills.ts`; paleta; i18n pt-BR+en; `skills.test.ts` (11 skills + folder `studies`) |
| AI Notes: resposta → nota (projeto, tags, data) | **Pass** (residual UX) | migração 0019, IPC `notes:*`, Save-as-note, painel; tags/data no DTO — UI de save não pede tags; painel não mostra timestamps |
| AI Tasks: resposta → checklist editável | **Pass** | `parseChecklistItems` + `workspace:tasksFromMessage` + checklist no workspace (escopo conversa, ADR) |
| Notes/Tasks no workspace e na busca | **Pass** | painel; `searchWorkspace` kinds `note`/`task`; paleta |
| DoD: “pesquisa X” gera relatório com fontes | **Pass** | prepare → start (caps W24) → artifact citável; fontes = locais (ADR); sem scraping web |
| DoD: “vire tarefas” cria checklist editável | **Pass** | botão i18n + parse + toggle/add/remove |

## Checklist §9.4

- [x] Sub-tasks W27 presentes em código (não TODOs)
- [x] DoD demonstrável via fluxo Research + Tasks-from-message
- [x] Sem leakage de Voice/marketplace/sync/team
- [x] Hooks: `graphVersion: 2`, `source_message_id`, search kinds — sem features futuras
- [x] Trust: notes cifradas; Zod dual; keys só main/keytar; research sem tool root
- [x] i18n pt-BR + en
- [x] Contratos shared/main/preload/renderer alinhados
- [x] Testes unitários sem provider live; typecheck desktop/shared/db OK pós-fixes
- [x] ADR-W27-001 written; índice atualizado
- [x] `REVIEW.md` + `DIFF.patch` + `DIFF-post-review.patch` persistidos

## Achados

| Severidade | Arquivo | Achado | Estado |
|---|---|---|---|
| High | `docs/reviews/W27/` | Gate sem `REVIEW.md` / DIFF incompleto no freeze inicial | **fixed** — artefatos regenerados com `research-runner`, `notes-tasks*`, ADR |
| High | `packages/shared/src/skills.test.ts` | Contagem de factory skills desatualizada após Study | **fixed** |
| High | `packages/db/src/repos.ts` | `planCipher` 8k truncava gather de fontes locais | **fixed** → 32k |
| Medium | `packages/db/src/repos.ts` | Títulos de task sem `redactSecrets` | **fixed** |
| Medium | `apps/desktop/src/main/research-runner.ts` | Writer sem reforço LOCAL SOURCES | **fixed** |
| Medium | `home-view.tsx` / `message-bubble.tsx` | Save-as-note sem projeto | **fixed** (prop omitida) |
| Medium | `packages/db/src/repos.ts` `createArtifact` | Artifact research sem redact no write | **fixed** |
| Medium | `conversation-workspace-panel.tsx` | Tags/data na UI de notes incompletos vs §39 | **accepted** residual |
| Medium | `App.tsx` | Hit `kind=note` só seleciona projeto; não abre painel | **accepted** residual UX |
| Medium | (ausente) | Sem teste isolado de `prepareResearch` / grafo v2 no desktop | **accepted** residual — cobertura via DB Zod + ADR |
| Medium | `orchestration-runner.ts` | `skipCaps` em children (herdado W24) | **accepted** — caps na reserva da raiz |
| Low | `agent-runner.ts` | `graphVersion>=2` ainda poderia executar `tool` se steps injetados | **fixed** — skip explícito |
| Low | Plano vs ADR | Plano diz checklist “no projeto”; código usa `conversation_tasks` | **accepted** (ADR) |
| Low | `gatherResearchSources` | Projeto vazio → placeholder | **accepted** (ADR: só fontes locais) |
| Out of wave | Escopo §41 comparação multi-modelo / web scrape | Fora do DoD W27 | **out-of-wave** |

## Correlações

- **W14:** reusa `conversation_tasks` + checklist; memories alimentam research, não viram Notes.
- **W16:** Writer grava artifact markdown citável.
- **W17:** Study = 4 factory skills (`tools: []`).
- **W24:** Research = mesmo runner start/pause/cancel + caps batch; `graphVersion: 2` sem `relativePaths`.
- **W28–W31:** sem implementação antecipada.

## Riscos residuais

- UI de Notes não coleta tags no save nem mostra `createdAt`/`updatedAt`.
- Busca de nota não abre o painel de notes automaticamente.
- Sem teste unitário do runner Research no desktop.
- Caps de children orquestrados continuam `skipCaps` após reserva em lote (W24).
- Tags de notes em plaintext (padrão W06).
- Research sem fontes indexadas ainda produz relatório com placeholder.

## Artefatos

- Diff da onda (corpus revisado, regenerado pós-freeze incompleto): `docs/reviews/W27/DIFF.patch`
- Delta pós-review: `docs/reviews/W27/DIFF-post-review.patch`
- ADR: `docs/ADR/ADR-W27-001-project-notes-and-research-graph.md`

## Verificação

- `pnpm --filter @ai-hub/desktop typecheck` — pass
- `pnpm --filter @ai-hub/shared typecheck` — pass
- `pnpm --filter @ai-hub/db typecheck` — pass
- Vitest: `skills.test`, `notes-tasks.test`, `ipc-schemas.test`, `repos.test` (project notes) — pass
