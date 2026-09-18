# ADR-W08-005-composer-secret-hint

- **Status:** accepted
- **Onda:** W08
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

UAT pede redaction básica no composer. O renderer não pode importar `@ai-hub/security` (keytar). Aviso, não strip silencioso — o utilizador pode estar a citar um exemplo.

## Decisão

`looksLikePastedSecret` / `redactPastedSecrets` em `packages/shared` (mesmos padrões do `redact.ts` do security). O composer avisa em texto e oferece “remover segredos”. O send **não** é bloqueado. Logs/export no main continuam a usar `@ai-hub/security` `redactSecrets`.

## Alternativas consideradas

- **IPC de redact a cada keystroke:** ruído; o padrão é estático.
- **Bloquear o send:** demasiado agressivo para um falso positivo.

## Consequências

- Positivas: renderer sem security/keytar; aviso visível (não só cor).
- Negativas: padrões viveram duplicados no freeze; o close gate unificou `redactSecrets` sobre `redactPastedSecrets`.
- Riscos aceitos: regex não cobre todos os formatos de chave (residual STATUS).

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 8
- ADR-W00-003 / ADR-W01-003 (trust boundary)
- `docs/reviews/W08/REVIEW.md`
