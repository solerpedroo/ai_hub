# ADR-W13-002-mention-stubs-until-later-waves

- **Status:** accepted (`@prompt` / `@skill`); `@memory` superseded by ADR-W14-002
- **Onda:** W13
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** ADR-W14-002 (apenas `@memory`)

## Contexto

O plano pede os tipos `@memory`, `@prompt` e `@skill` no autocomplete agora, mas as ondas donas ainda não existem (W14, W15, W17).

## Decisão

Os três tipos aparecem no trigger `@`. Escolher ou enviar um deles falha de forma explícita (`mentions:unavailable`) e **não** injeta contexto. Não há tabela nem IPC de memória/prompt/skill nesta onda.

## Alternativas consideradas

- **Omitir do autocomplete:** o aceite D6 lista os seis tipos.
- **Half-build com store vazio:** viola “hooks sem feature”.

## Consequências

- Positivas: contrato estável para W14+.
- Negativas: o utilizador vê tipos que ainda não resolvem.
- Riscos aceitos: copy de stub em pt-BR e en.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 13
- `docs/reviews/W13/REVIEW.md`
