# ADR-W16-001-artifacts-versioned-encrypted

- **Status:** accepted
- **Onda:** W16
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D5 pede canvas ao lado do chat com Markdown, Mermaid, HTML sandbox e código grande, versões (regenerar não apaga a anterior), pin no projeto e export. O corpo do artifact é conteúdo de trabalho; não pode ir em plaintext no SQLite.

## Decisão

- Tabela `artifacts` (migration 11): `title_cipher` / `body_cipher`; metadados plaintext (`kind`, `language`, `version`, `family_id`, `pinned`).
- Uma **família** (`family_id`) agrupa versões. Regenerar um irmão assistant ou “Guardar versão” no canvas cria `version+1` na mesma família.
- Extração no main após `complete` via `detectArtifacts` (pacote `shared`). Sem fatia de compiler; o artifact não entra no packet.
- Pin aplica-se a toda a família. Export MD/HTML/SVG corre no main (`dialog.showSaveDialog`); SVG do Mermaid é gerado no renderer e enviado no DTO (não é execução nativa).
- Sem pacote novo. Sem execução de código nativo nesta onda.

## Alternativas consideradas

- **Mutar o mesmo row:** perde histórico exigido pelo aceite.
- **Guardar só no `messages`:** não dá pin/export/versão independente do grafo.

## Consequências

- Duplicar conversa clona artifacts com novos ids/famílias.
- W17+ pode ligar skills a um `family_id` sem mudar o storage.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 16 / D5)
- `docs/reviews/W16/REVIEW.md`
- ADR-W15-001 (padrão de cifrar entidade)
