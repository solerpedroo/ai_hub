# REVIEW — Wave 12 (W12)

- **Wave:** W12 — Arquivos e multimodal básico
- **Data:** 2026-09-18
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](5d59b1cb-7fc8-4312-b993-6e271b9e602f), [trust-auditor](27215d66-2c6f-487e-bcc8-85331a0890eb); delta [wave-reviewer](4cd0678c-2ad6-49c1-9a20-a49bda0ff89e)
- **Branch / HEAD (freeze):** `main` / `3cc8327d314a4f8240f4bb30b335643ab15a30bf` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Drag/drop PDF, DOCX, TXT, MD, CSV, imagens, código | pass | `packages/files` classify + composer drop + `fromDrop` |
| Extração + preview + store no projeto | pass | `project_files` migration 8; DTO excerpt; extract cifrado |
| Imagem só se catalog `vision` (W5) | pass | `assertFileAttachmentAccess` + `files:vision_required` no send |
| Pasta → resumo v1 (stack, deps, README) | pass | `summarizeFolder`; e2e pasta Node contém `Node.js` |
| Limite de tamanho + aviso de tokens | pass | 8 MB / 8 ficheiros; chip + `files.tokenWarning` |
| Redactor antes do provider | pass | `redactSecrets` no persist e no `loadSendAttachments` |
| **DoD:** arrastar PDF e “resuma a seção 3” | pass | e2e `files.spec.ts` (2.4s); extract Flate no unit |
| **DoD:** pasta Node com stack detectada | pass | e2e `files.spec.ts` (2.2s); chip `Node.js` |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável: typecheck desktop + e2e files 2/2
- [x] Sem feature de onda posterior (sem @-mentions, RAG, MCP, agentes, run modes)
- [x] Hook: `project_files` + `fileIds` para W13 `@file`; packet v1 **não** leva extract
- [x] Sem D* novo; D1 packet continua sem ficheiros no envelope

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs; `fromDrop` resolve path só no preload
- [x] IPC Zod; `ingestDropped` removido da HubApi; `files:remove` exige `projectId`
- [x] Extract cifrado; DTO sem path/extract; `inspectablePacket` omite body do ficheiro
- [x] Sem fallback silencioso; imagem sem vision falha explícita
- [x] DTOs em shared + main + renderer
- [x] Migration 8 = schema
- [x] i18n pt-BR + en
- [x] Abort / crash-safe intactos
- [x] `fileIds` em send / regenerate / continue / edit / fallback; caps depois dos slices

**Falhas**

- [x] `files:vision_required|too_large|unsupported|project_mismatch|limit` mapeados
- [x] Empty attach não crasha
- [x] Windows-first; pasta com `realpath` + `isPathInsideRoot`

**Testes**

- [x] Extração PDF literal + FlateDecode; folder-summary; send-gate; path-guard; packet-ui
- [x] IPC extra keys em ingest/remove; extract não aparece no dump SQLite
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] typecheck + testes de pacote + e2e files após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch + REVIEW-delta.md
- [x] ADRs W12-001..004 + índice

**Produto**

- [x] Chip com excerpt / truncated / vision hint; aviso de tokens em texto
- [x] Erros de attach/send em i18n, não dump

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `hub-api.ts` / preload | `ingestDropped` expunha paths crus ao renderer | **fixed** — só `fromDrop` |
| High | `extract-pdf.ts` | Só literais Tj; PDF Flate real saía vazio | **fixed** — inflate + ADR-W12-004 |
| High | `files.ts` `persistFolder` | `resolve` sem garantir que `full` fica sob o root | **fixed** — `realpath` + `isPathInsideRoot` |
| Medium | `App.tsx` attach/drop | Erro genérico em vez de `workspaceErrorText` | **fixed** |
| Medium | `home-view.tsx` | Chip sem excerpt/truncated | **fixed** |
| Medium | `App.tsx` send paths | `fileIds` só em `mode: "send"` | **fixed** (incl. fallback preview) |
| Medium | `chat-session.ts` | `inspectablePacket` + `console.info` vazavam extract | **fixed** |
| Medium | `files:remove` | Qualquer UUID | **fixed** — `projectId` obrigatório |
| Medium | ingest FS | ENOENT com path no erro IPC | **fixed** — `files:unsupported` |
| Medium | `secret-paste.ts` | Sem PEM / AKIA / `ghp_` | **fixed** |
| Medium | testes | Sem vision/mismatch/Flate | **fixed** |
| Medium | `extract-pdf.ts` | `inflateSync` sem teto | **fixed** — `MAX_PDF_INFLATE_BYTES` 4 MiB |
| Low | e2e | Não assertava “Section 3” / “Node.js” | **fixed** |
| Low | `files:unsupported` para I/O | Copy fala em “tipo” | **accepted** |
| Low | paleta Inbox | Não limpa `attachedFiles` | **accepted** |
| Low | PDF CID / ToUnicode | Extração v1 best-effort | **accepted** — ADR-W12-004 |
| Low | `files:ingestPaths` | Canal ainda existe; renderer só via `fromDrop` | **accepted** |
| Low | `isPathInsideRoot` | Case-sensitive no Windows | **accepted** |
| Out-of-wave | packet aplicado | Label `extra-system` pode clipar 200 chars de system antigo | **accepted** |
| Out-of-wave | W13 | `@file` ainda não existe | **accepted** |

Sem Blocker. High e Medium in-wave corrigidos.

## Correlações

- **W5:** gate `catalog.vision`; imagens só em `ChatStreamRequest.images`.
- **W7:** `loadSendAttachments` corre antes dos caps; sem bypass.
- **W10:** export packet v1 **não** inclui ficheiros (ADR-W12-002).
- **W13:** `@file` deve reusar `project_files` + `fileIds` + `assertFileAttachmentAccess`.
- **W14:** RAG não assume extract no envelope portátil.

## Riscos residuais

- PDF sem ToUnicode / CID ainda pode sair vazio; e2e DoD usa fixture uncompressed (Flate só no unit).
- Nome do ficheiro em plaintext (como tags W6).
- Canal `files:ingestPaths` continua no main para o preload.
- `isPathInsideRoot` não normaliza casing no Windows (falso negativo, não escape).
- macOS não exercitado neste gate.

## ADRs

- `docs/ADR/ADR-W12-001-files-package-and-encrypted-extract.md`
- `docs/ADR/ADR-W12-002-files-inject-as-compiler-slices.md`
- `docs/ADR/ADR-W12-003-vision-images-on-stream-not-packet.md`
- `docs/ADR/ADR-W12-004-pdf-flatedecode-inflate.md`

## Patches

- `docs/reviews/W12/DIFF.patch` (freeze: implementação W12)
- `docs/reviews/W12/DIFF-post-review.patch` (fixes do gate)
- `docs/reviews/W12/REVIEW-delta.md` (delta estrutural: PDF + IPC)
