# REVIEW — Wave 19 (W19)

- **Wave:** W19 — Superpoderes desktop
- **Data:** 2026-09-20
- **Reviewer:** agent; passes independentes `w19_review` e `w19_trust`
- **Branch / HEAD (freeze):** `main` / working tree uncommitted

## DoD

| Critério | Resultado | Evidência |
|---|---|---|
| Atalho global abre Quick AI com o Hub oculto | pass | `main/index.ts`: `CommandOrControl+Shift+Space`, `BrowserWindow` isolada e tray |
| Pergunta volta no overlay | pass | `quick-ai-overlay.tsx` reutiliza `chat:send` e `chat:event` |
| Projeto atual ou avulsa | pass | checkbox cria conversa com `projectId` da sessão ou `null` |
| JSON oferece ações | pass | texto copiado + atalho abre ações formatar/explicar/interface; botão explícito lê clipboard |
| Stack trace pode ser diagnosticado | pass | detector puro e ação que preenche o prompt |
| Tray/background e quit vs hide | pass | hide no close, menu Quit e `before-quit` |
| Caps são respeitados | pass | mesmo `chat:send` aplica firewall, política, caps e receipts; estimativa inicial é informativa |

## Checklist

- [x] Main/preload/renderer mantêm sandbox, `contextIsolation` e `nodeIntegration: false`.
- [x] IPC novo é allowlisted e Zod-validado nos dois lados; leitura de clipboard só aceita a janela Quick AI e é redigida no main.
- [x] A seleção copiada de qualquer app entra apenas após atalho explícito; menu contextual também está disponível nas janelas Hub.
- [x] Fechar o overlay aborta stream ativo; botão Cancelar também aborta.
- [x] UI pt-BR + en; sem nova dependência.

## Findings

| Severidade | Resumo | Status |
|---|---|---|
| High | Clipboard bruto era pré-preenchido e capability estava exposta a qualquer renderer | fixed: redação no main + checagem de janela Quick AI |
| High | Overlay não oferecia cancelamento de stream | fixed: botão Cancelar e abort no unmount |
| Medium | Estimativa inicial não representa todo o packet compilado | accepted: label é estimativa; hard-stop autoritativo permanece em `chat:send` |
| Medium | Electron não captura seleção de outros processos diretamente | accepted: fluxo Windows usa copy + atalho explícito, sem monitoramento contínuo do clipboard |
| Low | Mensagens nativas de tray/context menu não seguem o i18n do renderer | accepted: são rótulos bilíngues no processo main |

## Validação

- `pnpm --filter @ai-hub/shared test -- --run` — 105 testes pass
- `pnpm --filter @ai-hub/shared typecheck` — pass
- `pnpm --filter @ai-hub/desktop typecheck` — pass
- `pnpm --filter @ai-hub/desktop lint` — pass
- `git diff --check` — pass

## ADR

- `docs/ADR/ADR-W19-001-shared-renderer-quick-ai-overlay.md`

## Patches

- `docs/reviews/W19/DIFF.patch`
- `docs/reviews/W19/DIFF-post-review.patch`
