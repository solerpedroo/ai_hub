# REVIEW — Wave 13 (W13)

- **Wave:** W13 — @-mentions (D6)
- **Data:** 2026-09-18
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](bae15b38-1df5-4710-83b7-3c64cc6a943f), [trust-auditor](4d288aaa-ad2a-48c1-87f2-92dca22a8b60); delta [wave-reviewer](469e8367-5943-476d-b519-d38814db3505)
- **Branch / HEAD (freeze):** `main` / `8320f996280c740fea0adb833f9700e3d08c21e2` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Trigger `@` com autocomplete | pass | `ChatComposer` `mention-list`; `mentionTriggerIn` |
| Tipos file/conversation/packet + stubs memory/prompt/skill | pass | listbox + `mentions:unavailable` |
| Chip + backspace remove menção | pass | `mention-chips`; backspace com composer vazio |
| Preview lateral: trecho + tokens | pass | `mention-preview` (chips + tokens digitados) |
| Compiler injeta estruturado, não no texto do user | pass | `appendMentionsToPacket` + `mentionVisibleContent` |
| Cap de tokens + aviso | pass | `MAX_MENTION_TOKENS`; ADR-W13-003 exclui `@file` |
| **DoD:** `@file:README.md o que este repo faz?` | pass | e2e `mentions.spec.ts` 2.7s; bubble sem dump |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks em código
- [x] DoD: typecheck desktop + e2e mentions
- [x] Sem RAG, memória persistida, prompt library, skills, MCP, agentes
- [x] Hooks: `MentionRef` + stubs para W14/W15/W17
- [x] D6 aceite

**Trust e correlações**

- [x] Renderer sem fs/net/SDKs; resolve no main
- [x] Sem canal IPC novo; `mentions[]` no send/preview Zod
- [x] Extract de conversa/packet stripped no packet da UI
- [x] Sem fallback silencioso
- [x] DTOs shared/main/renderer
- [x] Sem migration
- [x] i18n pt-BR + en
- [x] Abort/crash-safe intactos
- [x] Mentions no send (e preview) entram no tokenEstimate antes dos caps

**Falhas**

- [x] Preview não rebenta ao escrever `@file:…` (High corrigido)
- [x] Stub / not_found mapeados no send
- [x] Windows-first; `@` independente do `/`

**Testes**

- [x] parseMentionTokens, mentionRef refine, compiler appendMentions, packet-ui headings
- [x] e2e DoD sem dump
- [x] Sem providers reais
- [x] typecheck + testes após fixes
- [x] REVIEW + DIFF + DIFF-post-review + REVIEW-delta
- [x] ADRs W13-001..003 + índice

**Produto**

- [x] Preview/aviso em texto
- [x] Stubs com copy explícita

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `packet-preview.ts` / `App.tsx` | Preview throw `mentions:not_found` ao digitar `@file:` | **fixed** — mode `preview` ignora `mentions:*` |
| Medium | `gateway.ts` | Ref sem id/query | **fixed** — refine |
| Medium | `App.tsx` | Mentions em regenerate/continue/edit/fallback | **fixed** — só `mode: "send"` |
| Medium | `packet-ui.test.ts` | Sem teste de headings de menção | **fixed** |
| Medium | `mentions.ts` | `@file` fora do cap 8k | **fixed** — ADR-W13-003 |
| Medium | `home-view.tsx` | Token escrito sem preview | **fixed** — `mentionPreviewRows` |
| Medium | `mentions.ts` | Sem unit test do resolver (main) | **accepted** |
| Medium | `chat-session.ts` | Edit não re-resolve mentions do content | **accepted** |
| Low | composer Backspace | Só com textarea vazio | **accepted** |
| Low | `mentions.empty` | Key órfã | **accepted** |
| Low | `@conversation` self | Skip silencioso | **accepted** |
| Out-of-wave | ADR-W13-001 | Menção entra em `strict` | **accepted** |
| Out-of-wave | stubs | W14/W15/W17 | **accepted** |

Sem Blocker. High e Medium in-wave (exceto residual accepted) corrigidos.

## Correlações

- **W12:** `@file` reusa `project_files` + `fileIds` + redactor.
- **W10:** fatias `conversation` / `packet`; apply persistente ≠ menção pontual.
- **W14–W17:** mesmo `MentionRef`; trocar throw por resolver.
- **W7:** caps depois da injeção.
- **W11:** `@` não altera slash local.

## Riscos residuais

- Resolver de mentions sem teste de DB (isolamento só no código).
- Edit de mensagem com `@file` no texto não re-injeta.
- Replay de menções em regenerate/continue não persiste no grafo.
- Query de menção sem espaço (ADR-W13-001).
- Preview de conversa ainda usa título, não o body (body só no main).

## ADRs

- `docs/ADR/ADR-W13-001-mentions-structured-not-in-user-text.md`
- `docs/ADR/ADR-W13-002-mention-stubs-until-later-waves.md`
- `docs/ADR/ADR-W13-003-mention-token-cap-excludes-files.md`

## Patches

- `docs/reviews/W13/DIFF.patch` (freeze)
- `docs/reviews/W13/DIFF-post-review.patch` (fixes do gate)
- `docs/reviews/W13/REVIEW-delta.md`
