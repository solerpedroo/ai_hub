# ADR-W30-001-encrypted-folder-relay-sync

- **Status:** accepted
- **Onda:** W30
- **Data:** 2026-09-27
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A sincronização deve continuar opcional e local-first, funcionar entre Windows e macOS e não pode transportar provider keys. A onda não especifica um backend de conta, e adicionar um serviço cloud próprio ou dependências novas aumentaria a superfície de confiança.

## Decisão

Usar um relay de pasta compartilhada escolhido pelo usuário. O Hub lê e escreve um único envelope AES-256-GCM versionado; uma frase de pareamento fornecida pelo usuário é derivada apenas no processo principal e seu resultado fica no keytar local. A pasta pode ser compartilhada pelo mecanismo que o usuário preferir, sem que o Hub exija conta cloud.

O envelope contém somente as categorias selecionadas: projetos e conversas, settings, packets e skills. Provider keys, keytar accounts, roots de filesystem, permissões de tools, gastos e telemetria nunca entram no payload. O merge é LWW por entidade e registra um aviso local quando um estado local é substituído por uma versão remota mais nova.

## Alternativas consideradas

- Sincronizar o arquivo SQLite: rejeitado porque inclui metadados e referências a provider keys e porque cada banco usa chave local.
- Backend cloud obrigatório: rejeitado por quebrar local-first e exigir conta.
- Copiar a master key do banco: rejeitado porque amplia a superfície de segredo e mistura vault local com transporte.

## Consequências

- Dois dispositivos precisam apontar para a mesma pasta e informar a mesma frase de pareamento.
- O relay enxerga somente ciphertext e metadados mínimos de versão do envelope.
- Conflitos simultâneos são visíveis como aviso e resolvidos por `updatedAt`; não há CRDT nesta onda.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 30)
- `docs/reviews/W30/REVIEW.md`
- `docs/ADR/ADR-W01-001-envelope-encryption-at-rest.md`
