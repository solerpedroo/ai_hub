# ADR-W25-001-main-owned-read-only-developer-tools

- **Status:** accepted
- **Onda:** W25
- **Data:** 2026-09-22
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Developer Mode precisa inspecionar uma raiz de projeto, estado/diff Git e executar verificações sem transformar texto do modelo em shell arbitrário, expor paths absolutos ao renderer ou permitir mutações de repositório.

## Decisão

Explorer, Git e terminal são APIs explícitas do processo main. Git usa somente argumentos fixos e somente-leitura; terminal recebe argv estruturado, usa `shell: false`, tem timeout, output limitado e cwd limitado à raiz real do projeto. A aprovação é feita pelo Permission Center no main. Git read-only pode receber grant por projeto; terminal é sempre `allow once`. Não existem stage, commit, push, checkout ou escrita nesta onda.

## Alternativas consideradas

- Shell livre no renderer ou modelo: recusado por injection e quebra da trust boundary.
- Terminal PTY/interactive: recusado; acrescenta dependência e autoridade além do DoD.
- Reusar leitura de arquivo como autorização implícita de Git: recusado; Git e processo exigem consentimento próprio.

## Consequências

- O renderer recebe somente DTOs truncados/redigidos e paths relativos.
- Review cria artifact local; nenhum comando de mutação é despachado.
- W26+ pode ampliar o registry somente com novo ADR e Permission Center.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 25)
- `docs/ADR/ADR-W22-002-permission-center-main-owned-tool-router.md`
- `docs/reviews/W25/REVIEW.md`
