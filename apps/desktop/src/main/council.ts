import { DEFAULT_ESTIMATED_OUTPUT_TOKENS, SpendCapError, divergenceTerms, effectivePrivacyMode, packetV0Schema, portablePacketFromCompile, type CouncilRunInput, type CouncilRunResult } from "@ai-hub/shared";
import type { WebContents } from "electron";
import { compileActivePathDetailed } from "@ai-hub/ai-gateway";
import { applyContextFirewall } from "@ai-hub/security";
import { sendChat, waitForChatRun } from "./chat-session";
import { getHubDatabase } from "./persistence";
import { estimateOutgoingCostUsd, evaluateBatchScopedCaps } from "./spend-guard";

function prepareCouncilPacket(input: CouncilRunInput) {
  const repos = getHubDatabase().repos;
  const conversation = repos.getConversation(input.conversationId);
  if (!conversation) throw new Error("council:conversation");
  const prefs = repos.getAppPrefs();
  const privacyMode = effectivePrivacyMode(prefs.privacyMode);
  const safe = (text: string): string => {
    const result = applyContextFirewall(text, prefs.firewallPolicy);
    if (result.blocked.length > 0) throw new Error(`firewall:blocked:${result.blocked.join(",")}`);
    return result.maskedText;
  };
  const project = conversation.projectId ? repos.getProject(conversation.projectId) : null;
  const rows = repos.listMessages(input.conversationId).map((item) => ({ id: item.id, parentId: item.parentId, isActiveBranch: item.isActiveBranch, createdAt: item.createdAt, role: item.role, content: item.content, status: item.status, branchId: item.branchId, ...(item.pinned ? { pinned: true } : {}) }));
  const leaf = rows.filter((item) => item.isActiveBranch).at(-1);
  rows.push({ id: "council-pending", parentId: leaf?.id ?? null, isActiveBranch: true, createdAt: new Date().toISOString(), role: "user", content: safe(input.content), status: "complete", branchId: leaf?.branchId ?? "council" });
  const detailed = compileActivePathDetailed({ projectInstructions: project?.instructions ?? null, extraSystem: null, privacyMode, messages: rows });
  const packet = packetV0Schema.parse({ ...detailed.packet, system: safe(detailed.packet.system), messages: detailed.packet.messages.map((message) => ({ ...message, content: safe(message.content) })), tokenEstimate: Math.ceil((safe(detailed.packet.system).length + detailed.packet.messages.reduce((sum, message) => sum + safe(message.content).length, 0)) / 4) });
  return { packet, privacyMode };
}

export async function runCouncil(input: CouncilRunInput, sender: WebContents): Promise<CouncilRunResult> {
  const repos = getHubDatabase().repos;
  const conversation = repos.getConversation(input.conversationId);
  if (!conversation || conversation.projectId !== input.projectId) throw new Error("council:conversation");
  const prepared = prepareCouncilPacket(input);
  const estimates: Array<{ usd: string | null; projectId: string | null; providerSlug: string }> = [];
  // Reserve every branch plus the synthesis before the first provider call. The
  // synthesis receives all branch output, hence its input reservation is N outputs.
  const synthesisInputTokens = prepared.packet.tokenEstimate + input.slots.length * DEFAULT_ESTIMATED_OUTPUT_TOKENS;
  for (const slot of input.slots) {
    const key = await repos.getProviderSecret(slot.providerKeyId);
    if (!key) throw new Error("gateway:auth");
    estimates.push({ usd: estimateOutgoingCostUsd(slot.model, key.providerSlug, prepared.packet.tokenEstimate, DEFAULT_ESTIMATED_OUTPUT_TOKENS), projectId: conversation.projectId, providerSlug: key.providerSlug });
  }
  const synthesisKey = await repos.getProviderSecret(input.synthesis.providerKeyId);
  if (!synthesisKey) throw new Error("gateway:auth");
  estimates.push({ usd: estimateOutgoingCostUsd(input.synthesis.model, synthesisKey.providerSlug, synthesisInputTokens, DEFAULT_ESTIMATED_OUTPUT_TOKENS), projectId: conversation.projectId, providerSlug: synthesisKey.providerSlug });
  const cap = evaluateBatchScopedCaps({ estimates, repos });
  if (cap.blocked) throw new SpendCapError(cap.blocked);
  // Persist the whole batch before dispatch so a concurrent chat sees this budget.
  const reservationIds = estimates.flatMap((estimate) => estimate.usd === null ? [] : [repos.reserveSpend({ projectId: estimate.projectId, providerSlug: estimate.providerSlug, amountUsd: estimate.usd, expiresAt: Date.now() + 15 * 60_000 })]);
  const first = input.slots[0];
  if (!first) throw new Error("council:slots");
  // Freeze the compiler result before any provider request. Role instructions are a
  // dispatch layer; the context packet itself is identical for every council slot.
  const storedPacket = repos.createContextPacket({
    projectId: conversation.projectId,
    privacyMode: prepared.privacyMode,
    origin: { source: "compile", projectLabel: (repos.getProject(conversation.projectId ?? "")?.name ?? "").slice(0, 200), conversationLabel: conversation.title.slice(0, 200) },
    tokenEstimate: prepared.packet.tokenEstimate,
    payloadJson: JSON.stringify(portablePacketFromCompile({ privacyMode: prepared.privacyMode, origin: { source: "compile", projectLabel: (repos.getProject(conversation.projectId ?? "")?.name ?? "").slice(0, 200), conversationLabel: conversation.title.slice(0, 200) }, included: [], omitted: [], payload: prepared.packet })),
  });
  repos.applyContextPacket(input.conversationId, storedPacket.id);
  const primary = await sendChat({ mode: "send", conversationId: input.conversationId, providerKeyId: first.providerKeyId, model: first.model, content: input.content, __preparedPacket: prepared.packet, __councilRole: first.role, __skipCaps: true, ...(input.privacyMode ? { privacyMode: input.privacyMode } : {}) }, sender);
  await waitForChatRun(primary.runId);
  const slots: CouncilRunResult["slots"] = [{ role: first.role, providerKeyId: first.providerKeyId, model: first.model, send: primary }];
  const answers = [repos.getMessage(primary.messageId)?.content ?? ""];
  for (const slot of input.slots.slice(1)) {
    const branch = await sendChat({ mode: "regenerate", conversationId: input.conversationId, providerKeyId: slot.providerKeyId, model: slot.model, messageId: primary.messageId, __preparedPacket: prepared.packet, __councilRole: slot.role, __skipCaps: true, ...(input.privacyMode ? { privacyMode: input.privacyMode } : {}) }, sender);
    await waitForChatRun(branch.runId);
    slots.push({ role: slot.role, providerKeyId: slot.providerKeyId, model: slot.model, send: branch });
    answers.push(repos.getMessage(branch.messageId)?.content ?? "");
  }
  const debate = slots.map((slot, index) => `## ${slot.role}\n${answers[index] ?? ""}`).join("\n\n");
  const synthesisContent = `Council debate for: ${input.content}\n\n${debate}\n\nSynthesize agreements, disagreements, recommendation and risks.`;
  const synthesisPacket = packetV0Schema.parse({ ...prepared.packet, messages: [...prepared.packet.messages, { role: "user", content: synthesisContent }], tokenEstimate: prepared.packet.tokenEstimate + Math.ceil(synthesisContent.length / 4) });
  const synthesis = await sendChat({ mode: "send", conversationId: input.conversationId, providerKeyId: input.synthesis.providerKeyId, model: input.synthesis.model, content: synthesisContent, __preparedPacket: synthesisPacket, __skipCaps: true, ...(input.privacyMode ? { privacyMode: input.privacyMode } : {}) }, sender);
  await waitForChatRun(synthesis.runId);
  for (const reservationId of reservationIds) repos.releaseSpendReservation(reservationId);
  return { slots, synthesis: { providerKeyId: input.synthesis.providerKeyId, model: input.synthesis.model, send: synthesis }, divergences: divergenceTerms(answers) };
}
