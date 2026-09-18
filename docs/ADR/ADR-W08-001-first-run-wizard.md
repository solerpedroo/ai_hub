# ADR-W08-001-first-run-wizard

- **Status:** accepted
- **Onda:** W08
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D9 exige first token em menos de 90s. Um tour longo mata o onboarding. Quem já tem chave (upgrade W7) não deve ver o wizard de novo.

## Decisão

O wizard tem **dois passos**: idioma → um provider (OpenRouter em destaque) com save+teste. A **primeira pergunta é o composer** da home, não um terceiro ecrã. Sem conta cloud.

Skip se já existe provider key **ou** `onboardingComplete`. Preferências em `settings` key `app-prefs` (JSON). TTFT do wizard: relógio no mount até o primeiro `chunk`; log `[hub:wizard-ttft]`; orçamento 90s (`WIZARD_TTFT_BUDGET_MS`). Primeira resposta usa o mesmo `chat:send` (caps/health/receipts).

E2E com chaves seedadas não vê o wizard. `AI_HUB_E2E_EMPTY=1` cobre o caminho feliz com o adapter mock.

## Alternativas consideradas

- **Wizard de 4+ ecrãs:** estoura 90s e contradiz D9.
- **Primeira pergunta dentro do overlay:** duplica o composer e o caminho de send.

## Consequências

- Positivas: caminho curto; skip automático para quem já tem key.
- Negativas: custom ainda pede URL no mesmo passo.
- Riscos aceitos: TTFT medido em dev/e2e mock, não com latência real de provider.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 8 / D9
- `docs/reviews/W08/REVIEW.md`
- ADR-W05-002 (OpenRouter first-class)
