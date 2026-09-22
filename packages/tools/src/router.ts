import { randomUUID } from "node:crypto";
import { redactSecrets } from "@ai-hub/security";
import { ProjectFilesystemMcpClient } from "./mcp";
import { PROJECT_FILESYSTEM_OPERATION, PROJECT_FILESYSTEM_TOOL_ID, type PermissionDecision, type ProjectToolStore, type ToolActivity, type ToolExecutionRequest, type ToolExecutionResult, type ToolPermissionRequest } from "./types";

const REQUEST_TTL_MS = 5 * 60_000;
const MAX_OUTPUT_CHARS = 16_000;

interface PendingRequest { request: ToolExecutionRequest; permission: ToolPermissionRequest; requesterId: number; expiresAt: number; }

export class ToolRouter {
  private readonly pending = new Map<string, PendingRequest>();
  constructor(private readonly store: ProjectToolStore) {}

  async request(request: ToolExecutionRequest, requesterId: number): Promise<ToolExecutionResult | ToolPermissionRequest> {
    this.prune();
    if (this.store.hasProjectToolPermission(request.projectId, request.toolId, PROJECT_FILESYSTEM_OPERATION)) return this.execute(request);
    const permission: ToolPermissionRequest = {
      id: randomUUID(), projectId: request.projectId, toolId: request.toolId, operation: PROJECT_FILESYSTEM_OPERATION,
      effect: "read", argsSummary: `path: ${redactSecrets(request.relativePath).slice(0, 180)}`,
      requiresDestructiveConfirmation: false, createdAt: new Date().toISOString(),
    };
    this.pending.set(permission.id, { request, permission, requesterId, expiresAt: Date.now() + REQUEST_TTL_MS });
    return permission;
  }

  async decide(id: string, decision: PermissionDecision, requesterId: number, destructiveConfirmed = false): Promise<ToolExecutionResult | ToolActivity> {
    this.prune();
    const pending = this.pending.get(id);
    if (!pending || pending.requesterId !== requesterId) throw new Error("tools:permission_not_found");
    this.pending.delete(id);
    if (pending.permission.requiresDestructiveConfirmation && !destructiveConfirmed) throw new Error("tools:destructive_confirmation_required");
    if (decision === "deny") return this.activity(pending.permission, "denied", null);
    if (decision === "allow_project" && pending.permission.effect !== "read") throw new Error("tools:persistent_permission_forbidden");
    if (decision === "allow_project") this.store.grantProjectToolPermission(pending.request.projectId, pending.request.toolId, PROJECT_FILESYSTEM_OPERATION);
    return this.execute(pending.request);
  }

  private async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    if (request.toolId !== PROJECT_FILESYSTEM_TOOL_ID) throw new Error("tools:not_allowed");
    const root = this.store.getProjectToolRoot(request.projectId);
    if (!root) throw new Error("tools:root_not_configured");
    const activity = this.activity({ projectId: request.projectId, toolId: request.toolId, operation: PROJECT_FILESYSTEM_OPERATION, effect: "read", argsSummary: `path: ${redactSecrets(request.relativePath).slice(0, 180)}`, id: randomUUID(), createdAt: new Date().toISOString() }, "running", null);
    try {
      const raw = await new ProjectFilesystemMcpClient(root.rootPath).request({ method: "tools/call", params: { name: "read_file", arguments: { path: request.relativePath } } });
      if (!raw || typeof raw !== "object" || typeof (raw as { content?: unknown }).content !== "string" || typeof (raw as { fileName?: unknown }).fileName !== "string" || typeof (raw as { truncated?: unknown }).truncated !== "boolean") throw new Error("tools:mcp_invalid_response");
      const file = raw as { content: string; fileName: string; truncated: boolean };
      const output = redactSecrets(file.content).slice(0, MAX_OUTPUT_CHARS);
      return { activity: { ...activity, status: "completed", resultSummary: `${file.fileName}${file.truncated ? " (truncated)" : ""}` }, output };
    } catch (error) {
      const code = error instanceof Error ? error.message : "tools:failed";
      throw new Error(code);
    }
  }

  private activity(request: Pick<ToolPermissionRequest, "id" | "projectId" | "toolId" | "operation" | "effect" | "argsSummary" | "createdAt">, status: ToolActivity["status"], resultSummary: string | null): ToolActivity {
    return { id: request.id, projectId: request.projectId, toolId: request.toolId, operation: request.operation, effect: request.effect, status, argsSummary: request.argsSummary, resultSummary, createdAt: request.createdAt };
  }
  private prune(): void { const now = Date.now(); for (const [id, pending] of this.pending) if (pending.expiresAt <= now) this.pending.delete(id); }
}
