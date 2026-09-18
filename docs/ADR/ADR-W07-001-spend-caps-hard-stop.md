# ADR-W07-001-spend-caps-hard-stop

- **Status:** accepted
- **Onda:** W07
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D7 exige freio de custo, não só dashboard. A tabela `spend_caps` existia desde W1 sem consumidores. Sem hard-stop no caminho de envio, regenerate/edit/continue/compact poderiam ignorar o limite.

## Decisão

Caps desta onda: `request`, `day` (meia-noite local do processo main), `global`. Linha ausente = ilimitado. `limit_usd` `"0"` bloqueia qualquer estimativa positiva.

A checagem corre **depois** de compilar o packet e **antes** de persistir user/assistant. Todo modo de `chat:send` passa pelo mesmo guard. Aviso em ≥80% do limite; bloqueio em ≥100%. Override `allowOnce` grava audit local em `settings` (JSON, sem secrets). Sem preço no catálogo, o cap de request é ignorado; day/global usam só receipts já gravados.

Estimativa pré-envio: tokens de input do packet × preço de input + `maxTokens` ou **1024** tokens de saída quando o catálogo tem preço.

Caps por projeto/provider ficam para W18.

## Alternativas consideradas

- **Só UI / dashboard:** não atende D7 (hard-stop).
- **Checar depois de criar a user message:** o draft ficaria no grafo mesmo bloqueado.
- **Cap em micros inteiros no SQLite:** possível; W7 soma `cost_usd` TEXT com aritmética em micros no shared.

## Consequências

- Positivas: um único choke-point; override auditável; sem persistência órfã no block.
- Negativas: estimativa de saída 1024 pode superestimar; modelos fora do catálogo não travam o cap de request.
- Riscos aceitos: timezone do OS para o cap diário; W18 ainda precisa de escopos projeto/provider.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 7, D7)
- `docs/reviews/W07/REVIEW.md`
- ADR-W02-004 (receipts / catálogo)
