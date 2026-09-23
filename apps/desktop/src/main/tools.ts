import { basename } from "node:path";
import { BrowserWindow, dialog, type OpenDialogOptions, type WebContents } from "electron";
import { ToolRouter, type ToolActivity, type ToolExecutionResult, type ToolPermissionRequest } from "@ai-hub/tools";
import {
  TOOL_ID_PROJECT_FILESYSTEM_READ,
  TOOL_ID_DEVELOPER_EXPLORER,
  TOOL_ID_DEVELOPER_GIT,
  TOOL_ID_DEVELOPER_TERMINAL,
  type ToolProjectRootPickResult,
  type ToolProjectState,
  type ToolReadRequestInput,
  type ToolReadRequestResult,
} from "@ai-hub/shared";
import { getHubDatabase } from "./persistence";

const router = new ToolRouter({
  getProjectToolRoot: (projectId) => getHubDatabase().repos.getProjectToolRoot(projectId),
  hasProjectToolPermission: (projectId, toolId, operation) =>
    getHubDatabase().repos.hasProjectToolPermission(projectId, toolId, operation),
  grantProjectToolPermission: (projectId, toolId, operation) => {
    getHubDatabase().repos.grantProjectToolPermission(projectId, toolId, operation);
  },
});
let latestActivity: ToolActivity | null = null;
let permissionDialogQueue: Promise<void> = Promise.resolve();

function serializePermissionDialog<T>(task: () => Promise<T>): Promise<T> {
  const next = permissionDialogQueue.then(task, task);
  permissionDialogQueue = next.then(() => undefined, () => undefined);
  return next;
}

function projectState(projectId: string): ToolProjectState {
  const root = getHubDatabase().repos.getProjectToolRoot(projectId);
  return {
    projectId,
    rootLabel: root ? basename(root.rootPath) : null,
    allowedTools: [TOOL_ID_PROJECT_FILESYSTEM_READ, TOOL_ID_DEVELOPER_EXPLORER, TOOL_ID_DEVELOPER_GIT]
      .filter((toolId) => getHubDatabase().repos.hasProjectToolPermission(projectId, toolId, "read")),
  };
}

function isPermission(value: ToolExecutionResult | ToolPermissionRequest): value is ToolPermissionRequest {
  return "requiresDestructiveConfirmation" in value;
}

function isActivity(value: ToolExecutionResult | ToolActivity): value is ToolActivity {
  return "status" in value && !("output" in value);
}

function completed(result: ToolExecutionResult): { kind: "completed"; activity: ToolActivity; content: string } {
  return { kind: "completed", activity: result.activity, content: result.output };
}

export function getToolProjectState(projectId: string): ToolProjectState {
  return projectState(projectId);
}

export async function pickProjectToolRoot(projectId: string, sender: Electron.WebContents): Promise<ToolProjectRootPickResult> {
  if (!getHubDatabase().repos.getProject(projectId)) throw new Error("Project not found");
  const parent = BrowserWindow.fromWebContents(sender);
  const options: OpenDialogOptions = { properties: ["openDirectory", "createDirectory"] };
  const choice = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options);
  if (choice.canceled || !choice.filePaths[0]) return { status: "cancelled" };
  getHubDatabase().repos.setProjectToolRoot(projectId, choice.filePaths[0]);
  return { status: "selected", ...projectState(projectId) };
}

function record(result: ToolExecutionResult | ToolActivity): void {
  latestActivity = isActivity(result) ? result : result.activity;
}

export function getLatestToolActivity(): ToolActivity | null { return latestActivity; }

export function settleDeveloperActivity(status: "completed" | "failed", resultSummary: string): void {
  if (latestActivity && latestActivity.toolId.startsWith("developer.")) latestActivity = { ...latestActivity, status, resultSummary: resultSummary.slice(0, 260) };
}

/**
 * One-shot consent for fixed, main-process developer diagnostics. These actions
 * deliberately do not receive an "always allow" option: their scope is narrow
 * and each invocation remains visible to the user.
 */
export async function requestDeveloperPermission(projectId: string, sender: WebContents, toolId: typeof TOOL_ID_DEVELOPER_EXPLORER | typeof TOOL_ID_DEVELOPER_GIT | typeof TOOL_ID_DEVELOPER_TERMINAL | "developer.git.review", operation: "read" | "execute", detail: string): Promise<void> {
  if (!getHubDatabase().repos.getProject(projectId)) throw new Error("tools:project_not_found");
  if (operation === "read" && getHubDatabase().repos.hasProjectToolPermission(projectId, toolId, operation)) {
    latestActivity = { id: crypto.randomUUID(), projectId, toolId, operation, effect: "read", status: "completed", argsSummary: detail.slice(0, 200), resultSummary: "Project permission", createdAt: new Date().toISOString() };
    return;
  }
  const parent = BrowserWindow.fromWebContents(sender);
  const portuguese = getHubDatabase().repos.getAppearance().locale === "pt-BR";
  const options = {
    type: "question" as const,
    buttons: operation === "read" ? (portuguese ? ["Permitir uma vez", "Sempre neste projeto", "Negar"] : ["Allow once", "Always in this project", "Deny"]) : (portuguese ? ["Permitir uma vez", "Negar"] : ["Allow once", "Deny"]),
    defaultId: 0,
    cancelId: operation === "read" ? 2 : 1,
    message: portuguese ? "Permissão do modo desenvolvedor" : "Developer Mode permission",
    detail,
    noLink: true,
  };
  const answer = await serializePermissionDialog(() => parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options));
  if (answer.response !== 0 && !(operation === "read" && answer.response === 1)) {
    latestActivity = { id: crypto.randomUUID(), projectId, toolId, operation, effect: operation === "read" ? "read" : "unknown", status: "denied", argsSummary: detail.slice(0, 200), resultSummary: null, createdAt: new Date().toISOString() };
    throw new Error("tools:permission_denied");
  }
  if (operation === "read" && answer.response === 1) getHubDatabase().repos.grantProjectToolPermission(projectId, toolId, operation);
  latestActivity = { id: crypto.randomUUID(), projectId, toolId, operation, effect: operation === "read" ? "read" : "unknown", status: "running", argsSummary: detail.slice(0, 200), resultSummary: null, createdAt: new Date().toISOString() };
}

export async function requestToolRead(input: ToolReadRequestInput, sender: WebContents): Promise<ToolReadRequestResult> {
  const result = await router.request({ projectId: input.projectId, toolId: TOOL_ID_PROJECT_FILESYSTEM_READ, relativePath: input.relativePath }, sender.id);
  if (!isPermission(result)) { record(result); return completed(result); }
  const parent = BrowserWindow.fromWebContents(sender);
  const portuguese = getHubDatabase().repos.getAppearance().locale === "pt-BR";
  const options = {
    type: "question" as const,
    buttons: portuguese ? ["Permitir uma vez", "Sempre neste projeto", "Negar"] : ["Allow once", "Always in this project", "Deny"],
    defaultId: 0,
    cancelId: 2,
    message: portuguese ? "Permissão necessária" : "Permission required",
    detail: portuguese ? `${result.toolId} solicita acesso de leitura a ${result.argsSummary}.` : `${result.toolId} requests read access to ${result.argsSummary}.`,
    noLink: true,
  };
  const answer = await serializePermissionDialog(() => parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options));
  const decision = answer.response === 0 ? "allow_once" : answer.response === 1 ? "allow_project" : "deny";
  const settled = await router.decide(result.id, decision, sender.id);
  record(settled);
  return isActivity(settled) ? { kind: "denied", activity: settled } : completed(settled);
}
