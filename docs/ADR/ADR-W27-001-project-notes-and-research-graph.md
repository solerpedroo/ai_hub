# ADR-W27-001-project-notes-and-research-graph

- **Status:** accepted
- **Onda:** W27
- **Data:** 2026-09-23
- **Deciders:** Cursor / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Wave 27 exige Notes por projeto, Tasks como checklist editável a partir de respostas, Study Mode com personas e Research Mode com relatório citável. Já existem `conversation_tasks` (W14), artifacts markdown (W16), skills factory (W17) e grafo de orquestração (W24). Memories de projeto não são Notes.

## Decisão

1. **Notes** vivem em `project_notes` (cifradas) + `note_tags`, escopo de projeto, opcionalmente ligadas a `source_message_id`. Não reutilizam `project_memories`.
2. **AI Tasks** reutilizam `conversation_tasks`, com `source_message_id` e criação em lote a partir de checklist parseada da resposta; a UI de checklist do workspace permanece a superfície editável.
3. **Study Mode** são quatro factory skills (`study-professor`, `study-examiner`, `study-tutor`, `study-evaluator`) no contrato de skills existente.
4. **Research Mode** reutiliza o runner de orquestração W24 com `graphVersion = 2`: sem exigir tool root nem `relativePaths`; fontes locais (memórias + chunks de PDF) são embutidas no `plan` dos especialistas; o Writer grava artifact markdown citável. Mesmos IPC de start/pause/cancel/list do grafo.

## Alternativas consideradas

- Notes como alias de memories: rejeitado — memories são opt-in de packet/RAG, Notes são captura explícita do usuário.
- Tasks em tabela de projeto com JSON de itens: rejeitado nesta onda — checklist editável já existe por conversa; menos migração.
- Research só como skill de chat: rejeitado para o DoD multi-fonte — falta grafo, handoffs e artifact de relatório estruturado.
- Novo runner paralelo ao W24: rejeitado — duplicaria budget/pause/HUD.

## Consequências

- Migração **0019** obrigatória com o código.
- Search passa a discriminar `conversation | note | task`.
- Research depende de fontes locais já indexadas; não faz scraping web nesta onda.
- Caps e receipts do grafo W24 continuam a aplicar-se ao Research.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 27)
- `docs/AI_Hub_Desktop_Escopo.md` (§39–§42)
- `docs/ADR/ADR-W24-001-persisted-orchestration-graph-and-handoffs.md`
- `docs/reviews/W27/REVIEW.md`
