# W26 — Delta review

Após o primeiro review independente, foram corrigidos o EOF de stream sem `done:true`, a restauração do modelo local, o badge indisponível, o timeout cloud e o bloqueio por cap USD de um envio Ollama gratuito. O E2E novo demonstrou confirmação explícita de fallback e receipt zero. O segundo revisor de gateway confirmou os dois primeiros caminhos e encontrou que a primeira isenção de cap baseada apenas na string `0.000000` também poderia isentar cloud; a regra foi restrita a `providerSlug === "ollama"` e recebeu teste de contraste.

Verificações: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter @ai-hub/desktop exec vitest run src/main/spend-guard.test.ts`, build Electron e E2E `offline.spec.ts` + `rag.spec.ts`.

Continuação do gate (Cursor): instalado Ollama 0.34.3 + `llama3.2:1b`; gerado `DIFF-post-review.patch` ausente; prova física com Wi-Fi desligado e chat loopback em `PHYSICAL-DOD.md` (**PASS**). Runtime CUDA desta máquina invalidado — prova em CPU.

`DIFF-post-review.patch` contém o diff cumulativo dos arquivos corrigidos no review, relativo ao HEAD inicial; `DIFF.patch` contém todo o diff W26. Não é um patch incremental entre dois commits, pois nenhuma alteração da onda foi commitada.
