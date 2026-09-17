# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W04** |
| Marco | B — MVP |
| State | `pending` |
| Last completed | **W03** |
| Next action | Wave 4 — Conversation branching (D4) |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W03 não revalidaram a janela Electron com chave real após o último gate (e2e W3 usa mock).
- macOS não exercitado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- FTS5 existe e fica vazia; W6 não pode popular plaintext sem nova decisão (ADR-W01-001).
- Redaction regex não cobre todos os formatos de chave colados na conversa.
- Caps (W7) ainda não hard-stopam `chat:send`.
- Zustand ainda não foi introduzido; W0–W3 usam `useState` (barulho vs stack travada).
- `AI_HUB_E2E=1` só liga mock se o app **não** está empacotado; unpackaged + env ainda é o caminho CI.

## Notes for the next session

- W04: regenerar/editar criam irmãos; **não** usar `deleteMessagesFrom` como wipe do ramo antigo. Compiler no path ativo. Continue/regenerate continuam a ser novo send.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W03/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W03-005-sandboxed-cjs-preload.md` |
