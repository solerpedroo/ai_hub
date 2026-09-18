# ADR-W08-004-crash-reporter-opt-in-local

- **Status:** accepted
- **Onda:** W08
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Crash reporter é opt-in, sem PII e sem conteúdo de conversa. Não há servidor nosso de crash.

## Decisão

Electron `crashReporter.start` só se `crashReporterOptIn` for true (default **false**). `uploadToServer: false`. `extra` só `version` e `platform`. Sem conversation id, sem keys. Opt-in imediato nesta sessão; opt-out efetivo no próximo start (a API não para o reporter). Dumps locais no userData do Electron.

Isto **não** é o crash-safe streaming (ADR-W02-003).

## Alternativas consideradas

- **Sentry/telemetry cloud:** viola opt-in local-first e o “sem PII”.
- **Ligado por default:** contradiz o plano.

## Consequências

- Positivas: zero upload; utilizador controla.
- Negativas: dumps locais só úteis se o utilizador os copiar; opt-out nesta sessão não para o reporter.
- Riscos aceitos: `submitURL` dummy exigido pela API mesmo com upload off; dumps Crashpad **podem conter memória do processo** (conversa/chave one-shot) se o utilizador optar — anotações extra não incluem conteúdo.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 8
- ADR-W02-003 (crash-safe stream, outro contrato)
- `docs/reviews/W08/REVIEW.md`
