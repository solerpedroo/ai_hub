# ADR-W07-002-health-from-chat

- **Status:** accepted
- **Onda:** W07
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

W5 grava `health_samples` só em `secrets:test`. A status bar não refletia falhas reais de chat. D11 pede pulso local (latência, taxa de erro, último status) sem telemetria nossa.

## Decisão

Cada conclusão de stream grava um sample: `ok` no `done`, `ok: false` em erro de provider. Abort do usuário **não** conta como falha de provider. Summaries usam as últimas 20 samples por slug, 100% locais. A status bar lê esse resumo; o fallback explícito também.

## Alternativas consideradas

- **Só teste manual:** deixa “Claude fora” invisível no uso real.
- **Heartbeat periódico ao provider:** gasta cota e não é o pulso das requests do usuário.

## Consequências

- Positivas: health espelha o último send; D11 e fallback compartilham a mesma fonte.
- Negativas: providers sem tráfego recente ficam “sem amostra”.
- Riscos aceitos: taxa de erro das últimas 20, não janela temporal.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 7, D11)
- `docs/reviews/W07/REVIEW.md`
- ADR-W05-004 (teste de conexão e health_samples)
