# Wave 21 review

Status: **accepted**

## Gate

| Area | Result |
|---|---|
| RunMode/Effort Zod contracts and persistence | PASS |
| Plan/Assist UI; Agent/Orchestrate disabled | PASS |
| Effort bounds and pre-send cost estimate | PASS |
| Explicit thinking capability and honest unsupported-provider HUD | PASS |
| Immutable compiler packet at Council dispatch and adapter-side role lenses | PASS |
| Zod-validated usage HUD event with no secrets | PASS |
| i18n pt-BR/en | PASS |

## Validation

- `pnpm --filter @ai-hub/shared test -- --run run-modes.test.ts`
- `pnpm --filter @ai-hub/ai-gateway test -- --run adapter.test.ts openai-adapter.test.ts`
- `pnpm --filter @ai-hub/db test -- --run repos.test.ts`
- `pnpm --filter @ai-hub/desktop typecheck`
- `git diff --check`

Independent wave and trust reviews were applied. No secrets or provider headers cross the preload boundary. Thinking is capability-gated; current providers explicitly report unsupported rather than simulating it.

The usage event is emitted on every delta and on completion. The same validated telemetry drives the composer HUD and status bar; cache/thinking fields are explicit and remain zero when the provider does not report them. Council lenses are adapter-side dispatch metadata and never mutate the compiler packet.
