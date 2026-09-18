# ADR-W08-003-electron-updater-github

- **Status:** accepted
- **Onda:** W08
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

UAT W8: o check de auto-update **não pode derrubar o app** se o feed estiver fora. O remote é `solerpedroo/ai_hub`.

## Decisão

`electron-updater` com provider GitHub (`owner: solerpedroo`, `repo: ai_hub`). `autoDownload: false`. App **unpackaged** devolve `skipped`. Qualquer erro de rede/feed devolve `unavailable` — nunca throw para o renderer. Check no boot após persistência e via IPC `updates:check`. Resultado em `app-prefs` (`lastUpdateCheckAt`, `lastUpdateStatus`). Sem install automático nesta onda.

## Alternativas consideradas

- **Generic URL self-hosted:** extra infra; GitHub Releases já é o remote.
- **autoDownload true:** surpresa de custo/rede; o UAT só exige check.

## Consequências

- Positivas: feed morto não quebra o boot.
- Negativas: sem token, repos privados falham no check (status `unavailable`).
- Riscos aceitos: nenhum release publicado ainda → sempre unavailable até haver artefacto.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 8 / UAT §8
- `docs/reviews/W08/REVIEW.md`
