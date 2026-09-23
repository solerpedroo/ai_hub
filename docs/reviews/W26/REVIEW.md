# W26 — Revisão de Ollama + offline

- Data: 2026-09-23
- Branch/HEAD: `main` / `27415fa`
- Estado do gate: **fechado**; implementação, testes, artefatos e DoD físico (Wi-Fi off + Llama local) passaram.
- Revisores independentes: `wave-reviewer`, `trust-auditor` e revisão específica de streaming/gateway. Revisão delta pós-prova física: Cursor (continuação do gate Codex).

## DoD

| Item | Resultado | Evidência |
|---|---|---|
| Adapter Ollama, detecção do daemon e modelos instalados | Passou em teste automatizado | `packages/ai-gateway/src/ollama-adapter.ts`, `apps/desktop/src/main/local-provider.ts`, `apps/desktop/e2e/offline.spec.ts` |
| Embeddings locais e RAG de PDFs | Passou em fixture offline | `packages/memory/src/embed.ts`, `apps/desktop/e2e/rag.spec.ts`, `apps/desktop/e2e/offline.spec.ts`; modo de privacidade `maximum` requerido |
| Badge do que funciona offline | Passou em revisão de UI | `home-view.tsx`, `pt-BR.json`, `en.json`; indisponibilidade e ausência de modelos são estados distintos |
| Fallback local avisado, nunca silencioso | Passou em E2E de timeout cloud | `chat-session.ts`, `App.tsx`, `offline.spec.ts`; requer confirmação explícita |
| Receipt zero, latência real, HUD honesto | Passou em teste e E2E | `receipts.ts`, `chat-session.ts`, `packet-preview.ts`, `offline.spec.ts` |
| Wi-Fi desligado, Llama real e RAG pré-indexado | **Passou** | `docs/reviews/W26/PHYSICAL-DOD.md` — Ollama 0.34.3 + `llama3.2:1b` (CPU); Wi-Fi off; chat loopback; embeddings locais + E2E RAG |

## Checklist §9.4

- Escopo W26 implementado; nenhuma funcionalidade W27 introduzida.
- Índice RAG local da W14 preservado, sem mistura de espaços vetoriais ou reindexação implícita.
- Renderer não recebe chaves nem imports de `fs`/rede; HTTP Ollama fica no main; canal IPC novo validado com Zod; nenhuma chave local em keytar/SQLite.
- Sem fallback automático; caps, receipts e persistência crash-safe mantidos no caminho de envio existente.
- `pt-BR` e `en` atualizados; contratos shared/main/preload/renderer alinhados.
- Unit tests não acessam provider real. `pnpm typecheck`, `pnpm lint`, `pnpm test`, build Electron e E2E local/RAG/fallback passaram após as correções; para E2E, o binário nativo foi recompilado para Electron depois da suíte DB.
- Windows exercitado pelo E2E. Demonstração física sem Wi-Fi: PASS (`PHYSICAL-DOD.md`).

## Achados

| Severidade | Arquivo | Achado | Estado |
|---|---|---|---|
| High | `packages/ai-gateway/src/ollama-adapter.ts` | EOF sem `done:true` poderia concluir resposta parcial | Corrigido; teste de stream truncado |
| Medium | `apps/desktop/src/renderer/src/App.tsx` | Modelo local salvo não restaurava com chave cloud presente | Corrigido; descoberta local na seleção inicial |
| Medium | `apps/desktop/src/renderer/src/components/layout/home-view.tsx` | Badge dizia que Ollama funcionava mesmo indisponível | Corrigido |
| Medium | `apps/desktop/src/main/chat-session.ts` | Timeout cloud não priorizava fallback local | Corrigido; E2E com confirmação |
| Medium | `apps/desktop/src/main/spend-guard.ts` | Teto USD esgotado bloqueava Ollama gratuito | Corrigido e restrito ao provider Ollama; teste de contraste cloud |
| Low | `docs/ADR/ADR-W26-001-local-ollama-provider-and-offline-embeddings.md` | Processo local na porta 11434 pode imitar o daemon | Premissa registrada no ADR |

## Correlações e riscos

- W14: PDFs já indexados continuam pesquisáveis localmente. RAG automático exige modo `maximum`; `normal` e `private` não o incluem.
- W20/W21: seleção e HUD aceitam modelo dinâmico sem catálogo estático; janela configurada em 8.192 tokens no request Ollama.
- Sem daemon/modelo instalado, a UI informa indisponibilidade e o envio local é recusado. DoD físico validado em 2026-09-23 (`PHYSICAL-DOD.md`).
- Loopback `127.0.0.1:11434` pressupõe confiança no processo local que ocupa a porta.
- Nesta máquina o runtime CUDA do Ollama falhou (`device kernel image is invalid`); a prova usou CPU (`OLLAMA_NUM_GPU=0`). Residual operacional, não de produto.

## Artefatos

- Diff cumulativo revisado: `docs/reviews/W26/DIFF.patch`.
- Delta das correções de revisão: `docs/reviews/W26/DIFF-post-review.patch` e `docs/reviews/W26/REVIEW-delta.md`.
- Prova física: `docs/reviews/W26/PHYSICAL-DOD.md`.
- ADR: `docs/ADR/ADR-W26-001-local-ollama-provider-and-offline-embeddings.md`.
