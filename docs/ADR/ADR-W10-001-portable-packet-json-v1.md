# ADR-W10-001-portable-packet-json-v1

- **Status:** accepted
- **Onda:** W10
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O compiler v0 (ADR-W02-002) produz um packet interno `version: 1` (`system` + `messages` + `tokenEstimate` + `excluded`). A Wave 10 precisa de um **artefato de ficheiro** portátil entre projetos, com preview (o que entra / o que fica de fora), sem keys e sem misturar conteúdo de outros projetos.

## Decisão

Ficheiro `.aihub-packet.json` com envelope Zod `.strict()`:

- `kind`: `aihub.packet`
- `version`: `1` (versão do envelope; o payload interno continua o packet v0)
- `privacyMode`: `standard` | `strict`
- `origin`: `{ source: compile | import, projectLabel, conversationLabel }` — rótulos, não ids de outro workspace
- `included` / `omitted`: fatias curtas para preview (kind + label ≤200 + tokens)
- `payload`: `packetV0Schema` (sem `apiKey`, sem headers)

Export e import passam por `redactSecrets`. Campos extra (`apiKey`, `authorization`) falham o parse.

O packet **interno** de send não muda de versão. W13+ pode acrescentar files/memories no envelope `version: 2`.

## Alternativas consideradas

- **Reusar só o packet v0 como ficheiro:** falta origin, privacy e manifesto de preview.
- **Subir o payload interno para version 2 agora:** quebraria testes e o contrato W2 sem ganho.

## Consequências

- Positivas: contrato testável; compiler v0 intacto.
- Negativas: dois “version: 1” (envelope vs payload) — disambiguados por `kind`.
- Riscos aceitos: labels de preview são recortes da conversa no renderer (já vê as mensagens).

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 10 / D1
- `docs/ADR/ADR-W02-002-compiler-packet-v0.md`
- `docs/reviews/W10/REVIEW.md`
