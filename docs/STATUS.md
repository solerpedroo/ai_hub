# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W08** |
| Marco | B — MVP |
| State | `pending` |
| Last completed | **W07** |
| Next action | Wave 8 — onboarding <90s + installer + ship MVP |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W07 não revalidaram a janela Electron com chaves reais após o último gate (e2e usa mock).
- macOS não exercitado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- Busca W6 decripta no main e **não** popula `messages_fts` (ADR-W06-001). Índice FTS5 continua vazio; O(n) local.
- Tags e `preferred_*` em plaintext (ADR-W06-004).
- Redaction regex não cobre todos os formatos de chave colados na conversa (export e logs).
- Zustand ainda não foi introduzido; W0–W7 usam `useState` (barulho vs stack travada).
- `AI_HUB_E2E=1` só liga mock se o app **não** está empacotado; unpackaged + env ainda é o caminho CI.
- `messages.update` IPC ainda muta user in-place (UI W4 já não usa).
- Labels de ramo em plaintext no SQLite (ADR-W04-004).
- Custom / uncatalogued: compact/preview usam janela 128k estimada; sem preço no catálogo o request-cap por estimativa é skip (ADR-W07-001).
- Coerce de modelo no mesmo provider quando o id sai do catálogo (W5).
- Schema 0001 ainda tem `ON DELETE CASCADE` em `conversations.project_id`; o app anula antes de apagar.
- Caps projeto/provider ficam para W18; request/day/global já hard-stopam `chat:send`.
- Estimativa de output usa `maxTokens` ou 1024 tokens.
- Gemini 429 pode mapear para `rate_limit` (retry transiente) em vez de `quota`.

## Notes for the next session

- W07 fechada: receipts + modal, caps hard-stop, health na status bar (com errorRate), retry transiente, fallback explícito, debug sem auth.
- Não popular FTS plaintext. Não começar W08 sem o utilizador pedir.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W07/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W07-005-retry-transient-only.md` |
