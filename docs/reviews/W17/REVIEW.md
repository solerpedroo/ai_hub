# REVIEW — Wave 17 (W17)

- **Wave:** W17 — Skills / workflows (D8)
- **Data:** 2026-09-19
- **Reviewer:** agent (síntese). Independentes: [wave-reviewer](2512f0fb-121c-46d4-9312-52c59b90d10b), [trust-auditor](aeb20924-b57b-41d6-b0ef-a6025fefd3c9)
- **Branch / HEAD (freeze):** `main` / `a6ca061ceb157fc3366749a00ed612ef71b2904d` (working tree uncommitted)
- **`security-review` / Bugbot Cursor:** não disparados (utilizador não pediu pelo nome). Superfície coberta pelo `trust-auditor`.

## DoD (plano)

| Critério | Resultado | Como verificou |
|---|---|---|
| Entidade Skill: nome, descrição, prompt, modelo preferido, menções padrão, `steps[]` | pass | tabela `skills` + contrato v1 `packages/shared/src/skills.ts` |
| CRUD + pastas; 5 factory | pass | IPC `skills:*`; `FACTORY_SKILLS`; UI `skills-view.tsx` |
| Palette, `/skill`, atalho, `@skill` | pass | palette + `Ctrl/Cmd+Shift+S` + parse-on-send + mention resolve |
| UI passo atual | pass | stepper `skill-run`; todos os passos `data-current` durante o send único |
| Spend cap + privacy | pass | reusa `sendChat`; `{{goal}}` vazio em `strict` |
| Contrato JSON versionado (`tools: []`) | pass | `skillContractV1Schema`; teste rejeita tools |
| **DoD:** `/skill Code Review` + `@file:diff` revisão no formato da skill, modelo configurado | pass | e2e `skills.spec.ts` 2.4s pós-fix; mock `MOCK_SKILL_REVIEW_TEXT`; receipt `gpt-4o-mini` |

## Checklist §9.4

**DoD e escopo**

- [x] Sub-tasks em código
- [x] DoD: e2e `/skill Code Review @file:diff` + ficheiro `diff.md` (stem match)
- [x] Sem MCP, tools, agentes, Council
- [x] Hook `tools: []` sem feature W23
- [x] D8 desta onda, não deferido

**Trust e correlações**

- [x] Renderer sem fs/net/SDKs; cifra title/description/definition
- [x] IPC `skills:*` Zod nos dois sentidos
- [x] Sem fallback silencioso de modelo: preferred só se a chave da sessão servir o id
- [x] DTOs shared/main/renderer
- [x] Migration 12 no mesmo PR
- [x] i18n pt-BR + en
- [x] Caps no `sendChat` existente
- [x] `@skill` saiu de `MENTION_STUB_TYPES`

**Falhas**

- [x] Skill em falta: `mentions:not_found`
- [x] Caps: mesmo path do chat
- [x] Windows-first; e2e Electron

**Testes e qualidade**

- [x] Contrato, compiler slice, mock, repos encrypted+seed, IPC Zod, `projectFileNameMatches`, e2e
- [x] Sem providers reais
- [x] Sem testes apagados
- [x] Typecheck shared + desktop; e2e após fixes
- [x] `docs/reviews/W17/` + ADRs W17-001…003

**Produto**

- [x] Empty library: New + factory seed
- [x] Stepper em texto, não só cor

## Findings

| Severidade | Ficheiro | Resumo | Status |
|---|---|---|---|
| High | `mentions.ts` (main) | `@file:diff` não resolvia `diff.md`; DoD abortava | **fixed** — `projectFileNameMatches` (stem) |
| High | `skills.ts` / `skills-view.tsx` | Run em pt-BR falhava (`Resumir PDF` ≠ título EN) | **fixed** — Run manda `skillId`; `matchSkill` exact-first |
| High | `prompt-vars.ts` | `{{goal}}` interpolava instructions em `strict` | **fixed** — `goal=""` em strict |
| High | `App.tsx` | preferred model trocava `providerKeyId` em silêncio | **fixed** — só aplica se a chave da sessão listar o id |
| Medium | `home-view.tsx` | passo atual fingia index 0 | **fixed** — todos current no send único |
| Medium | `skills.ts` resolve | `text` sem `redactSecrets` | **fixed** |
| Medium | `matchSkill` | `includes` curto podia apanhar a skill errada | **fixed** — exact, fuzzy só se único |
| Medium | defaultMentions UI / seed `@file:diff` | editor não edita menções; factory sem anexo default | **accepted** — menções default no contrato; Code Review pede o diff se faltar (não hard-fail) |
| Medium | defaultMentions no send vs preview | prefixadas no send após preview | **accepted** — mesmas menções do composer no DoD; preview já inclui `@skill`+`@file` |
| Medium | testes main resolver | sem vitest Electron para `resolveSkillMention` | **accepted** — e2e DoD + testes shared/repos |
| Low | palette | só “Run skill: Code Review” | **accepted** |
| Low | `preferred_model` plaintext | aceite ADR-W17-003 | **accepted** |
| Out-of-wave | edit/regenerate | não re-injeta menções | **out-of-wave** (residual W13) |
| Out-of-wave | `tools: []` | hook W23 | **out-of-wave** |

## Correlações

- W13: `@skill` saiu do stub; ADR-W13-002 superseded por ADR-W17-003.
- W15: interpolação e pastas reutilizadas; prompts e skills são tabelas distintas.
- W18: `strict` já omite instructions no compiler e agora também em `{{goal}}` da skill; firewall ainda não existe.
- W23: `tools: []` no JSON cifrado; `skillDefinitionJson` reescreve tools vazio até essa onda.
- Caps/receipts: nenhum send path paralelo.

## Riscos residuais

- Factory títulos em inglês na DB; labels i18n na UI. Run da library usa `id`.
- Stepper não segue headings do stream (um send = SOP completo).
- `matchSkill` fuzzy só se o resultado for único; `/skill re` ambíguo falha explícito.
- Sem e2e de palette/atalho/cap/strict (DoD composer coberto).
- `skills:list` devolve prompt em plaintext no renderer (como prompts W15).

## ADRs

- `docs/ADR/ADR-W17-001-skill-contract-json.md`
- `docs/ADR/ADR-W17-002-skill-slash-arguments.md`
- `docs/ADR/ADR-W17-003-skills-encrypted-library.md`

## Patches

- `docs/reviews/W17/DIFF.patch` (freeze)
- `docs/reviews/W17/DIFF-post-review.patch` (High fixes + working tree completo após review)
