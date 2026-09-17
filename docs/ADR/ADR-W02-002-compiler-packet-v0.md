# ADR-W02-002-compiler-packet-v0

- **Status:** accepted
- **Onda:** W02
- **Data:** 2026-09-16
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D1 pede um pacote independente de provider. A Wave 2 entrega o compiler **v0**: system + histórico + instruções do projeto. Sem arquivos, memórias, skills ou compactação.

## Decisão

`compile(input) → ProviderAgnosticPacket` versão `1`:

- `system`: instruções do projeto (se houver) + system extra
- `messages`: pares `user`/`assistant` do histórico (sem API keys)
- `tokenEstimate`: `ceil(chars / 4)`
- `excluded`: lista de omissões (nesta onda: mensagens `streaming`)

Trocar de modelo nesta onda **não** existe na UI; o packet já é a entrada do adapter. Preview vai à UI de debug e para o log com redaction.

## Alternativas consideradas

- **Concatenar o recap no texto do user:** viola o compiler.
- **Packet completo da W10 agora:** fora de onda.

## Consequências

- W6/W10 evoluem o JSON (`version: 2+`) sem quebrar o v0.
- O packet nunca contém secrets (ADR-W01-003).

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 2, D1)
- `docs/reviews/W02/REVIEW.md`
