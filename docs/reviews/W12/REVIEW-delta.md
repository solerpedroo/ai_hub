# REVIEW-delta — W12

- **Data:** 2026-09-18
- **Reviewer:** [wave-reviewer](4cd0678c-2ad6-49c1-9a20-a49bda0ff89e) + síntese do agente
- **Âmbito:** correções pós-freeze (não relitigar a onda inteira)

## Highs do freeze

Confirmados **gone**: `ingestDropped` fora da HubApi; PDF FlateDecode com teste; pasta com `realpath` + `isPathInsideRoot`.

## Delta estrutural

1. Extrator PDF passou de literais crus para inflate `zlib` com teto de 4 MiB (ADR-W12-004).
2. Preload já não aceita paths do renderer; drop só via `File` + `webUtils`.
3. Packet enviado ao renderer omite o body dos anexos; log `[hub:packet]` só metadados.

## Achados do delta

Nenhum Blocker/High novo. Mediums do delta (fallback `fileIds`, teto de inflate, testes de path/strip) **fixed** no mesmo gate.

## Verificação

- `pnpm --filter @ai-hub/files test` — 14/14
- `pnpm --filter @ai-hub/desktop typecheck`
- e2e `files.spec.ts` 2/2 (antes deste último micro-delta de fallback/inflate; extração e UI inalteradas nesse e2e)
