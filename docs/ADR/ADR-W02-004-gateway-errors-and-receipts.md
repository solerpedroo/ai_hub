# ADR-W02-004-gateway-errors-and-receipts

- **Status:** accepted
- **Onda:** W02
- **Data:** 2026-09-16
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano pede taxonomia de erro e um receipt em toda tentativa, inclusive falha. Preços reais do provider só existem às vezes.

## Decisão

Códigos: `timeout | rate_limit | auth | context_overflow | quota | network | aborted | unknown`. O adapter mapeia HTTP/SDK para estes códigos; nunca engole; nunca troca de modelo.

Receipt: `provider`, `model`, `tokens_in/out`, `latency_ms`, `cost_usd`, `error_code` opcional. Preferir `usage` da API; senão estimar pelos chars. Custo vem do catálogo JSON versionado em `packages/shared` (`model-catalog.json`). Sem secrets no receipt.

Migration `0002` acrescenta `error_code` em `message_receipts`.

## Alternativas consideradas

- **Erro só na UI, sem receipt:** quebra D12.
- **Preço hardcoded no adapter:** o catálogo tem de viver em `shared` para a W7.

## Consequências

- Caps (W7) leem a mesma tabela.
- UI de receipt polida é W7; W2 mostra o motor na UI de debug.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 2, D12)
- `docs/reviews/W02/REVIEW.md`
