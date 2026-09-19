# ADR-W12-003-vision-images-on-stream-not-packet

- **Status:** accepted
- **Onda:** W12
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Imagens precisam ir ao provider se o catálogo marcar `vision`. O `packetV0` é texto e entra no debug/export. Meter base64 no packet vazaria no snapshot e no `.aihub-packet.json`.

## Decisão

Imagens viajam em `ChatStreamRequest.images`, não no `ProviderAgnosticPacket`. O main recusa o send se houver imagem e `catalog.vision === false` (gate W5). Adapters montam a parte multimodal só nesse request.

## Alternativas consideradas

- **Campo `images` no packet v0:** polui export e debug.
- **OCR local e só texto:** fora do DoD; vision é o requisito.

## Consequências

- Positivas: packet/export/debug continuam texto; mock e2e ignora imagens.
- Negativas: cada adapter precisa do ramo de imagem.
- Riscos aceitos: JPEG/PNG/WebP/GIF só; sem TIFF/HEIC nesta onda.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 12 / W5 catalog
- `docs/reviews/W12/REVIEW.md`
