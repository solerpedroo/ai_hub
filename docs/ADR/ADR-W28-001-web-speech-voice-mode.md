# ADR-W28-001-web-speech-voice-mode

- **Status:** accepted
- **Onda:** W28
- **Data:** 2026-09-23
- **Deciders:** Cursor / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Wave 28 exige Voice Mode (STT → LLM → TTS), conversa contínua com interrupção, escolha de voz, aviso se STT/TTS for cloud, e respeito ao modo Privado (não gravar áudio em disco sem opt-in). O DoD é hands-free de uma pergunta com transcript e receipt visíveis. Não há pacote `voice` no MVP; a trust boundary proíbe keys/Provider HTTP no renderer.

## Decisão

1. **STT/TTS** usam a **Web Speech API** no renderer (Chromium do Electron): `SpeechRecognition` / `SpeechSynthesis`. Sem novo npm package e sem HTTP de provider de voz no main nesta onda.
2. **LLM** continua exclusivamente via `chat:send` / `sendChat` (caps, firewall, receipts, abort, privacy efetiva no main). O transcript vira o `content` da mensagem do usuário.
3. **Áudio em disco:** W28 **não** grava wav/webm. Pref `audioDiskOptIn` (default `false`) reserva o contrato; em `privacyMode === "private"` a gravação é sempre recusada mesmo com opt-in (`setAppPrefs` força `audioDiskOptIn=false`; `canPersistVoiceAudio` é o gate para qualquer writer futuro). Transcripts vivem como mensagens cifradas da conversa.
4. **Cloud / OS:** Web Speech pode usar serviços do SO/navegador. Exigimos `voiceCloudAck` antes do primeiro listen e mostramos aviso de privacidade na Settings e no painel de voz.
5. **Voz TTS:** `ttsVoiceURI` em app prefs; lista vem de `speechSynthesis.getVoices()` no renderer.
6. **Contínuo / interrupt:** após TTS da resposta, se `voiceContinuous` e o utilizador ainda está em modo voz, reinicia STT; interrupt para reconhecimento, síntese e `chat.abort`.

## Alternativas consideradas

- **Whisper/ffmpeg local no main:** rejeitado nesta onda — pesado, novo binário, fora do DoD mínimo.
- **Cloud STT/TTS via ai-gateway:** rejeitado — nova superfície de keys e custo; aviso cloud basta para Web Speech.
- **Pacote `packages/voice`:** rejeitado — plano não cria pacote; lógica cabe em desktop + prefs shared/db.

## Consequências

- Qualidade STT/TTS depende do SO/Chromium; CI deve mockar transcript (sem microfone real).
- Histórico de voz = histórico da conversa (sem tabela separada).
- Ondas futuras podem trocar o backend de STT/TTS sem mudar o caminho LLM se mantiverem o contrato transcript → `chat:send`.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 28)
- `docs/AI_Hub_Desktop_Escopo.md` (§38)
- `docs/ADR/ADR-W18-001-effective-privacy-policy.md`
- `docs/reviews/W28/REVIEW.md`
