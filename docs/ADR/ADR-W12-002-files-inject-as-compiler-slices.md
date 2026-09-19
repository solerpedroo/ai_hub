# ADR-W12-002-files-inject-as-compiler-slices

- **Status:** accepted
- **Onda:** W12
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

W13 é `@file`. W12 precisa injetar anexos no próximo send sem inventar mentions. O packet portátil v1 não inclui arquivos.

## Decisão

Anexos são IDs no `chat:send` / preview (`fileIds`). O compiler acrescenta fatias `file` ao system. Export/apply de packet **não** recebe `files`. Caps continuam a medir o packet já com o texto anexado.

## Alternativas consideradas

- **Concatenar no `content` do utilizador:** o texto visível vira dump (o que W13 proíbe).
- **Meter arquivos no envelope v1:** rejeitado (ADR-W10-001).

## Consequências

- Positivas: preview mostra tokens do anexo; `@file` (W13) pode reusar a mesma fatia.
- Negativas: anexos são por send, não viajam no packet exportado.
- Riscos aceitos: merge com packet aplicado acrescenta files *depois* do envelope.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Waves 12–13
- `docs/ADR/ADR-W10-001-portable-packet-json-v1.md`
- `docs/reviews/W12/REVIEW.md`
