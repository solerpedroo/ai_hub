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

- `pnpm typecheck` — TypeScript em `apps/desktop` e `packages/*`
- `pnpm lint` — ESLint
- `pnpm test` — Vitest (sem chaves reais)
- `pnpm build` — bundle Electron
- `pnpm --filter @ai-hub/desktop dist` — instalador NSIS em `apps/desktop/release/`

Após o install, `pnpm dev` recompila nativos para o Electron. `pnpm test` no pacote `db` restaura o ABI do Node se o binário estiver no ABI do Electron.

A janela é frameless. Projetos e conversas ficam no SQLite local (campos sensíveis em envelope AES-GCM). Tema/idioma persistem em `settings`. Chaves de API vão para o Credential Manager. `Ctrl+K` abre um command palette de chrome (tema). First-run: idioma → um provider (OpenRouter em destaque) → teste → composer.

## Limitações do MVP

- Windows first. **Sem build macOS assinado.**
- Sem RAG, MCP, agentes, packet portátil completo, artifacts, skills, @-mentions, sync ou team.
- Import Hub: ChatGPT (ZIP/JSON), Claude JSON e Gemini `MyActivity.json` (best-effort). Takeout HTML do Gemini não é suportado. Anexos binários viram placeholder. Reimport do mesmo `external_id` não duplica.
- Auto-update consulta GitHub Releases; feed vazio/fora **não** fecha o app.
- Crash dumps são **opt-in** e só locais (sem upload, sem conversa).
- e2e de CI usa adapter mock (`AI_HUB_E2E=1`), não chaves reais.

UAT: [`docs/UAT-MVP.md`](docs/UAT-MVP.md).

## Docs

| Documento | Função |
|---|---|
| [Escopo](docs/AI_Hub_Desktop_Escopo.md) | Produto |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md) | Ondas, DoD, diferenciais |
| [STATUS](docs/STATUS.md) | Onde a implementação está agora |
| [UAT MVP](docs/UAT-MVP.md) | Checklist da Wave 8 |
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
