# Wave 22 — Delta review

**Date:** 2026-09-21  
**Reviewer:** `/root`, after independent DoD and trust reviews

The post-review changes were structural trust fixes, so the delta was audited against the original findings:

- The renderer can request a project-file read but cannot approve it. `main/tools.ts` owns the native confirmation, binds the pending request to `WebContents`, records only the settled redacted activity, and the shared public contract has no decision schema or IPC channel.
- Selecting/replacing a project root deletes every persistent grant for that project in the same transaction.
- File access now validates canonical containment, opens with `O_NOFOLLOW`, revalidates before reading, and returns at most 64 KiB.
- Stdio/SSE clients now have bounded response sizes, cancellation/timeout behavior, no shell, minimal inherited environment, and HTTPS-only remote SSE.
- The HUD uses a typed latest-activity endpoint and never receives a root path or permission-decision capability.

Final validation passed: `pnpm --filter @ai-hub/tools test` (9), `pnpm --filter @ai-hub/db test` (29), `pnpm --filter @ai-hub/shared test` (110), `pnpm typecheck`, and `pnpm lint`.
