# ADR-W00-001-electron-vite-monorepo

- **Status:** accepted
- **Onda:** W00
- **Data:** 2026-09-15
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano trava Electron + React + TypeScript. Precisamos de um empacotador que trate main, preload e renderer como três bundles, com HMR no renderer e rebuild do processo principal.

## Decisão

Usar **electron-vite** no app `apps/desktop`, com três entradas (`main`, `preload`, `renderer`). Monorepo **pnpm workspaces + Turborepo**. Pacotes nesta onda: `apps/desktop` e `packages/shared`. Não criar `db` / `security` / `ai-gateway` vazios.

## Alternativas consideradas

- **Tauri:** mais leve, mas MCP/SQLite/SDKs Node custam mais; o plano já recusou.
- **electron-forge:** maduro, mas o DX de Vite no renderer é pior que electron-vite.
- **Pacote único sem monorepo:** simples agora, quebra o contrato de `packages/shared` nas ondas seguintes.

## Consequências

- Renderer isolado; preload estreito; main dono da janela e da CSP.
- Turborepo orquestra `dev` / `build` / `typecheck` / `lint`.
- Risco aceito: Wave 0 verificada em Windows; macOS só na arquitetura (atalhos/paths).

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 0, decisões de arquitetura)
- `docs/reviews/W00/REVIEW.md`
