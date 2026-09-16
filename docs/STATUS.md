# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W02** |
| Marco | A — Foundation |
| State | `pending` |
| Last completed | **W01** |
| Next action | Começar Wave 2 — AI Gateway, streaming crash-safe, receipts, Compiler v0 |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00/W01 não revalidaram a janela Electron após o último gate (só typecheck/lint/test).
- macOS não exercitado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- FTS5 existe e fica vazia; W6 não pode popular plaintext sem nova decisão (ADR-W01-001).

## Notes for the next session

- W01 fechada: `docs/reviews/W01/REVIEW.md`.
- Sem chat/gateway ainda. Schema com hooks (branches, receipts, caps, import, packets).

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W01/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W01-004-message-graph-parent-branch.md` |
