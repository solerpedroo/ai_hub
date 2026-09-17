import type { MessageRecord } from "@ai-hub/db";
import {
  gatewayErrorCodeSchema,
  messageDtoSchema,
  receiptDtoSchema,
  type MessageDto,
} from "@ai-hub/shared";

export function toMessageDto(row: MessageRecord): MessageDto {
  const receipt = row.receipt
    ? receiptDtoSchema.parse({
        id: row.receipt.id,
        messageId: row.receipt.messageId,
        provider: row.receipt.provider,
        model: row.receipt.model,
        tokensIn: row.receipt.tokensIn,
        tokensOut: row.receipt.tokensOut,
        latencyMs: row.receipt.latencyMs,
        costUsd: row.receipt.costUsd,
        errorCode: row.receipt.errorCode ? gatewayErrorCodeSchema.parse(row.receipt.errorCode) : null,
        createdAt: row.receipt.createdAt,
      })
    : null;
  return messageDtoSchema.parse({
    id: row.id,
    conversationId: row.conversationId,
    parentId: row.parentId,
    branchId: row.branchId,
    role: row.role,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    receipt,
  });
}
