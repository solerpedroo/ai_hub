import type { GatewayErrorCode } from "@ai-hub/shared";

export class GatewayError extends Error {
  readonly code: GatewayErrorCode;

  constructor(code: GatewayErrorCode, message: string, options?: { cause?: unknown }) {
    if (options) {
      super(message, options);
    } else {
      super(message);
    }
    this.name = "GatewayError";
    this.code = code;
  }
}

export class GatewayStreamError extends GatewayError {
  readonly content: string;
  readonly tokensIn: number | null;
  readonly tokensOut: number | null;
  readonly costUsd: string | null;

  constructor(
    cause: unknown,
    partial: { content: string; tokensIn: number | null; tokensOut: number | null; costUsd: string | null },
  ) {
    const code = gatewayErrorCode(cause);
    const message = cause instanceof Error ? cause.message : "Stream failed";
    if (cause instanceof Error) {
      super(code, message, { cause });
    } else {
      super(code, message);
    }
    this.name = "GatewayStreamError";
    this.content = partial.content;
    this.tokensIn = partial.tokensIn;
    this.tokensOut = partial.tokensOut;
    this.costUsd = partial.costUsd;
  }
}

export function isGatewayError(error: unknown): error is GatewayError {
  return error instanceof GatewayError;
}

export function gatewayErrorCode(error: unknown): GatewayErrorCode {
  if (error instanceof GatewayError) {
    return error.code;
  }
  return "unknown";
}
