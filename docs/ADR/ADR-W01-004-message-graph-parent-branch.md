# ADR-W01-004-message-graph-parent-branch

- **Status:** accepted
- **Onda:** W01
- **Data:** 2026-09-15
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano da Wave 1 pede o modelo de branching (D4) já no schema: ou tabela `message_branches`, ou `messages.parent_id` + `messages.branch_id`. A Wave 4 é quem implementa a UI de ramos.

## Decisão

Não criar tabela `message_branches`. Cada mensagem tem:

- `parent_id` nullable — `NULL` = raiz de um fio linear; não-nulo = filho de outro nó
- `branch_id` obrigatório — identifica o ramo; filhos herdam o do pai se o cliente não mandar outro
- `is_active_branch` (integer 0/1, default 1) — hook para a Wave 4 filtrar o caminho ativo

`listMessages` nesta onda devolve todas as mensagens da conversa. O composer W1 grava notas de utilizador com `parent_id = NULL` (linear). Regenerar/editar como irmãos fica para W4.

## Alternativas consideradas

- **Tabela `message_branches`:** um nível extra de join para um produto que ainda não tem UI de ramo.
- **Só lista ordenada por `created_at`:** não dá para W4 sem migration destrutiva.

## Consequências

- Wave 4 liga `is_active_branch`, irmãos (`parent_id` partilhado) e o compiler só no path ativo.
- Até lá, um cliente IPC pode criar um grafo; a UI W1 não o navega.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 1, D4, Wave 4)
- `docs/reviews/W01/REVIEW.md`
- ADR-W01-001
