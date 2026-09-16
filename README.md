# AI Hub Desktop

Camada de controle entre você e o ecossistema de IAs. Desktop (Windows first), BYOK, local-first. O modelo é um plug substituível; projeto, contexto, custo e dados ficam com o usuário.

**Código ainda não iniciado.** Próximo passo: Wave 0 — ver [`docs/STATUS.md`](docs/STATUS.md).

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

Setup da Wave 0 (quando existir): `pnpm install` && `pnpm dev`.
