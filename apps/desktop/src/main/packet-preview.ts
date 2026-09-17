import { compileActivePath } from "@ai-hub/ai-gateway";
import {
  findCatalogModel,
  packetPreviewResultSchema,
  type PacketPreviewInput,
  type PacketPreviewResult,
} from "@ai-hub/shared";
import { getHubDatabase } from "./persistence";

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
  const compiled = {
    projectInstructions: project?.instructions ?? null,
    extraSystem,
    messages: repos.listActivePath(input.conversationId).map((item) => ({
      id: item.id,
      parentId: item.parentId,
      isActiveBranch: item.isActiveBranch,
      createdAt: item.createdAt,
      role: item.role,
      content: item.content,
      status: item.status,
    })),
  };
  const packet = compileActivePath(
    input.compact === true ? { ...compiled, maxTokenBudget: contextWindow } : compiled,
  );
  return packetPreviewResultSchema.parse({
    tokenEstimate: packet.tokenEstimate,
    contextWindow,
    overflow: packet.tokenEstimate > contextWindow,
    compacted: input.compact === true && packet.excluded.length > 0,
    excludedCount: packet.excluded.length,
  });
}
