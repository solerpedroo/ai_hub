export const FIREWALL_KINDS = ["secret", "token", "email", "cpf", "prompt_injection"] as const;
export type FirewallKind = (typeof FIREWALL_KINDS)[number];
export const FIREWALL_ACTIONS = ["block", "mask", "allow"] as const;
export type FirewallAction = (typeof FIREWALL_ACTIONS)[number];
export type FirewallPolicy = Record<FirewallKind, FirewallAction>;

export const DEFAULT_FIREWALL_POLICY: FirewallPolicy = {
  secret: "mask",
  token: "mask",
  email: "mask",
  cpf: "mask",
  prompt_injection: "block",
};

const detectors: ReadonlyArray<{ kind: FirewallKind; pattern: RegExp }> = [
  { kind: "secret", pattern: /(?:sk-[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9]{8,}|AIza[A-Za-z0-9_-]{10,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,})/g },
  { kind: "token", pattern: /(?:Bearer\s+[A-Za-z0-9._\-+=/]+|(?:api[_-]?key|access[_-]?token|secret|password)[=:\s]+['"]?[^\s'"]+)/gi },
  { kind: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { kind: "cpf", pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g },
  { kind: "prompt_injection", pattern: /\b(?:ignore (?:all |previous |the )?instructions|system prompt|developer message|jailbreak|do not follow (?:the )?rules)\b/gi },
];

export interface FirewallFinding {
  kind: FirewallKind;
  action: FirewallAction;
  count: number;
}

export interface FirewallResult {
  blocked: FirewallKind[];
  findings: FirewallFinding[];
  maskedText: string;
}

export function applyContextFirewall(text: string, policy: FirewallPolicy = DEFAULT_FIREWALL_POLICY): FirewallResult {
  let maskedText = text;
  const findings: FirewallFinding[] = [];
  const blocked: FirewallKind[] = [];
  for (const detector of detectors) {
    detector.pattern.lastIndex = 0;
    const matches = [...text.matchAll(detector.pattern)];
    if (matches.length === 0) continue;
    const action = policy[detector.kind];
    findings.push({ kind: detector.kind, action, count: matches.length });
    if (action === "block") blocked.push(detector.kind);
    if (action === "mask" || detector.kind === "secret" || detector.kind === "token") {
      detector.pattern.lastIndex = 0;
      maskedText = maskedText.replace(detector.pattern, `[${detector.kind.toUpperCase()}_REDACTED]`);
    }
  }
  return { blocked, findings, maskedText };
}
