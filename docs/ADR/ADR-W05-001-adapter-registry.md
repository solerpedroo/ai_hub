# ADR-W05-001-adapter-registry

- **Status:** accepted
- **Onda:** W05
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A W2 deixou um único adapter OpenAI. A W5 precisa de vários provedores no mesmo contrato `ProviderAdapter`, sem fallback silencioso e sem o renderer falar HTTP.

## Decisão

`resolveAdapter(slug)` no `packages/ai-gateway` escolhe o adapter. OpenAI, OpenRouter, Groq e custom OpenAI-compatible reutilizam `createOpenAICompatibleAdapter` (fetch + SSE). Anthropic e Gemini (slug `google`) têm adapters nativos. O main resolve o slug da chave no keytar; o renderer só envia `providerKeyId` + `model`.

## Alternativas consideradas

- **Um adapter só com `baseUrl` por slug:** esconde OpenRouter como URL custom e quebra Anthropic/Gemini.
- **Vercel AI SDK / SDKs oficiais:** mais superfície; fixtures de CI ficam mais pesadas. Mantém-se fetch (ADR-W02-001).

## Consequências

- Slug desconhecido ou custom sem URL lança `GatewayError`, não troca de provedor.
- Catálogo local em `model-catalog.json` lista modelos por `provider`; custom não tem catálogo e aceita id livre.
- Caps continuam W7: todo send path (incluindo o novo) ainda não hard-stopa.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 5)
- `docs/ADR/ADR-W02-001-provider-adapter-fetch.md`
