# ADR-W06-004 — Nomes de tags em plaintext

- **Status:** accepted
- **Onda:** W06
- **Data:** 2026-09-17
- **Deciders:** agent
- **Supersedes:** —
- **Superseded by:** —

## Contexto

`tags` e `conversation_tags` existem desde W1 com `name TEXT` e unique index. Cifrar o nome quebraria o unique e a busca por label.

## Decisão

Nomes de tags ficam em plaintext no SQLite, no mesmo espírito das labels de ramo (ADR-W04-004). Não são corpo de conversa nem instruções de projeto. O conteúdo das mensagens continua cifrado.

## Alternativas consideradas

- **Cifrar tag names:** unique index inviável sem lookup table extra.
- **Tags só no renderer:** não sobrevivem restart.

## Consequências

- Positivas: CRUD simples; unique por nome.
- Negativas / restrições: dump do SQLite revela rótulos que o usuário colocou.
- Riscos aceitos: mesmo residual das branch labels.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 6)
- `docs/ADR/ADR-W04-004-export-json-main-process.md`
- `docs/reviews/W06/REVIEW.md`
