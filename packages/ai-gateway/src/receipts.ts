import {
  estimateCostUsd,
  findCatalogModel,
  type GatewayErrorCode,
} from "@ai-hub/shared";

export interface ComposeReceiptInput {
  provider: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  estimatedIn: number;
  estimatedOut: number;
  latencyMs: number;
  errorCode: GatewayErrorCode | null;
  reportedCostUsd?: string | null;
}

export interface ComposedReceipt {
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  costUsd: string | null;
  errorCode: GatewayErrorCode | null;
}

export function composeReceipt(input: ComposeReceiptInput): ComposedReceipt {
  const tokensIn = input.tokensIn ?? input.estimatedIn;
  const tokensOut = input.tokensOut ?? input.estimatedOut;
  const catalog = findCatalogModel(input.model, input.provider);
  return {
    provider: input.provider,
    model: input.model,
    tokensIn,
    tokensOut,
    latencyMs: input.latencyMs,
    costUsd:
      input.reportedCostUsd !== undefined && input.reportedCostUsd !== null
        ? input.reportedCostUsd
        : catalog
          ? estimateCostUsd(catalog, tokensIn, tokensOut)
          : null,
    errorCode: input.errorCode,
  };
}

export function estimateTokensFromChars(chars: number): number {
  return Math.ceil(chars / 4);
}
