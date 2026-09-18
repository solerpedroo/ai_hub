# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W09** |
| Marco | B — MVP+ |
| State | `pending` |
| Last completed | **W08** |
| Next action | Wave 9 — Import Hub |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W08 não revalidaram a janela Electron com chaves reais após o último gate (e2e usa mock).
- Instalador NSIS gerado no gate; install em máquina limpa não corrido.
- macOS não exercitado / não assinado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- Busca W6 decripta no main e **não** popula `messages_fts` (ADR-W06-001). Índice FTS5 continua vazio; O(n) local.
- Tags e `preferred_*` em plaintext (ADR-W06-004).
- Zustand ainda não foi introduzido; W0–W8 usam `useState` (barulho vs stack travada).
- `AI_HUB_E2E=1` só liga mock se o app **não** está empacotado; unpackaged + env ainda é o caminho CI.
- Caps projeto/provider ficam para W18; request/day/global já hard-stopam `chat:send`.
- Feed de auto-update (GitHub Releases) pode estar vazio; o check não derruba o app (`unavailable`/`skipped`).
- Crash dumps opt-in podem incluir memória do processo (anotações extra só version/platform).

## Notes for the next session

- W08 fechada: wizard <90s, aviso de secret no composer, NSIS, electron-updater, crash opt-in local.
- Plano atualizado (ADR-W09-001): duas ondas novas — **W21** run modes + HUD de tokens (D13); **W24** orquestração (D14). MCP deslocou para W22; agente único W23; marcos D/E até W31. **Não implementar isso agora.**
- Não popular FTS plaintext. Não começar W09 sem o utilizador pedir. Não pular para agentes.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W08/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W09-001-run-modes-and-agent-orchestration-waves.md` |
