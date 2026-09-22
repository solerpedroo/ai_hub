import type { WebContents } from "electron";
import { DEFAULT_ESTIMATED_OUTPUT_TOKENS, SpendCapError, addUsd, findCatalogModel, usdToMicros, type AgentIdInput, type AgentNodeDto, type AgentRunDto, type OrchestrationPrepareInput, type OrchestrationRunDetail } from "@ai-hub/shared";
import type { AgentHandoffRecord, AgentRunRecord } from "@ai-hub/db";
import { redactSecrets } from "@ai-hub/security";
import { cancelAgentRun, pauseAgentRun, resumeAgentRun, startAgentRun } from "./agent-runner";
import { getHubDatabase } from "./persistence";
import { estimateOutgoingCostUsd, evaluateBatchScopedCaps } from "./spend-guard";

interface ActiveOrchestration { sender: WebContents; reservationIds: string[]; }
const activeOrchestrations = new Map<string, ActiveOrchestration>();

function summary(value: string, max = 400): string { return redactSecrets(value).replace(/\s+/g, " ").trim().slice(0, max); }
function terminal(status: AgentRunRecord["status"]): boolean { return ["cancelled", "completed", "completed_with_errors", "stopped_budget", "stopped_timeout", "interrupted", "failed"].includes(status); }
function childBudget(total: string, fraction: number): string { return (Math.floor(Number(total) * 1_000_000 * fraction) / 1_000_000).toFixed(6); }
function runDto(run: AgentRunRecord): AgentRunDto { return { id: run.id, projectId: run.projectId, conversationId: run.conversationId, parentRunId: run.parentRunId, kind: "single", status: run.status, provider: run.provider, model: run.model, goalSummary: summary(run.goal), planSummary: summary(run.plan, 1000), maxSteps: run.maxSteps, budgetUsd: run.budgetUsd, timeoutSeconds: run.timeoutSeconds, reportArtifactId: run.reportArtifactId, createdAt: run.createdAt, startedAt: run.startedAt, finishedAt: run.finishedAt }; }
function nodeDto(run: AgentRunRecord): AgentNodeDto {
  const steps = getHubDatabase().repos.listAgentSteps(run.id);
  const tokensIn = steps.reduce((total, step) => total + (step.tokensIn ?? 0), 0);
  const tokensOut = steps.reduce((total, step) => total + (step.tokensOut ?? 0), 0);
  const costUsd = (steps.reduce((total, step) => total + Number(step.costUsd ?? "0"), 0)).toFixed(6);
  return { ...runDto(run), kind: "orchestrated", role: run.role === "explorer" || run.role === "reviewer" || run.role === "writer" ? run.role : "explorer", effort: "medium", isModelOverride: false, tokensIn, tokensOut, costUsd };
}
function handoffDto(handoff: AgentHandoffRecord) { return { id: handoff.id, rootRunId: handoff.rootRunId, fromRunId: handoff.fromRunId, toRunId: handoff.toRunId, ordinal: handoff.ordinal, joinKind: handoff.joinKind, status: handoff.status, systemMessageSummary: summary(handoff.systemMessage), packetSubsetSummary: summary(handoff.summary), tokenEstimate: handoff.tokenEstimate, createdAt: handoff.createdAt, finishedAt: handoff.finishedAt }; }
function detail(root: AgentRunRecord): OrchestrationRunDetail {
  const repos = getHubDatabase().repos;
  const nodes = repos.listAgentRuns(root.conversationId).filter((run) => run.parentRunId === root.id);
  return { ...runDto(root), kind: "orchestrated", role: "supervisor", graphVersion: 1, budgetMode: "shared", nodes: nodes.map(nodeDto), handoffs: repos.listAgentHandoffs(root.id).map(handoffDto) };
}
function requireRoot(input: AgentIdInput): AgentRunRecord {
  const root = getHubDatabase().repos.getAgentRun(input.id);
  if (!root || root.kind !== "orchestrated" || root.role !== "supervisor" || root.projectId !== input.projectId || root.conversationId !== input.conversationId) throw new Error("orchestration:not_found");
  return root;
}
function childIdentity(run: AgentRunRecord): AgentIdInput { return { id: run.id, projectId: run.projectId, conversationId: run.conversationId }; }
function childSteps(role: "explorer" | "reviewer" | "writer", paths: string[]) {
  if (role === "writer") return [{ kind: "plan" as const, title: "Confirm handoff-only writer scope" }, { kind: "report" as const, title: "Synthesize specialist handoffs" }, { kind: "artifact" as const, title: "Save orchestration report" }];
  return [{ kind: "plan" as const, title: `Confirm ${role} scope` }, ...paths.map((path) => ({ kind: "tool" as const, title: `Read ${path}`, toolId: "project-filesystem.read-file" })), { kind: "report" as const, title: `Produce ${role} handoff` }, { kind: "artifact" as const, title: `Save ${role} artifact` }];
}

export async function prepareOrchestration(input: OrchestrationPrepareInput, _sender: WebContents): Promise<OrchestrationRunDetail> {
  const repos = getHubDatabase().repos;
  const project = repos.getProject(input.projectId);
  const conversation = repos.getConversation(input.conversationId);
  if (!project || !conversation || conversation.projectId !== input.projectId) throw new Error("orchestration:project_mismatch");
  if (!repos.getProjectToolRoot(input.projectId)) throw new Error("tools:root_not_configured");
  const key = await repos.getProviderSecret(input.providerKeyId);
  if (!key || !findCatalogModel(input.model, key.providerSlug)) throw new Error("unknown_model");
  const root = repos.createAgentRun({ projectId: input.projectId, conversationId: input.conversationId, provider: key.providerSlug, providerKeyId: input.providerKeyId, model: input.model, goal: input.goal, plan: "Supervisor dispatches Explorer and Reviewer in a bounded parallel join, then Writer saves the shared report.", maxSteps: 3, budgetUsd: input.budgetUsd, timeoutSeconds: input.timeoutSeconds, kind: "orchestrated", role: "supervisor", graphVersion: 1, budgetMode: "shared", steps: [{ kind: "plan", title: "Confirm orchestration graph" }, { kind: "report", title: "Join specialist handoffs" }, { kind: "artifact", title: "Record orchestration outcome" }] });
  const makeChild = (role: "explorer" | "reviewer" | "writer", plan: string, fraction: number) => repos.createAgentRun({ projectId: input.projectId, conversationId: input.conversationId, parentRunId: root.id, provider: key.providerSlug, providerKeyId: input.providerKeyId, model: input.model, goal: input.goal, plan, maxSteps: role === "writer" ? 3 : input.maxSteps, budgetUsd: childBudget(input.budgetUsd, fraction), timeoutSeconds: input.timeoutSeconds, kind: "orchestrated", role, graphVersion: 1, budgetMode: "shared", steps: childSteps(role, input.relativePaths) });
  const explorer = makeChild("explorer", "Map the explicitly selected project files.", 0.4);
  const reviewer = makeChild("reviewer", "Identify risks in the explicitly selected project files.", 0.4);
  const writer = makeChild("writer", "Synthesize only the specialist handoffs into a Markdown artifact.", 0.2);
  repos.createAgentHandoff({ rootRunId: root.id, fromRunId: explorer.id, toRunId: writer.id, ordinal: 1, joinKind: "parallel", systemMessage: "Explorer handoff for Writer.", packetSubset: "Awaiting Explorer output.", tokenEstimate: 0, summary: "Explorer → Writer: selected-file map." });
  repos.createAgentHandoff({ rootRunId: root.id, fromRunId: reviewer.id, toRunId: writer.id, ordinal: 2, joinKind: "parallel", systemMessage: "Reviewer handoff for Writer.", packetSubset: "Awaiting Reviewer output.", tokenEstimate: 0, summary: "Reviewer → Writer: risks from selected files." });
  return detail(root);
}

export function getOrchestration(input: AgentIdInput): OrchestrationRunDetail { return detail(requireRoot(input)); }
export function listOrchestrations(conversationId: string): OrchestrationRunDetail[] {
  return getHubDatabase().repos.listAgentRuns(conversationId).filter((run) => run.kind === "orchestrated" && run.role === "supervisor").map(detail);
}
export function startOrchestration(input: AgentIdInput, sender: WebContents): OrchestrationRunDetail {
  const root = requireRoot(input);
  if (root.status !== "awaiting_confirmation" && root.status !== "paused") throw new Error("orchestration:not_startable");
  if (activeOrchestrations.has(root.id)) throw new Error("orchestration:already_running");
  const repos = getHubDatabase().repos;
  const estimates = ["explorer", "reviewer", "writer"].map(() => estimateOutgoingCostUsd(root.model, root.provider, Math.ceil(root.goal.length / 4), DEFAULT_ESTIMATED_OUTPUT_TOKENS));
  if (estimates.some((value) => value === null)) {
    for (const step of repos.listAgentSteps(root.id).filter((step) => step.status === "pending")) repos.updateAgentStep(step.id, { status: "skipped", summary: "Preflight estimate exceeds the shared graph budget.", finishedAt: Date.now() });
    return detail(repos.updateAgentRun(root.id, { status: "stopped_budget", finishedAt: Date.now() }));
  }
  const knownEstimates = estimates as string[];
  const total = knownEstimates.reduce((sum, value) => addUsd(sum, value), "0.000000");
  if (usdToMicros(total) > usdToMicros(root.budgetUsd)) {
    for (const step of repos.listAgentSteps(root.id).filter((step) => step.status === "pending")) repos.updateAgentStep(step.id, { status: "skipped", summary: "Preflight estimate exceeds the shared graph budget.", finishedAt: Date.now() });
    return detail(repos.updateAgentRun(root.id, { status: "stopped_budget", finishedAt: Date.now() }));
  }
  // Reserve the full graph allocation, not just today's prompt estimate: selected
  // files and handoffs enlarge packets after dispatch, while child sends skip caps.
  const allocations = [childBudget(root.budgetUsd, 0.4), childBudget(root.budgetUsd, 0.4), childBudget(root.budgetUsd, 0.2)];
  const batch = evaluateBatchScopedCaps({ estimates: allocations.map((usd) => ({ usd, projectId: root.projectId, providerSlug: root.provider })), repos });
  if (batch.blocked) throw new SpendCapError(batch.blocked);
  const reservationIds = allocations.map((usd) => repos.reserveSpend({ projectId: root.projectId, providerSlug: root.provider, amountUsd: usd, expiresAt: Date.now() + 15 * 60_000 }));
  const updated = repos.updateAgentRun(root.id, root.startedAt ? { status: "running", finishedAt: null } : { status: "running", startedAt: Date.now(), finishedAt: null });
  const active = { sender, reservationIds }; activeOrchestrations.set(root.id, active); void execute(updated.id, active); return detail(updated);
}
export function pauseOrchestration(input: AgentIdInput): OrchestrationRunDetail {
  const root = requireRoot(input); if (root.status !== "running") throw new Error("orchestration:not_pausable");
  const repos = getHubDatabase().repos;
  for (const child of repos.listAgentRuns(root.conversationId).filter((run) => run.parentRunId === root.id && run.status === "running")) pauseAgentRun(childIdentity(child), { orchestrationRootId: root.id });
  return detail(repos.updateAgentRun(root.id, { status: "paused" }));
}
export function resumeOrchestration(input: AgentIdInput, sender: WebContents): OrchestrationRunDetail { return startOrchestration(input, sender); }
export function cancelOrchestration(input: AgentIdInput): OrchestrationRunDetail {
  const root = requireRoot(input); const repos = getHubDatabase().repos; const now = Date.now();
  for (const child of repos.listAgentRuns(root.conversationId).filter((run) => run.parentRunId === root.id && !terminal(run.status))) cancelAgentRun(childIdentity(child), { orchestrationRootId: root.id });
  for (const handoff of repos.listAgentHandoffs(root.id).filter((handoff) => handoff.status === "pending" || handoff.status === "ready")) repos.updateAgentHandoff(handoff.id, { status: "cancelled", finishedAt: now });
  for (const step of repos.listAgentSteps(root.id).filter((step) => step.status === "pending" || step.status === "running")) repos.updateAgentStep(step.id, { status: "cancelled", finishedAt: now });
  return detail(repos.updateAgentRun(root.id, { status: "cancelled", finishedAt: now }));
}
async function waitForChildren(rootId: string, ids: string[]): Promise<boolean> {
  const repos = getHubDatabase().repos;
  while (true) { const root = repos.getAgentRun(rootId); if (!root || root.status !== "running") return false; const children = ids.map((id) => repos.getAgentRun(id)).filter((run): run is AgentRunRecord => run !== null); if (children.every((child) => terminal(child.status))) return true; await new Promise((resolve) => setTimeout(resolve, 40)); }
}
async function execute(rootId: string, active: ActiveOrchestration): Promise<void> {
  const repos = getHubDatabase().repos;
  try {
    const root = repos.getAgentRun(rootId); if (!root || root.status !== "running") return;
    const plan = repos.listAgentSteps(root.id).find((step) => step.kind === "plan"); if (plan?.status === "pending") repos.updateAgentStep(plan.id, { status: "completed", summary: "Supervisor confirmed a two-specialist bounded parallel graph.", startedAt: Date.now(), finishedAt: Date.now() });
    const children = repos.listAgentRuns(root.conversationId).filter((run) => run.parentRunId === root.id); const specialists = children.filter((run) => run.role === "explorer" || run.role === "reviewer");
    for (const child of specialists) { if (child.status === "awaiting_confirmation") startAgentRun(childIdentity(child), active.sender, { orchestrationRootId: root.id, skipCaps: true }); else if (child.status === "paused") resumeAgentRun(childIdentity(child), active.sender, { orchestrationRootId: root.id, skipCaps: true }); }
    if (!(await waitForChildren(root.id, specialists.map((child) => child.id)))) return;
    for (const handoff of repos.listAgentHandoffs(root.id)) { const source = repos.getAgentRun(handoff.fromRunId); if (!source || handoff.status !== "pending") continue; const report = repos.listAgentSteps(source.id).find((step) => step.kind === "report")?.detail; const safeReport = report ? redactSecrets(report).slice(0, 32_000) : `Specialist ended with ${source.status}; no report was available.`; repos.updateAgentHandoff(handoff.id, { status: "ready", packetSubset: safeReport, tokenEstimate: Math.ceil(safeReport.length / 4), summary: `${source.role}: ${summary(safeReport)}`, finishedAt: Date.now() }); }
    const join = repos.listAgentSteps(root.id).find((step) => step.kind === "report"); if (join?.status === "pending") repos.updateAgentStep(join.id, { status: "completed", summary: "Specialist handoffs are ready for Writer.", startedAt: Date.now(), finishedAt: Date.now() });
    const writer = repos.listAgentRuns(root.conversationId).find((run) => run.parentRunId === root.id && run.role === "writer"); if (!writer) throw new Error("orchestration:writer_missing"); if (writer.status === "awaiting_confirmation") startAgentRun(childIdentity(writer), active.sender, { orchestrationRootId: root.id, skipCaps: true }); else if (writer.status === "paused") resumeAgentRun(childIdentity(writer), active.sender, { orchestrationRootId: root.id, skipCaps: true });
    if (!(await waitForChildren(root.id, [writer.id]))) return;
    const completedWriter = repos.getAgentRun(writer.id); const finalRoot = repos.getAgentRun(root.id); if (!completedWriter || !finalRoot || finalRoot.status !== "running") return;
    const artifactStep = repos.listAgentSteps(root.id).find((step) => step.kind === "artifact"); if (artifactStep?.status === "pending") repos.updateAgentStep(artifactStep.id, { status: "completed", summary: "Writer outcome recorded in the graph.", startedAt: Date.now(), finishedAt: Date.now() });
    for (const handoff of repos.listAgentHandoffs(root.id).filter((handoff) => handoff.status === "ready")) repos.updateAgentHandoff(handoff.id, { status: "consumed", finishedAt: Date.now() });
    const specialistErrors = specialists.some((child) => repos.getAgentRun(child.id)?.status !== "completed"); repos.updateAgentRun(root.id, { status: completedWriter.status === "completed" && !specialistErrors ? "completed" : "completed_with_errors", reportArtifactId: completedWriter.reportArtifactId, finishedAt: Date.now() });
  } catch { const root = repos.getAgentRun(rootId); if (root?.status === "running") repos.updateAgentRun(root.id, { status: "failed", finishedAt: Date.now() }); } finally { for (const reservationId of active.reservationIds) repos.releaseSpendReservation(reservationId); activeOrchestrations.delete(rootId); }
}
