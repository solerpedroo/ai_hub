# ADR-W13-001-mentions-structured-not-in-user-text

- **Status:** accepted
- **Onda:** W13
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D6 exige que `@file:README.md o que este repo faz?` injete só aquele arquivo e que o texto visível não vire um dump. Anexos W12 já entram via `fileIds` e fatias `file`.

## Decisão

O send/preview leva `mentions[]` (`type` + `id` e/ou `query`). O main resolve e o compiler injeta no `system` (não no `content` do user). Tokens `@type:query` são removidos do texto persistido. `@file` resolve para `project_files` e reusa `fileIds` + `appendFilesToPacket`. `@conversation` e `@packet` viram fatias próprias após o compile do path ativo.

## Alternativas consideradas

- **Concatenar o extract no texto do user:** viola o DoD e o preview.
- **`mentionIds` só para ficheiros:** duplicaria ADR-W12-002.

## Consequências

- Positivas: chip/token curto na UI; W14–W17 podem ligar stubs no mesmo contrato.
- Negativas: syntax `@type:query` sem espaço no query.
- Riscos aceitos: menção explícita entra mesmo em `privacyMode: strict`.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 13 / D6
- `docs/ADR/ADR-W12-002-files-inject-as-compiler-slices.md`
- `docs/reviews/W13/REVIEW.md`
