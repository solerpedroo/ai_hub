# ADR-W01-001-envelope-encryption-at-rest

- **Status:** accepted
- **Onda:** W01
- **Data:** 2026-09-15
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano exige persistência criptografada. SQLCipher no `better-sqlite3` implica build nativo customizado, frágil no Windows. FTS5 precisa de texto em claro para indexar; a Wave 6 é quem popula a busca.

## Decisão

Usar **envelope AES-256-GCM** (Node `crypto`) nos campos sensíveis (`name_cipher`, `title_cipher`, `content_cipher`, `instructions_cipher`, `payload_cipher`). A chave mestra (32 bytes) vive no **keytar**, nunca no SQLite. O ficheiro `.sqlite` pode ser lido, mas o conteúdo das conversas não.

A tabela FTS5 `messages_fts` existe como **hook** e permanece vazia nesta onda.

## Alternativas consideradas

- **SQLCipher:** FTS e encriptação no ficheiro inteiro; custo de toolchain no Windows.
- **SQLite plaintext:** viola o DoD da Wave 1.

## Consequências

- Repos no main desencriptam antes de montar DTOs.
- Busca FTS real fica para W6 (talvez índice separado ou SQLCipher depois).
- Backup do `.sqlite` sem o Credential Manager não recupera o texto.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 1)
- `docs/reviews/W01/REVIEW.md`
- ADR-W01-003
