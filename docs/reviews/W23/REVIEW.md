# Wave 23 — Review

- **Data:** 2026-09-22
- **Branch / HEAD no freeze:** `main` / `b5cbdeb`
- **Revisores independentes:** `wave-reviewer`, `trust-auditor`; delta por `wave-reviewer`
- **Patches:** [DIFF.patch](DIFF.patch), [DIFF-post-review.patch](DIFF-post-review.patch)
- **ADRs:** [ADR-W23-001](../../ADR/ADR-W23-001-main-owned-single-agent-runner.md), [ADR-W23-002](../../ADR/ADR-W23-002-persisted-bounded-agent-runs.md)

## DoD

| Critério | Resultado | Evidência |
|---|---|---|
| Plano de até seis etapas e confirmação antes de tools | Passou | `apps/desktop/src/main/agent-runner.ts`, `home-view.tsx` |
| Cancelamento, persistência e recuperação de runs | Passou | `agent-runner.ts`, `packages/db/src/repos.ts`, `persistence.ts` |
| Assist não executa tools | Passou | `home-view.tsx` só chama `prepareAgent` em `runMode === "agent"` |
| Relatório em artifact com limites de custo/tempo | Passou | `agent-runner.ts`, `home-view.tsx` |

## Checklist §9.4

- [x] Sub-tarefas implementadas em código; sem W24 (orquestração, handoff ou paralelismo).
- [x] Renderer usa apenas bridge preload; IPC novo validado por Zod nos dois lados.
- [x] Chaves continuam no keytar; SQLite armazena conteúdo de run/step cifrado e DTOs não expõem `providerKeyId`.
- [x] Packet de relatório é isolado, passa pelo firewall e é o mesmo usado para estimar orçamento e enviar pelo caminho normal de caps/receipt.
- [x] Timeout aborta e aguarda o stream; pause/cancel abortam a run ativa; boot interrompe runs órfãs.
- [x] Migration 17 corresponde ao schema e ao repositório; não há DDL ad-hoc.
- [x] Copy nova existe em pt-BR e en.
- [x] Testes de contratos/persistência usam mocks ou memória, sem provider/chave real; typecheck e lint passam.

## Achados

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | `agent-runner.ts` | Orçamento ignorava o histórico compilado | Corrigido: packet isolado e preflight do mesmo packet enviado |
| High | `agent-runner.ts` | Timeout podia deixar stream ativo | Corrigido: abort + espera limitada de encerramento |
| Medium | `agent-runner.ts`, IPC | Controle de run apenas por UUID | Corrigido: comando vinculado a run, projeto e conversa |
| Medium | `home-view.tsx` | Limites não apareciam no plano | Corrigido: passos, orçamento e timeout visíveis |
| Medium | `agent-runner.ts` | `skill.steps[]` ainda é instrução de síntese, não grafo de tool por etapa | Aceito: a allowlist declarativa executa a leitura W22; grafo por etapa exigiria novo contrato e não entra na W23 |
| Medium | `agent-runner.ts` | Sem teste isolado do runner para cancelamento no passo 3/deny/timeout | Aceito como risco de cobertura; contratos, DB, typecheck, lint e build foram executados sem provider real |
| Low | `agent-runner.ts` | Renderer vê resumo redigido, não o detalhe completo da evidência | Aceito: preserva a fronteira de dados; detalhe cifrado permanece no main/DB |

## Correlações e riscos residuais

- W24 pode reutilizar `parent_run_id`, estados persistidos e Permission Center, mas não deve introduzir paralelismo sem um contrato de cancelamento de filhos.
- A estimativa é hard preflight para o packet isolado e `maxTokens`; o custo real continua registrado pelo receipt normal do provider.
- Não foi incluído um grafo de tools por etapa de skill nem teste e2e de cancelamento durante diálogo nativo; ambos permanecem riscos documentados, sem ampliar o escopo da W23.
