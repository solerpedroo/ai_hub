# Delta review — Wave 20

- **Data:** 2026-09-20
- **Reviewer:** `w20_close_review` (independente, somente leitura)
- **Status:** failed — fechamento bloqueado

## Correções verificadas

- `conversationId` passou a ser validado no contrato IPC e o Council usa a conversa ativa.
- Os streams de cada slot e da síntese são aguardados antes do retorno.
- O lote avalia caps globais e scoped e soma USD sem `Number`.
- O Router passou a apresentar seleção, estimativa e confirmação; as chaves pt-BR/en foram incluídas.

## Achados remanescentes

| Severidade | Arquivo | Status | Resumo |
|---|---|---|---|
| Blocker | `main/council.ts`, `main/chat-session.ts` | open | O primeiro slot é despachado antes de o packet ser congelado; slots seguintes recompilam/mesclam tail por modelo, portanto não há packet idêntico verificável. |
| Blocker | `main/council.ts` | open | Papéis são apenas rótulos; nenhuma instrução de papel chega ao modelo. |
| Blocker | `main/council.ts` | open | Preflight usa o tamanho do texto, não o packet compilado nem o debate real. |
| High | `prompts-view.tsx` | open | Comparação é vertical, não side-by-side por colunas. |
| High | `prompts-view.tsx`, `shared/council.ts` | open | Router não escolhe concretamente o modelo por custo/latência; custo exibido não é o custo do Council. |
| High | testes | open | Faltam testes de packet, branches, papéis, caps e Router. |

## Verificação executada

- `pnpm --filter @ai-hub/shared test -- --run council.test.ts` — pass
- `pnpm --filter @ai-hub/desktop typecheck` — pass
- `git diff --check` — pass

O ADR `ADR-W20-001-council-explicit-multi-model-deliberation.md` permanece `proposed` e `docs/STATUS.md` permanece em `review` até que os blockers sejam removidos.
