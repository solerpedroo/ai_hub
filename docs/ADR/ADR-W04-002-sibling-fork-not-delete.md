# ADR-W04-002-sibling-fork-not-delete

- **Status:** accepted
- **Onda:** W04
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** ADR-W03-002
- **Superseded by:** —

## Contexto

A W3 regenerava e editava com `deleteMessagesFrom` (wipe linear). D4 exige que o caminho antigo sobreviva. Continue/regenerate continuam a ser **novo send** (ADR-W02-003), não retoma do mesmo `runId`.

## Decisão

`chat:send` passa a união discriminada por `mode`:

- `send` — cria user no leaf do path ativo (mesmo `branch_id`) e um assistant filho.
- `continue` — não cria user; assistant filho do leaf (parcial `interrupted`/`aborted` permanece).
- `regenerate` — cria **irmão** da assistant alvo (`parent_id` partilhado, `branch_id` novo). Não apaga nada. O packet omite a alvo e os seus descendentes.
- `edit` — cria **irmão** da user alvo (conteúdo novo, `branch_id` novo) e um assistant filho. A user antiga e o subgrafo ficam.

`messages:deleteFrom` permanece no IPC por compatibilidade, mas o renderer **não** o usa para regenerar nem editar. Continuar a ser novo send.

## Alternativas consideradas

- **Mutar a user in-place e só ramificar o assistant:** perderia o prompt original daquele nó.
- **Manter o schema de `content: string | null` da W3:** ambíguo entre continue e regenerate.

## Consequências

- Comparar duas respostas no mesmo ponto é navegar irmãos, não desfazer.
- Caps (W7) e receipts aplicam-se a cada novo send, inclusive regenerate/edit.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 4, D4, D10)
- `docs/ADR/ADR-W02-003-crash-safe-stream.md`
- `docs/ADR/ADR-W03-002-linear-edit-and-regenerate.md`
- `docs/reviews/W04/REVIEW.md`
