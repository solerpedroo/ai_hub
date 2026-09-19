# ADR-W16-003-artifact-detector-thresholds

- **Status:** accepted
- **Onda:** W16
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano pede detector de fence `mermaid` / `html`, “doc longo” e “código >N linhas”. Sem limiar o chat inteiro viraria canvas (incluindo “Hello from mock”).

## Decisão

- `mermaid` e `html`/`htm`/`svg` fenced: **sempre** (se o corpo não for vazio).
- `markdown`/`md` fenced: se o corpo tiver ≥ 200 caracteres.
- Outras langs fenced **ou fence sem linguagem**: se tiverem ≥ **12** linhas.
- Texto residual (fora de fences): Markdown se ≥ **800** caracteres **e** (heading ATX ou ≥ 20 linhas).
- Títulos: primeiro heading, senão o kind (`Mermaid`, `HTML`, lang, `Markdown`).

## Alternativas consideradas

- **Sempre o message inteiro:** polui o workspace.
- **Só mermaid:** falha o aceite D5 (html/doc/código).

## Consequências

- Snippets curtos ficam na bolha (highlight W03). O mock e2e só abre canvas no prompt de arquitetura.
- Limiares são constantes em `packages/shared/src/artifacts.ts`.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 16)
- ADR-W16-001
