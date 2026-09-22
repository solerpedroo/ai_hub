# Review — W24

- **Data:** 2026-09-22
- **Branch / HEAD:** working tree / HEAD not committed
- **Revisores:** Codex + independent wave reviewer + trust auditor
- **Patch congelado:** `docs/reviews/W24/DIFF.patch`
- **ADR:** `docs/ADR/ADR-W24-001-persisted-orchestration-graph-and-handoffs.md`

## DoD

Passou: o modo Orquestrar executa supervisor, Explorer e Reviewer com limite de dois filhos paralelos, transforma os resultados em handoffs cifrados e libera o Writer. A UI mostra papéis, estado, tokens/custo e controles de pausa/cancelamento; uma negação de leitura fica localizada no nó. Os filhos usam somente o Permission Center e o filesystem scoped.

## Checklist

- DoD e subtarefas: pass
- Trust boundary, IPC Zod e DTOs redigidos: pass
- Migration aditiva e cifragem de handoffs: pass
- Sem fallback silencioso: pass
- i18n pt-BR/en: pass
- Caps: preflight N× e reserva pessimista do orçamento completo antes do dispatch: pass
- Testes, typecheck, lint e build: pass

## Achados e correções

| Severidade | Achado | Status |
|---|---|---|
| Blocker | Reserva inicial não cobria os pacotes que crescem com arquivos/handoffs. | Corrigido: reserva o orçamento completo particionado (.4/.4/.2) antes do dispatch. |
| High | Filhos eram controláveis pela API pública W23. | Corrigido: `agents:*` aceita apenas runs `single`; scheduler usa caminho interno identificado pela raiz. |
| High | Retomada perdia o escopo da orquestração. | Corrigido: contexto da raiz e `skipCaps` persistem no restart. |
| High | Diálogos de Permission Center podiam concorrer. | Corrigido: fila main-owned para diálogo nativo. |
| Medium | Crash não interrompia handoffs pendentes/prontos. | Corrigido. |
| Low | Falha do scheduler não possui taxonomia detalhada exposta. | Aceito: estado terminal é persistido sem vazar conteúdo; taxonomia fica para evolução do observability. |

## Correlações e riscos residuais

- W25 pode reutilizar o grafo, mas terminal/Git continuam fora de escopo.
- O transcript normal ainda recebe a resposta gerada pelo caminho de chat; o conteúdo de handoff em repouso permanece cifrado e os DTOs do grafo são redigidos.
- Cobertura de contrato e persistência está presente; o fluxo real de diálogo nativo continua coberto indiretamente pelo Permission Center, sem provider real no CI.

## Verificações

- `pnpm --filter @ai-hub/shared test` — 115 testes
- `pnpm --filter @ai-hub/db test` — 31 testes
- `pnpm --filter @ai-hub/desktop typecheck`
- `pnpm --filter @ai-hub/desktop lint`
- `pnpm --filter @ai-hub/desktop build`

