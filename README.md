# AI Hub Desktop

Camada de controle entre você e o ecossistema de IAs. Desktop (Windows first), BYOK, local-first. O modelo é um plug substituível; projeto, contexto, custo e dados ficam com o usuário.

Onda atual: [`docs/STATUS.md`](docs/STATUS.md).

## Setup local (Windows)

Requisitos: Node.js 22+ e [pnpm](https://pnpm.io) 10 (via Corepack: `corepack enable`).

```bash
pnpm install
pnpm dev
```

Outros scripts na raiz:

- `pnpm typecheck` — TypeScript em `apps/desktop` e `packages/shared`
- `pnpm lint` — ESLint
- `pnpm build` — bundle Electron (sem instalador; isso é Wave 8)

A janela é frameless. Tema (claro/escuro/sistema) e idioma (pt-BR/en) ficam em Configurações. `Ctrl+K` abre um command palette só de chrome (tema).

## Docs

| Documento | Função |
|---|---|
| [Escopo](docs/AI_Hub_Desktop_Escopo.md) | Produto |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md) | Ondas, DoD, diferenciais |
| [STATUS](docs/STATUS.md) | Onde a implementação está agora |
| [ADRs](docs/ADR/README.md) | Decisões (`ADR-WXX-NNN-…`) |
| [Reviews](docs/reviews/README.md) | Close gate por onda |

## Agente (Cursor)

| Artefato | Função |
|---|---|
| [AGENTS.md](AGENTS.md) | Bootstrap de sessão |
| [.cursorrules](.cursorrules) | Constituição |
| `.cursor/rules/` | Regras por área |
| `.cursor/skills/` | wave-start, wave-close, write-adr |
| `.cursor/agents/` | wave-reviewer, trust-auditor |
