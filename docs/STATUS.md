# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W11** |
| Marco | C — V1 |
| State | `pending` |
| Last completed | **W10** |
| Next action | Teclado-primeiro: Command Palette + cheatsheet + slash commands |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W10 não revalidaram a janela Electron com chaves reais após o último gate (e2e usa mock).
- Instalador NSIS gerado no gate W08; install em máquina limpa não corrido.
- macOS não exercitado / não assinado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node.
- Busca W6 decripta no main e **não** popula `messages_fts` (ADR-W06-001). Índice FTS5 continua vazio; O(n) local.
- Tags e `preferred_*` em plaintext (ADR-W06-004).
- Zustand ainda não foi introduzido; W0–W10 usam `useState` (barulho vs stack travada).
- `AI_HUB_E2E=1` só liga mock se o app **não** está empacotado; unpackaged + env ainda é o caminho CI.
- Caps projeto/provider ficam para W18; request/day/global já hard-stopam `chat:send`.
- Feed de auto-update (GitHub Releases) pode estar vazio; o check não derruba o app (`unavailable`/`skipped`).
- Crash dumps opt-in podem incluir memória do processo (anotações extra só version/platform).
- Import Hub: e2e com fixture ChatGPT, não ZIP real da OpenAI; cancel durante inflate/parse ainda síncrono no main; Gemini é activity log; ZIP Zip64/data descriptor → extrair JSON.
- Packet importado grande + modelo com janela menor → `context_overflow` (compact não corta o envelope). Labels `origin` em plaintext.

## Notes for the next session

- W10 fechada. Próxima: **W11 Teclado-primeiro** (palette `Ctrl/Cmd+K`, cheatsheet, slash `/model /clear /compact /packet /cap`).
- Não implementar arquivos W12, @-mentions, RAG, MCP, agentes, run modes.
- Packet: apply só no mesmo projeto; move limpa o ponteiro; send leva `privacyMode`.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W10/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W10-003-deterministic-inactive-summary-and-pins.md` |
