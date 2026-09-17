const SECRET_PATTERNS: readonly RegExp[] = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /gsk_[A-Za-z0-9]{8,}/g,
  /AIza[A-Za-z0-9_-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /(?:api[_-]?key|access[_-]?token|secret|x-api-key|x-goog-api-key)[=:\s]+['"]?[^\s'"]+/gi,
];

export function redactSecrets(text: string): string {
  let output = text;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, "[REDACTED]");
  }
  return output;
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
