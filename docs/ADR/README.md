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
| — | — | (nenhuma ADR ainda) | — |
