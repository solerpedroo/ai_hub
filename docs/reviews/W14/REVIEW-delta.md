# REVIEW-delta — Wave 14

- **Data:** 2026-09-18
- **Reviewer:** [wave-reviewer](7a7b7304-47ff-433a-beca-2950a4947bec)
- **Âmbito:** só as Highs do close gate + Mediums corrigidos

## Highs

| Finding | Status |
|---|---|
| `compileAndSavePacket` sem memórias/RAG | **fixed** — `loadAutoProjectContext` + `appendMentionsToPacket` |
| Sem teste `strict` | **fixed** — `allowsProjectContext` + `memory.test.ts` |
| Preview vs send privacyMode | **fixed** — preview injeta com `input.privacyMode` |

## Residual após o delta

Packet aplicado pode reenviar memórias gravadas no envelope em `strict` e duplicar auto-inject em `standard`. Aceite como residual W14/W10. Citar RAG ainda não abre o extract do ficheiro.
