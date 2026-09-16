# ADR-W00-002-shadcn-tailwind-i18n

- **Status:** accepted
- **Onda:** W00
- **Data:** 2026-09-15
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A UI precisa de densidade desktop, tema claro/escuro/sistema e copy **pt-BR + en** desde o chrome vazio. Inventar um design system próprio atrasaria o DoD da Wave 0.

## Decisão

- **Tailwind CSS v3** + **shadcn/ui** (New York): Button, Input, Dialog, Tooltip, Command, ScrollArea.
- **Zustand** ainda não — tema fica no renderer (`localStorage` + classe no `document`). Persistência no SQLite é Wave 1.
- **i18next + react-i18next**, locale default `pt-BR`, fallback `en`.
- Tema **não** usa IPC nem secrets.

## Alternativas consideradas

- **Tailwind v4:** default novo do shadcn; menos exemplos estáveis com electron-vite hoje.
- **Kit UI extra (MUI, Ant):** viola o plano.
- **Tema no main via IPC:** overkill para preferência visual sem conta.

## Consequências

- Copy nova sempre ganha chaves pt-BR e en no mesmo PR.
- Preferência de tema é local ao renderer até Wave 1 (settings na DB).
- Command palette visual existe; atalhos reais de produto (`Ctrl+K` de verdade) são Wave 11.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 0)
- `docs/reviews/W00/REVIEW.md`
