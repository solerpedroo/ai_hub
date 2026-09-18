# ADR-W08-002-electron-builder-nsis

- **Status:** accepted
- **Onda:** W08
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano trava `electron-builder` + NSIS no Windows. Sem instalador, o DoD de “outra pessoa instala” falha. macOS assinado fica fora desta onda.

## Decisão

`electron-builder` gera NSIS x64. `appId` `com.aihub.desktop` (igual ao AppUserModelId). Ícone em `apps/desktop/resources/icon.png`. Artefactos em `release/` (gitignored). `better-sqlite3` e `keytar` saem do asar (`asarUnpack`). Script `pnpm --filter @ai-hub/desktop dist`. Build macOS/Linux não é alvo do MVP.

## Alternativas consideradas

- **Squirrel / MSI only:** NSIS é o alvo do plano.
- **Tauri installer:** stack travada em Electron.

## Consequências

- Positivas: instalador Windows alinhado ao plano.
- Negativas: nativos pnpm+asar exigem unpack; CI pode não assinar o binário.
- Riscos aceitos: unsigned Windows; macOS unsigned não é entregue.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` tabela de arquitetura / Wave 8
- `docs/reviews/W08/REVIEW.md`
