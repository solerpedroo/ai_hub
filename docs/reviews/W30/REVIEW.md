# Review — W30

- Date: 2026-09-27
- Branch/HEAD: current working tree after W30 implementation
- ADR: `docs/ADR/ADR-W30-001-encrypted-folder-relay-sync.md`

## DoD

- Pass: two isolated Electron profiles synchronize a project, conversation and message (`apps/desktop/e2e/sync.spec.ts`).
- Pass: provider keys remain in OS keytar and are excluded from snapshot and relay tests.
- Pass: opt-in is disabled by default; only explicitly selected categories are exported.
- Pass: AES-GCM envelope is validated before persistence; relay writes are serialized with a cross-process lock.
- Accepted residual risk: Windows was exercised; physical macOS execution was unavailable in this workspace. The Node/Electron implementation uses platform-neutral paths and is documented as pending physical validation.

## Findings and disposition

| Severity | Finding | Status |
|---|---|---|
| High | Device-local privacy/consent preferences were included in settings sync. | Fixed: only portable appearance settings synchronize. |
| High | Relay temporary file could collide across devices. | Fixed: lock file, stale-lock recovery and unique temp files. |
| High | LWW was incomplete for editable messages and skills. | Fixed: message `updatedAt` migration 22, entity LWW and conflict records. |
| High | Import transaction was constructed without execution. | Fixed and covered by the full DB suite. |
| Medium | Relay input had only shallow shape validation. | Fixed: bounded strict shared Zod snapshot schema. |
| Medium | macOS physical proof is unavailable on this Windows host. | Accepted residual risk. |
| Low | Conflict UI exposes a count, not entity details. | Accepted; persistent conflict records exist and detail UI is deferred. |

## Verification

- `pnpm --filter @ai-hub/db test -- --run src/repos.test.ts` — 35 passed.
- `pnpm --filter @ai-hub/shared test -- --run src/sync.test.ts` — 2 passed.
- `pnpm --filter @ai-hub/desktop typecheck` and `lint` — passed.
- `pnpm --filter @ai-hub/desktop test:e2e -- sync.spec.ts` — passed.

## Correlations and residual risks

- W31 must preserve the relay lock and entity versions when adding shared writers.
- macOS physical verification and signing remain tracked in `docs/STATUS.md`.
- The native ABI switches between Node tests and Electron; rebuild the native modules before desktop e2e.

## Artifacts

- `docs/reviews/W30/DIFF.patch`
- `docs/reviews/W30/DIFF-post-review.patch`
