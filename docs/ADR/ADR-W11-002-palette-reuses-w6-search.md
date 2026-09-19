# ADR-W11-002-palette-reuses-w6-search

- **Status:** accepted
- **Onda:** W11
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano da W11 pede “paleta busca conversas/projetos (FTS)”. O índice FTS5 continua vazio (ADR-W06-001). Implementar FTS agora seria popular plaintext no SQLite ou mudar a decisão de busca.

## Decisão

A Command Palette **reusa** `search:query` da W6 (decripta no main, O(n) local). Projetos filtrados no renderer pelo nome já visível. Sem canal IPC novo. Sem popular `messages_fts`.

## Alternativas consideradas

- **Popular FTS5 com plaintext:** rejeitado (ADR-W06-001).
- **Paleta sem busca de conversas:** falha o sub-task.

## Consequências

- Positivas: um caminho de busca; trust boundary intacto.
- Negativas: a paleta herda a latência O(n) da W6.
- Riscos aceitos: o texto “(FTS)” do plano fica como intenção futura; o DoD é teclado, não o motor de índice.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 11
- `docs/ADR/ADR-W06-001-search-decrypt-not-plaintext-fts.md`
- `docs/reviews/W11/REVIEW.md`
