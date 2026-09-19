# ADR-W17-002-skill-slash-arguments

- **Status:** accepted
- **Onda:** W17
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O DoD pede `/skill Code Review`. Slash W11 só aceita um token sem espaços (ADR-W11-001). Enviar `/skill …` ao modelo violaria “slash conhecido = ação local”.

## Decisão

`/skill` sem argumentos continua slash local e abre a library. `/skill Nome` (com espaços e menções na mesma linha ou nas seguintes) é parse-on-send: o texto `/skill …` **não** entra em `chat:send`; resolve-se a skill e enviam-se as menções restantes (`@file:diff`, etc.). Atalho `Ctrl/Cmd+Shift+S` abre a library; a palette corre “Run skill: Code Review”.

## Alternativas consideradas

- **Só picker após `/skill`:** falha o DoD literal.
- **Enviar a linha `/skill` como user:** mistura UI local com o provider.

## Consequências

- Positivas: DoD e ADR-W11-001 coexistem.
- Negativas: `/skill` com argumentos não é o `matchKnownSlashCommand` de um token.
- Riscos aceitos: `/unknown` continua mensagem normal.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 17
- ADR-W11-001
- `docs/reviews/W17/REVIEW.md`
