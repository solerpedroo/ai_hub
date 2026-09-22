# ADR-W23-001-main-owned-single-agent-runner

- **Status:** accepted
- **Onda:** W23
- **Data:** 2026-09-21
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Os adapters atuais só expõem streaming de texto e não possuem protocolo nativo de tool calling. Transformar uma resposta do modelo em comandos livres anteciparia uma superfície sem limites e a orquestração da W24.

## Decisão

A W23 implementa um runner determinístico, exclusivo do processo main, para um único agente. O runner persiste um plano de até seis etapas e só inicia leituras depois de confirmação explícita do plano. Cada leitura reutiliza o Permission Center e o conector scoped da W22; a síntese usa o caminho normal de chat, firewall, receipts e caps. O renderer só controla o ciclo da corrida e vê DTOs redigidos.

## Alternativas consideradas

- **Tool calling nativo por provider:** recusado nesta onda; exigiria contrato e testes multi-provider que não existem.
- **Modelo escolhe comandos livres:** recusado; concederia autoridade ao texto e invadiria W25.
- **Vários especialistas ou handoffs:** recusado; pertencem à W24.

## Consequências

- Assist continua incapaz de disparar tools.
- O agente inicial recebe caminhos relativos explícitos; não descobre a árvore, não executa shell, Git ou terminal.
- A W24 pode evoluir o schema com `parent_run_id`, mas não ganha filas, nós, papéis ou paralelismo nesta onda.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 23)
- `docs/ADR/ADR-W22-001-main-owned-mcp-tool-router.md`
- `docs/ADR/ADR-W22-002-project-scoped-tool-permissions.md`
