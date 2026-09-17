# ADR-W05-002-openrouter-first-class

- **Status:** accepted
- **Onda:** W05
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano manda OpenRouter first-class, não “URL custom escondida”. O recusar da constituição lista exatamente esse atalho.

## Decisão

OpenRouter é um slug de provedor (`openrouter`), com adapter próprio, catálogo próprio e URL fixa `https://openrouter.ai/api/v1`. Headers `HTTP-Referer` e `X-Title` identificam o app. A UI lista OpenRouter ao lado dos nativos; não é um campo de URL no fluxo OpenAI.

## Alternativas consideradas

- **Custom OpenAI-compatible apontando para OpenRouter:** viola o plano e mistura pricing/model ids.
- **Listar modelos ao vivo na API:** precisa de rede e chave no boot; o catálogo local cobre o picker da W5. Listagem remota fica para uma onda posterior se o produto pedir.

## Consequências

- Model ids no catálogo usam o formato OpenRouter (`openai/gpt-4o-mini`).
- Teste de conexão e chat usam o mesmo adapter first-class.
- Custom continua existindo para endpoints OpenAI-compatible *do usuário*, não como substituto do OpenRouter.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 5)
- `docs/ADR/ADR-W05-001-adapter-registry.md`
