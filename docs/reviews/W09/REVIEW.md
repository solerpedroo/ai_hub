# REVIEW — Wave 9 (W09)

- **Wave:** W09 — Import Hub (D2)
- **Data:** 2026-09-17
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](33f8e0dc-bece-4e45-9694-65c015ad109b), [trust-auditor](cb63337e-4ee9-49ae-9538-d4309075af5d)
- **Branch / HEAD (freeze):** `main` / `4d45cafe85a67e6b4ef5bb87caf568600597f1a9` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Parser ChatGPT ZIP/JSON `conversations.json` | pass | `packages/shared/src/import/chatgpt.ts`, `zip.ts`, `parse.test.ts` |
| Parser Claude JSON oficial | pass | `claude.ts`; array, `{ conversations }`, objeto único com `chat_messages` |
| Parser Gemini best-effort + limitações | pass | `gemini.ts`; copy `import.geminiLimits`; HTML Takeout rejeitado |
| Job: progresso, cancelar, relatório ok/skip/erro | pass | `import-job.ts`, `import-view.tsx`; e2e ok/skip; cancel via AbortController (parse ainda síncrono) |
| Idempotência `import_source` + `external_id` | pass | ADR-W09-002; índice único parcial; `repos.test.ts`; e2e reimport skipped |
| Destino: projeto ou inbox Importadas | pass | ADR-W09-003; `listConversations(..., inbox)`; sidebar `inbox-imported` |
| Mapear user/assistant, timestamps, título | pass | parsers + `createMessage({ createdAtMs })` |
| Receipts `source=import`, custo `null` | pass | `importConversation` só em assistant; e2e `receipt-source` |
| Sem anexos binários; placeholder `[file not imported]` | pass | constante + fixture + e2e |
| Testes com fixtures pequenas anonimizadas | pass | `parse.test.ts` (9), `repos.test.ts`, e2e fixture ChatGPT |
| **DoD:** export ChatGPT → conversas navegáveis; reimport não duplica | pass (formato oficial, fixture anonimizada) | e2e `import.spec.ts` |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável: typecheck; shared 69; security 10; db 21; gateway 37; e2e 12/12
- [x] Sem feature de onda posterior (sem packet W10, RAG, MCP, agentes, run modes)
- [x] Hooks de schema só os desta onda (`import_source`, `external_id`, `message_receipts.source`); `import_jobs` já existia na W1
- [x] D2 desta onda implementado (não deferido)

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs/`better-sqlite3`; parsers via `@ai-hub/shared/import` só no main; `tsconfig.web.json` exclude `import/**`
- [x] IPC Zod: `import:pickFile/start/cancel/event`, `conversations:move`; start rejeita `path`
- [x] Ticket opaco; path só no Map do main; eventos de progresso sem texto; relatório só contagens + códigos `empty`/`failed`
- [x] Sem fallback silencioso; import não é send path; caps somam `null` como 0
- [x] HubApi alinhado shared / preload / renderer
- [x] Migration 6; `user_version` 6
- [x] i18n pt-BR + en
- [x] Abort / crash-safe / caps intactos no chat
- [x] Novo caminho (import) não chama `chat:send`

**Falhas**

- [x] HTML Takeout / JSON inválido → erro i18n, não hang
- [x] Inbox vazia de importadas tem empty state
- [x] Windows-first; ZIP Zip64/data descriptor residual (ADR-W09-004)

**Testes**

- [x] Parsers (path ativo, BOM, ZIP deflate, Claude objeto único, Gemini, HTML)
- [x] IPC start sem path; relatório sem título/`externalId`
- [x] DB idempotência + move + receipt import
- [x] e2e Import Hub + regressão W3–W8 (12/12)
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] typecheck + test após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W09-001..004 + índice

**Produto**

- [x] Empty state Importadas ensina o Import Hub
- [x] Receipts de import mostram origem em texto (`receipt-source`), não só cor

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High (trust) | `import-job.ts` / `importItemErrorSchema` | Relatório `done` levava `title` + `externalId` no IPC, React state e `import_jobs.report_json` plaintext | **fixed** — só `reason: empty \| failed`; teste IPC rejeita título/id |
| Medium (trust) | `zip.ts` | `inflateRawSync` sem teto; ZIP bomb no processo com master key | **fixed** — 256 entradas, 32 MiB `maxOutputLength` |
| Medium | `claude.ts` | JSON de uma conversa (`chat_messages` na raiz) falhava | **fixed** + teste |
| Medium | `chatgpt.ts` | Path ativo com irmão inativo sem teste | **fixed** — `parse.test.ts` |
| Medium | `import-view.tsx` | Erros só como contagem | **fixed** — i18n por código, sem ids |
| Medium | `App.tsx` `onRemoveProject` | Apagar projeto abria Avulsas mesmo se o chat era importado | **fixed** — se `importSource`, vai a Importadas |
| Medium | `import-job.ts` | Cancel só depois de parse; event loop no inflate | **accepted** (parcial: abort após `readFile`) — parse ZIP continua síncrono; residual |
| Medium | parsers | Conversas malformadas dropadas sem linha de erro | **accepted** — DoD é path reconhecido; dump incompleto ≠ erro de job |
| Low | `importItemErrorSchema` | `externalId` no renderer | **fixed** com o High |
| Low | tickets Map | Paths até exit se pick sem start | **fixed** — `tickets.clear()` em cada pick |
| Low | `STATUS.md` Latest ADR | Apontava W09-001 | **fixed** — W09-004 |
| Low | ZIP Zip64 / bit 3 | Falha; utilizador extrai JSON | **accepted** — ADR-W09-004 |
| Out-of-wave | packet / RAG / MCP / agentes | — | **out-of-wave** |

## Correlações

- W6 busca: importadas com `projectId` null; `App.tsx` faz fallback para inbox imported. FTS5 continua vazio (ADR-W06-001).
- W7 caps: receipts import `costUsd` null não inflacionam spend. Continuar o fio usa `chat:send`.
- W4 ramos: só `current_node` do ChatGPT (ADR-W09-004).
- W10 packets: conversas importadas são grafo linear + receipts `source=import`; packet ainda não existe.
- W11: paleta já abre Import Hub; resto da paleta continua W11.
- ADR-W09-001 continua lock de **plano** W21/W24, não código desta onda.

## Riscos residuais

- e2e usa fixture no formato ChatGPT, não um ZIP real da OpenAI.
- Cancel durante inflate/parse ainda não interrompe o CPU do main.
- Gemini é activity log; threads incompletos são esperados.
- ZIP Zip64 / data descriptor: extrair JSON.
- `conversations.external_id` plaintext para idempotência (ADR-W09-002).
- macOS não exercitado.

## ADRs desta onda

- `docs/ADR/ADR-W09-001-run-modes-and-agent-orchestration-waves.md` (mapa futuro)
- `docs/ADR/ADR-W09-002-import-identity-and-receipt-source.md`
- `docs/ADR/ADR-W09-003-imported-inbox-not-sentinel-project.md`
- `docs/ADR/ADR-W09-004-vendor-parsers-and-opaque-ticket.md`

## Patches

- Freeze: `docs/reviews/W09/DIFF.patch`
- Pós-review: `docs/reviews/W09/DIFF-post-review.patch`
