# REVIEW delta — W15

- **Data:** 2026-09-19
- **Reviewer:** agent + [wave-reviewer](c7ae8cf3-98c7-4824-bfa6-9baa165ccbdb)
- **Âmbito:** correções High/Medium do freeze (caps N×, latch, privacyMode, i18n `@prompt`)

High do preflight N× confirmado **fixed**: `evaluatePlaygroundCaps` + testes; `runPlayground` avalia antes de `sendChat`; latch síncrono + `waitForChatRun`.

Medium restantes aceites ou corrigidos no mesmo delta (privacyMode, slots distintos, cap copy, filtro de erro, latch no início). Residual: `running` na UI vs streams ainda vivos; GC playground; poll sem timeout.
