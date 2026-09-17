# ADR-W02-001-provider-adapter-fetch

- **Status:** accepted
- **Onda:** W02
- **Data:** 2026-09-16
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano pede um `ProviderAdapter` unificado e um adapter OpenAI com stream + abort. A tabela de arquitetura menciona “AI SDK no main ou camada equivalente”. Puxar o AI SDK agora traria um runtime extra só para um provider.

## Decisão

Adapters vivem em `packages/ai-gateway` e falam HTTP com `fetch` + SSE. A interface é `listModels`, `chatStream`, `testConnection`, `capabilities`. O adapter OpenAI é o único desta onda. Não há fallback silencioso para outro modelo ou URL.

A chave sai do keytar **só no main**. O pacote gateway recebe o secret como argumento de chamada, nunca persiste, nunca devolve.

## Alternativas consideradas

- **Vercel AI SDK:** streaming maduro; mais superfície e versão a gerir para um adapter.
- **SDK oficial `openai`:** útil, mas os testes de fixture ficam mais pesados que um `fetch` injetável.

## Consequências

- Fixtures de stream são strings SSE, sem rede no CI.
- OpenRouter e nativos extras entram no mesmo contrato na W5, não como URL escondida.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 2)
- `docs/reviews/W02/REVIEW.md`
