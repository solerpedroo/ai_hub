# ADR-W07-005-retry-transient-only

- **Status:** accepted
- **Onda:** W07
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Timeout e rate-limit são ruído de rede. Retry cego após tokens já emitidos duplicaria conteúdo e receipts. Auth, quota, overflow e abort não devem ser retentados.

## Decisão

Até 2 retries (3 tentativas) só para `timeout`, `rate_limit` e `network`, e **somente se nenhum delta** foi emitido. Backoff `400ms * 3^attempt`. Abort cancela o sleep. Auth/quota/overflow/unknown/aborted falham na hora. Retry é o **mesmo** adapter e modelo — não é fallback.

## Alternativas consideradas

- **Retry após parcial:** corrompe a bolha e o flush crash-safe.
- **Retry de auth:** martela chave inválida.

## Consequências

- Positivas: TTFT mais resiliente; sem duplicar tokens na UI.
- Negativas: falha no primeiro byte depois de um delta curto não retenta.
- Riscos aceitos: backoff fixo, sem jitter.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 7)
- `docs/reviews/W07/REVIEW.md`
- ADR-W02-003 (crash-safe stream)
- ADR-W07-003 (fallback explícito é outro mecanismo)
