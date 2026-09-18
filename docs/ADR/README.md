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
