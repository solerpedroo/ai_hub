# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W06** |
| Marco | B — MVP |
| State | `pending` |
| Last completed | **W05** |
| Next action | Wave 6 — Projetos, tags, busca, model switch |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W05 não revalidaram a janela Electron com chaves reais após o último gate (e2e usa mock).
- macOS não exercitado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- FTS5 existe e fica vazia; W6 não pode popular plaintext sem nova decisão (ADR-W01-001).
- Redaction regex não cobre todos os formatos de chave colados na conversa (export e logs).
- Caps (W7) ainda não hard-stopam `chat:send` (incluindo regenerate/edit).
- Falhas de chat não escrevem `health_samples` (só `secrets:test`).
- Zustand ainda não foi introduzido; W0–W5 usam `useState` (barulho vs stack travada).
- `AI_HUB_E2E=1` só liga mock se o app **não** está empacotado; unpackaged + env ainda é o caminho CI.
- `messages.update` IPC ainda muta user in-place (UI W4 já não usa).
- Labels de ramo em plaintext no SQLite (ADR-W04-004).

## Notes for the next session

- W06: CRUD de projetos (cor, instruções, modelo/provider preferidos), tags, FTS5, model switch via Compiler. Não implementar RAG.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W05/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W05-004-connection-test-health-samples.md` |
