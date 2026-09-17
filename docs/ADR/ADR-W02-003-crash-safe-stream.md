# ADR-W02-003-crash-safe-stream

- **Status:** accepted
- **Onda:** W02
- **Data:** 2026-09-16
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D10 exige que crash ou abort não apague o parcial. O schema W1 já tem `streaming | interrupted | complete | aborted`.

## Decisão

- A assistant message nasce com `status = streaming` e conteúdo vazio.
- Flush criptografado a cada 48 caracteres **ou** 200 ms.
- Abort do utilizador → `aborted` + receipt com tokens parciais.
- Erro de rede/provider → `interrupted` + receipt com `error_code`.
- No boot, qualquer linha ainda `streaming` passa a `interrupted` (processo morreu).

IPC: `chat:send` / `chat:abort` + evento `chat:event` (chunk/done/error), Zod nos dois sentidos. Continuar um stream interrompido no mesmo request id fica para W3 (regenerar a partir daqui = novo send).

## Alternativas consideradas

- **Só persistir no `done`:** perde o DoD de crash.
- **Flush a cada token:** I/O demais no main.

## Consequências

- Reabrir o app mostra o parcial `interrupted`.
- W3 usa os mesmos estados na bolha.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 2, D10)
- `docs/reviews/W02/REVIEW.md`
