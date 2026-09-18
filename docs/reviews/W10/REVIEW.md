# REVIEW — Wave 10 (W10)

- **Wave:** W10 — Portable Context Packet (D1)
- **Data:** 2026-09-18
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](c0f299b7-1968-4889-9196-9a47b0bd3fe3), [trust-auditor](fb32252b-8bbe-45e2-b18b-ba8386b7c78c)
- **Branch / HEAD (freeze):** `main` / `0d52e8db310ff3f4976ea65d9497d04cb55534b7` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Schema `context_packets` versionado + tokens + privacy + origin | pass | Migration 7; `schema.ts`; `createContextPacket` |
| Preview rico (entra / fica de fora / tokens / destino) | pass | `packet-preview.ts`, `packet-panel.tsx`; refetch após apply |
| Compact: ramos inativos, cortar antigas, pins | pass | `compiler.ts` + testes; send após apply usa path ativo |
| Export `.aihub-packet.json` | pass | `packet-file.ts`; e2e `packet.spec.ts` |
| Import noutro projeto | pass | cópia com `origin.source=import`; apply só no mesmo `projectId` |
| Usar packet nesta conversa | pass | `active_packet_id` + `mergePacketWithTail` no send |
| Sem API keys / sem conteúdo de outro projeto | pass | envelope `.strict()`; move limpa apply; send/preview revalidam projeto |
| Testes de contrato JSON v1 | pass | `portable-packet.test.ts` (v1, rejeita `apiKey` / v2 / kind) |
| **DoD:** export A → import B → outro modelo com preview visível | pass | e2e `packet.spec.ts` (4.2s) |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável: typecheck; shared 73; gateway 41; db 22; e2e packet + send 10/10
- [x] Sem feature de onda posterior (sem RAG, MCP, agentes, @-mentions, files, run modes)
- [x] Hooks só desta onda (`privacy_mode`, `origin`, `version`, `active_packet_id`, `packet_applied_at`, `messages.pinned`)
- [x] D1 desta onda implementado (envelope v1; files/memories ficam para envelope v2)

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs; ticket opaco; export IPC sem path
- [x] IPC Zod: `packets:list/compile/export/pickFile/import/apply/clear`, `messages:pin`, preview alargado
- [x] Payload cifrado; list DTO sem JSON; `redactSecrets` no persist/export
- [x] Sem fallback silencioso; caps ainda hard-stopam `chat:send`
- [x] HubApi alinhado shared / preload / renderer
- [x] Migration 7; `user_version` 7
- [x] i18n pt-BR + en
- [x] Abort / crash-safe / caps intactos
- [x] Apply não é send path novo; continua a passar por `chat:send`

**Falhas**

- [x] Packet inválido / ficheiro grande → erro genérico, sem path
- [x] Apply cross-project rejeitado; move limpa o ponteiro
- [x] Windows-first; diálogo nativo + ticket e2e

**Testes**

- [x] Envelope v1 / rejeita extras e `version: 2`
- [x] Compiler: inativos, pins, strict, merge tail
- [x] DB: cifra + apply mesmo projeto + move limpa apply + pin
- [x] IPC import sem path; `privacyMode` no send
- [x] e2e A→ficheiro→B + regressão send
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] typecheck + test após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W10-001..003 + índice

**Produto**

- [x] Preview lista entra/sai em texto, não só badge
- [x] Empty de packets no projeto; import possível sem preview

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `chat-session.ts` | Tail do packet aplicado era `listMessages` sem `activePath` | **fixed** — `activePath` + `createdAt >= appliedAt` |
| High | `App.tsx` | Preview não refetch após apply/clear | **fixed** — dep `activePacketId` |
| High | `gateway.ts` / send | `privacyMode` no preview mas não no send | **fixed** — campo no `chatSendInputSchema` + `compileOutgoing` |
| High (trust) | `repos.ts` `moveConversation` | Move mantinha apply e injetava packet de outro projeto | **fixed** — limpa `active_packet_id`; send/preview revalidam `projectId` |
| Medium | `compiler.ts` `mergePacketWithTail` | Envelope fica pinned; compact não encolhe o import | **accepted** — overflow explícito (`context_overflow`); compact só no tail |
| Medium | `compiler.test.ts` | Sem teste de merge | **fixed** |
| Medium | `packet-panel.tsx` | Export só do `packets[0]` | **fixed** — export por linha |
| Medium | timestamps `>` exclusive | Send no mesmo ms que apply podia omitir o turno | **fixed** — `>=` |
| Medium | `portable-packet.test.ts` | Sem rejeição explícita de v2 | **fixed** |
| Medium | `packet-file.ts` | Erros `fs` podiam vazar path no IPC | **fixed** — mensagens genéricas |
| Low | diálogo exigia preview (e chave) para import | **fixed** — import/list sem preview |
| Low | `origin` labels plaintext no SQLite | **accepted** — só rótulos; payload cifrado |
| Low | `console.info("[hub:packet]")` no main | **accepted** — pré-existente; `redactSecrets` |
| Low | `conversationDtoSchema` não `.strict()` | **accepted** — extras já não atravessam o DTO |
| Out-of-wave | files/memories/skills no envelope | **out-of-wave** — ADR-W10-001 aponta v2 |

## Correlações

- W4/W6: send com packet aplicado volta a respeitar o path ativo; compact de envelope importado não apaga o grafo.
- W7: `packets:*` não envia; caps continuam no `chat:send`.
- W9: ticket opaco reutilizado (`AI_HUB_E2E_PACKET_FILE`).
- W11: diálogo Packet ainda é rato-primeiro; slash `/packet` fica na paleta.
- W12/W13: payload interno continua packet v0; não abrir slots de files no v1.
- W18: caps projeto/provider continuam fora.

## Riscos residuais

- e2e usa fixture + mock, não chaves reais nem diálogo nativo de ficheiro.
- Compact de um packet importado grande num modelo com janela menor → `context_overflow` (não corta o envelope).
- `origin` (labels) em plaintext.
- `AI_HUB_E2E_PACKET_FILE` só unpackaged (igual W9).
- macOS não exercitado.

## ADRs desta onda

- `docs/ADR/ADR-W10-001-portable-packet-json-v1.md`
- `docs/ADR/ADR-W10-002-context-packets-apply.md`
- `docs/ADR/ADR-W10-003-deterministic-inactive-summary-and-pins.md`

## Patches

- Freeze: `docs/reviews/W10/DIFF.patch`
- Pós-review: `docs/reviews/W10/DIFF-post-review.patch` (ficheiros tocados no review, vs HEAD; o freeze está no DIFF.patch)
