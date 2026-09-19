# ADR-W14-003-workspace-local-no-llm

- **Status:** accepted
- **Onda:** W14
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Conversation Workspace pede resumo, decisões, pins e tarefas extraídas, mais duplicar conversa e transformar conversa → projeto. Um segundo `chat:send` para resumir gastaria cap e mudaria privacidade.

## Decisão

- Resumo, decisões e tarefas candidatas são **extração local** do caminho ativo + pins (sem LLM), no mesmo espírito do resumo de ramos inativos (ADR-W10-003).
- Pins continuam em `messages.pinned`.
- Tarefas persistidas em `conversation_tasks` (título cifrado); o utilizador pode marcar feito ou apagar.
- Duplicar clona o grafo (ids novos, sem receipts, sem identidade de import).
- Conversa → projeto: cria projeto com o título da conversa e faz `moveConversation`.

## Alternativas consideradas

- **Resumo via modelo:** custo, latência, falha offline. Fora desta onda.
- **Tarefas só efémeras na UI:** o DoD de workspace pede persistência mínima.

## Consequências

- Resumo v1 é um recorte, não uma síntese.
- Transformar resposta em documento (escopo) fica para artifacts (W16).
- Prompts no workspace ficam para W15.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 14)
- `docs/AI_Hub_Desktop_Escopo.md` (§8 Conversation Workspace)
- `docs/ADR/ADR-W10-003-deterministic-inactive-summary-and-pins.md`
