# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W01** (pending) |
| Marco | A — Foundation |
| State | `pending` |
| Last completed | **W00** |
| Next action | Wave 1: trust boundary, DB, keytar, IPC Zod além da janela (`docs/IMPLEMENTATION_PLAN.md` § Wave 1) |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00 não revalidou a janela após locks de navegação/`openExternal`.
- macOS não exercitado.
- Tema/idioma ainda em `localStorage` até W1.
- Dev CSP com `unsafe-eval` para HMR (aceito em ADR-W00-003).

## Notes for the next session

- W00 fechada: `docs/reviews/W00/REVIEW.md`.
- Não implementar chat/gateway em W1. Schema nasce com hooks (branches, receipts, caps) sem features posteriores.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W00/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W00-003-csp-and-window-ipc.md` |
