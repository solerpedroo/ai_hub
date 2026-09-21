---
name: write-adr
description: Writes or supersedes an Architecture Decision Record in docs/ADR using wave-coded ids. Use when locking stack, choosing between alternatives, introducing a contract later waves depend on, accepting residual risk, or changing a previous ADR.
---

# Write ADR

Folder: `docs/ADR/`. Template: `docs/ADR/TEMPLATE.md`. Rules: `.cursorrules` §13.

## Filename

```text
ADR-W{wave:02d}-{seq:03d}-{kebab-slug}.md
```

- `{wave}` = wave that **made** the decision (`00`–`31`)
- `{seq}` = next free number **in that wave** (`001`, `002`, …)
- Never reuse or rename an id. To change a decision: new ADR + old `Status: superseded by ADR-WXX-NNN`

## Body

Copy `docs/ADR/TEMPLATE.md`. Portuguese. Fill: Status (`accepted` unless still proposed), Wave, Date ISO, Context, Decision, Alternatives, Consequences, links to plan + `docs/reviews/WXX/REVIEW.md` when the review exists.

No secrets, keys, or conversation content.

## Index

Add a row to the table in `docs/ADR/README.md` in the same change.

## When not to write

Cosmetic UI, formatting, one-off variable names. If it affects security, cost, providers, or data shape — write it **now**, not at wave close.
