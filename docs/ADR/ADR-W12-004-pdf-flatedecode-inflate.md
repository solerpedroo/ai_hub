# ADR-W12-004-pdf-flatedecode-inflate

- **Status:** accepted
- **Onda:** W12
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O extrator PDF da W12 lia só literais `(…) Tj` / `TJ` no bytes crus. PDFs reais comprimem o content stream com `/FlateDecode`; nesse caso o DoD (“resuma a seção 3”) só passava no fixture uncompressed.

## Decisão

Inflacionar streams `/FlateDecode` com `zlib.inflateSync` e voltar a correr o extrator de literais. Sem `pdfjs`/`unpdf` nesta onda.

## Alternativas consideradas

- **pdfjs-dist / unpdf:** extração mais completa (CID, ToUnicode), mas dependência pesada e worker no main.
- **Aceitar só fixture literal:** mentiria o DoD em PDFs do dia a dia.

## Consequências

- Positivas: PDFs Flate típicos passam no teste sem novo pacote.
- Negativas: sem cmap/ToUnicode, PDFs CID/subset ainda podem sair vazios.
- Riscos aceitos: extração v1 é best-effort; OCR e layout ficam fora da onda.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 12
- `docs/reviews/W12/REVIEW.md`
- `packages/files/src/extract-pdf.ts`
