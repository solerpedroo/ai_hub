# Architecture Decision Records

Decisões de arquitetura **necessárias** ficam aqui. Convenção completa: `.cursorrules` §13.

## Código do arquivo (a onda vai no id)

```text
ADR-W{onda:02d}-{seq:03d}-{kebab-slug}.md
```

| Parte | Significado |
|---|---|
| `W00` | Onda que **tomou** a decisão (Wave 0) |
| `001` | Sequência **dentro dessa onda** |
| slug | Inglês, kebab-case, estável |

Exemplos: `ADR-W00-001-electron-vite-monorepo.md`, `ADR-W02-001-provider-adapter-interface.md`.

Não reutilizar id. Não renomear. Para mudar uma decisão: nova ADR com `Status: accepted` e a antiga `superseded by ADR-WXX-NNN`.

Template: [TEMPLATE.md](./TEMPLATE.md).

## Quando escrever

- Trava ou desvio do `IMPLEMENTATION_PLAN.md`
- Escolha entre alternativas reais
- Contrato que ondas futuras vão consumir
- Risco residual aceito
- Mudança de uma ADR anterior

Não escrever ADR de detalhe cosmética. Se mexe em segurança, custo, provider ou formato de dados — escrever **na mesma onda**.

## Índice

| ID | Onda | Título | Status |
|---|---|---|---|
| [ADR-W00-001](./ADR-W00-001-electron-vite-monorepo.md) | W00 | Electron-vite + pnpm + Turborepo | accepted |
| [ADR-W00-002](./ADR-W00-002-shadcn-tailwind-i18n.md) | W00 | shadcn, Tailwind v3, i18n, tema no renderer | accepted |
| [ADR-W00-003](./ADR-W00-003-csp-and-window-ipc.md) | W00 | CSP, sandbox, IPC de janela com Zod | accepted |
| [ADR-W01-001](./ADR-W01-001-envelope-encryption-at-rest.md) | W01 | Envelope AES-256-GCM em vez de SQLCipher | accepted |
| [ADR-W01-002](./ADR-W01-002-drizzle-user-version-migrations.md) | W01 | Drizzle + migrations via `user_version` | accepted |
| [ADR-W01-003](./ADR-W01-003-keytar-and-ipc-secrets.md) | W01 | Segredos no keytar; IPC devolve máscara | accepted |
| [ADR-W01-004](./ADR-W01-004-message-graph-parent-branch.md) | W01 | Grafo de mensagens: `parent_id` + `branch_id` | accepted |
| [ADR-W02-001](./ADR-W02-001-provider-adapter-fetch.md) | W02 | Adapter via `fetch` + SSE, sem AI SDK | accepted |
| [ADR-W02-002](./ADR-W02-002-compiler-packet-v0.md) | W02 | Compiler v0 e packet JSON versão 1 | accepted |
| [ADR-W02-003](./ADR-W02-003-crash-safe-stream.md) | W02 | Flush incremental e `interrupted` no boot | accepted |
| [ADR-W02-004](./ADR-W02-004-gateway-errors-and-receipts.md) | W02 | Taxonomia de erro e receipts com catálogo | accepted |
| [ADR-W03-001](./ADR-W03-001-react-markdown-gfm.md) | W03 | Markdown no renderer com GFM e highlight | accepted |
| [ADR-W03-002](./ADR-W03-002-linear-edit-and-regenerate.md) | W03 | Edit/regenerate lineares até a W4 | superseded by ADR-W04-002 |
| [ADR-W03-003](./ADR-W03-003-session-restore-settings.md) | W03 | Restore da sessão em `settings` | accepted |
| [ADR-W03-004](./ADR-W03-004-e2e-mock-adapter.md) | W03 | Playwright com adapter mock, sem rede | accepted |
| [ADR-W03-005](./ADR-W03-005-sandboxed-cjs-preload.md) | W03 | Preload CJS sandboxed + HTML sem crossorigin | accepted |
| [ADR-W04-001](./ADR-W04-001-active-path-is-active-branch.md) | W04 | Path ativo via `is_active_branch` | accepted |
| [ADR-W04-002](./ADR-W04-002-sibling-fork-not-delete.md) | W04 | Regenerar/editar criam irmãos, sem wipe | accepted |
| [ADR-W04-003](./ADR-W04-003-compiler-active-path.md) | W04 | Compiler só no path ativo | accepted |
| [ADR-W04-004](./ADR-W04-004-export-json-main-process.md) | W04 | Export JSON no main + labels em settings | accepted |
| [ADR-W05-001](./ADR-W05-001-adapter-registry.md) | W05 | Registry de adapters por slug | accepted |
| [ADR-W05-002](./ADR-W05-002-openrouter-first-class.md) | W05 | OpenRouter first-class, não URL custom | accepted |
| [ADR-W05-003](./ADR-W05-003-custom-base-url-settings.md) | W05 | URL custom em settings, chave no keytar | accepted |
| [ADR-W05-004](./ADR-W05-004-connection-test-health-samples.md) | W05 | Teste de conexão grava health_samples | accepted |
| [ADR-W06-001](./ADR-W06-001-search-decrypt-not-plaintext-fts.md) | W06 | Busca decripta no main; FTS5 vazio | accepted |
| [ADR-W06-002](./ADR-W06-002-inbox-null-project.md) | W06 | Inbox Avulsas é `projectId: null` | accepted |
| [ADR-W06-003](./ADR-W06-003-compile-trim-context-window.md) | W06 | Compactar histórico só no packet | accepted |
| [ADR-W06-004](./ADR-W06-004-plaintext-conversation-tags.md) | W06 | Nomes de tags em plaintext | accepted |
| [ADR-W06-005](./ADR-W06-005-model-switch-via-compiler.md) | W06 | Troca de modelo no mesmo fio via Compiler | accepted |
| [ADR-W07-001](./ADR-W07-001-spend-caps-hard-stop.md) | W07 | Spend caps hard-stop request/day/global | accepted |
| [ADR-W07-002](./ADR-W07-002-health-from-chat.md) | W07 | Health samples a partir do chat | accepted |
| [ADR-W07-003](./ADR-W07-003-explicit-fallback.md) | W07 | Fallback de provider só com confirmação | accepted |
| [ADR-W07-004](./ADR-W07-004-debug-meta-no-auth.md) | W07 | Debug snapshot sem auth/headers | accepted |
| [ADR-W07-005](./ADR-W07-005-retry-transient-only.md) | W07 | Retry só transiente e antes do 1º token | accepted |
| [ADR-W08-001](./ADR-W08-001-first-run-wizard.md) | W08 | Wizard first-run curto; skip se já há key | accepted |
| [ADR-W08-002](./ADR-W08-002-electron-builder-nsis.md) | W08 | electron-builder NSIS Windows | accepted |
| [ADR-W08-003](./ADR-W08-003-electron-updater-github.md) | W08 | electron-updater GitHub; feed morto não derruba | accepted |
| [ADR-W08-004](./ADR-W08-004-crash-reporter-opt-in-local.md) | W08 | Crash reporter opt-in, dumps locais | accepted |
| [ADR-W08-005](./ADR-W08-005-composer-secret-hint.md) | W08 | Aviso de secret no composer via shared | accepted |
| [ADR-W09-001](./ADR-W09-001-run-modes-and-agent-orchestration-waves.md) | W09 | Mapa W21 run modes + W24 orquestração (plano) | accepted |
| [ADR-W09-002](./ADR-W09-002-import-identity-and-receipt-source.md) | W09 | Identidade de import + receipt `source` | accepted |
| [ADR-W09-003](./ADR-W09-003-imported-inbox-not-sentinel-project.md) | W09 | Inbox Importadas virtual, sem projeto sentinela | accepted |
| [ADR-W09-004](./ADR-W09-004-vendor-parsers-and-opaque-ticket.md) | W09 | Parsers no shared; ticket opaco; Gemini best-effort | accepted |
| [ADR-W10-001](./ADR-W10-001-portable-packet-json-v1.md) | W10 | Envelope `.aihub-packet.json` v1 | accepted |
| [ADR-W10-002](./ADR-W10-002-context-packets-apply.md) | W10 | Persistência, apply no chat, ticket de ficheiro | accepted |
| [ADR-W10-003](./ADR-W10-003-deterministic-inactive-summary-and-pins.md) | W10 | Resumo de ramos inativos sem LLM; pins no compact | accepted |
| [ADR-W11-001](./ADR-W11-001-slash-commands-local-ui.md) | W11 | Slash commands são ações locais, não send | accepted |
| [ADR-W11-002](./ADR-W11-002-palette-reuses-w6-search.md) | W11 | Paleta reusa busca W6; FTS5 continua vazio | accepted |
| [ADR-W12-001](./ADR-W12-001-files-package-and-encrypted-extract.md) | W12 | Pacote `files` + extract cifrado | accepted |
| [ADR-W12-002](./ADR-W12-002-files-inject-as-compiler-slices.md) | W12 | Anexos entram como fatias do compiler, não no packet v1 | accepted |
| [ADR-W12-003](./ADR-W12-003-vision-images-on-stream-not-packet.md) | W12 | Imagens no stream, não no packet; gate `vision` | accepted |
| [ADR-W12-004](./ADR-W12-004-pdf-flatedecode-inflate.md) | W12 | PDF: inflate FlateDecode + literais Tj | accepted |
| [ADR-W13-001](./ADR-W13-001-mentions-structured-not-in-user-text.md) | W13 | Menções estruturadas, não no texto do user | accepted |
| [ADR-W13-002](./ADR-W13-002-mention-stubs-until-later-waves.md) | W13 | stubs; `@skill` superseded by W17-003 | accepted |
| [ADR-W13-003](./ADR-W13-003-mention-token-cap-excludes-files.md) | W13 | Cap de menção não inclui `@file` | accepted |
| [ADR-W14-001](./ADR-W14-001-local-hashed-embeddings.md) | W14 | Embeddings locais hashed; pacote `memory` | accepted |
| [ADR-W14-002](./ADR-W14-002-memories-in-packet-strict-excludes.md) | W14 | Memórias no packet; `strict` exclui | accepted |
| [ADR-W14-003](./ADR-W14-003-workspace-local-no-llm.md) | W14 | Workspace por extração local, sem LLM | accepted |
| [ADR-W15-001](./ADR-W15-001-prompt-library-encrypted.md) | W15 | Library global cifrada + pastas + factory | accepted |
| [ADR-W15-002](./ADR-W15-002-prompt-variables-and-mention.md) | W15 | Variáveis + `@prompt` no compiler | accepted |
| [ADR-W15-003](./ADR-W15-003-playground-n-sends-caps.md) | W15 | Playground = N sends + preflight N× caps | accepted |
| [ADR-W16-001](./ADR-W16-001-artifacts-versioned-encrypted.md) | W16 | Artifacts versionados e cifrados | accepted |
| [ADR-W16-002](./ADR-W16-002-html-sandbox-custom-protocol.md) | W16 | HTML sandbox via `ai-hub-artifact:` | accepted |
| [ADR-W16-003](./ADR-W16-003-artifact-detector-thresholds.md) | W16 | Limiares do detector de artifacts | accepted |
| [ADR-W17-001](./ADR-W17-001-skill-contract-json.md) | W17 | Contrato JSON v1; steps = secções; tools `[]` | accepted |
| [ADR-W17-002](./ADR-W17-002-skill-slash-arguments.md) | W17 | `/skill Nome` parse-on-send local | accepted |
| [ADR-W17-003](./ADR-W17-003-skills-encrypted-library.md) | W17 | Library de skills cifrada; `@skill` no compiler | accepted |
| [ADR-W18-001](./ADR-W18-001-effective-privacy-policy.md) | W18 | Política efetiva de privacidade no main | accepted |
| [ADR-W19-001](./ADR-W19-001-shared-renderer-quick-ai-overlay.md) | W19 | Overlay Quick AI no renderer compartilhado | accepted |
| [ADR-W20-001](./ADR-W20-001-council-explicit-multi-model-deliberation.md) | W20 | Council multi-modelo explícito | accepted |
| [ADR-W21-001](./ADR-W21-001-run-modes-effort-hud.md) | W21 | Run modes, esforço e HUD de uso | accepted |
| [ADR-W22-001](./ADR-W22-001-main-owned-mcp-tool-router.md) | W22 | MCP e Tool Router no processo main | accepted |
| [ADR-W22-002](./ADR-W22-002-project-scoped-tool-permissions.md) | W22 | Permissões de tools escopadas por projeto | accepted |
| [ADR-W22-003](./ADR-W22-003-realpath-scoped-filesystem-connector.md) | W22 | Connector filesystem com realpath e escopo | accepted |
| [ADR-W22-004](./ADR-W22-004-skill-contract-v2-tool-allowlist.md) | W22 | Contrato Skill v2 com allowlist de tools | accepted |
| [ADR-W23-001](./ADR-W23-001-main-owned-single-agent-runner.md) | W23 | Runner de agente único no processo main | accepted |
| [ADR-W23-002](./ADR-W23-002-persisted-bounded-agent-runs.md) | W23 | Corridas de agente persistidas e limitadas | accepted |
| [ADR-W24-001](./ADR-W24-001-persisted-orchestration-graph-and-handoffs.md) | W24 | Grafo de orquestração e handoffs persistidos | accepted |
| [ADR-W25-001](./ADR-W25-001-main-owned-read-only-developer-tools.md) | W25 | Ferramentas de desenvolvimento somente-leitura no main | accepted |
