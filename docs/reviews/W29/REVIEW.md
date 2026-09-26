# Review — W29 Plugins + marketplace

- **Data:** 2026-09-26
- **Branch / HEAD:** `main` / `80e9e036b109b77bb018ca319dc40af8e8a2f44c`
- **Revisores independentes:** `wave-reviewer`, `trust-auditor`
- **ADR:** [ADR-W29-001](../../ADR/ADR-W29-001-declarative-internal-marketplace.md)

## DoD

> Instalar um pack MCP pelo marketplace interno e usar no projeto com Permission Center.

| Item | Resultado | Evidência |
|---|---|---|
| Manifest, permissões e sandbox estáveis | Passou | `packages/shared/src/extensions.ts` e testes estritos |
| Marketplace interno de provider, MCP e skill | Passou | catálogo declarativo; cards core-integrated são explícitos |
| Endpoint OpenAI-compatible | Passou | fluxo existente documentado na tela de provider |
| Sem acesso direto de plugin a keytar | Passou | catálogo sem código; apenas APIs core/main |
| Pack interno real | Passou | `ai-hub.project-files`, persistido em `installed_packs` |
| Sem agentes de terceiros | Passou | nenhum carregador/host de terceiros foi introduzido |
| Instalar e usar com Permission Center | Passou | bloqueio pré-instalação + diálogo e leitura scoped cobertos em `tools.marketplace.test.ts`; instalação/remover na UI cobertos em Playwright |

## Checklist do gate

- [x] Subtarefas e DoD presentes em código executável.
- [x] Renderer continua sem keytar, filesystem, rede de provider ou SQLite.
- [x] IPC novo é explicitamente exposto e validado por Zod no preload e no main.
- [x] Migração `installed_packs` corresponde ao schema e aos repositórios.
- [x] Metadados visíveis possuem pt-BR e en; DTO usa chaves de tradução restritas.
- [x] Não há novo caminho de chat/custo/fallback silencioso.
- [x] Contratos, persistência, fluxo de autorização e UI possuem testes sem chaves reais.
- [x] `pnpm typecheck`, lint, testes unitários e E2E selecionado passaram.

## Achados

| Severidade | Arquivo | Resumo | Estado |
|---|---|---|---|
| Medium | `apps/desktop/e2e/marketplace.spec.ts` | E2E inicial não cobria a leitura após instalar. | corrigido — teste de integração cobre pack → Permission Center → leitura scoped. |
| Medium | `apps/desktop/src/main/marketplace-packs.ts` | Provider e skill pareciam itens instaláveis sem vínculo. | corrigido — DTO/UI declaram `core_integrated`. |
| Medium | `apps/desktop/src/main/marketplace-packs.ts` | Copy do catálogo era inglês na UI pt-BR. | corrigido — renderer resolve chaves i18n pt-BR/en. |
| Low | `apps/desktop/src/main/tools.ts` | Permissão persistida podia continuar visível após desinstalar. | corrigido — estado também é filtrado pela instalação. |

O delta review do `wave-reviewer` e do `trust-auditor` não encontrou Blocker, High ou Medium restante.

## Correlações e riscos residuais

- A instalação habilita o pack, mas não concede autorização: a leitura continua no `ToolRouter` da W22, por projeto e dentro da raiz selecionada.
- `installed_packs` preserva identidade/versionamento para atualizações futuras sem carregar código.
- Packs de terceiros permanecem fora de escopo: exigem host isolado, assinatura e capability broker, como registra a ADR.
- O E2E não automatiza o diálogo nativo do Electron; o teste de integração em main simula a decisão e prova o caminho de autorização. Não há risco residual de fronteira de confiança conhecido.

## Evidências de verificação

- `pnpm --filter @ai-hub/shared test` — 130 testes passaram.
- `pnpm --filter @ai-hub/desktop exec vitest run src/main/tools.marketplace.test.ts` — passou.
- `pnpm typecheck` — 8 tarefas passaram.
- `pnpm --filter @ai-hub/desktop lint` — passou.
- `pnpm --filter @ai-hub/desktop rebuild:native` + `build` — passou.
- `pnpm --filter @ai-hub/desktop test:e2e -- marketplace.spec.ts developer.spec.ts` — 2 testes passaram.

## Patches

- `docs/reviews/W29/DIFF.patch`
- `docs/reviews/W29/DIFF-post-review.patch`
