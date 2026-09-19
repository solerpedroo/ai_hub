const SECRET_HINT_PATTERNS: readonly RegExp[] = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /gsk_[A-Za-z0-9]{8,}/g,
  /AIza[A-Za-z0-9_-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /(?:api[_-]?key|access[_-]?token|secret|x-api-key|x-goog-api-key)[=:\s]+['"]?[^\s'"]+/gi,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /AKIA[0-9A-Z]{16}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
];

export function looksLikePastedSecret(text: string): boolean {
  for (const pattern of SECRET_HINT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

export function redactPastedSecrets(text: string): string {
  let output = text;
  for (const pattern of SECRET_HINT_PATTERNS) {
    pattern.lastIndex = 0;
    output = output.replace(pattern, "[REDACTED]");
  }
  return output;
}
