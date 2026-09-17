# ADR-W03-004-e2e-mock-adapter

- **Status:** accepted
- **Onda:** W03
- **Data:** 2026-09-16
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A Wave 3 exige Playwright: enviar mensagem mockada e ver a bolha assistente. CI e UAT não podem usar chaves reais nem a rede OpenAI.

## Decisão

- `AI_HUB_E2E=1` no processo main: adapter mock em `packages/ai-gateway` (deltas fixos, abort respeitado), `userData` temporário, `MemorySecretStore`, seed de projeto/conversa/key falsa.
- Playwright lança o Electron já built (`out/main/index.js`). Sem rede.

## Alternativas consideradas

- **Interceptar `fetch` no teste:** frágil com o bundle do main.
- **Só Vitest no renderer com `window.hub` fake:** não cumpre o sub-task Playwright.

## Consequências

- O mock nunca é o caminho de produção (`AI_HUB_E2E` ausente).
- Caps (W7) devem aplicar-se também a este send path quando existirem.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 3)
- `docs/ADR/ADR-W02-001-provider-adapter-fetch.md`
- `docs/reviews/W03/REVIEW.md`
