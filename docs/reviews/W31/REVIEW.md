# Review — W31 Team / Enterprise

- **Date:** 2026-09-28
- **Branch / HEAD:** `main` / `e24c3f1`
- **Independent reviewers:** `w31_dod_reviewer`, `w31_trust_auditor`
- **ADR:** [ADR-W31-001](../../ADR/ADR-W31-001-local-enterprise-policy-profile.md)

## DoD

**Pass, as a local Enterprise profile.** Organizations can govern assigned projects: model allowlist, PII firewall, read/execute tools, monthly team hard-stop, encrypted audit log, and opt-in aggregate analytics. The renderer only receives validated DTOs; provider credentials remain BYOK/keytar-only. Billing was not added.

The profile is intentionally single-machine/local-admin configuration. It does not claim remote identity, RBAC, live shared projects, or centrally distributed provider credentials; those require authenticated transport and remain a future scope as recorded in ADR-W31-001.

## Verification

- `pnpm --filter @ai-hub/shared test -- --run` — 22 files, 134 tests passed.
- `pnpm --filter @ai-hub/desktop typecheck` — passed.
- `pnpm --filter @ai-hub/db typecheck` — passed.
- `pnpm --filter @ai-hub/tools typecheck` — passed.
- `pnpm --filter @ai-hub/desktop build` — passed.
- `pnpm --filter @ai-hub/desktop exec playwright test e2e/enterprise.spec.ts` — 1 passed.
- `pnpm --filter @ai-hub/db test` did not finish in this environment after rebuilding `better-sqlite3` for Node; this is the documented ABI limitation. Electron native modules were rebuilt before Playwright.

## Findings

| Severity | Finding | Status |
|---|---|---|
| High | Playground batch could concurrently exceed the organization monthly cap. | Fixed: organization-aware batch preflight and reservations before `Promise.all`. |
| High | Council/orchestration could double-count their own batch reservations. | Fixed: the common batch preflight owns the organization check; child sends use internal `__skipCaps`. |
| Medium | Council reservations could remain until TTL after a failed slot. | Fixed: release in `finally`. |
| Medium | Audit/analytics lacked safe coverage. | Fixed: encrypted/redacted audit events, opt-in aggregate analytics, contract/DB/E2E coverage. |
| Out of wave | RBAC, remote shared projects, centralized/distributed provider keys. | Explicitly excluded by ADR-W31-001; no remote identity or backend exists, and no multi-user security claim is made. |

## Checklist

- [x] No Node/provider SDK imports in renderer; explicit preload DTO API.
- [x] New IPC inputs and outputs validated by Zod in preload and main.
- [x] Audit policy/details encrypted; secret-like values redacted; analytics contains counters only.
- [x] No silent model fallback or unaccounted send path.
- [x] Council, agent/orchestration, and Playground reach the shared chat/tool enforcement.
- [x] pt-BR and en strings included.
- [x] No billing, cloud account, or provider-secret synchronization added.

## Residual risks

- The DB Vitest command is environment-blocked by the Node/Electron native ABI handoff; typecheck and Electron E2E passed after `rebuild:native`.
- Local-admin settings are not a substitute for multi-user authorization. Implement identity, RBAC, authenticated policy distribution, and real shared-project transport before describing this as remote team collaboration.

## Artifacts

- [DIFF.patch](./DIFF.patch)
- [DIFF-post-review.patch](./DIFF-post-review.patch)
