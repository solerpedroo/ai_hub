# ADR-W19-001-shared-renderer-quick-ai-overlay

- **Status:** accepted
- **Onda:** W19
- **Data:** 2026-09-20
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Quick AI precisa funcionar com o Hub oculto, sem criar uma segunda fronteira de confiança ou um caminho de gateway que ignore limites e recibos.

## Decisão

Usar uma `BrowserWindow` pequena com o mesmo bundle renderer, preload sandboxed e hash `#quick-ai`. A janela cria uma conversa normal e reutiliza `chat:send`; clipboard é lido somente por ação explícita ou pelo atalho/contexto e nunca é monitorado ou gravado separadamente.

## Alternativas consideradas

- **Segunda aplicação/renderer com gateway próprio:** duplicaria contratos de segurança e caps.
- **Mostrar a janela principal:** não atende à interação rápida e discreta.

## Consequências

- Firewall, privacidade, caps e receipts são aplicados uniformemente.
- Uma pergunta avulsa continua sendo uma conversa local persistida.
- Captura de seleção fora de apps Electron não é prometida; Windows usa clipboard sob gatilho explícito e menu contextual da superfície.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (W19)
- `docs/reviews/W19/REVIEW.md`
- `ADR-W00-003-csp-and-window-ipc.md`
