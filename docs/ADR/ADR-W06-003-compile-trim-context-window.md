# ADR-W06-003 — Compactar histórico só no packet

- **Status:** accepted
- **Onda:** W06
- **Data:** 2026-09-17
- **Deciders:** agent
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A Wave 6 pede aviso se a context window estourar e uma ação “compactar histórico”. Resumir via LLM seria outro send (custo, privacy) e cheira a RAG. Apagar nós do grafo violaria o lock W4 (ramos não se apagam).

## Decisão

Overflow é `tokenEstimate > contextWindow` do catálogo (badge do packet). Compactar passa `compactHistory` no próximo `chat:send`: o Compiler descarta as mensagens **mais antigas** do packet até caber no budget, sempre tentando manter a última. Ids descartados vão para `excluded`. O grafo SQLite não muda. Instruções do projeto continuam no `system`.

Sem compact, o send usa o path ativo completo; o provider pode responder `context_overflow`.

## Alternativas consideradas

- **Resumo LLM automático:** custo oculto + segundo modelo; rejeitado.
- **Delete/truncate de mensagens:** quebra o grafo; rejeitado.
- **Compact persistido em settings:** desnecessário; o usuário religa na UI da conversa.

## Consequências

- Positivas: compact é reversível; Compiler continua a única montagem do prompt.
- Negativas: uma mensagem única maior que a janela não cabe mesmo compactada.
- Riscos aceitos: `tokenEstimate` é chars/4, não tokenizer do provider.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 6)
- `docs/ADR/ADR-W02-002-compiler-packet-v0.md`
- `docs/ADR/ADR-W04-002-sibling-fork-not-delete.md`
- `docs/reviews/W06/REVIEW.md`
