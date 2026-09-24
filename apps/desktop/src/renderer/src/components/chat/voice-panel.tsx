import { type JSX, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AppPrefs, MessageDto } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import {
  createSpeechRecognition,
  isSpeechRecognitionAvailable,
  isSpeechSynthesisAvailable,
  listTtsVoices,
  speakText,
  stopSpeaking,
  type HubSpeechRecognition,
} from "@/lib/voice-session";

type VoicePhase = "idle" | "listening" | "sending" | "speaking";

export function VoicePanel({
  enabled,
  conversationId,
  prefs,
  messages,
  streaming,
  sending,
  hasKey,
  hasConversation,
  locale,
  onSendTranscript,
  onAbortChat,
  onPrefsChange,
}: {
  enabled: boolean;
  conversationId: string | null;
  prefs: AppPrefs | null;
  messages: MessageDto[];
  streaming: boolean;
  sending: boolean;
  hasKey: boolean;
  hasConversation: boolean;
  locale: string;
  onSendTranscript: (text: string) => Promise<boolean>;
  onAbortChat: () => void;
  onPrefsChange: (patch: Partial<AppPrefs>) => Promise<void>;
}): JSX.Element | null {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [interim, setInterim] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<HubSpeechRecognition | null>(null);
  const spokenMessageIdRef = useRef<string | null>(null);
  const awaitingVoiceReplyRef = useRef(false);
  const continuousRef = useRef(false);
  const listeningDesiredRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => undefined);

  const cloudAck = prefs?.voiceCloudAck === true;
  const continuous = prefs?.voiceContinuous === true;
  const voiceURI = prefs?.ttsVoiceURI ?? null;
  const sttOk = isSpeechRecognitionAvailable();
  const ttsOk = isSpeechSynthesisAvailable();
  const speechLang = locale.toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";

  continuousRef.current = continuous;

  const markExistingAssistantSpoken = (): void => {
    const last = [...messages]
      .reverse()
      .find((item) => item.role === "assistant" && item.status === "complete");
    spokenMessageIdRef.current = last?.id ?? null;
  };

  const stopListening = (): void => {
    listeningDesiredRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterim("");
    setPhase((current) => (current === "listening" ? "idle" : current));
  };

  const interrupt = (): void => {
    listeningDesiredRef.current = false;
    awaitingVoiceReplyRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    stopSpeaking();
    onAbortChat();
    setInterim("");
    setPhase("idle");
  };

  const startListening = (): void => {
    setError(null);
    if (!sttOk) {
      setError(t("voice.error.unsupported"));
      return;
    }
    if (!cloudAck) {
      setError(t("voice.error.cloudAck"));
      return;
    }
    if (!hasConversation || !hasKey) {
      setError(t("voice.error.ready"));
      return;
    }
    recognitionRef.current?.abort();
    stopSpeaking();
    listeningDesiredRef.current = true;
    const recognition = createSpeechRecognition({
      lang: speechLang,
      continuous: false,
      onInterim: (text) => setInterim(text),
      onFinal: (text) => {
        setInterim("");
        setLastTranscript(text);
        setPhase("sending");
        recognitionRef.current = null;
        awaitingVoiceReplyRef.current = true;
        void onSendTranscript(text).then((ok) => {
          if (!ok) {
            awaitingVoiceReplyRef.current = false;
            setPhase("idle");
            setError(t("voice.error.send"));
            return;
          }
          setPhase("idle");
        });
      },
      onError: (code) => {
        if (code === "aborted" || code === "no-speech") {
          setPhase("idle");
          return;
        }
        setError(t("voice.error.stt", { code }));
        setPhase("idle");
      },
      onEnd: () => {
        setPhase((current) => (current === "listening" ? "idle" : current));
      },
    });
    if (!recognition) {
      setError(t("voice.error.unsupported"));
      return;
    }
    recognitionRef.current = recognition;
    setPhase("listening");
    try {
      recognition.start();
    } catch {
      setError(t("voice.error.unsupported"));
      setPhase("idle");
    }
  };

  startListeningRef.current = startListening;

  useEffect(() => {
    if (!ttsOk) return;
    const refresh = (): void => setVoices(listTtsVoices());
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, [ttsOk]);

  useEffect(() => {
    listeningDesiredRef.current = false;
    awaitingVoiceReplyRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    stopSpeaking();
    markExistingAssistantSpoken();
    setInterim("");
    setLastTranscript("");
    setPhase("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on conversation change
  }, [conversationId]);

  useEffect(() => {
    return () => {
      listeningDesiredRef.current = false;
      awaitingVoiceReplyRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!open || !awaitingVoiceReplyRef.current) return;
    if (phase === "listening" || phase === "sending") return;
    if (streaming || sending) return;
    const last = [...messages].reverse().find((item) => item.role === "assistant" && item.status === "complete");
    if (!last || !last.content.trim()) return;
    if (spokenMessageIdRef.current === last.id) return;
    if (!ttsOk) return;
    spokenMessageIdRef.current = last.id;
    awaitingVoiceReplyRef.current = false;
    setPhase("speaking");
    speakText({
      text: last.content,
      voiceURI,
      lang: speechLang,
      onEnd: () => {
        setPhase("idle");
        if (continuousRef.current && listeningDesiredRef.current && cloudAck) {
          startListeningRef.current();
        }
      },
    });
  }, [messages, streaming, sending, open, phase, ttsOk, voiceURI, speechLang, cloudAck]);

  if (!enabled) {
    return null;
  }

  return (
    <section className="border-t px-2 py-2" data-testid="voice-panel">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12px] font-medium">{t("voice.title")}</p>
        <Button
          type="button"
          size="sm"
          variant={open ? "default" : "outline"}
          aria-pressed={open}
          data-testid="voice-toggle"
          onClick={() => {
            setOpen((value) => {
              const next = !value;
              if (next) {
                markExistingAssistantSpoken();
              } else {
                listeningDesiredRef.current = false;
                awaitingVoiceReplyRef.current = false;
                recognitionRef.current?.abort();
                recognitionRef.current = null;
                stopSpeaking();
                setPhase("idle");
              }
              return next;
            });
          }}
        >
          {open ? t("voice.hide") : t("voice.show")}
        </Button>
        {open ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={phase === "sending" || streaming || sending}
              data-testid="voice-listen"
              onClick={() => {
                if (phase === "listening") {
                  stopListening();
                  return;
                }
                startListening();
              }}
            >
              {phase === "listening" ? t("voice.stopListen") : t("voice.listen")}
            </Button>
            <Button type="button" size="sm" variant="ghost" data-testid="voice-interrupt" onClick={interrupt}>
              {t("voice.interrupt")}
            </Button>
          </>
        ) : null}
      </div>
      {open ? (
        <div className="mt-2 flex flex-col gap-2">
          {!cloudAck ? (
            <div className="rounded border border-amber-600/40 bg-amber-500/10 p-2 text-[11px]" role="status">
              <p>{t("voice.cloudWarning")}</p>
              <Button
                type="button"
                size="sm"
                className="mt-2"
                data-testid="voice-cloud-ack"
                onClick={() => {
                  void onPrefsChange({ voiceCloudAck: true });
                }}
              >
                {t("voice.cloudAck")}
              </Button>
            </div>
          ) : null}
          <p className="text-[11px] text-muted-foreground" data-testid="voice-phase" data-phase={phase}>
            {t(`voice.phase.${phase}`)}
          </p>
          {interim ? (
            <p className="text-[12px] italic text-muted-foreground" data-testid="voice-interim">
              {interim}
            </p>
          ) : null}
          {lastTranscript ? (
            <p className="text-[12px]" data-testid="voice-transcript">
              <span className="text-muted-foreground">{t("voice.transcript")}: </span>
              {lastTranscript}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">{t("voice.hint")}</p>
          )}
          <label className="flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={continuous}
              onChange={(event) => {
                void onPrefsChange({ voiceContinuous: event.target.checked });
              }}
              data-testid="voice-continuous"
            />
            {t("voice.continuous")}
          </label>
          {ttsOk && voices.length > 0 ? (
            <label className="flex flex-col gap-1 text-[12px]">
              {t("voice.voice")}
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={voiceURI ?? ""}
                onChange={(event) => {
                  const next = event.target.value || null;
                  void onPrefsChange({ ttsVoiceURI: next });
                }}
                data-testid="voice-select"
              >
                <option value="">{t("voice.voiceDefault")}</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {error ? (
            <p className="text-[11px] text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
