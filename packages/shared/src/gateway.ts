import { z } from "zod";

export {
  estimateCostUsd,
  findCatalogModel,
  MODEL_CATALOG,
  openaiCatalogModels,
  type CatalogModel,
  type ModelCatalog,
} from "./model-catalog";

export const gatewayErrorCodeSchema = z.enum([
  "timeout",
  "rate_limit",
  "auth",
  "context_overflow",
  "quota",
  "network",
  "aborted",
  "unknown",
]);

export type GatewayErrorCode = z.infer<typeof gatewayErrorCodeSchema>;

export const packetMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export type PacketMessage = z.infer<typeof packetMessageSchema>;

export const packetV0Schema = z
  .object({
    version: z.literal(1),
    system: z.string(),
    messages: z.array(packetMessageSchema),
    tokenEstimate: z.number().int().nonnegative(),
    excluded: z.array(z.string()),
  })
  .strict();

export type ProviderAgnosticPacket = z.infer<typeof packetV0Schema>;

export const receiptDtoSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  tokensIn: z.number().int().nullable(),
  tokensOut: z.number().int().nullable(),
  latencyMs: z.number().int().nullable(),
  costUsd: z.string().nullable(),
  errorCode: gatewayErrorCodeSchema.nullable(),
  createdAt: z.string().min(1),
});

export type ReceiptDto = z.infer<typeof receiptDtoSchema>;

export const chatSendInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    providerKeyId: z.string().uuid(),
    model: z.string().min(1).max(128),
  })
  .strict();

export type ChatSendInput = z.infer<typeof chatSendInputSchema>;

export const chatSendResultSchema = z
  .object({
    runId: z.string().uuid(),
    messageId: z.string().uuid(),
    packet: packetV0Schema,
  })
  .strict();

export type ChatSendResult = z.infer<typeof chatSendResultSchema>;

export const chatAbortInputSchema = z.object({ runId: z.string().uuid() }).strict();

export type ChatAbortInput = z.infer<typeof chatAbortInputSchema>;
