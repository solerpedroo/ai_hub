# REVIEW delta — Wave 16

- **Data:** 2026-09-19
- **Reviewer:** [wave-reviewer](eda53da1-c960-4a5c-a54b-12be5dde9058)
- **Âmbito:** correções pós-freeze (navegação iframe, redact, mermaid srcdoc, cap IPC, delete)

HIGH de navegação do iframe: **fechado** (`isAllowedArtifactFrame` + `will-frame-navigate` + `onBeforeRequest`).

Delta extra: `listArtifacts.slice(100)` não limita o clone (cap só no IPC); SVG export passa por `redactSecrets`; erro de mermaid limpa `hasSvg`.

Typecheck desktop + shared; testes shared 97 / db 26; e2e artifacts 2.8s.
