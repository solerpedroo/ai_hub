# ADR-W22-001-main-owned-mcp-tool-router

- **Status:** accepted
- **Onda:** W22
- **Data:** 2026-09-21
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

MCP usa rede, stdio e, em conectores locais, filesystem. Expor qualquer um desses recursos ao renderer quebraria a fronteira de confiança do Hub.

## Decisão

`packages/tools` concentra o Tool Router e clientes JSON-RPC MCP para stdio e SSE. O processo main é o único chamador desses clientes; preload expõe apenas DTOs Zod de pedido e atividade redigida. A decisão acontece no diálogo nativo do main, sem canal de aprovação no renderer. O conector de referência de filesystem também é invocado pelo método MCP `tools/call` no main.

## Alternativas consideradas

- **Renderer como cliente MCP:** recusada por expor stdio/rede e por permitir bypass de permissões.
- **Tool calling nativo em todos os adapters:** adiado; ampliaria providers e anteciparia o loop da W23.

## Consequências

- Mantém o renderer sem Node, filesystem, processos ou URLs MCP.
- A W22 oferece ação de leitura explicitamente iniciada pelo usuário; Assist não ganha loop autônomo.
- Configuração de servidores MCP externos e autenticação dedicada podem evoluir sem mudar a fronteira.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 22)
- `docs/reviews/W22/REVIEW.md`
- `docs/ADR/ADR-W01-003-keytar-and-ipc-secrets.md`
