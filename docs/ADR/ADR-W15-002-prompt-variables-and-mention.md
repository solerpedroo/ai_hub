# ADR-W15-002-prompt-variables-and-mention

- **Status:** accepted
- **Onda:** W15
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** ADR-W13-002 (apenas `@prompt`)
- **Superseded by:** —

## Contexto

O DoD exige que `{{project}}`, `{{language}}` e `{{goal}}` resolvam contra o projeto ativo. `@prompt` era stub (ADR-W13-002). Inserir no composer e mencionar `@prompt` são os dois caminhos do plano.

## Decisão

- Interpolação no main (e testes em `shared`): `{{project}}` = nome do projeto (vazio na inbox); `{{language}}` = locale de appearance (`pt-BR` | `en`); `{{goal}}` = instruções do projeto (vazio se null). Placeholders desconhecidos ficam no texto.
- `@prompt` usa o mesmo `MentionRef` da W13; sai de `MENTION_STUB_TYPES`. O corpo **já interpolado** entra no `system` como fatia `Library prompt:` (compiler), não no texto do user.
- Inserir no composer cola o texto interpolado no rascunho (o user pode editar). Não é auto-inject.
- `privacyMode: strict` **não** bloqueia `@prompt` nem insert — é conteúdo explícito do user, não memória/RAG.

## Alternativas consideradas

- **Só insert, sem menção:** falha o aceite D6/`@prompt`.
- **Resolver no renderer:** o renderer não deve ler instruções só para template se o main já as tem; e o send precisa da mesma função.

## Consequências

- ADR-W13-002 permanece válido só para `@skill` (W17).
- O corpo do prompt no packet debug é omitido no renderer (mesmo padrão de memory/file).

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 15
- `docs/reviews/W15/REVIEW.md`
- ADR-W13-001, ADR-W13-002, ADR-W15-001
