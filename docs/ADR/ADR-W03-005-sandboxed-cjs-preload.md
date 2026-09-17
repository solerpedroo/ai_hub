# ADR-W03-005-sandboxed-cjs-preload

- **Status:** accepted
- **Onda:** W03
- **Data:** 2026-09-16
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A Wave 3 exige Playwright no Electron já built (`file://` + `sandbox: true`). O preload ESM (`.mjs`) com `zod` externalizado não carrega no renderer sandboxed: `window.hub` fica `undefined`. Scripts Vite com `crossorigin` também falham no protocolo `file://`.

## Decisão

- Preload de produção em **CJS** (`out/preload/index.cjs`), com `zod` e `@ai-hub/shared` **empacotados** (não externalizados). `electron` continua externo.
- `sandbox: true` permanece (ADR-W00-003).
- HTML do renderer sem atributo `crossorigin`, para o bundle `file://` executar.

## Alternativas consideradas

- **Desligar `sandbox`:** enfraquece a trust boundary.
- **Interceptar `fetch` no e2e em vez de lançar o build:** rejeitado em ADR-W03-004.

## Consequências

- `pnpm dev` pode emitir preload `.mjs`; o main resolve `index.cjs` / `index.mjs` / `index.js`.
- Waves futuras não devem voltar a externalizar `zod` no preload sandboxed.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 3)
- `docs/ADR/ADR-W00-003-csp-and-window-ipc.md`
- `docs/ADR/ADR-W03-004-e2e-mock-adapter.md`
- `docs/reviews/W03/REVIEW.md`
