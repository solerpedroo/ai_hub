# ADR-W04-003-compiler-active-path

- **Status:** accepted
- **Onda:** W04
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O compiler v0 (ADR-W02-002) recebe uma lista e ignora só `streaming`. Se a main passar `listMessages` completo, irmãos inativos e ramos mortos entram no packet — custo, privacidade e respostas misturadas.

## Decisão

O packet v0 é compilado **apenas** com o path ativo (raiz → folha), na ordem desse path. `compilePacket` não conhece o grafo; `compileActivePath` filtra com o algoritmo da ADR-W04-001 e depois chama `compilePacket`.

Exceções:

- Regenerar: o path passado ao compiler termina no **pai** da assistant alvo (a resposta antiga não é reenviada).
- `streaming` continua excluído do packet (já na W2).

O composer envia sempre no leaf do path ativo (`send` / `continue`).

## Alternativas consideradas

- **Filtrar dentro de `compilePacket` por `isActiveBranch` sem caminhar:** um irmão inativo com flag 1 legado ou um filho ativo de um pai inativo poluiria o packet.
- **Deixar o renderer montar o histórico:** o renderer não deve decidir o que o provider vê.

## Consequências

- Trocar de modelo no mesmo ramo (W6) usa o mesmo path. @-mentions e RAG (ondas posteriores) injetam no packet **depois** deste recorte.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 4, Wave 2 compiler)
- `docs/ADR/ADR-W02-002-compiler-packet-v0.md`
- `docs/ADR/ADR-W04-001-active-path-is-active-branch.md`
- `docs/reviews/W04/REVIEW.md`
