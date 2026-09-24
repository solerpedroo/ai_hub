# STATUS — AI Hub Desktop

Living session file. Agents **read this first** and **update it** when the wave changes. Keep it short.

## Current

| Field | Value |
|---|---|
| Wave | **W28** |
| Marco | E — V3 ecosystem |
| State | `pending` |
| Last completed | **W27** |
| Next action | Iniciar Wave 28 (Voice Mode) com skill `wave-start`. |

`State` is one of: `pending` | `in_progress` | `review` | `blocked` | `complete`.

## Blockers

None.

## Open residual risks

- W00–W17 não revalidaram a janela Electron com chaves reais após o último gate (e2e usa mock).
- Instalador NSIS gerado no gate W08; install em máquina limpa não corrido.
- macOS não exercitado / não assinado.
- Dev CSP com `unsafe-eval` para HMR (ADR-W00-003).
- `better-sqlite3` tem um binário só: `pnpm dev` recompila para Electron; `pnpm test` no `db` restaura o ABI do Node. e2e precisa de `rebuild:native`.
- Busca W6/W11 decripta no main e **não** popula `messages_fts` (ADR-W06-001, ADR-W11-002). Índice FTS5 continua vazio; O(n) local. Paleta reusa o mesmo `search:query`.
- Tags e `preferred_*` em plaintext (ADR-W06-004). Skills: `preferred_model` plaintext (ADR-W17-003).
- Zustand ainda não foi introduzido; W0–W17 usam `useState` (barulho vs stack travada).
- `AI_HUB_E2E=1` só liga mock se o app **não** está empacotado; unpackaged + env ainda é o caminho CI.
- Caps projeto/provider ficam para W18; request/day/global já hard-stopam `chat:send` (incl. skill) e o preflight N× do playground.
- Feed de auto-update (GitHub Releases) pode estar vazio; o check não derruba o app (`unavailable`/`skipped`).
- Crash dumps opt-in podem incluir memória do processo (anotações extra só version/platform).
- Import Hub: e2e com fixture ChatGPT, não ZIP real da OpenAI; cancel durante inflate/parse ainda síncrono no main; Gemini é activity log; ZIP Zip64/data descriptor → extrair JSON.
- Packet importado grande + modelo com janela menor → `context_overflow` (compact não corta o envelope). Labels `origin` em plaintext.
- Paleta: falha de `search:query` parece lista vazia; key `command.search` órfã; colar secret na paleta herda o contrato W6.
- PDF W12: extração v1 (Tj + FlateDecode). CID/ToUnicode pode sair vazio. Nome do ficheiro em plaintext. Canal `files:ingestPaths` existe só para o preload.
- Mentions W13: resolver sem teste de DB; edit/regenerate não re-injeta menções; query sem espaço; `@conversation` da conversa atual é skip silencioso.
- W14: embeddings hashed (não MiniLM); attach nativo ainda teto 8; packet aplicado pode reenviar/duplicar memórias gravadas no envelope; decrypt de todos os vetores no send.
- W15: conversas `kind=playground` sem GC; `waitForChatRun` sem timeout; UI `running` cai quando o IPC devolve (streams podem continuar); títulos factory em inglês na DB.
- W16: `navigate-to 'none'` pode ser no-op; locks Electron fecham o iframe. Capture de artifact falha em silêncio. Lista IPC teto 100. Pin é família, não galeria de projeto. Bundle mermaid no renderer.
- W17: stepper não segue headings do stream; palette só corre Code Review por atalho; factory títulos EN na DB; `skills:list` devolve prompt no renderer (como prompts W15).
- W23: não há teste isolado do runner para cancelamento durante diálogo nativo/timeout; `skill.steps[]` orienta a síntese e a allowlist executa a leitura, mas ainda não há grafo de tool por etapa.
- W26: nesta máquina Ollama CUDA falhou (`device kernel image is invalid`); prova física usou CPU. Caps batch (council/playground) ainda podem hard-stopar Ollama com teto USD esgotado; chat path isenta.
- W27: UI de Notes não coleta tags no save nem mostra timestamps; hit de busca `kind=note` não abre o painel; sem teste isolado de `prepareResearch`; Research sem fontes indexadas usa placeholder; tags de notes em plaintext (W06).

## Notes for the next session

- W27 fechada: Notes cifradas por projeto; Tasks from message; Study (4 factory skills); Research via orquestração `graphVersion: 2` + artifact citável. Gate em `docs/reviews/W27/`.
- W26 fechada: Ollama first-class sem keytar; fallback local com confirmação; receipts custo 0; badge offline; embeddings hashed continuam offline. Prova física em `docs/reviews/W26/PHYSICAL-DOD.md`.
- W17 fechada. Skills cifradas; `/skill` + `@skill`; contrato `tools: []` para W23.
- W18 fechada: Privacy Center, Context Firewall, Cost Tracker e caps por projeto/provider.
- W19 fechada: Quick AI, clipboard intelligence, seleção via copy + atalho e tray/background.
- W22 fechada: MCP scoped ao projeto, Permission Center no main, HUD redigido e allowlist declarativa para skills.

## Last review / ADR

| Kind | Path |
|---|---|
| Review | `docs/reviews/W27/REVIEW.md` |
| Latest ADR | `docs/ADR/ADR-W27-001-project-notes-and-research-graph.md` |
