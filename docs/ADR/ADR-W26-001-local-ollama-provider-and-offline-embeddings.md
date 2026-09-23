# ADR-W26-001-local-ollama-provider-and-offline-embeddings

- **Status:** accepted
- **Onda:** W26
- **Data:** 2026-09-23
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Ollama usa um daemon local e modelos instalados dinamicamente. O contrato anterior exige chave no keytar e catálogo estático, enquanto o índice de PDFs já usa embeddings locais determinísticos e cifrados.

## Decisão

Ollama é um provider local de primeira classe, sem segredo ou chave falsa persistida. O main expõe uma identidade local fixa e consulta `127.0.0.1:11434` para detectar o daemon e listar modelos; o envio valida o modelo instalado antes do dispatch. O adapter usa a API nativa `/api/chat`, com streaming, abort e uso reportado. Receipts locais têm custo `0.000000` e latência medida.

O índice de PDFs existente mantém embeddings locais determinísticos, sem dependência do daemon de embeddings: arquivos já indexados permanecem pesquisáveis quando a internet está desligada. Migração para embeddings Ollama exigiria versionamento e reindexação do espaço vetorial; não misturaremos vetores incompatíveis nesta onda.

Fallback de provider remoto para local requer escolha explícita do usuário e modelo instalado. Nenhuma tentativa é redirecionada silenciosamente.

## Alternativas consideradas

- Armazenar uma chave fictícia para Ollama: rejeitado por confundir a fronteira de segredos.
- Adicionar modelos Ollama ao catálogo estático: rejeitado porque instalações diferem por máquina.
- Reindexar automaticamente com `/api/embed`: rejeitado porque quebraria o índice existente sem versão de embedding e impediria RAG quando o daemon de embedding não estivesse disponível.

## Consequências

- O main mantém a única chamada HTTP local; renderer recebe DTOs limitados e validados.
- Um daemon ausente aparece como indisponível e não impede uso dos providers remotos.
- O endpoint loopback é uma fronteira de confiança local: outro processo na mesma máquina que ocupe a porta 11434 pode se passar pelo daemon e receber o packet após escolha explícita do usuário.
- O embedding hashed existente é local e funciona offline, mas tem qualidade semântica inferior a um modelo neural; uma futura migração precisa de versão e reindexação explícitas.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 26)
- `docs/reviews/W26/REVIEW.md`
- `docs/ADR/ADR-W14-001-local-hashed-embeddings.md`
