# W28 — Revisão de Voice Mode

- Data: 2026-09-23
- Branch/HEAD: `main` / `c3fa222`
- Estado do gate: **fechado**; DoD cumprido; Blocker/High corrigidos; artefatos persistidos.
- Revisores independentes: `wave-reviewer` (`860e2dae-e5cf-42cd-8c71-8eba6ae31fbc`), `trust-auditor` (`72ecc7cd-1d66-47d8-be60-91b8a15af583`).

## DoD

| Item | Resultado | Evidência |
|---|---|---|
| STT → LLM → TTS | **Pass** | Web Speech no renderer; LLM só `chat:send`; TTS após turno de voz |
| Hands-free de uma pergunta | **Pass** | Listen → transcript → send → reply + receipt no fio |
| Transcript + receipt visíveis | **Pass** | Painel (`voice-transcript`) + message bubble / receipt |
| Contínuo / interrupt / histórico | **Pass** | `voiceContinuous`; interrupt STT/TTS/`chat.abort`; histórico = conversa |
| Escolha de voz + aviso cloud | **Pass** | `ttsVoiceURI`; `voiceCloudAck` em Settings e painel |
| Private: sem áudio em disco sem opt-in | **Pass** | Sem writer wav/webm; `audioDiskOptIn` default false; Private força false em `setAppPrefs`; `canPersistVoiceAudio` |

## Checklist §9.4

- [x] Sub-tasks W28 em código
- [x] Sem leakage marketplace/sync/team/`packages/voice`
- [x] LLM sem keys/provider HTTP no renderer
- [x] Prefs Zod dual; sem secrets em appPrefs
- [x] i18n pt-BR + en (`voice.*`)
- [x] Abort / unsupported / cloudAck / ready tratados
- [x] Testes: `voice.test.ts`, prefs Zod, repos prefs (incl. Private limpa disk opt-in)
- [x] ADR-W28-001 + índice
- [x] `REVIEW.md` + `DIFF.patch` + `DIFF-post-review.patch`

## Achados

| Severidade | Arquivo | Achado | Estado |
|---|---|---|---|
| High | `voice-panel.tsx` | TTS falava última assistant ao abrir painel / trocar conversa | **fixed** — só fala após send de voz; reset por `conversationId` |
| High | `main/index.ts` | `media` liberado sem restrição (incl. câmera) | **fixed** — origem app + negar `video`; check handler alinhado |
| Medium | `home-view.tsx` | Voice `onSend` sem route (ignorava plan/assist) | **fixed** — passa route; force `assist` se modo agent/orch/research |
| Medium | `repos.ts` / `voice.ts` | `canPersistVoiceAudio` sem enforcement; Private não limpava opt-in | **fixed** — `setAppPrefs` força `audioDiskOptIn=false` em Private |
| Medium | `voice-panel` / testes | Sem mock STT→send→TTS em CI | **accepted** residual — ADR; unit de gate + prefs cobertos |
| Medium | abort na fase `sending` | `runId` pode ainda não estar no estado React | **accepted** residual |
| Low | locales DIFF | Reescrita JSON ruidosa / mojibake pré-existente | **accepted** |
| Low | atalho teclado Voice | Sem shortcut Listen/Interrupt | **accepted** residual |
| Out of wave | whisper local / cloud STT provider | Fora do ADR W28 | **out-of-wave** |

## Correlações

- **W18:** `privacyMode` Private bloqueia disk opt-in.
- **W21:** Voice usa plan/assist; agent/orchestrate/research são forçados para `assist` no send de voz.
- Caps/receipts/firewall do `sendChat` preservados.
- W29+ sem dependência bloqueante.

## Riscos residuais

- Qualidade STT/TTS depende do Chromium/SO; CI sem microfone real.
- Race de abort durante `await chat.send` antes do `runId` no estado.
- Sem e2e hands-free automatizado.
- `audioDiskOptIn` é hook; W28 não grava ficheiros de áudio.

## Artefatos

- Diff freeze: `docs/reviews/W28/DIFF.patch`
- Diff pós-review: `docs/reviews/W28/DIFF-post-review.patch`
- ADR: `docs/ADR/ADR-W28-001-web-speech-voice-mode.md`

## Verificação

- `pnpm --filter @ai-hub/desktop typecheck` — pass
- Vitest: `voice.test.ts`, `ipc-schemas` (prefs voz), `repos.test` (prefs / Private) — pass
