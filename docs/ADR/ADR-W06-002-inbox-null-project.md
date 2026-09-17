# ADR-W06-002 — Inbox Avulsas é `projectId: null`

- **Status:** accepted
- **Onda:** W06
- **Data:** 2026-09-17
- **Deciders:** agent
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Conversas já aceitam `project_id` nulo no schema W1. Falta a unidade de UI “Avulsas” e o que acontece ao apagar um projeto.

## Decisão

Inbox **Avulsas** é o conjunto de conversas com `projectId === null`. Não há linha sentinela em `projects`. Apagar um projeto move as conversas para a inbox (`project_id = NULL`); o grafo de mensagens permanece.

## Alternativas consideradas

- **Projeto sistema “Inbox”:** mistura dado do usuário com sentinela; complicaria preferências/instruções.
- **Apagar conversas junto com o projeto:** perda irreversível; rejeitado para W6.

## Consequências

- Positivas: contrato IPC atual (`projectId` nullable) permanece; restore de sessão com `projectId: null` é a inbox.
- Negativas: UI precisa tratar “sem projeto selecionado” como inbox, não como empty state de onboarding.
- Riscos aceitos: conversas órfãs são o comportamento explícito, não um bug.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 6)
- `docs/reviews/W06/REVIEW.md`
