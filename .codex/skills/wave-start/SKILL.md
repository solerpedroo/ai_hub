---
name: wave-start
description: Starts or resumes an AI Hub implementation wave. Use when the user asks to start a wave, implement the next wave, continue Wave N, or begin coding the plan.
---

# Wave start

## Steps

1. Read `docs/STATUS.md`. If `State` is `review` or `blocked`, do not start a new wave — finish or unblock the current one.
2. Read the **current wave** section in `docs/IMPLEMENTATION_PLAN.md` (objective, sub-tasks, DoD, diferenciais).
3. Inspect the repo (do not assume planned files exist).
4. State in chat (Portuguese): wave id, DoD, packages you will touch, what you will **not** touch (later-wave features).
5. Set `docs/STATUS.md`: `State: in_progress`, Wave `WXX`, Next action = first sub-task.
6. If this wave locks architecture, create/update ADRs as decisions happen (skill `write-adr`). Do not wait until close.
7. Implement **only** this wave’s sub-tasks, smallest change that meets DoD.

Do not skip waves. Do not declare the wave complete here — that is `wave-close`.
