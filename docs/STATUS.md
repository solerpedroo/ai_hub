# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W10** |
| Marco | B — MVP+ |
| State | `pending` |
| Last completed | **W09** |
| Next action | Portable Context Packet (D1): schema + preview + export/import |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W09 não revalidaram a janela Electron com chaves reais após o último gate (e2e usa mock).
- Instalador NSIS gerado no gate W08; install em máquina limpa não corrido.
- macOS não exercitado / não assinado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- Busca W6 decripta no main e **não** popula `messages_fts` (ADR-W06-001). Índice FTS5 continua vazio; O(n) local.
- Tags e `preferred_*` em plaintext (ADR-W06-004).
- Zustand ainda não foi introduzido; W0–W9 usam `useState` (barulho vs stack travada).
- `AI_HUB_E2E=1` só liga mock se o app **não** está empacotado; unpackaged + env ainda é o caminho CI.
- Caps projeto/provider ficam para W18; request/day/global já hard-stopam `chat:send`.
- Feed de auto-update (GitHub Releases) pode estar vazio; o check não derruba o app (`unavailable`/`skipped`).
- Crash dumps opt-in podem incluir memória do processo (anotações extra só version/platform).
- Import Hub: e2e com fixture ChatGPT, não ZIP real da OpenAI; cancel durante inflate/parse ainda síncrono no main; Gemini é activity log; ZIP Zip64/data descriptor → extrair JSON.

## Notes for the next session

- W09 fechada: Import Hub (D2). ChatGPT/Claude/Gemini, inbox Importadas virtual, idempotência `import_source+external_id`, receipts `source=import`.
- Próxima: W10 Portable Context Packet. Não implementar RAG, MCP, agentes, run modes, FTS plaintext.
- Plano W21/W24 (ADR-W09-001) continua lock de mapa, não código.
- Parsers: `@ai-hub/shared/import` só no main, nunca no barrel do renderer.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W09/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W09-004-vendor-parsers-and-opaque-ticket.md` |
