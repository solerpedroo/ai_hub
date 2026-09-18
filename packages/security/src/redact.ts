import { redactPastedSecrets } from "@ai-hub/shared";

export function redactSecrets(text: string): string {
  return redactPastedSecrets(text);
}

export function maskSecret(secret: string): string {
  const last = secret.length >= 4 ? secret.slice(-4) : secret;
  if (secret.startsWith("sk-")) {
    return `sk-…${last}`;
  }
  return `…${last}`;
}

export function last4OfSecret(secret: string): string {
  return secret.length >= 4 ? secret.slice(-4) : secret;
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return redactSecrets(error.message);
  }
  return redactSecrets(String(error));
}
