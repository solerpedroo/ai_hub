# ADR-W20-001-council-explicit-multi-model-deliberation

- **Status:** accepted
- **Onda:** W20
- **Data:** 2026-09-20
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Council compara respostas de múltiplos modelos sem se tornar um agente, sem tools e sem fallback silencioso. O custo combinado precisa ser verificado antes do disparo.

## Decisão

Council recebe slots e papéis explícitos, estima debate mais síntese antes de enviar e usa o caminho normal de `chat:send` para cada resposta. O packet compilado é congelado e persistido antes do primeiro despacho; o papel é metadata de dispatch tipada, traduzida pelo adapter sem alterar o packet auditável. A síntese é solicitada a um modelo escolhido explicitamente. Divergência e Router são heurísticas locais e explicáveis; uma sugestão nunca troca o modelo sem confirmação.

## Alternativas consideradas

- **Playground W15 sem extensão:** não expressa papéis nem síntese.
- **Agente supervisor com tools:** pertence à W24 e viola o limite desta onda.

## Consequências

- Recibos, firewall e caps continuam centralizados no main.
- Council não compartilha tools, filesystem ou estado de agente.
- Heurísticas de router são recomendações, não decisões automáticas.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (W20)
- `docs/reviews/W20/REVIEW.md`
- `ADR-W15-003-playground-n-sends-caps.md`
