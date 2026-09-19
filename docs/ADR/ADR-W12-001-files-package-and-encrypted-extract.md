# ADR-W12-001-files-package-and-encrypted-extract

- **Status:** accepted
- **Onda:** W12
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A Wave 12 precisa extrair texto, guardar arquivos no projeto e injetá-los no send. O renderer não pode usar `fs`. O utilizador vai largar código e documentos privados.

## Decisão

Nasce `packages/files` só com extração e resumo de pasta (sem I/O). O main lê o disco, redige, cifra o extract com `encryptUtf8` e grava em `project_files`. O renderer só vê DTOs (nome, kind, tokens, excerpt). Paths não atravessam o IPC de volta.

## Alternativas consideradas

- **Tudo no main, sem pacote:** viola o plano (“`files` nasce quando a onda precisar”).
- **Blobs plaintext em `userData`:** rejeitado — o trust boundary já cifra conversas.

## Consequências

- Positivas: testes de extração sem Electron; um sítio para PDF/DOCX.
- Negativas: migration 8; envelope v1 do packet **não** leva o extract (W10).
- Riscos aceitos: nome do ficheiro fica em plaintext (como tags W6).

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 12
- `docs/ADR/ADR-W01-001-envelope-encryption-at-rest.md`
- `docs/reviews/W12/REVIEW.md`
