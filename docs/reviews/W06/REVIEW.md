# REVIEW — Wave 6 (W06)

- **Wave:** W06 — Projetos, tags, busca, model switch
- **Data:** 2026-09-17
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](3693d7ed-fbb1-42be-a642-ae231454f040), [trust-auditor](86798e71-adf4-43c1-b3a1-394264998949)
- **Branch / HEAD (freeze):** `main` / `d8577bcd445c0510608261ace37c292c7946ea5e` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| CRUD projetos (nome, cor, instruções, modelo/provider preferidos) | pass (pós-review) | Create/update na UI; delete + confirm + e2e `project-delete` após o gate |
| Conversas num projeto; inbox Avulsas | pass | `projectId: null`; `inbox-avulsas`; ADR-W06-002 |
| Tags em conversas | pass | `conversations:setTags`; chips em `home-view.tsx`; teste de repo |
| Busca por título/mensagem (não RAG) | pass | `searchWorkspace` decripta no main; FTS vazio (ADR-W06-001); e2e acha “Hello from mock” |
| Trocar modelo no meio da conversa via Compiler | pass | Mesmo `conversationId`; e2e GPT→Claude; `compiler.test.ts` |
| Aviso de context window + compactar | pass | `packetPreview.overflow` + `compactHistory` no Compiler (ADR-W06-003) |
| Badge de tokens do packet | pass | `chat:previewPacket` → `packet-badge` |
| Empty states; atalhos New Project / New Chat | pass | Inbox vazia + Ctrl/Cmd+N / Shift+N + paleta |
| Instruções do projeto sempre no packet | pass | `compilePacket` + teste de compact |
| DoD: 3 projetos; busca acha mensagem antiga; instruções no packet; GPT→Claude sem colar resumo | pass | e2e 3 projetos + search; compiler; e2e model switch |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código (delete de projeto era IPC-only no freeze; UI no pós-review)
- [x] DoD demonstrável (typecheck/lint/test; 7 e2e)
- [x] Sem feature de onda posterior (sem RAG/MCP/agents/caps/onboarding)
- [x] Hooks W1 (`spend_caps`, `import_jobs`, `messages_fts`) não implementam a feature futura; FTS permanece vazio
- [x] Sem D* desta onda além do Compiler no caminho feliz

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs/`better-sqlite3`
- [x] IPC Zod: `projects:update`, `conversations:setTags`, `search:query`, `chat:previewPacket`
- [x] Busca não popula plaintext FTS; snippets passam por `redactSecrets` (pós-review)
- [x] Sem fallback silencioso de **provider**; coerce de modelo no mesmo catálogo (W5) aceite
- [x] HubApi alinhado shared / preload / renderer
- [x] Migration 0004 `preferred_provider`; `user_version` 4
- [x] i18n pt-BR + en (incl. delete/confirm/tagRemove)
- [x] Abort / crash-safe intactos; compact não apaga o grafo
- [x] Caps N/A — W7 deve hard-stopar todos os modos de `chat:send` (já passam por `sendToModel`)

**Falhas**

- [x] Conversa/projeto em falta: erro Zod/main, não hang
- [x] Delete de projeto move chats para inbox (não wipe)
- [x] Windows-first; macOS não exercitado

**Testes**

- [x] 3 projetos + search + FTS=0; tags; redact em snippet; hit schema `.strict()`; compact do compiler; e2e 3 projetos, search, delete, GPT→Claude
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] typecheck + lint + test após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W06-001..005 + índice

**Produto**

- [x] Inbox / projeto vazio ensinam Ctrl+N; aviso de overflow em texto, não só cor
- [x] Model switch notice em texto

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `App.tsx` / `home-view.tsx` | CRUD sem delete na UI; ADR-W06-002 inalcançável | **fixed** — `project-delete` + confirm; chats → Avulsas; e2e |
| Medium | `repos.ts` `searchWorkspace` | Snippets sem `redactSecrets` | **fixed** — redact + clip 200/400 |
| Medium | `ipc-schemas.ts` `searchHitSchema` | Sem `.strict()` / teto de snippet | **fixed** — `.strict()`, max title 200 / snippet 400 + teste extra key |
| Medium | `App.tsx` `onOpenSearchHit` | `messageId` ignorado (ramo inativo) | **fixed** — `messages.activate` depois do open |
| Medium | `App.tsx` `onSaveProject` | Prefs só ao selecionar o projeto | **fixed** — `applyProjectPreferences` após update |
| Medium | `App.tsx` search effect | Resposta antiga podia sobrescrever hits | **fixed** — generation token |
| Medium | `repos.ts` search | Primeiros 50 hits em ordem de insert | **fixed** — `updatedAt` desc |
| Medium | `packet-preview.ts` / e2e | Sem teste de overflow/tags | **accepted** — compact no compiler; e2e cobre search/delete/switch |
| Medium | `App.tsx` catalog coerce | Mesmo provider: modelo inválido → primeiro do catálogo (W5) | **accepted** — não é fallback de provider; send ainda recusa modelo desconhecido |
| Medium | `chat-session.ts` / `packet-preview.ts` | Custom sem catálogo usa janela 128k | **accepted** — residual custom |
| Low | locales / `sidebar.tsx` | `empty.title` pouco usado; copy diz Ctrl+N | **accepted** |
| Low | `home-view.tsx` tags | Chip sem nome acessível de remover | **fixed** — `workspace.tagRemove` |
| Low | `migrations.ts` 0001 | FK `ON DELETE CASCADE` se alguém pular o UPDATE | **accepted** — `removeProject` anula `project_id` primeiro |
| Low | `chat-session.ts` `[hub:packet]` | Log de packet (W2) | **accepted** — residual STATUS |
| Out-of-wave | sem `conversations.update` projectId | Recolocar Avulsas num projeto | **out-of-wave** — W9 import |
| Out-of-wave | `sendChat` | Caps não hard-stopam | **out-of-wave** — W7 |

## Correlações

- **W7:** todo send (incl. compact) passa por `chat:send`; caps/receipts UI devem hookar o main, não um segundo caminho.
- **W9:** inbox `projectId: null` é o gancho certo; falta API para mover conversa de projeto.
- **W10 / D1:** Compiler injeta instruções do projeto e trim opcional; packet sem keys.
- **FTS:** `messages_fts` continua vazio (ADR-W06-001). Ondas futuras não devem inserir plaintext.

## Riscos residuais

- UAT com chaves reais e restart da janela Electron não corridos (e2e usa mock).
- Busca O(n) no main (ADR-W06-001).
- Tags e `preferred_*` em plaintext (ADR-W06-004).
- Redaction ainda não cobre todos os formatos de chave colados.
- Caps (W7) ainda não hard-stopam send.
- Custom / uncatalogued: janela 128k estimada.
- Coerce de modelo no mesmo provider quando o id sai do catálogo (W5).
- FK SQLite `ON DELETE CASCADE` se um caller futuro apagar projeto sem anular `project_id`.
- macOS não exercitado.

## ADRs

- `docs/ADR/ADR-W06-001-search-decrypt-not-plaintext-fts.md`
- `docs/ADR/ADR-W06-002-inbox-null-project.md`
- `docs/ADR/ADR-W06-003-compile-trim-context-window.md`
- `docs/ADR/ADR-W06-004-plaintext-conversation-tags.md`
- `docs/ADR/ADR-W06-005-model-switch-via-compiler.md`

## Patches

- Freeze (o que os reviewers viram): `docs/reviews/W06/DIFF.patch`
- Após High/Medium: `docs/reviews/W06/DIFF-post-review.patch` (working tree vs HEAD nos arquivos tocados no gate; inclui freeze + correções, porque a onda ainda não estava commitada)

## Delta (pós-review)

Fixes não estruturais o suficiente para `REVIEW-delta.md` separado: delete na UI, redact/clip da busca, schema de hit, activate no hit, prefs após save, generation da busca, e2e de delete. Re-typecheck, 35 shared + 18 db, lint desktop, 7 e2e verdes.
