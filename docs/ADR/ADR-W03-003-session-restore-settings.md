# ADR-W03-003-session-restore-settings

- **Status:** accepted
- **Onda:** W03
- **Data:** 2026-09-16
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O DoD pede reabrir no mesmo ponto, inclusive com stream `interrupted`. `interruptOrphanStreams` já corre no boot (W2). Falta lembrar **qual** conversa estava aberta.

## Decisão

Persistir `{ projectId, conversationId, model }` na tabela `settings` (chave `workspace-session`), via IPC Zod. Não usar só `localStorage`: o utilizador dono dos dados está no SQLite envelope do app. `providerKeyId` não é guardado (a chave pode ter sido removida); ao restaurar escolhe-se a primeira key OpenAI ativa.

## Alternativas consideradas

- **Só localStorage no renderer:** sobrevive ao reload da janela, não a um userData limpo da mesma forma que o resto do workspace, e foge do padrão W1 de settings.
- **Coluna na conversa `last_opened`:** extra schema sem ganho nesta onda.

## Consequências

- Restore lê settings depois do boot; mensagens `interrupted` já estão no DB.
- W4 pode acrescentar `branchId` ativo no mesmo JSON.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 3)
- `docs/ADR/ADR-W01-002-drizzle-user-version-migrations.md`
- `docs/reviews/W03/REVIEW.md`
