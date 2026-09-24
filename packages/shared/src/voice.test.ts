import { describe, expect, it } from "vitest";
import { canPersistVoiceAudio } from "./voice";

describe("canPersistVoiceAudio", () => {
  it("refuses Private mode even with opt-in", () => {
    expect(canPersistVoiceAudio({ privacyMode: "private", audioDiskOptIn: true })).toBe(false);
  });

  it("refuses normal/maximum without opt-in", () => {
    expect(canPersistVoiceAudio({ privacyMode: "normal", audioDiskOptIn: false })).toBe(false);
    expect(canPersistVoiceAudio({ privacyMode: "maximum", audioDiskOptIn: false })).toBe(false);
  });

  it("allows normal/maximum only with opt-in", () => {
    expect(canPersistVoiceAudio({ privacyMode: "normal", audioDiskOptIn: true })).toBe(true);
    expect(canPersistVoiceAudio({ privacyMode: "maximum", audioDiskOptIn: true })).toBe(true);
  });
});
