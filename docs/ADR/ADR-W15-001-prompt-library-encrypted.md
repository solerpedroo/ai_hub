# ADR-W15-001-prompt-library-encrypted

- **Status:** accepted
- **Onda:** W15
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A Wave 15 pede uma Prompt Library com pastas (Desenvolvimento, Estudos, Trabalho) e prompts de fábrica (code review, debug, resumo, professor). O corpo do prompt pode incluir contexto de projeto; não pode ir em plaintext no SQLite.

## Decisão

- Tabela global `prompts` (não por projeto): `folder` plaintext (`development` | `studies` | `work`), `title_cipher` / `body_cipher`, `factory_id` opcional único.
- Sem pacote novo: interpolação e fábrica em `packages/shared`; CRUD em `packages/db`.
- Seed de fábrica **uma vez** (`settings` `prompt-factory-seeded`). Apagar um factory não o recria.
- Inserir no composer resolve variáveis no main e cola o texto no rascunho.

## Alternativas consideradas

- **Library por projeto:** o plano descreve pastas globais; variáveis é que ligam ao projeto ativo.
- **Corpos em i18n só no renderer:** o modelo recebe o template; inglês com `{{language}}` cobre os dois locales.

## Consequências

- Positivas: mesmo envelope de cifra das memórias; factory determinístico no e2e.
- Negativas: títulos de fábrica ficam em inglês na DB; a UI pode mapear `factory_id` para i18n.
- Riscos aceitos: pastas fixas nesta onda (sem CRUD de pasta).

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 15
- `docs/reviews/W15/REVIEW.md`
- ADR-W15-002, ADR-W15-003
