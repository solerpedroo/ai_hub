# ADR-W14-002-memories-in-packet-strict-excludes

- **Status:** accepted
- **Onda:** W14
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** ADR-W13-002 (apenas `@memory`)
- **Superseded by:** —

## Contexto

Memórias de projeto devem reaparecer na conversa seguinte e entrar no packet. O plano diz que o modo Privado as exclui (W18 liga o modo). `privacyMode` já existe no send/preview. `@memory` era stub (ADR-W13-002).

## Decisão

- Tabela `project_memories` (título/corpo cifrados). CRUD + opt-out por projeto (`settings` `memory-opt-out:{projectId}`).
- `@memory` usa o mesmo `MentionRef` da W13; sai de `MENTION_STUB_TYPES`. `@prompt`/`@skill` continuam stub.
- Memórias ativas entram no `system` como `Project memory:` via compiler. Opt-out desliga só a injeção **automática** e o banner de sugerir; `@memory` explícito ainda resolve em `standard`.
- `privacyMode: strict` **exclui** memórias automáticas, `@memory` e fatias RAG. W18 não precisa de outro gancho para isto.

## Alternativas consideradas

- **Só `@memory` explícito, sem auto-inject:** falha o DoD “reaparece na conversa seguinte”.
- **Strict ainda injeta menção explícita:** contradiz “modo Privado as exclui”.

## Consequências

- ADR-W13-002 permanece válido para prompt/skill.
- Banner “sugerir salvar” é heurística local (sem LLM extra).
- Corpo da memória não vai para o renderer no packet debug (omitido como extract).

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 14, W18)
- `docs/ADR/ADR-W13-002-mention-stubs-until-later-waves.md`
