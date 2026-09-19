# ADR-W13-003-mention-token-cap-excludes-files

- **Status:** accepted
- **Onda:** W13
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O teto `MAX_MENTION_TOKENS` (8000) existe para `@conversation` e `@packet`, que podem despejar histórico. `@file` já tem limites W12 (8 MB, 80k chars, 8 ficheiros) e entra pelo mesmo `fileIds`.

## Decisão

O cap W13 corta só injeção de conversa/packet. `@file` não incrementa `usedTokens`; continua sujeito aos limites e ao redactor da W12. Overflow da janela do modelo continua a hard-stopar o send.

## Alternativas consideradas

- **Um cap único incluindo ficheiros:** um README grande falharia o DoD `@file:README.md`.
- **Dois caps na UI:** ruído sem ganho nesta onda.

## Consequências

- Positivas: DoD de ficheiro previsível.
- Negativas: aviso `mentions.tokenOver` não reflete tokens de `@file`.
- Riscos aceitos: ficheiro + conversa podem somar acima de 8k no packet; caps W7 ainda medem o total.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 13
- `docs/ADR/ADR-W12-002-files-inject-as-compiler-slices.md`
- `docs/reviews/W13/REVIEW.md`
