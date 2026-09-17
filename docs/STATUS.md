# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W05** |
| Marco | B — MVP |
| State | `pending` |
| Last completed | **W04** |
| Next action | Wave 5 — Providers + OpenRouter + vault |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W04 não revalidaram a janela Electron com chave real após o último gate (e2e usa mock).
- macOS não exercitado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- FTS5 existe e fica vazia; W6 não pode popular plaintext sem nova decisão (ADR-W01-001).
- Redaction regex não cobre todos os formatos de chave colados na conversa (export e logs).
- Caps (W7) ainda não hard-stopam `chat:send` (incluindo regenerate/edit).
- Zustand ainda não foi introduzido; W0–W4 usam `useState` (barulho vs stack travada).
- `AI_HUB_E2E=1` só liga mock se o app **não** está empacotado; unpackaged + env ainda é o caminho CI.
- `messages.update` IPC ainda muta user in-place (UI W4 já não usa).
- Labels de ramo em plaintext no SQLite (ADR-W04-004).

## Notes for the next session

- W05: OpenRouter first-class; adapters Anthropic/Gemini/Groq/custom; key nunca em SQLite nem no renderer. Caps continuam W7.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W04/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W04-004-export-json-main-process.md` |
