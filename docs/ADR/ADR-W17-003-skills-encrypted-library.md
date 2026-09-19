# ADR-W17-003-skills-encrypted-library

- **Status:** accepted
- **Onda:** W17
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Skills são SOP reutilizáveis (prompt + passos + menções). O conteúdo é privado. Prompts W15 já usam tabela global cifrada, sem pacote extra.

## Decisão

Tabela `skills` (migration 12): `title`, `description` e `definition` (JSON do contrato) cifrados com o envelope existente. `folder`, `preferred_model` e `factory_id` em plaintext para listar/seed. Sem pacote `packages/skills`. `@skill` sai de `MENTION_STUB_TYPES` e resolve como `@prompt`. Modelo preferido só se aplica se existir uma chave do utilizador que sirva esse id; senão mantém-se o modelo da sessão (sem fallback silencioso para outro modelo).

## Alternativas consideradas

- **Reusar a tabela `prompts`:** mistura contratos e pastas.
- **Novo pacote:** viola o layout MVP.

## Consequências

- Positivas: mesmo trust boundary da library W15.
- Negativas: `preferred_model` em plaintext (como tags/preferências de projeto).
- Riscos aceitos: seed factory em inglês na DB; labels i18n na UI.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 17
- ADR-W15-001, ADR-W01-001
- `docs/reviews/W17/REVIEW.md`
