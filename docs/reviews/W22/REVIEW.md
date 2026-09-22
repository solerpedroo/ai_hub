# Wave 22 — MCP + Permission Center — Review

- **Date:** 2026-09-21
- **Branch / HEAD:** `main` / `2f38ccc1e787179f256df724d12b2bdfc5be0e01` (uncommitted wave changes)
- **Reviewers:** `/root/w22_wave_review`, `/root/w22_trust_review`; final delta audit by `/root`
- **Patches:** `docs/reviews/W22/DIFF.patch`, `docs/reviews/W22/DIFF-post-review.patch`

## DoD

> Chat reads a project file through MCP only after “Allow once”; deny works; renderer never talks stdio/MCP directly.

| Requirement | Result | Evidence |
|---|---|---|
| `packages/tools` and MCP stdio/SSE clients | Pass | `packages/tools/src/mcp.ts`, transport tests |
| Once / project / deny permissions | Pass | Native main-process dialog plus `ToolRouter` tests |
| Project-scoped filesystem reference connector | Pass | Realpath + no-follow file-handle validation in `filesystem.ts` |
| Redacted activity in HUD | Pass | typed IPC, `HomeView`, output/argument caps |
| Skill allowlist contract | Pass | Skill contract v2 with empty defaults |
| No renderer MCP/stdio access | Pass | only main imports `@ai-hub/tools`; preload exposes typed request APIs |

## Checklist (§9.4)

| Check | Result |
|---|---|
| DoD and every sub-task exists in code | Pass |
| No W23 agent loop, W24 orchestration, terminal or unrestricted disk access | Pass |
| Renderer has no keys, Node filesystem, network or MCP transport | Pass |
| IPC is explicit and Zod-validated; permission decision stays in main native UI | Pass |
| Migration 16 matches Drizzle schema and repository consumers | Pass |
| pt-BR and en strings exist; native confirmation follows selected locale | Pass |
| Timeout, invalid path, root missing and denied states surface a bounded error | Pass |
| Tests have no live providers/keys; typecheck and lint pass | Pass |
| ADRs and README index are current | Pass |

## Findings

| Severity | File(s) | Finding | Status |
|---|---|---|---|
| Blocker | `preload/index.ts`, `main/tools.ts`, `shared/ipc-schemas.ts` | Renderer could decide a pending permission. | Fixed: decision moved to a native main-process dialog; decision schemas and IPC are not exposed. |
| High | `db/repos.ts` | A root change could retain previous project grants. | Fixed: root update revokes that project’s grants transactionally; repository test added. |
| High | `tools/filesystem.ts` | Initial read path could load a complete file. | Fixed: file-handle read is capped at 64 KiB plus one byte and tested. |
| High | `tools/mcp.ts` | Remote transports needed bounds and safer defaults. | Fixed: no shell, minimal environment, timeout, response cap, HTTPS-only remote SSE and credential-URL rejection. |
| Medium | `main/tools.ts`, `home-view.tsx` | Activity/error feedback was incomplete. | Fixed: latest activity is typed over IPC, HUD shows redacted args/result, and deny/read errors are usable. |
| Medium | `shared/ipc-schemas.test.ts` | W22 IPC contract coverage was missing. | Fixed: strict input/result contract test added; router and transport tests cover the executable flow. |

## Correlations and boundaries

- Migration 16 stores only encrypted project roots and permission metadata. Paths are decrypted solely in main; tools never enter renderer state except redacted labels/activity.
- Skills move from contract v1 to backward-compatible v2 and default to no allowed tools. W23 consumes this declaration; W22 does not create an agent execution loop.
- Tool output is redacted and bounded before returning to the renderer. If the user sends it, the existing composer/firewall/send/cap path remains authoritative.

## Residual risks

- The only shipped connector is read-only. The `destructive` confirmation branch is contractual and unexercised until a destructive MCP connector is introduced; it cannot receive a persistent grant.
- Native Electron permission dialogs are covered by the main/IPC type contracts and router unit tests, not an automated OS-dialog e2e fixture.
- Generic external MCP configuration is intentionally not exposed in this wave; stdio/SSE clients are bounded building blocks for later explicitly configured connectors.

## ADRs

- `docs/ADR/ADR-W22-001-main-owned-mcp-tool-router.md`
- `docs/ADR/ADR-W22-002-project-scoped-tool-permissions.md`
- `docs/ADR/ADR-W22-003-realpath-scoped-filesystem-connector.md`
- `docs/ADR/ADR-W22-004-skill-contract-v2-tool-allowlist.md`
