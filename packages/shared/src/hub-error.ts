import type { GatewayErrorCode } from "./gateway";
import { parseSpendCapError, type CapBlockScope } from "./spend-caps";

export type HubIpcErrorKind =
  | "cap"
  | "unknown_model"
  | "gateway"
  | "generic";

export interface HubIpcError {
  kind: HubIpcErrorKind;
  scope: CapBlockScope | null;
  code: GatewayErrorCode | null;
}

const GATEWAY_CODES: readonly GatewayErrorCode[] = [
  "timeout",
  "rate_limit",
  "auth",
  "context_overflow",
  "quota",
  "network",
  "aborted",
  "unknown",
];

function isGatewayCode(value: string): value is GatewayErrorCode {
  return (GATEWAY_CODES as readonly string[]).includes(value);
}

export function classifyHubIpcError(message: string): HubIpcError {
  const cap = parseSpendCapError(message);
  if (cap) {
    return { kind: "cap", scope: cap, code: null };
  }
  if (message.includes("unknown_model")) {
    return { kind: "unknown_model", scope: null, code: null };
  }
  const gateway = /gateway:(timeout|rate_limit|auth|context_overflow|quota|network|aborted|unknown)/.exec(
    message,
  );
  if (gateway && isGatewayCode(gateway[1] ?? "")) {
    return { kind: "gateway", scope: null, code: gateway[1] as GatewayErrorCode };
  }
  if (message.includes("context_overflow")) {
    return { kind: "gateway", scope: null, code: "context_overflow" };
  }
  return { kind: "generic", scope: null, code: null };
}
