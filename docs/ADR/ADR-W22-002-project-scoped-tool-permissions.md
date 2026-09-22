# ADR-W22-002-project-scoped-tool-permissions

- **Status:** accepted
- **Onda:** W22
- **Data:** 2026-09-21
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Uma autorização global faria uma ferramenta de um projeto ler outro projeto. A confirmação precisa ser explícita e não pode ser reutilizada por outro renderer ou pedido tardio.

## Decisão

Permissões persistentes são grants de somente leitura identificados por `project_id`, `tool_id` e operação. A confirmação acontece em diálogo nativo do processo main; o renderer não possui API para aprová-la. `allow_once` existe apenas em memória, com TTL e vínculo ao `WebContents`; `deny` não executa nem persiste. Trocar a raiz revoga os grants do projeto. Efeitos write, destructive e unknown não podem receber grant persistente e exigem confirmação adicional.

## Alternativas consideradas

- **Allowlist global por ferramenta:** recusada por vazar poder entre projetos.
- **Persistir deny:** recusada; uma negativa é decisão pontual e não deve impedir uma solicitação futura compreensível.

## Consequências

- Grants sobrevivem reinício sem registrar conteúdo ou argumentos de tool.
- A W23 reutiliza a mesma política, mas não recebe autorização implícita.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 22)
- `docs/reviews/W22/REVIEW.md`
