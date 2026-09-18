# REVIEW — Wave 8 (W08)

- **Wave:** W08 — Onboarding <90s + installer + ship MVP
- **Data:** 2026-09-17
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](2a4f18fe-d2e1-4878-8f7b-430c88ffe725), [trust-auditor](0f7f72b8-ce3f-4af8-8e9b-3c3810c243a4)
- **Branch / HEAD (freeze):** `main` / `1410d79f12b29e41dd7dd4ab43ce8215ad6ddf6a` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| First-run wizard: idioma → 1 provider (OpenRouter) → teste → primeira pergunta | pass | `onboarding-view.tsx`; composer é o 3º passo; e2e `onboarding.spec.ts` |
| Medir TTFT; cortar passos se >90s | pass (mock) | relógio no mount → 1º chunk; `WIZARD_TTFT_BUDGET_MS`; e2e <90s; 2 passos |
| Auto-redaction no composer | pass | aviso + redact; e2e `composer-secret-warning`; send não bloqueado |
| electron-builder NSIS; ícone; app id | pass | `electron-builder.yml` `com.aihub.desktop`; `resources/icon.png`; `AI-Hub-Setup-0.1.0.exe` gerado no gate |
| Auto-update (GitHub Releases) | pass | `updater.ts` + `resolveUpdateCheckResult`; unpackaged `skipped`; feed morto `unavailable` |
| Crash reporter opt-in, sem PII extra, sem upload | pass | default off; `extra` version/platform; copy ajustada (heap residual) |
| Checklist UAT MVP | pass | `docs/UAT-MVP.md` |
| README limitações MVP | pass | sem macOS signed / RAG / MCP |
| DoD: instalador; wizard até 1ª resposta; update check; §47 minus macOS signed | pass (código) / residual UAT máquina limpa + chaves reais | e2e 11/11; NSIS artefact; update `skipped` no Playwright |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks existem em código
- [x] DoD demonstrável: typecheck/lint; shared 58; security 10; db 20; e2e 11/11; NSIS gerado
- [x] Sem feature de onda posterior (sem import Hub/RAG/MCP/agents)
- [x] Sem D* desta onda além de D9
- [x] D9: skip se já há key; sem conta cloud

**Trust e correlações**

- [x] Renderer sem `fs`/`net`/SDKs/`better-sqlite3`/`@ai-hub/security`
- [x] IPC Zod: `prefs:get/set`, `updates:check`
- [x] Secret do wizard one-shot; DTO mascarado; crash extra sem conversa
- [x] Sem fallback silencioso; wizard termina em `chat:send` (caps intactos)
- [x] HubApi alinhado shared / preload / renderer
- [x] Prefs em `settings` JSON (`app-prefs`); sem migration nova
- [x] i18n pt-BR + en
- [x] Abort / crash-safe / caps intactos
- [x] Novo send path (wizard → composer) passa por `sendToModel`

**Falhas**

- [x] Feed de update / unpackaged não derruba o boot
- [x] Wizard vazio isolado (`AI_HUB_E2E_EMPTY`); seed e2e não vê wizard
- [x] Windows-first; macOS não assinado

**Testes**

- [x] onboarding skip/sort; secret-paste; `resolveUpdateCheckResult`; prefs db; e2e wizard + secret + updates skipped
- [x] Sem providers reais
- [x] Nenhum teste apagado
- [x] typecheck + lint + test após fixes
- [x] Este REVIEW + DIFF.patch + DIFF-post-review.patch
- [x] ADRs W08-001..005 + índice

**Produto**

- [x] Wizard curto; empty chat = primeira pergunta
- [x] Aviso de secret e update status em texto, não só cor

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| Medium | `updater.ts` | Contrato never-throw sem teste | **fixed** — `resolveUpdateCheckResult` + `updates.test.ts`; e2e `data-status=skipped` |
| Medium | `docs/UAT-MVP.md` | NSIS UAT unchecked | **fixed** — artefacto gerado no gate; install em máquina limpa residual |
| Medium | `crash-reporter.ts` / locales | Copy sobreclaimava “sem conversa” nos dumps | **fixed** — copy + ADR-W08-004: heap pode vazar se opt-in |
| Medium | `secret-paste.ts` vs `redact.ts` | Regex duplicada | **fixed** — `redactSecrets` delega a `redactPastedSecrets` |
| Medium (trust) | crash dumps | Heap Crashpad se opt-in | **accepted** — default off; anotações limpas |
| Medium (trust) | composer | Aviso não bloqueia send | **accepted** — ADR-W08-005 |
| Low | `onboarding-view.tsx` | OpenRouter em `<select>`, não cards lado a lado | **accepted** |
| Low | TTFT clock | Começa após hydrate; e2e agora <90s | **fixed** parcialmente — assert e2e |
| Low | secret no React state | Igual Settings, one-shot | **accepted** |
| Out-of-wave | import/RAG/MCP | — | **out-of-wave** |

## Correlações

- **W9:** skip-if-key; import não deve reabrir o wizard. Destino inbox continua `projectId: null`.
- **W10:** packet export ainda sem keys; composer warn não substitui redact no main.
- **W18:** wizard não cria segundo caminho de send.
- Releases GitHub vazios → `unavailable` até haver artefacto publicado.

## Riscos residuais

- UAT com chaves reais / instalador em máquina limpa não corrido (e2e mock; NSIS gerado localmente).
- macOS unsigned.
- Crashpad opt-in pode incluir memória do processo.
- Feed GitHub sem release publicado.
- Dev CSP `unsafe-eval` (ADR-W00-003).
- FTS5 vazio; Zustand ausente.

## ADRs

- `docs/ADR/ADR-W08-001-first-run-wizard.md`
- `docs/ADR/ADR-W08-002-electron-builder-nsis.md`
- `docs/ADR/ADR-W08-003-electron-updater-github.md`
- `docs/ADR/ADR-W08-004-crash-reporter-opt-in-local.md`
- `docs/ADR/ADR-W08-005-composer-secret-hint.md`

## Patches

- Freeze (o que os reviewers viram): `docs/reviews/W08/DIFF.patch`
- Após High/Medium: `docs/reviews/W08/DIFF-post-review.patch` (working tree vs HEAD; inclui freeze + correções)

## Delta (pós-review)

Fixes não estruturais o suficiente para `REVIEW-delta.md`: contrato de update + testes, copy de crash, unificação de redact, e2e locale-safe, assert TTFT. Re-typecheck; shared 58 / security 10; e2e 11/11.
