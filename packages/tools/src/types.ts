export const PROJECT_FILESYSTEM_TOOL_ID = "project-filesystem.read-file" as const;
export const PROJECT_FILESYSTEM_OPERATION = "read" as const;

export type ToolEffect = "read" | "write" | "destructive" | "unknown";
export type PermissionDecision = "allow_once" | "allow_project" | "deny";
export type ToolActivityStatus = "permission_required" | "denied" | "running" | "completed" | "failed";

export interface ToolActivity {
  id: string;
  projectId: string;
  toolId: typeof PROJECT_FILESYSTEM_TOOL_ID;
  operation: typeof PROJECT_FILESYSTEM_OPERATION;
  effect: ToolEffect;
  status: ToolActivityStatus;
  argsSummary: string;
  resultSummary: string | null;
  createdAt: string;
}

export interface ToolPermissionRequest {
  id: string;
  projectId: string;
  toolId: typeof PROJECT_FILESYSTEM_TOOL_ID;
  operation: typeof PROJECT_FILESYSTEM_OPERATION;
  effect: ToolEffect;
  argsSummary: string;
  requiresDestructiveConfirmation: boolean;
  createdAt: string;
}

export interface ToolExecutionRequest {
  projectId: string;
  toolId: typeof PROJECT_FILESYSTEM_TOOL_ID;
  relativePath: string;
}

export interface ToolExecutionResult {
  activity: ToolActivity;
  output: string;
}

export interface ProjectToolStore {
  getProjectToolRoot(projectId: string): { rootPath: string } | null;
  hasProjectToolPermission(projectId: string, toolId: string, operation: string): boolean;
  grantProjectToolPermission(projectId: string, toolId: string, operation: string): void;
}
