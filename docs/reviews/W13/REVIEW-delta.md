# REVIEW-delta — W13

- **Data:** 2026-09-18
- **Reviewer:** [wave-reviewer](469e8367-5943-476d-b519-d38814db3505) + síntese do agente
- **Âmbito:** correções pós-freeze (preview mode, schema refine, send paths)

## High do freeze

**gone** — `resolveSendMentions(..., "preview")` ignora `mentions:*`; send continua a lançar. e2e DoD 2.7s após o fix.

## Sem Blocker/High novo

Medium residual aceite: sem unit test do resolver no main; edit não re-injeta mentions do content.

## Verificação

- `pnpm --filter @ai-hub/shared test` — 83/83
- `pnpm --filter @ai-hub/files test` — 15/15
- `pnpm --filter @ai-hub/desktop typecheck`
- e2e `mentions.spec.ts` 1/1
