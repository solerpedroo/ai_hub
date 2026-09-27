# ADR-W31-001 — Local enterprise policy profile

- **Status:** accepted
- **Onda:** W31
- **Data:** 2026-09-27
- **Deciders:** Pedro / Codex
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A W31 requer organizações, governança, auditoria, limites por time e analytics opt-in. O repositório é local-first e não contém um backend de identidade, colaboração ou gestão remota de segredos. A decisão do produto é não introduzir backend externo nesta etapa.

## Decisão

Implementar um perfil Enterprise local no processo principal: uma organização local, associações de projeto, política de modelos/PII/tools, limites agregados, audit log cifrado e analytics explicitamente opt-in. Providers continuam BYOK e suas chaves permanecem somente no keytar local.

O contrato persistirá identificadores de organização e compartilhamento de projeto para permitir uma futura sincronização remota, mas não alegará colaboração multiusuário até existir identidade e transporte autenticado.

## Alternativas consideradas

- Backend colaborativo real agora: rejeitado por decisão explícita de não escolher infraestrutura externa nesta onda.
- Copiar provider keys para SQLite ou sync: rejeitado pela fronteira de confiança BYOK.

## Consequências

- Governança e auditoria funcionam localmente e podem ser validadas sem conta cloud.
- Projetos marcados como compartilháveis não serão visíveis em outro dispositivo nesta onda.
- Uma onda futura deverá introduzir identidade, autorização remota e distribuição de políticas antes de colaboração real.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 31)
- `docs/AI_Hub_Desktop_Escopo.md` (§43–44)
