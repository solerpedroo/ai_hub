# ADR-W10-003-deterministic-inactive-summary-and-pins

- **Status:** accepted
- **Onda:** W10
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

W10 pede compactar: sumarizar ramos inativos, cortar mensagens antigas, manter pins. ADR-W06-003 já recusa resumo via LLM (custo/privacy ocultos) e recusa apagar o grafo.

## Decisão

- **Ramos inativos:** o compiler gera um bloco de texto determinístico no `system` (`N turns. Last: …` ≤80 caracteres). Os turnos inativos **não** entram em `payload.messages`. Sem segundo modelo.
- **Cortar antigas:** igual W6 (`maxTokenBudget`), mas **não remove mensagens com `pinned=1`**.
- **Privacy `strict`:** omite instruções do projeto e o resumo de ramos inativos; o path ativo permanece.
- **Privacy `standard`:** instruções + resumos + path ativo.

Overflow continua `tokenEstimate > contextWindow`. Compactar não muda o SQLite.

## Alternativas consideradas

- **LLM summary:** rejeitado de novo (ADR-W06-003).
- **Incluir ramos inativos como mensagens:** mistura o fio ativo (ADR-W04-003).

## Consequências

- Positivas: preview consegue listar omitted `inactive-branch` / `old-message` / `privacy`.
- Negativas: o “resumo” é um recorte, não uma síntese semântica.
- Riscos aceitos: chars/4; pin em plaintext no schema (flag, não conteúdo).

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 10
- `docs/ADR/ADR-W06-003-compile-trim-context-window.md`
- `docs/ADR/ADR-W04-003-compiler-active-path.md`
- `docs/reviews/W10/REVIEW.md`
