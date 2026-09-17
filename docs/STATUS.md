# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W03** |
| Marco | B — MVP |
| State | `in_progress` |
| Last completed | **W02** |
| Next action | Chat core: composer, bolhas markdown, restore, Playwright mock |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W02 não revalidaram a janela Electron com chave real após o último gate (só typecheck/lint/test + fixtures).
- macOS não exercitado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- FTS5 existe e fica vazia; W6 não pode popular plaintext sem nova decisão (ADR-W01-001).
- Redaction regex não cobre todos os formatos de chave colados na conversa.
- Caps (W7) ainda não hard-stopam `chat:send`.
- Zustand ainda não foi introduzido; W0–W3 usam `useState` (barulho vs stack travada).

## Notes for the next session

- W03 em curso: composer + bolhas markdown + restore + Playwright mock. Não fechar sem o gate §9. W4 branching, W5 OpenRouter, W7 receipts/caps.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W02/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W03-005-sandboxed-cjs-preload.md` |
