# ADR-W03-001-react-markdown-gfm

- **Status:** accepted
- **Onda:** W03
- **Data:** 2026-09-16
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O DoD da Wave 3 pede markdown na bolha, highlight e copy em code block. O renderer já é React; não há markdown no main.

## Decisão

Renderizar markdown **só no renderer** com `react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-sanitize`. Copy do bloco e da resposta usa `navigator.clipboard` (sem Node no renderer).

## Alternativas consideradas

- **Markdown no main e HTML no DTO:** HTML no IPC aumenta superfície XSS e duplica a fonte.
- **Biblioteca de editor (CodeMirror/Monaco):** fora de onda; o composer é texto.

## Consequências

- Dependências só em `apps/desktop`.
- W15 artifacts podem reutilizar o mesmo renderer de markdown, não um segundo kit.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 3)
- `docs/reviews/W03/REVIEW.md`
- ADR-W00-002 (shadcn + Tailwind; sem outro UI kit)
