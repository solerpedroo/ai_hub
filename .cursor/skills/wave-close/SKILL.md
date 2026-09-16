---
name: wave-close
description: Closes an AI Hub implementation wave with mandatory independent review, persisted REVIEW.md plus git diffs, ADRs, and STATUS update. Use when the user says the wave is done, onda concluída, DoD met, move to the next wave, or finish Wave N.
---

# Wave close

A wave is **not** complete after the last code edit. Full protocol: `.cursorrules` §9 and §13.

## Sequence

1. Freeze. No new features. Re-read the wave DoD in `docs/IMPLEMENTATION_PLAN.md`.
2. Set `docs/STATUS.md` → `State: review`.
3. Capture **DIFF.patch** of the wave (first-party `apps/`, `packages/`, product `docs/` — exclude `node_modules`, `dist`, `docs/reviews/WXX`).
4. Spawn **independent** reviewers (they did not write the code):
   - Prefer project subagent `wave-reviewer`
   - If the wave touches keys, IPC, preload, encryption, gateway: also `trust-auditor`
   - Else Task `explore` / `generalPurpose` with the same jobs
5. Walk `.cursorrules` §9.4 yourself.
6. Classify: Blocker / High / Medium / Low / Out of wave. Fix Blocker+High. Medium unless user defers.
7. Re-typecheck / re-test. Non-trivial fixes → delta review + `DIFF-post-review.patch` and optional `REVIEW-delta.md`.
8. Write `docs/reviews/WXX/REVIEW.md` (template in `docs/reviews/README.md`) + patches. Never delete old reviews.
9. Audit ADRs: every lock/deviation/contract of this wave has `docs/ADR/ADR-WXX-NNN-*.md`. Update `docs/ADR/README.md` index.
10. Update `docs/STATUS.md`: `State: complete` (or `blocked`), Last completed `WXX`, Wave = next pending, Next action = next wave or blocker, Last review path filled.
11. Chat report in Portuguese with finding table + file paths. Only then say **Wave N complete**.

Missing `REVIEW.md` or `DIFF.patch` = failed gate. Chat is not a substitute.
