import { effectivePrivacyMode, type PacketPrivacyMode } from "@ai-hub/shared";

export function allowsProjectContext(privacyMode: PacketPrivacyMode): boolean {
  return effectivePrivacyMode(privacyMode) === "maximum";
}
