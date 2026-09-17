# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W03** |
| Marco | B — MVP |
| State | `pending` |
| Last completed | **W02** |
| Next action | Wave 3 — Chat core |

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

## Notes for the next session

- W03: composer (Enter envia, Stop), stream na bolha, markdown, restore de sessão, encadear `parentId`. Continue/regenerate = novo send (ADR-W02-003). Sem OpenRouter first-class (W5), sem UI polida de receipts (W7).

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W02/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W02-004-gateway-errors-and-receipts.md` |
