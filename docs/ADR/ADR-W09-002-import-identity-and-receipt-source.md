# ADR-W09-002-import-identity-and-receipt-source

- **Status:** accepted
- **Onda:** W09
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D2 exige idempotência no reimport (`provider + external_id`) e receipts das importadas com `source=import` e custo nulo. O schema W1 tem `import_jobs` vazio e conversas sem identidade de origem.

## Decisão

- Colunas em `conversations`: `import_source` (`chatgpt` | `claude` | `gemini`) e `external_id` (id do vendor). Índice único parcial `(import_source, external_id)` onde ambos NOT NULL.
- Coluna `message_receipts.source` com default `chat`. Import grava `import`, `cost_usd` NULL, `provider` = fonte do export, `model` NULL.
- Identidade **não** vai no renderer além de `importSource` no DTO (sem path de ficheiro, sem JSON cru).

## Alternativas consideradas

- **Hash do conteúdo como chave:** muda se o vendor reexportar com whitespace diferente; o id estável do vendor é o contrato do plano.
- **Tabela auxiliar de mapeamento:** extra join sem ganho; a conversa *é* o mapeamento.

## Consequências

- Positivas: reimport é no-op; receipts de chat e import distinguíveis; caps não somam custo fantasma.
- Negativas: Gemini sem `titleUrl` cai num id derivado (best-effort).
- Riscos aceitos: formatos oficiais mudam; parsers são best-effort versionados nesta onda.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 9 / D2
- ADR-W06-002 (inbox null)
- ADR-W09-003 (inbox Importadas)
