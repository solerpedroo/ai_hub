# REVIEW — Wave 20 (W20)

- **Wave:** W20 — Multi-modelo, Council, Router
- **Data:** 2026-09-20
- **Reviewer:** `w20_actual_close` + delta review independente
- **Status:** passed with residual risks

## DoD

| Critério | Resultado | Evidência |
|---|---|---|
| Comparação N-modelos com o mesmo packet | pass | Packet preparado/persistido antes do primeiro dispatch; `councilRole` é metadata de adapter e não altera o packet auditável. |
| Colunas como ramos W4 | pass | Slots usam `regenerate` na conversa ativa e a UI renderiza as respostas em grid. |
| Debate visível + síntese | pass | Debate, divergências e síntese concluída são exibidos; síntese aguarda o stream. |
| Router explicável e recusável | pass | Motivo, modelo, custo, latência/velocidade, confirmação e override explícito no composer e Council. |
| Pré-custo N× e caps | pass | Preflight inclui slots/síntese; caps scoped usam soma decimal; reservas persistidas cobrem a janela de despacho e são liberadas no término. |

## Validação

- `pnpm --filter @ai-hub/shared test -- --run council.test.ts` — pass
- `pnpm --filter @ai-hub/ai-gateway test -- --run adapter.test.ts` — pass (21 testes)
- `pnpm --filter @ai-hub/db test -- --run repos.test.ts` — pass (28 testes)
- `pnpm --filter @ai-hub/desktop typecheck` — pass
- `git diff --check` — pass

## Trust / correlações

- Keys, SQLite e provider network permanecem no main; metadata de papel não é persistido no packet nem exposto como segredo.
- Migração 0014 adiciona reservas de gasto com expiração; receipts liberam reservas de streams normais e Council libera o lote após síntese.
- i18n pt-BR/en foi atualizado para Router e Council.

## Riscos residuais aceitos

- Não há teste end-to-end com providers reais; adapters usam fixtures/mock.
- A comparação de slots é sequencial devido à trava de stream por conversa; os ramos são persistidos como irmãos W4.
- W21 passa a ser responsável por HUD/run modes, fora do escopo desta onda.

## ADR e patches

- [ADR-W20-001](../../ADR/ADR-W20-001-council-explicit-multi-model-deliberation.md) — accepted
- `DIFF.patch`
- `DIFF-post-review.patch`
