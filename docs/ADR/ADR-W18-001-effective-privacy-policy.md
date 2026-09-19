# ADR-W18-001-effective-privacy-policy

- **Status:** accepted
- **Onda:** W18
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A W18 introduz três modos de privacidade e um firewall antes do envio. O contrato anterior tinha apenas `standard` e `strict`; preview, packet aplicado e contexto automático podiam avaliar modos distintos, permitindo que memória/RAG entrasse após um packet estrito.

## Decisão

O modo efetivo é resolvido no main e é a única entrada para compiler, menções, anexos automáticos, RAG, preview e envio. Os modos versionados são:

- `private`: apenas o histórico ativo e o texto que o usuário digitou; sem instruções do projeto, ramos inativos, memórias, RAG, anexos ou menções de arquivo.
- `normal`: histórico ativo, instruções do projeto e contexto explicitamente escolhido pelo usuário; sem memória/RAG automáticos.
- `maximum`: todo o contexto normal, mais resumos de ramos, memórias e RAG automáticos.

Valores legados `standard` e `strict` continuam aceitos no banco/packets e são normalizados para `normal` e `private`, respectivamente. A política do firewall é aplicada no main antes de persistir ou enviar; `allow` nunca autoriza persistir uma credencial detectada em SQLite.

## Alternativas consideradas

- **Manter `standard`/`strict`:** não atende os três níveis pedidos e mantém semântica ambígua.
- **Confiar no estado do renderer:** permite drift entre preview, packet aplicado e envio.
- **Permitir credenciais cruas quando a ação é Allow:** viola a regra de não guardar chaves no banco local.

## Consequências

- Positivas: um preview descreve o mesmo packet que será enviado; Privado cumpre o isolamento de memórias e outros arquivos do projeto.
- Negativas: anexos explícitos são omitidos em Privado; o usuário precisa escolher Normal ou Máximo para compartilhá-los.
- Riscos aceitos: a normalização preserva a leitura de packets legados, mas não reescreve arquivos exportados antigos.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 18)
- `docs/reviews/W18/REVIEW.md`
- `docs/ADR/ADR-W10-003-deterministic-inactive-summary-and-pins.md`
- `docs/ADR/ADR-W14-002-memories-in-packet-strict-excludes.md`
