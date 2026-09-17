# ADR-W03-002-linear-edit-and-regenerate

- **Status:** superseded by ADR-W04-002
- **Onda:** W03
- **Data:** 2026-09-16
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** ADR-W04-002-sibling-fork-not-delete

## Contexto

O plano manda regenerar e editar **substituindo** nesta onda. W4 transforma isso em irmãos/ramos. D10 pede continuar a partir de um parcial via **novo send** (ADR-W02-003).

## Decisão

Conversa **linear** nesta onda:

- Enviar: cria a user message com `parentId` = última mensagem, depois o stream.
- Regenerar: apaga a assistant alvo e as posteriores; novo `chat:send` sem texto extra.
- Continuar (`interrupted`/`aborted`): novo send, parcial permanece na linha.
- Editar user: atualiza o conteúdo, apaga mensagens posteriores, novo send.

Não se apaga o ramo antigo porque ainda não há ramo (W4). `branch_id` continua copiado do pai.

## Alternativas consideradas

- **Já criar irmãos na W3:** implementaria D4 cedo e quebraria a ordem das ondas.
- **Continuar no mesmo request id:** rejeitado em ADR-W02-003.

## Consequências

- W4 deve trocar delete-after por insert irmão sem perder o caminho antigo.
- Compiler v0 já ignora `streaming` e inclui `interrupted`/`aborted`.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 3, Wave 4, D10)
- `docs/ADR/ADR-W02-003-crash-safe-stream.md`
- `docs/reviews/W03/REVIEW.md`
