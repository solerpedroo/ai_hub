# REVIEW — Wave 0 (W00)

- **Wave:** W00 — Repo, shell, design system
- **Data:** 2026-09-15
- **Reviewer:** agent (síntese). Independentes: `wave-reviewer`, `trust-auditor`
- **Branch / HEAD:** `main` / `b611476f61724455e691737930f600ae88698f6f`
- **`security-review` / Bugbot Cursor:** não disparados (não pedidos pelo nome). O passe de confiança foi o subagente de projeto `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| `pnpm dev` abre janela no Windows | pass | `electron-vite dev` subiu renderer em `localhost:5173` e iniciou o Electron sem erro no log |
| Tema troca | pass | `theme.tsx` + Configurações + Ctrl+K |
| Nenhum secret no renderer | pass | grep; `window.hub` só chrome de janela |
| CSP no renderer | pass | `applyContentSecurityPolicy` em `session.webRequest.onHeadersReceived` |

Sub-tasks do plano: todas presentes em código (pnpm/turbo/eslint/prettier, electron-vite 3 processos, layout, shadcn pedido, i18n, gitignore, EditorConfig, CI, README).

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável
- [x] Sem feature de onda posterior (sem RAG/MCP/chat/keys/db)
- [x] Sem hooks de schema W1 (correto: W0 não cria tabelas)
- [x] Sem D* desta onda (D* começam depois)

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs
- [x] IPC com Zod (após fix: ida e volta)
- [x] Sem secrets em log/UI
- [x] Sem fallback de modelo (não há gateway)
- [x] `HubApi` alinhado preload/renderer (payload opcional removido)
- [x] Sem DB
- [x] i18n pt-BR + en
- [x] Streaming N/A
- [x] Spend caps N/A (sem send path de chat)

**Falhas**

- [x] Sem rede de provider nesta onda
- [x] Empty chrome não crasha
- [x] Ctrl/Cmd+K para palette de chrome

**Testes**

- [x] Contrato IPC/Zod com Vitest (após review)
- [x] Testes sem providers
- [x] Nenhum teste apagado
- [x] `pnpm typecheck` e `pnpm lint` ok após fixes; `pnpm test` 4/4
- [x] Este REVIEW + DIFF.patch (+ DIFF-post-review.patch)
- [x] ADRs W00-001..003 + índice

**Produto**

- [x] Empty state ensina a ir a Configurações
- [x] Tema também em texto na status bar

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| Medium | `packages/shared` (sem testes) | Contrato IPC/Zod sem testes | **fixed** — `ipc-schemas.test.ts` + Vitest + CI `pnpm test` |
| Medium | `apps/desktop/src/preload/index.ts` | Resultado de invoke só com `as Promise` | **fixed** — `ipcAckResultSchema` / `windowIsMaximizedResultSchema.parse` |
| Medium | `apps/desktop/src/main/index.ts` | `openExternal` sem allowlist | **fixed** — só `https:` |
| Medium | `apps/desktop/src/main/index.ts` | Sem lock de `will-navigate` / `will-redirect` | **fixed** — só localhost em dev, `file:` em prod |
| Medium | `components/ui/dialog.tsx` | Close sem nome acessível / i18n | **fixed** — `dialog.close` |
| Low | `command-palette.tsx` | Empty `"—"`; keys mortas | **fixed** em parte (`command.empty`, `command.theme`); `about.*` ainda não usadas |
| Low | `i18n.ts` | `html lang` estático | **fixed** — `document.documentElement.lang` no boot |
| Low | `hub-api.ts` | Payload opcional mentia o preload | **fixed** |
| Low | `tailwind.config.ts` | Inter sem ficheiro | **fixed** — Segoe UI / system-ui |
| Low | CSP dev | Sem `object-src` etc. | **fixed** — alinhado ao prod (exceto script/connect HMR) |
| Low | `appearance.ts` | enums não-Zod | **accepted** — W1 pode wrapping `z.enum` |
| Low | `isMaximized` não usado na titlebar | API existe, UI não reflete | **accepted** |
| Out-of-wave | theme/locale em localStorage | Correto por ADR-W00-002 | **out-of-wave** — W1 |

Nenhum Blocker ou High.

## Correlações

- Preload agora valida respostas; W1 deve copiar esse padrão para keys/DB, não reintroduzir `as Promise`.
- Navigation lock + allowlist `https:` devem permanecer quando o chat tiver links (W3).
- Overlay/Quick AI herdam a CSP de sessão (ADR-W00-003).
- Ctrl+K desta onda é chrome (tema), não a palette de produto da W11.
- Zustand continua adiado (ADR-W00-002).
- `pnpm-lock.yaml` precisa ir no git para o CI `--frozen-lockfile`.

## Riscos residuais

- App não foi reaberto após os locks de navegação (só typecheck/lint/test).
- macOS (Keychain, titlebar, notarização) não exercitado.
- Dev CSP ainda permite `unsafe-eval` para HMR (ADR-W00-003).
- Chaves `about.title` / `about.body` sem UI.
- Preferências em `localStorage` até W1.

## ADRs

- [ADR-W00-001-electron-vite-monorepo.md](../../ADR/ADR-W00-001-electron-vite-monorepo.md)
- [ADR-W00-002-shadcn-tailwind-i18n.md](../../ADR/ADR-W00-002-shadcn-tailwind-i18n.md)
- [ADR-W00-003-csp-and-window-ipc.md](../../ADR/ADR-W00-003-csp-and-window-ipc.md)

## Patches

- [DIFF.patch](./DIFF.patch) — freeze do que foi revisado
- [DIFF-post-review.patch](./DIFF-post-review.patch) — correções Medium/Low do gate
