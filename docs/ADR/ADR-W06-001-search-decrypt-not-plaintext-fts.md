# ADR-W06-001 — Busca decripta no main; FTS5 não recebe plaintext

- **Status:** accepted
- **Onda:** W06
- **Data:** 2026-09-17
- **Deciders:** agent
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A Wave 6 pede “busca FTS5 por título/mensagem”. O schema W1 já tem `messages_fts`, mas ADR-W01-001 escolheu envelope AES-256-GCM e deixou o FTS vazio: popular o índice com plaintext desfaz a criptografia em repouso do conteúdo pesquisável.

## Decisão

A busca W6 roda no processo main: decripta título e conteúdo, aplica match tokenizado (AND, case-insensitive) e devolve hits com snippet. **Não** inserir texto de conversa em `messages_fts`. A tabela virtual permanece vazia até uma onda futura escolher SQLCipher ou um índice derivado.

O plano (“FTS5”) é cumprido como *contrato de busca local, não RAG*. A implementação concreta desvia do motor FTS5 para não violar o envelope.

## Alternativas consideradas

- **Popular FTS5 com plaintext:** atende o texto do plano; cria cópia pesquisável sem cifra. Rejeitado.
- **FTS contentless só com ids:** não acelera match de texto.
- **SQLCipher nesta onda:** troca o lock W1; fora de escopo.

## Consequências

- Positivas: envelope de mensagens intacto; busca ainda acha mensagem antiga (DoD).
- Negativas: busca é O(n) no volume local; snippets existem só na resposta IPC (não no disco como índice).
- Riscos aceitos: desktop MVP com volume humano; se a busca ficar lenta, revisitar índice cifrado.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 6)
- `docs/ADR/ADR-W01-001-envelope-encryption-at-rest.md`
- `docs/reviews/W06/REVIEW.md`
