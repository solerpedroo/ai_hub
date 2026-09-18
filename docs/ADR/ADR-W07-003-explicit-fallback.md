# ADR-W07-003-explicit-fallback

- **Status:** accepted
- **Onda:** W07
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O princípio do produto proíbe fallback silencioso de modelo. Wave 7 pede “Claude fora → tentar GPT?” usando health. Trocar o adapter no main sem confirmação mudaria custo e destino dos tokens.

## Decisão

Nunca o main retenta noutro provider. No evento `chat:error`, o main pode incluir `suggestProviderSlug`, `suggestKeyId` e `suggestModel` (id de catálogo, nunca secret). A UI pergunta. Só um `chat:send` posterior (regenerate no assistente falho) usa a outra chave.

Sugestão: outra chave **ativa** de **outro** slug; prefere o último sample `ok`, depois sem amostra, nunca o provider que acabou de falhar.

## Alternativas consideradas

- **Retry automático noutro provider:** silent fallback — recusado.
- **Mesmo provider, outro modelo:** ainda muda custo; W7 sugere outro slug com health melhor.

## Consequências

- Positivas: confirmação explícita; IPC sem secrets.
- Negativas: se só existe uma chave, não há sugestão.
- Riscos aceitos: o modelo sugerido é o primeiro do catálogo daquele provider, não o “equivalente”.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 7, D11)
- `docs/reviews/W07/REVIEW.md`
