export function allowsProjectContext(privacyMode: "standard" | "strict"): boolean {
  return privacyMode !== "strict";
}
