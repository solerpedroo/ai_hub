# REVIEW — Wave 14 (W14)

- **Wave:** W14 — RAG + memória + Conversation Workspace
- **Data:** 2026-09-18
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](284ba7e0-e871-4270-82c0-a3f836ff5ecd), [trust-auditor](2bbba925-56c3-4881-b2b1-ebe1bb34b8e5); delta [wave-reviewer](7a7b7304-47ff-433a-beca-2950a4947bec)
- **Branch / HEAD (freeze):** `main` / `525d5ee9cc893f006e773b02b1d7d3d36a977a62` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Chunking + embeddings locais | pass | `packages/memory`; ingest indexa em `files.ts`; ADR-W14-001 |
| Retrieval + citações | pass | e2e `rag.spec.ts` (10 PDFs → `doc-03.pdf`); chip clicável |
| Memória CRUD + suggest + opt-out | pass | IPC + painel; e2e apaga o item |
| `@memory` resolve | pass | fora de `MENTION_STUB_TYPES`; `mentions.ts` |
| Workspace (resumo, decisões, pins, tarefas) | pass | extração local; refresh após assistant complete |
| Duplicar / conversa → projeto | pass | repos + IPC; `repos.test.ts` |
| Memórias no packet; `strict` exclui | pass | send/preview + `compileAndSavePacket`; `allowsProjectContext` |
| **DoD:** 10 PDFs com citação; memória PostgreSQL na conversa seguinte; apagar | pass | e2e memory 2.3s + rag 2.4s (pós-fix do preview) |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks em código
- [x] DoD: typecheck desktop + e2e memory/rag
- [x] Sem prompt library, skills, MCP, agentes, Council
- [x] Hooks: `@prompt`/`@skill` continuam stub
- [x] Sem D* desta onda além do plano W14

**Trust e correlações**

- [x] Renderer sem fs/net/SDKs; embeddings só no main
- [x] IPC novo Zod nos dois sentidos (`memory:*`, `workspace:*`, duplicate, toProject)
- [x] Corpos memory/RAG omitidos no packet da UI; `redactSecrets` na injeção
- [x] Sem fallback silencioso; caps no mesmo `chat:send`
- [x] DTOs shared/main/renderer
- [x] Migration 9 no mesmo PR
- [x] i18n pt-BR + en
- [x] Abort/crash-safe intactos
- [x] Send paths novos não existem (só inject no compile existente)

**Falhas**

- [x] Rede/key/timeout: send path inalterado
- [x] Empty DB: listas vazias
- [x] Windows-first

**Testes e qualidade**

- [x] Contratos: chunk/retrieve/privacy, repos memória/duplicar, compiler slices, Zod memory/workspace
- [x] Sem providers reais
- [x] Sem testes apagados
- [x] Typecheck desktop + memory + shared
- [x] `docs/reviews/W14/` + ADRs W14-001…003

**Produto**

- [x] Empty states nos painéis
- [x] Citações com texto, não só cor

## Findings

| Severidade | Ficheiro | Resumo | Status |
|---|---|---|---|
| High | `packet-file.ts` | Packet gravado omitia memórias/RAG | **fixed** |
| High | `project-context.ts` / `mentions.ts` | Sem teste do contrato `strict` | **fixed** (`allowsProjectContext`) |
| High | `packet-preview.ts` | Preview usava privacy do envelope; send usava o do input | **fixed** |
| Medium | `home-view.tsx` | Citações sem link | **fixed** (botão; memory abre o painel) |
| Medium | `workspace.ts` / `home-view.tsx` | Workspace só após Refresh | **fixed** (refresh no assistant complete) |
| Medium | `ipc-schemas.test.ts` | Sem Zod dos DTOs novos | **fixed** |
| Medium | ADR-W13-002 / i18n strict | Stub `@memory` e copy desatualizados | **fixed** |
| Medium | `files.ts` | Attach UI/send continua teto 8; e2e 10 PDFs via `ATTACH_DIR` | **accepted** |
| Medium | `chat-session.ts` | Packet aplicado pode reenviar memórias do envelope em `strict` e duplicar em `standard` | **accepted** |
| Low | `repos.ts` | Título `Copy of …` em inglês | **accepted** |
| Low | `workspace.ts` | Snapshot prefixa User/Assistant em inglês | **accepted** |
| Low | `project-context.ts` | Decrypt de todos os embeddings no send | **accepted** |
| Out-of-wave | `mentions.ts` | `@prompt`/`@skill` stub | **out-of-wave** |

## Correlações

- W18: `privacyMode: strict` já exclui memória/RAG no send/preview/compile; packet aplicado antigo pode ainda trazer fatias gravadas (residual).
- W10: compile/export agora pode levar memórias/RAG no envelope; apply + send em standard pode duplicar auto-inject.
- W13: `@memory` sai do stub; edit/regenerate ainda não reenviam `mentions[]` (residual W13); auto-memória/RAG entram pela query.
- W15/W17: `MentionRef` estável; stubs intactos.
- W26: backend hashed trocável sem novo DTO.

## Riscos residuais

- Embeddings hashed (não MiniLM); projetos grandes decriptam todos os vetores no main.
- 10 PDFs no diálogo nativo ainda batem no teto de 8 anexos de send; ingest por pasta/e2e cobre o DoD.
- Packet aplicado + troca para `strict` não raspa `Project memory:` / `Retrieved chunk:` já no envelope.
- Workspace v1 é recorte local, não síntese.

## ADRs

- `docs/ADR/ADR-W14-001-local-hashed-embeddings.md`
- `docs/ADR/ADR-W14-002-memories-in-packet-strict-excludes.md` (supersede `@memory` de W13-002)
- `docs/ADR/ADR-W14-003-workspace-local-no-llm.md`

## Patches

- `docs/reviews/W14/DIFF.patch`
- `docs/reviews/W14/DIFF-post-review.patch`
- `docs/reviews/W14/REVIEW-delta.md`
