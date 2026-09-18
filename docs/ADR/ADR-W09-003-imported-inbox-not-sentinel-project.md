# ADR-W09-003-imported-inbox-not-sentinel-project

- **Status:** accepted
- **Onda:** W09
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D2 pede inbox “Importadas” + mover para projeto. ADR-W06-002 já definiu Avulsas como `projectId === null`, sem linha sentinela em `projects`.

## Decisão

- **Avulsas:** `project_id IS NULL AND import_source IS NULL`.
- **Importadas:** `project_id IS NULL AND import_source IS NOT NULL`.
- Destino do job: `projectId` UUID escolhido **ou** `null` (cai em Importadas).
- Mover: `conversations:update` só altera `project_id`. `import_source` permanece (idempotência sobrevive à mudança de projeto).
- Apagar projeto continua a pôr `project_id = NULL` (voltam a Importadas se tiverem `import_source`).

## Alternativas consideradas

- **Projeto sentinela “Importadas”:** contradiz ADR-W06-002 e aparece na lista de projetos como dado do utilizador.
- **Tudo em Avulsas:** mistura chats novos com dumps de 500 conversas do ChatGPT.

## Consequências

- Positivas: duas inboxes virtuais; sem FK fantasma.
- Negativas: `listConversations(null)` deixa de devolver importadas — callers passam `inbox`.
- Riscos aceitos: sessão persiste `importedInbox` boolean.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 9 / D2
- ADR-W06-002-inbox-null-project
- ADR-W09-002
