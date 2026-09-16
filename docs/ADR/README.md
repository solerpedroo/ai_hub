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
