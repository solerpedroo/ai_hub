# ADR-W00-003-csp-and-window-ipc

- **Status:** accepted
- **Onda:** W00
- **Data:** 2026-09-15
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O DoD exige CSP no renderer e zero secrets na UI. A janela é frameless (titlebar custom); minimizar/maximizar/fechar precisam de IPC. Toda IPC deve nascer com Zod, senão a Wave 1 herda canais soltos.

## Decisão

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- CSP via `session.webRequest.onHeadersReceived`: em produção, `default-src 'self'`; em dev, relaxa `script-src`/`connect-src` só o suficiente para HMR do Vite.
- Preload expõe apenas `window.hub.window.{minimize,maximize,close,isMaximized}` e `window.hub.platform`. Payloads validados com Zod em `packages/shared`.
- Nenhum SDK de provider, `fs`, `net` ou keytar no renderer.

## Alternativas consideradas

- **CSP só no `index.html`:** fácil de furar em navigation; headers na session são o controle real.
- **`frame: true` nativo:** menos IPC, pior densidade (não parece Linear/Cursor).
- **IPC sem Zod até Wave 1:** cria débito de canais untyped.

## Consequências

- Overlay/Quick AI futuros reutilizam o mesmo preload.
- Dev CSP é mais frouxo de propósito; prod é estrito.
- Risco aceito: sandbox + HMR no Windows podem exigir ajuste fino da CSP de desenvolvimento.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 0 DoD)
- `.cursorrules` §5
- `docs/reviews/W00/REVIEW.md`
