# ADR-W16-002-html-sandbox-custom-protocol

- **Status:** accepted
- **Onda:** W16
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

HTML de artifact precisa de preview com scripts de UI, **sem rede e sem Node**. `srcdoc` herda o CSP do renderer (`script-src 'self'` em prod) e bloquearia inline. `dangerouslySetInnerHTML` no React quebraria o sanitize da W03.

## Decisão

- Protocolo privilegiado `ai-hub-artifact:` registado **antes** de `app.ready`.
- Cada preview usa origem única `ai-hub-artifact://<uuid>/` servida pelo main a partir do body cifrado.
- CSP do preview: `default-src 'none'` + `script-src`/`style-src 'unsafe-inline'` + `img-src data:` + `connect-src 'none'`.
- iframe `sandbox="allow-scripts"` (sem `allow-same-origin`, sem popups, sem forms).
- `will-frame-navigate` + `webRequest.onBeforeRequest` cancelam subframe que não seja `ai-hub-artifact:` / `about:blank` / `about:srcdoc`.
- CSP do preview inclui `navigate-to 'none'` (defesa extra; Chromium pode ignorar).
- CSP da janela ganha `frame-src 'self' ai-hub-artifact:`. Pedidos `ai-hub-artifact:` **não** recebem o CSP da app.
- Mermaid **não** usa este protocolo: lib `mermaid` no renderer com `securityLevel: "strict"`.

## Alternativas consideradas

- **BrowserView / WebContentsView:** isolamento extra, layout split mais frágil nesta onda.
- **srcdoc + relaxar CSP da app:** enfraquece a janela principal.

## Consequências

- Preview HTML de rascunho não-salvo exige “Guardar versão”.
- Scripts no artifact não acedem a `window.hub`.
- Mermaid renderiza num iframe `sandbox=""` (`about:srcdoc`), não via `innerHTML` na origem da app.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 16)
- ADR-W00-003 (CSP da janela)
- ADR-W03-001 (markdown sanitize no chat)
