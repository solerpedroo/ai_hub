# ADR-W14-001-local-hashed-embeddings

- **Status:** accepted
- **Onda:** W14
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A W14 pede chunking + embeddings, locais se possível, senão API explícita e paga no cap. Uma API de embedding (OpenAI etc.) criaria custo silencioso e chave extra. `transformers.js` baixa um modelo e pesa o event loop do main.

## Decisão

- Nasce `packages/memory` (`@ai-hub/memory`).
- Embeddings **locais**: vetor de 128 dimensões por *signed hashing* de n-gramas (caracteres 3 + tokens). Sem rede, sem keytar extra, determinístico nos testes.
- Indexação no ingest do ficheiro (main), não no caminho quente do stream.
- Retrieval por cosseno no projeto; fatias `rag` no compiler (`Retrieved chunk:`), não no texto do user.
- Upgrade futuro para MiniLM/transformers **reindexa** a mesma tabela `file_chunks` sem mudar o contrato IPC.

## Alternativas consideradas

- **API de embedding paga:** custo no cap, mas exige consentimento e key; rejeitado como default.
- **transformers.js MiniLM no main:** qualidade melhor; binário/download e CPU no event loop. Adiado.

## Consequências

- RAG v1 é lexical-semântico fraco (hash), suficiente para citar o PDF certo num projeto pequeno.
- Sem embeddings na renderer; texto do chunk cifrado; vetor também cifrado.
- W26 (Ollama offline) pode trocar o backend sem novo DTO.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 14)
- `docs/ADR/ADR-W12-001-files-package-and-encrypted-extract.md`
- `docs/ADR/ADR-W13-001-mentions-structured-not-in-user-text.md`
