import { buildWorkspaceSnapshot } from "@ai-hub/memory";
import type { ConversationTaskRecord, ConversationWorkspaceRecord, HubRepos } from "@ai-hub/db";
import { redactSecrets } from "@ai-hub/security";
import type { ConversationWorkspaceDto } from "@ai-hub/shared";

export function toWorkspaceDto(
  conversationId: string,
  workspace: ConversationWorkspaceRecord | null,
  tasks: ConversationTaskRecord[],
  pinIds: string[],
): ConversationWorkspaceDto {
  return {
    conversationId,
    summary: workspace?.summary ?? "",
    decisions: workspace?.decisions ?? [],
    tasks: tasks.map((task) => ({
      id: task.id,
      conversationId: task.conversationId,
      title: task.title,
      done: task.done,
      createdAt: task.createdAt,
    })),
    pins: pinIds,
  };
}

export function refreshConversationWorkspace(
  repos: HubRepos,
  conversationId: string,
): ConversationWorkspaceDto {
  const path = repos.listActivePath(conversationId);
  const snapshot = buildWorkspaceSnapshot(
    path.map((item) => ({
      role: item.role,
      content: redactSecrets(item.content),
      pinned: item.pinned,
    })),
  );
  const stored = repos.upsertConversationWorkspace(
    conversationId,
    redactSecrets(snapshot.summary),
    snapshot.decisions.map((item) => redactSecrets(item)),
  );
  const existingTitles = new Set(repos.listConversationTasks(conversationId).map((item) => item.title.toLowerCase()));
  for (const title of snapshot.taskCandidates) {
    if (!existingTitles.has(title.toLowerCase())) {
      repos.createConversationTask(conversationId, title);
      existingTitles.add(title.toLowerCase());
    }
  }
  return getConversationWorkspaceDto(repos, conversationId, stored);
}

export function getConversationWorkspaceDto(
  repos: HubRepos,
  conversationId: string,
  workspace = repos.getConversationWorkspace(conversationId),
): ConversationWorkspaceDto {
  const pins = repos.listMessages(conversationId).filter((item) => item.pinned).map((item) => item.id);
  return toWorkspaceDto(conversationId, workspace, repos.listConversationTasks(conversationId), pins);
}
