# ADR-W22-003-realpath-scoped-filesystem-connector

- **Status:** accepted
- **Onda:** W22
- **Data:** 2026-09-21
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Uma string de path relativo não basta para conter junctions e symlinks. A raiz do projeto também é dado local sensível e não deve ir em texto claro ao SQLite nem ao renderer.

## Decisão

A raiz é cifrada em `project_tool_roots`. O connector aceita apenas paths relativos sem drive, absoluto, NUL ou `..`; resolve `realpath` da raiz e do alvo, abre o alvo sem seguir symlink quando a plataforma oferece `O_NOFOLLOW`, revalida o path após abrir e lê no máximo 64 KiB + 1 byte pelo handle. A saída é redigida e a UI recebe apenas o nome da raiz/atividade resumida.

## Alternativas consideradas

- **Checagem textual de prefixo:** recusada por permitir sibling prefix e escape por symlink.
- **Raiz em plaintext no projeto:** recusada por aumentar a exposição de metadados locais.

## Consequências

- A leitura usa handle limitado e mitiga a troca de path entre validação e leitura; `O_NOFOLLOW` reforça onde suportado.
- Arquivos inexistentes, diretórios e escapes falham antes de qualquer conteúdo ser retornado.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 22)
- `docs/reviews/W22/REVIEW.md`
