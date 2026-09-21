# Codex project operating system

This directory is the Codex-native mirror of the Cursor operating system. It is intentionally versioned with the repository so a new Codex session preserves the same engineering bar.

## Bootstrap

1. Read `docs/STATUS.md`.
2. Read the current wave in `docs/IMPLEMENTATION_PLAN.md`.
3. Read `AGENTS.md` and `.cursorrules` (constitution).
4. Apply the focused rules in `.codex/rules/` for the files being changed.

## Workflow skills

- `.codex/skills/wave-start/SKILL.md` — start/resume one wave in plan order.
- `.codex/skills/wave-close/SKILL.md` — freeze, review, fix gates, persist artifacts, and close.
- `.codex/skills/write-adr/SKILL.md` — record architecture decisions and index them.

## Review agents

- `.codex/agents/wave-reviewer.md` — independent DoD, tests, and correlation review; never implements.
- `.codex/agents/trust-auditor.md` — independent trust-boundary review; never implements.

## Compatibility

`.cursor/` remains the source-compatible Cursor layout. `.codex/` is kept synchronized with it. `.cursorignore` and `.codexignore` carry the same repository context policy; Codex should also honor `.gitignore` and avoid generated, secret, binary, and patch-artifact noise.

The global `ai-hub-repo` skill at `C:\Users\pedro\.codex\skills\ai-hub-repo` routes new Codex sessions to this bootstrap when working in this repository.
