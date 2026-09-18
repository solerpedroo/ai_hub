# ADR-W07-004-debug-meta-no-auth

- **Status:** accepted
- **Onda:** W07
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A tela Debug/Observability precisa de meta da request (retries, estimativa, decisão de cap) sem vazar Authorization, packet completo ou conteúdo da conversa.

## Decisão

O main guarda **em memória** o último snapshot: provider slug, model id, retries, código de erro, token estimate, custo estimado, decisão de cap, overflow. Sem headers, sem body, sem keys. IPC `debug:getLatest`. Reinício do processo apaga o snapshot (não é persistência).

## Alternativas consideradas

- **Logar o packet redigido na UI:** ainda é conteúdo de conversa numa tela de debug.
- **SQLite de telemetria:** fora de onda; W7 é o último send.

## Consequências

- Positivas: diagnóstico sem secrets; some ao restart.
- Negativas: só o último send; sem histórico.
- Riscos aceitos: debug é local e opt-in pela navegação, não um reporter.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 7)
- `docs/reviews/W07/REVIEW.md`
- ADR-W00-003 (CSP / IPC)
