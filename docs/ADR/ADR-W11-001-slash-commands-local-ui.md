# ADR-W11-001-slash-commands-local-ui

- **Status:** accepted
- **Onda:** W11
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A Wave 11 pede slash commands no composer (`/model`, `/clear`, `/compact`, `/packet`, `/cap`). Se o Enter enviasse o texto ao modelo, o utilizador pagaria tokens e vazaría intenção de UI para o provider.

## Decisão

Slash commands reconhecidos são **ações locais**. O composer intercepta `/` + id conhecido (sem espaços) e chama um handler no renderer. O texto **não** entra em `chat:send`.

`/unknown` ou `/foo bar` continuam mensagem normal. `/clear` cria uma conversa nova; não apaga o grafo.

## Alternativas consideradas

- **Enviar o slash ao modelo e interpretar a resposta:** custo oculto e sem determinismo.
- **Palette-only, sem slash:** falha o sub-task do plano.

## Consequências

- Positivas: teclado-primeiro sem spend; e2e pode afirmar zero `message-user` após `/compact`.
- Negativas: lista fechada nesta onda; skills/mentions (ondas posteriores) não entram aqui.
- Riscos aceitos: um slash com espaço (`/model gpt`) vai para o modelo.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 11
- `docs/reviews/W11/REVIEW.md`
- `docs/ADR/ADR-W07-001-spend-caps-hard-stop.md`
