# REVIEW — Wave 11 (W11)

- **Wave:** W11 — Teclado-primeiro
- **Data:** 2026-09-18
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](def174a7-7f1c-477d-a5b1-2a85fc99650e), [trust-auditor](3b0994d9-b414-4d57-8d36-df008effdb7c)
- **Branch / HEAD (freeze):** `main` / `b636dac4594160003ad591608f611909370b64aa` (working tree uncommitted; implementação Codex + gate)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Command Palette `Ctrl/Cmd+K`: nova conversa, modelo, projeto, export, providers, settings, import | pass | `command-palette.tsx`; e2e `keyboard.spec.ts` |
| Cheatsheet in-app | pass | `keyboard-shortcuts.tsx`; `Ctrl/Cmd+/`; status bar + paleta |
| Slash `/model` `/clear` `/compact` `/packet` `/cap` | pass | `runSlashCommand` + `matchKnownSlashCommand` no `submit()` |
| Paleta busca conversas/projetos (FTS) | pass (ADR-W11-002) | `search:query` W6; projetos no renderer; FTS5 continua vazio |
| **DoD:** avançado usa o Hub 10 min sem mouse nos fluxos principais | pass | e2e paleta + slash + Inbox/Importadas + `Ctrl+N` no composer |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável: `pnpm --filter @ai-hub/desktop typecheck`; e2e keyboard 2/2 (6.1s)
- [x] Sem feature de onda posterior (sem RAG, MCP, agentes, @-mentions, files, run modes)
- [x] Sem hooks de schema nesta onda (UI only)
- [x] Sem D* próprio; D1 (packet) só aberto via `/packet`

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs; preload/main/shared intocados
- [x] Sem canal IPC novo; busca reusa `search:query` (Zod W6)
- [x] Hits já passam por `redactSecrets`; paleta mostra título + snippet
- [x] Sem fallback silencioso; troca de modelo na paleta é explícita
- [x] Sem DTO novo
- [x] Sem migration
- [x] i18n pt-BR + en nas keys novas
- [x] Abort / crash-safe / caps intactos (slash conhecido não chama `chat:send`)
- [x] Paleta/slash não criam send path que fure tetos

**Falhas**

- [x] Slash conhecido no Send / Enter após Esc → ação local (High corrigido)
- [x] Empty states de conversa usam `{{modifier}}`
- [x] Windows-first; `Ctrl`/`⌘` via `window.hub.platform`

**Testes**

- [x] e2e paleta (ações, modelo, projeto, busca, cheatsheet, providers, import, settings, inbox, imported)
- [x] e2e slash happy path + Esc+Enter + `chat-send` + `/unknown` + `Ctrl+N`
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] typecheck + e2e após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W11-001..002 + índice

**Produto**

- [x] Cheatsheet lista atalhos e slashes em texto, não só ícone
- [x] Empty da paleta: `command.empty`; empty de conversas ensina `{{modifier}}+N`

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `chat-composer.tsx` `submit()` | Slash conhecido ia a `chat:send` via Send / Enter após Esc | **fixed** — `matchKnownSlashCommand` |
| Medium | `App.tsx` | `Ctrl/Cmd+N` e `Shift+N` engolidos com foco no composer | **fixed** |
| Medium | `en.json` / `pt-BR.json` | Empty state hardodava `Ctrl+N` | **fixed** — `{{modifier}}` |
| Medium | `command-palette.tsx` | Sem Inbox / Importadas | **fixed** |
| Medium | `keyboard.spec.ts` | Não cobria o furo Send/Esc | **fixed** |
| Low | locales `command.search` | Key órfã da paleta antiga | **accepted** |
| Low | `command-palette.tsx` | Falha de `search:query` parece “sem resultados” | **accepted** |
| Low | `command-palette.tsx` | Query da paleta sem aviso de secret (já W6) | **accepted** |
| Out-of-wave | ADR-W11-002 | Plano diz FTS; índice continua vazio | **accepted** — W6 |
| Out-of-wave | ADR-W11-001 | `/model gpt` (com espaço) vai ao modelo | **accepted** |

Sem Blocker. High e Medium in-wave corrigidos.

## Correlações

- **W6:** paleta reusa `search:query` (O(n), decrypt no main). W14 não pode assumir FTS5 populado.
- **W7:** nenhum send path novo; slash conhecido não chega ao gateway.
- **W10:** `/packet` só abre o dialog; compile/apply inalterados.
- **W12:** drag-drop no mesmo composer com listbox slash — não empilhar overlay sem teclado.
- **W13:** `@` é outro trigger; `/` fechado nesta onda.

## Riscos residuais

- `command.search` órfã; erro de busca na paleta sem status dedicado.
- Colar chave na paleta viaja em `search:query` (contrato W6, max 200).
- e2e Electron precisa do ABI nativo (`rebuild:native`); o primeiro launch desta sessão falhou até o rebuild.
- macOS não exercitado; modificador está abstraído.
- `/foo bar` e slash desconhecido continuam mensagem (ADR-W11-001).

## ADRs

- `docs/ADR/ADR-W11-001-slash-commands-local-ui.md`
- `docs/ADR/ADR-W11-002-palette-reuses-w6-search.md`

## Patches

- `docs/reviews/W11/DIFF.patch` (freeze: implementação Codex + ADRs)
- `docs/reviews/W11/DIFF-post-review.patch` (fixes do gate)
