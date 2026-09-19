# REVIEW — Wave 18 (W18)

- **Wave:** W18 — Privacy Center + Context Firewall + Cost Tracker
- **Data:** 2026-09-19
- **Reviewer:** agent; passes independentes `w18_review` e `w18_trust`
- **Branch / HEAD (freeze):** `main` / `faf7f0c8f5d2f18f734eb26423b0e217edb7c18f` (working tree uncommitted)

## DoD

| Critério | Resultado | Evidência |
|---|---|---|
| Pre-flight lista o que segue ou fica de fora | pass | `packet-preview.ts` e `packet-panel.tsx` |
| Privado / Normal / Máximo alteram o Compiler | pass | `portable-packet.ts`, `compiler.ts`, Privacy Center |
| Firewall bloqueia/mascara dados e injection | pass | `security/firewall.ts`; main antes de persistir/enviar |
| Dashboard mensal fecha com receipts | pass | `repos.summarizeReceipts`, `costs:monthly`, Settings |
| Caps por projeto/provider são hard-stop | pass | migration 13, `spend-guard.ts`, `chat-session.ts` |
| `sk-` é mascarado; Privado não envia memória/outros arquivos | pass | firewall e compiler/mentions |

## Checklist

- [x] Sem MCP, agentes, Council ou overlay.
- [x] Renderer sem Node/SDK/db; IPC novo validado por Zod no preload e main.
- [x] Preview, send, save e import usam firewall; packet/exports não recebem credenciais.
- [x] Migrations versionadas; UI pt-BR + en; caps passam pelo mesmo caminho de chat/skill.
- [x] Typecheck e lint desktop passam; shared/security/gateway tests passam.

## Findings

| Severidade | Arquivo | Resumo | Status |
|---|---|---|---|
| High | preview / packet-file | Firewall divergente entre preview, envio e packet | fixed no delta |
| Medium | repos | Dashboard excluía receipts sem custo e ordenava texto | fixed |
| Medium | Settings | `Allow` era enganoso para credenciais | fixed: credenciais só Block/Mask |
| Low | import packet | segredo já redigido é aceito mesmo com policy Block | accepted; não persiste segredo |
| Low | db test | Windows retorna `EBUSY` ao remover SQLite temporário | accepted; 27/28 testes passam, falha anterior/ambiental |

## Correlações e riscos

- `standard`/`strict` continuam legíveis para packets antigos e normalizam em `normal`/`private`.
- Sem e2e específico da W18; contratos críticos têm testes unitários/integração de pacote. UI Electron continua coberta pelos fluxos mock existentes.
- Import de packet pode aceitar conteúdo já redigido sob policy Block; nunca grava o segredo.

## ADR

- `docs/ADR/ADR-W18-001-effective-privacy-policy.md`

## Patches

- `docs/reviews/W18/DIFF.patch`
- `docs/reviews/W18/DIFF-post-review.patch`
