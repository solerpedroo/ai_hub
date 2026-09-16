# Code reviews por onda

Cada fechamento de onda (§9 do `.cursorrules`) **deve** deixar artefatos nesta pasta. O chat não substitui o disco.

## Layout

```text
docs/reviews/WXX/
  REVIEW.md                 # síntese do review
  DIFF.patch                # diff do código revisado (freeze)
  DIFF-post-review.patch    # diff das correções do review (se houver)
  REVIEW-delta.md           # só se o delta review for estrutural
```

`WXX` é a onda com dois dígitos: Wave 0 → `W00`, Wave 8 → `W08`, Wave 10 → `W10`.

## Regras

- Criar a pasta da onda no **primeiro** close gate dessa onda.
- Não apagar nem reescrever reviews antigos. Rounds seguintes entram como `REVIEW-delta.md` + patch extra, ou uma seção “Delta” no `REVIEW.md` **sem** apagar o conteúdo original.
- `DIFF.patch` é o git diff (apps/packages/docs de produto), não um resumo em prosa. Excluir `node_modules`, `dist` e a própria pasta `docs/reviews/WXX` se o diff for gerado depois dos arquivos de review.
- Ligar ADRs da onda em `REVIEW.md` (`docs/ADR/ADR-WXX-NNN-*.md`).

## Conteúdo mínimo de `REVIEW.md`

Wave, data ISO, HEAD/branch, DoD pass/fail, checklist §9.4, tabela de achados (severidade, arquivo, status), correlações, riscos residuais, paths dos patches, links de ADR.
