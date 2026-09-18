import { compileActivePath } from "@ai-hub/ai-gateway";
import { randomUUID } from "node:crypto";
import {
  findCatalogModel,
  packetPreviewResultSchema,
  type PacketPreviewInput,
  type PacketPreviewResult,
} from "@ai-hub/shared";
import { getHubDatabase } from "./persistence";
import { estimateOutgoingCostUsd, evaluateOutgoingCaps, localDayStartMs, spendCapLimitsFromRows } from "./spend-guard";

export function previewPacket(input: PacketPreviewInput): PacketPreviewResult {
  const repos = getHubDatabase().repos;
  const conversation = repos.getConversation(input.conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  const project = conversation.projectId ? repos.getProject(conversation.projectId) : null;
  const extraSystem =
    input.extraSystem !== undefined && input.extraSystem.trim().length > 0 ? input.extraSystem.trim() : null;
  const catalog = findCatalogModel(input.model, input.providerSlug);
  const contextWindow = catalog?.contextWindow ?? 128_000;
  const path = repos.listActivePath(input.conversationId);
  const pending =
    input.pendingContent !== undefined && input.pendingContent.trim().length > 0
      ? input.pendingContent.trim()
      : null;
  const leaf = path.at(-1);
  const messages = [
    ...path.map((item) => ({
      id: item.id,
      parentId: item.parentId,
      isActiveBranch: item.isActiveBranch,
      createdAt: item.createdAt,
      role: item.role,
      content: item.content,
      status: item.status,
    })),
    ...(pending
      ? [
          {
            id: randomUUID(),
            parentId: leaf?.id ?? null,
            isActiveBranch: true,
            createdAt: new Date().toISOString(),
            role: "user" as const,
            content: pending,
            status: "complete" as const,
          },
        ]
      : []),
  ];
  const compiled = {
    projectInstructions: project?.instructions ?? null,
    extraSystem,
    messages,
  };
  const packet = compileActivePath(
    input.compact === true ? { ...compiled, maxTokenBudget: contextWindow } : compiled,
  );
  const estimatedCostUsd = estimateOutgoingCostUsd(
    input.model,
    input.providerSlug,
    packet.tokenEstimate,
    input.maxTokens ?? null,
  );
  const cap = evaluateOutgoingCaps({
    estimatedRequestUsd: estimatedCostUsd,
    daySpentUsd: repos.sumReceiptCostUsd({ sinceMs: localDayStartMs() }),
    globalSpentUsd: repos.sumReceiptCostUsd({}),
    limits: spendCapLimitsFromRows(repos.listSpendCaps()),
  });
  return packetPreviewResultSchema.parse({
    tokenEstimate: packet.tokenEstimate,
    contextWindow,
    overflow: packet.tokenEstimate > contextWindow,
    compacted: input.compact === true && packet.excluded.length > 0,
    excludedCount: packet.excluded.length,
    estimatedCostUsd,
    capWarnings: cap.warnings,
    capBlocked: cap.blocked,
  });
}
