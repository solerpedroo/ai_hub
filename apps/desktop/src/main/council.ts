import { SpendCapError, divergenceTerms, evaluatePlaygroundCaps, type CouncilRunInput, type CouncilRunResult } from "@ai-hub/shared";
import type { WebContents } from "electron";
import { sendChat, waitForChatRun } from "./chat-session";
import { getHubDatabase } from "./persistence";
import { localDayStartMs, estimateOutgoingCostUsd, spendCapLimitsFromRows } from "./spend-guard";

const ROLE_PROMPTS = {
  architect: "You are the Architect. Analyze structure, trade-offs, and a concrete recommendation.",
  reviewer: "You are the Reviewer. Find assumptions, gaps, and testable objections.",
  security: "You are the Security reviewer. Identify risks, abuse paths, and mitigations.",
  ux: "You are the UX reviewer. Identify user impact, clarity, and accessible next steps.",
} as const;

export async function runCouncil(input: CouncilRunInput, sender: WebContents): Promise<CouncilRunResult> {
  const repos = getHubDatabase().repos;
  const configured = [...input.slots, input.synthesis];
  const estimates: Array<string | null> = [];
  for (const slot of configured) {
    const key = await repos.getProviderSecret(slot.providerKeyId);
    if (!key) throw new Error("gateway:auth");
    estimates.push(estimateOutgoingCostUsd(slot.model, key.providerSlug, Math.ceil(input.content.length / 4), null));
  }
  const cap = evaluatePlaygroundCaps({ estimates, daySpentUsd: repos.sumReceiptCostUsd({ sinceMs: localDayStartMs() }), globalSpentUsd: repos.sumReceiptCostUsd({}), limits: spendCapLimitsFromRows(repos.listSpendCaps()) });
  if (cap.blocked) throw new SpendCapError(cap.blocked);

  const deliberations = await Promise.all(input.slots.map(async (slot) => {
    const conversation = repos.createConversation(input.projectId, `Council · ${slot.role} · ${slot.model}`, "playground");
    const send = await sendChat({ mode: "send", conversationId: conversation.id, providerKeyId: slot.providerKeyId, model: slot.model, content: input.content, extraSystem: ROLE_PROMPTS[slot.role], ...(input.privacyMode ? { privacyMode: input.privacyMode } : {}) }, sender);
    await waitForChatRun(send.runId);
    const answer = repos.getMessage(send.messageId)?.content ?? "";
    return { ...slot, send, answer };
  }));
  const debate = deliberations.map((item) => `## ${item.role}\n${item.answer}`).join("\n\n");
  const synthesisConversation = repos.createConversation(input.projectId, `Council synthesis · ${input.synthesis.model}`, "playground");
  const synthesis = await sendChat({ mode: "send", conversationId: synthesisConversation.id, providerKeyId: input.synthesis.providerKeyId, model: input.synthesis.model, content: `Question:\n${input.content}\n\nCouncil deliberation:\n${debate}\n\nSynthesize the disagreements, recommendation, and risks.`, ...(input.privacyMode ? { privacyMode: input.privacyMode } : {}) }, sender);
  return { slots: deliberations.map(({ role, providerKeyId, model, send }) => ({ role, providerKeyId, model, send })), synthesis: { providerKeyId: input.synthesis.providerKeyId, model: input.synthesis.model, send: synthesis }, divergences: divergenceTerms(deliberations.map((item) => item.answer)) };
}
