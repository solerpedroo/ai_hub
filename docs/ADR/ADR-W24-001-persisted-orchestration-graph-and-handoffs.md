# ADR-W24-001-persisted-orchestration-graph-and-handoffs

- **Status:** accepted
- **Onda:** W24
- **Data:** 2026-09-22
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A W23 possui uma corrida linear, com um único executor. A W24 precisa coordenar supervisor, Explorer, Reviewer e Writer sem transformar texto do modelo em autoridade livre, sem reenviar o projeto inteiro entre especialistas e sem permitir que a UI guarde chaves ou decida permissões.

## Decisão

Uma orquestração é uma raiz `agent_runs` com `kind = orchestrated`; seus nós são corridas-filhas ligadas por `parent_run_id`. Cada run armazena papel, versão do grafo e modo de orçamento. A tabela `agent_handoffs` persiste arestas ordenadas, tipo de join, estado e, cifrados, a mensagem de sistema e o subset de packet que saem de um nó para outro. O renderer recebe somente DTOs redigidos: papel, estado, métricas e resumos do handoff.

O main é o único scheduler. Ele limita o paralelismo de especialistas a dois, serializa diálogos nativos de permissão e reutiliza o Tool Router da W22 para cada leitura. O orçamento do grafo é reservado antes do primeiro dispatch; qualquer desvio de provider/modelo/esforço fica pendente de confirmação explícita. Pause ou cancelamento da raiz propaga para todos os filhos.

## Alternativas consideradas

- **Reusar Council:** recusado; Council não tem persistência de grafo, tools, pause ou handoff escopado.
- **JSON do grafo em `settings`:** recusado; não tem integridade relacional, recuperação por nó nem proteção cifrada dos handoffs.
- **Paralelismo livre no `chat-session`:** recusado; o escopo humano da conversa continua serializado; só filhos internos do mesmo grafo podem compartilhar o limite explícito.

## Consequências

- A migration W24 amplia `agent_runs` e adiciona `agent_handoffs`, sem mutar a migration W23.
- W24 pode recuperar, interromper e auditar uma execução parcial sem expor conteúdo de arquivos, headers ou chaves.
- W25 pode reutilizar o grafo para Developer Mode, mas terminal/Git não fazem parte desta decisão.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 24)
- `docs/ADR/ADR-W23-001-main-owned-single-agent-runner.md`
- `docs/ADR/ADR-W23-002-persisted-bounded-agent-runs.md`
- `docs/reviews/W24/REVIEW.md`
