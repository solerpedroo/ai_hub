# ADR-W22-004-skill-contract-v2-tool-allowlist

- **Status:** accepted
- **Onda:** W22
- **Data:** 2026-09-21
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O contrato de Skill v1 deliberadamente exigia `tools: []`. A W22 precisa permitir que uma skill declare intenção sem transformar a skill em autoridade de execução.

## Decisão

Skills novas usam contrato v2 com `allowedTools`, uma allowlist declarativa de referências registradas e operações. Contratos v1 permanecem legíveis e normalizam para allowlist vazia. A declaração nunca concede permissão: o Tool Router exige a política por projeto em toda execução.

## Alternativas consideradas

- **Alterar v1 in-place:** recusada por quebrar skills cifradas existentes.
- **Permitir prompt/args executáveis na skill:** recusada; delegaria autoridade demais ao conteúdo.

## Consequências

- A W23 pode intersectar allowlist da skill e Permission Center.
- Skills de fábrica continuam sem tools por padrão.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 22)
- `docs/reviews/W22/REVIEW.md`
- `docs/ADR/ADR-W17-001-skill-contract-json.md`
