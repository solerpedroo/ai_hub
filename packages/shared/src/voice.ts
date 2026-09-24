/**
 * Voice Mode (W28) helpers — disk gate for audio. STT/TTS live in the renderer (Web Speech).
 */

export type VoicePrivacyPrefs = {
  privacyMode: "private" | "normal" | "maximum";
  audioDiskOptIn: boolean;
};

/** Audio must never hit disk in Private mode, nor without explicit opt-in. */
export function canPersistVoiceAudio(prefs: VoicePrivacyPrefs): boolean {
  if (prefs.privacyMode === "private") {
    return false;
  }
  return prefs.audioDiskOptIn === true;
}
