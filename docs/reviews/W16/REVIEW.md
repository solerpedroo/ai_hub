# REVIEW — Wave 16 (W16)

- **Wave:** W16 — Artifacts canvas (D5)
- **Data:** 2026-09-19
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](f93f81f6-8ec2-4939-b3b9-3e392786dbeb), [trust-auditor](1985e9f3-a96b-42f1-95c9-bbe8738d8cb1); delta [wave-reviewer](eda53da1-c960-4a5c-a54b-12be5dde9058)
- **Branch / HEAD (freeze):** `main` / `334107567ef2cdadaafaa30947bec201115c63ab` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Detector mermaid / html / doc / código >N | pass | `detectArtifacts`; fences sem lang ≥12 linhas após review; testes `artifacts.test.ts` |
| Split chat \| canvas | pass | `artifact-canvas.tsx` `w-[42%]` em `home-view.tsx` |
| Render MD / Mermaid / HTML sandbox | pass | `MessageMarkdown`; mermaid iframe `sandbox=""`; `ai-hub-artifact:` + CSP `connect-src 'none'` |
| Code highlight + copy; sem execução nativa | pass | canvas toolbar copy; sem `child_process` |
| Versionamento v1, v2… | pass | `family_id` + saveVersion; e2e 2 options |
| Pin no projeto; export MD/HTML/SVG | pass | pin de família; export HTML em todos os kinds; SVG mermaid |
| Abrir artifact antigo no workspace | pass | `artifact-workspace-item` + e2e |
| **DoD:** “desenhe a arquitetura deste fluxo” abre Mermaid editável/versionado | pass | e2e `artifacts.spec.ts` 2.8s (pós-fix) |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks em código
- [x] DoD: typecheck desktop + e2e artifacts
- [x] Sem skills reais, MCP, agentes, Council
- [x] Sem D* desta onda além de D5
- [x] Hooks: tabela `artifacts` + IPC; packet sem fatia artifact (intencional, ADR-W16-001)

**Trust e correlações**

- [x] Renderer sem fs/net/SDKs; cifra title/body no main
- [x] IPC `artifacts:*` Zod nos dois sentidos
- [x] Sem fallback silencioso; capture não é send path (caps intactos em `sendChat`)
- [x] DTOs shared/main/renderer
- [x] Migration 11 no mesmo PR
- [x] i18n pt-BR + en
- [x] Abort/crash-safe: capture isolado após `complete`
- [x] HTML sandbox: `will-frame-navigate` + `onBeforeRequest` cancelam subframe fora do protocolo

**Falhas**

- [x] Save/pin/export: `artifacts.error`
- [x] Empty: detector ignora “Hello from mock”
- [x] Windows-first; e2e Electron

**Testes e qualidade**

- [x] Contratos: detectArtifacts, Zod artifact DTO, repos encrypted+versões+clone+delete, mock mermaid
- [x] Sem providers reais
- [x] Sem testes apagados
- [x] Typecheck desktop + shared; e2e após fixes
- [x] `docs/reviews/W16/` + ADRs W16-001…003

**Produto**

- [x] Editor + versões visíveis; HTML dirty pede save
- [x] Kind em texto, não só cor

## Findings

| Severidade | Ficheiro | Resumo | Status |
|---|---|---|---|
| High | `index.ts` / `artifacts.ts` | iframe HTML podia navegar para `https://` e levar o body | **fixed** — `will-frame-navigate` + `onBeforeRequest` + `navigate-to 'none'` |
| Medium | `ipc.ts` / `artifacts.ts` | `saveVersion`/export sem `redactSecrets` | **fixed** |
| Medium | `artifact-canvas.tsx` | mermaid `innerHTML` na origem da app | **fixed** — iframe `sandbox=""` srcDoc |
| Medium | `chat-session.ts` | capture throw virava `complete` em `interrupted` | **fixed** — try/catch isolado |
| Medium | `artifacts.ts` (shared) | fence sem linguagem nunca virava código | **fixed** |
| Medium | `artifact-canvas.tsx` | export HTML só se kind html | **fixed** |
| Medium | `ipc-schemas` / repos | lista >100 rebentava Zod | **fixed** — cap no IPC, clone sem cap |
| Medium | `repos.ts` | `removeConversation` deixava artifacts órfãos | **fixed** |
| Medium | `home-view.tsx` | save/pin/export sem catch | **fixed** |
| Medium | `artifacts.ts` (main) | protocol host sem UUID | **fixed** |
| Medium | testes main wrap/CSP | sem vitest Electron | **accepted** (e2e mermaid; locks no main) |
| Low | `pt-BR.json` | `workspace.panel.artifacts` em inglês | **fixed** — Artefactos |
| Low | SVG export | botão sem svg / sem redact | **fixed** |
| Low | atalho canvas | só rato | **accepted** |
| Out-of-wave | packet/export conversa | artifacts não vão no packet | **out-of-wave** |
| Out-of-wave | pin galeria de projeto | flag de família, não `project_id` | **accepted** (ADR-W16-001) |

## Correlações

- W17: `family_id` pronto; não ligar skills.
- W10 packet: artifact não entra no compiler (intencional).
- W15 playground: `sendChat` captura artifacts em `kind=playground`; UI do playground não tem canvas.
- W4 regenerate: matching por `kind` no sibling.

## Riscos residuais

- `navigate-to 'none'` pode ser no-op no Chromium; os locks Electron são o fecho real. Sem e2e de HTML hostil.
- `mermaid.render()` ainda corre no renderer (`securityLevel: "strict"`); o SVG é mostrado noutro iframe.
- Falha de capture é silenciosa (mensagem completa sem artifact).
- Lista IPC teto 100 versões/linhas por conversa.
- Bundle mermaid aumenta o renderer (~1–2 MB de chunks).
- Pin não é galeria de projeto.

## ADRs

- `docs/ADR/ADR-W16-001-artifacts-versioned-encrypted.md`
- `docs/ADR/ADR-W16-002-html-sandbox-custom-protocol.md`
- `docs/ADR/ADR-W16-003-artifact-detector-thresholds.md`

## Patches

- `docs/reviews/W16/DIFF.patch` (freeze)
- `docs/reviews/W16/DIFF-post-review.patch` (fixes)
- `docs/reviews/W16/REVIEW-delta.md`
