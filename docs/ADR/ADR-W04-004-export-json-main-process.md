# ADR-W04-004-export-json-main-process

- **Status:** accepted
- **Onda:** W04
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D4 pede export do ramo ativo e uma opção avançada de exportar a árvore JSON. O renderer já vê o conteúdo da conversa, mas `fs` e o diálogo nativo pertencem ao main. Nomes de ramo são opcionais e não cabem no schema de mensagens (ADR-W01-004).

## Decisão

- Export é IPC `conversations:export` `{ conversationId, mode: "active" | "tree" }`. O main monta um documento JSON versão 1 (conversa, labels, mensagens DTO), aplica redaction, abre `dialog.showSaveDialog` e grava o ficheiro.
- Resultado: `{ status: "saved", path }` ou `{ status: "cancelled" }`. O renderer não recebe um blob para escrever em disco.
- Nomes de ramo: chave `settings` `branch-labels:{conversationId}` → `{ [branchId]: string }`. Não são cifrados (são rótulos curtos, não o corpo da mensagem).
- O documento **não** inclui chaves, receipts com secret, nem campos extra. Mensagens já vão em plaintext no DTO (o renderer já as tem).

## Alternativas consideradas

- **Devolver JSON ao renderer e `download`:** exigiria `fs` no renderer ou um save não nativo.
- **Tabela `branches`:** viola ADR-W01-004.
- **Cifrar labels:** custo sem ganho; o título da conversa já é cifrado, o rótulo é metadata de UI.

## Consequências

- Import (W9) pode reutilizar a versão 1 do documento; se o formato mudar, nova ADR.
- Diálogo nativo não corre em e2e a menos que um teste o invoque; o contrato é coberto por Zod + unit tests do documento.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 4, D4)
- `docs/ADR/ADR-W01-001-envelope-encryption-at-rest.md`
- `docs/reviews/W04/REVIEW.md`
