# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W07** |
| Marco | B — MVP |
| State | `pending` |
| Last completed | **W06** |
| Next action | Wave 7 — Receipts UI + spend caps + provider health |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W06 não revalidaram a janela Electron com chaves reais após o último gate (e2e usa mock).
- macOS não exercitado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- Busca W6 decripta no main e **não** popula `messages_fts` (ADR-W06-001). Índice FTS5 continua vazio; O(n) local.
- Tags e `preferred_*` em plaintext (ADR-W06-004).
- Redaction regex não cobre todos os formatos de chave colados na conversa (export e logs).
- Caps (W7) ainda não hard-stopam `chat:send` (incluindo regenerate/edit/compact).
- Falhas de chat não escrevem `health_samples` (só `secrets:test`).
- Zustand ainda não foi introduzido; W0–W6 usam `useState` (barulho vs stack travada).
- `AI_HUB_E2E=1` só liga mock se o app **não** está empacotado; unpackaged + env ainda é o caminho CI.
- `messages.update` IPC ainda muta user in-place (UI W4 já não usa).
- Labels de ramo em plaintext no SQLite (ADR-W04-004).
- Custom / uncatalogued: compact/preview usam janela 128k estimada.
- Coerce de modelo no mesmo provider quando o id sai do catálogo (W5).
- Schema 0001 ainda tem `ON DELETE CASCADE` em `conversations.project_id`; o app anula antes de apagar.

## Notes for the next session

- W07: receipts visíveis, spend caps hard-stop, health na status bar. Todo send já passa por `chat:send` (incl. compact). Não popular FTS plaintext.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W06/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W06-005-model-switch-via-compiler.md` |
