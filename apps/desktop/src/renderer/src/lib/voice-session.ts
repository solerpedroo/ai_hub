/** Minimal typings for Chromium Web Speech used by Voice Mode (W28). */

export type HubSpeechRecognitionAlternative = {
  transcript: string;
};

export type HubSpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: HubSpeechRecognitionAlternative;
};

export type HubSpeechRecognitionResultList = {
  length: number;
  [index: number]: HubSpeechRecognitionResult;
};

export type HubSpeechRecognitionEvent = {
  results: HubSpeechRecognitionResultList;
};

export type HubSpeechRecognitionErrorEvent = {
  error: string;
};

export type HubSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: HubSpeechRecognitionEvent) => void) | null;
  onerror: ((event: HubSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => HubSpeechRecognition;

function recognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionAvailable(): boolean {
  return recognitionCtor() !== null;
}

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listTtsVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisAvailable()) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

export function createSpeechRecognition(options: {
  lang: string;
  continuous: boolean;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (code: string) => void;
  onEnd: () => void;
}): HubSpeechRecognition | null {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    return null;
  }
  const recognition = new Ctor();
  recognition.continuous = options.continuous;
  recognition.interimResults = true;
  recognition.lang = options.lang;
  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result?.[0]) continue;
      if (result.isFinal) {
        finalText += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }
    if (interim) {
      options.onInterim(interim.trim());
    }
    if (finalText.trim()) {
      options.onFinal(finalText.trim());
    }
  };
  recognition.onerror = (event) => {
    options.onError(event.error || "unknown");
  };
  recognition.onend = () => {
    options.onEnd();
  };
  return recognition;
}

export function speakText(input: {
  text: string;
  voiceURI: string | null;
  lang: string;
  onEnd?: () => void;
}): SpeechSynthesisUtterance | null {
  if (!isSpeechSynthesisAvailable() || !input.text.trim()) {
    input.onEnd?.();
    return null;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(input.text.slice(0, 8_000));
  utterance.lang = input.lang;
  if (input.voiceURI) {
    const match = listTtsVoices().find((voice) => voice.voiceURI === input.voiceURI);
    if (match) {
      utterance.voice = match;
    }
  }
  utterance.onend = () => input.onEnd?.();
  utterance.onerror = () => input.onEnd?.();
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.cancel();
  }
}
