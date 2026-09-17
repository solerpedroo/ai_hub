# ADR-W04-001-active-path-is-active-branch

- **Status:** accepted
- **Onda:** W04
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O schema W1 já tem `parent_id`, `branch_id` e `is_active_branch` (ADR-W01-004), mas a UI e o compiler ainda tratavam a conversa como lista. A W4 precisa de uma regra única para “qual fio está na tela” e para persistir isso após restart, sem uma tabela extra de ramos.

## Decisão

O caminho ativo é a caminhada **raiz → folha**: em cada grupo de irmãos (`parent_id` igual, ou todos os nós com `parent_id` nulo), no máximo um nó tem `is_active_branch = 1`. Se nenhum estiver marcado (legado), escolhe-se o mais antigo por `created_at`.

- Inserir um irmão (regenerar / editar / novo send) ativa o nó novo e desativa os outros irmãos **naquele pai**. Descendentes de irmãos inativos mantêm os próprios flags para quando o utilizador voltar.
- `messages:activate` ativa o nó alvo **e os ancestrais**, para um salto na árvore não deixar o path incoerente.
- A sessão em `settings` **não** ganha `branchId`: os flags no grafo já sobrevivem ao restart (ADR-W03-003 permanece só `{ projectId, conversationId, model }`).
- `listMessages` continua a devolver **todas** as mensagens; o filtro de path é no compiler, no export `active` e na UI.

## Alternativas consideradas

- **Guardar `branchId` na sessão:** redundante e divergiria dos flags se o utilizador mudasse de ramo noutro sítio.
- **Tabela `message_branches`:** rejeitada em ADR-W01-004.
- **Filtrar no SQL (`WHERE is_active_branch = 1`):** quebraria o painel Árvore e a navegação de irmãos.

## Consequências

- Conversas lineares W1–W3 (todas com `is_active_branch = 1`) continuam corretas: cada pai tem um filho.
- Ondas futuras (caps, council) devem enviar e contabilizar só o path ativo, a menos que o utilizador exporte a árvore.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 4, D4)
- `docs/ADR/ADR-W01-004-message-graph-parent-branch.md`
- `docs/ADR/ADR-W03-003-session-restore-settings.md`
- `docs/reviews/W04/REVIEW.md`
