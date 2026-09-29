import { SpendCapError, FACTORY_PROMPTS } from "@ai-hub/shared";
import type { PlaygroundRunInput, PlaygroundRunResult } from "@ai-hub/shared";
import type { WebContents } from "electron";
import { sendChat, waitForChatRun } from "./chat-session";
import { previewPacket } from "./packet-preview";
import { getHubDatabase } from "./persistence";
import { interpolateStoredPrompt } from "./prompt-vars";
import { evaluateBatchScopedCaps } from "./spend-guard";

let playgroundBusy = false;

export function seedFactoryPrompts(): void {
  getHubDatabase().repos.ensureFactoryPrompts(FACTORY_PROMPTS);
}

export function listPromptDtos() {
  seedFactoryPrompts();
  return getHubDatabase().repos.listPrompts();
}

export function resolvePromptDto(
  promptId: string,
  projectId: string | null,
): { id: string; title: string; text: string } {
  seedFactoryPrompts();
  const prompt = getHubDatabase().repos.getPrompt(promptId);
  if (!prompt) {
    throw new Error("mentions:not_found");
  }
  const text = interpolateStoredPrompt(getHubDatabase().repos, prompt.body, projectId);
  return { id: prompt.id, title: prompt.title, text };
}

export async function runPlayground(
  input: PlaygroundRunInput,
  sender: WebContents,
): Promise<PlaygroundRunResult> {
  if (playgroundBusy) {
    throw new Error("playground:busy");
  }
  playgroundBusy = true;
  const repos = getHubDatabase().repos;
  seedFactoryPrompts();
  let content = input.content;
  if (input.promptId !== undefined) {
    const resolved = resolvePromptDto(input.promptId, input.projectId);
    content = `${resolved.text}\n\n${input.content}`.trim();
  }
  const uniqueKeys = new Set(input.slots.map((slot) => `${slot.providerKeyId}:${slot.model}`));
  if (uniqueKeys.size !== input.slots.length) {
    playgroundBusy = false;
    throw new Error("playground:duplicate_slot");
  }

  const prepared = [];
  try {
    for (const slot of input.slots) {
      const key = await repos.getProviderSecret(slot.providerKeyId);
      if (!key) {
        throw new Error("gateway:auth");
      }
      prepared.push({ slot, key });
    }
  } catch (error) {
    playgroundBusy = false;
    throw error;
  }
  const conversations: Array<(typeof prepared)[number] & { conversation: { id: string } }> = [];
  let reservationIds: string[] = [];
  try {
    for (const item of prepared) {
      const conversation = repos.createConversation(
        input.projectId,
        `Playground · ${item.slot.model}`,
        "playground",
      );
      conversations.push({ ...item, conversation });
    }

    const estimates: Array<{ usd: string | null; projectId: string | null; providerSlug: string }> = [];
    for (const item of conversations) {
      const preview = previewPacket({
        conversationId: item.conversation.id,
        pendingContent: content,
        model: item.slot.model,
        providerSlug: item.key.providerSlug,
        ...(input.privacyMode !== undefined ? { privacyMode: input.privacyMode } : {}),
        ...(input.extraSystem !== undefined ? { extraSystem: input.extraSystem } : {}),
        ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
      });
      if (preview.overflow) {
        throw new Error("gateway:context_overflow");
      }
      estimates.push({ usd: preview.estimatedCostUsd, projectId: input.projectId, providerSlug: item.key.providerSlug });
    }

    const cap = evaluateBatchScopedCaps({ estimates, repos });
    if (cap.blocked) {
      throw new SpendCapError(cap.blocked);
    }

    reservationIds = estimates.flatMap((estimate) => estimate.usd === null ? [] : [repos.reserveSpend({ projectId: estimate.projectId, providerSlug: estimate.providerSlug, amountUsd: estimate.usd, expiresAt: Date.now() + 15 * 60_000 })]);
    const sends = await Promise.all(
      conversations.map((item) =>
        sendChat(
          {
            mode: "send",
            conversationId: item.conversation.id,
            providerKeyId: item.slot.providerKeyId,
            model: item.slot.model,
            content,
            ...(input.privacyMode !== undefined ? { privacyMode: input.privacyMode } : {}),
            ...(input.extraSystem !== undefined ? { extraSystem: input.extraSystem } : {}),
            ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
            ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
            __skipCaps: true,
          },
          sender,
        ),
      ),
    );
    void Promise.all(sends.map((send) => waitForChatRun(send.runId))).finally(() => {
      for (const reservationId of reservationIds) repos.releaseSpendReservation(reservationId);
      playgroundBusy = false;
    });
    return {
      content,
      slots: conversations.map((item, index) => {
        const send = sends[index];
        if (!send) {
          throw new Error("playground:slots");
        }
        return {
          providerKeyId: item.slot.providerKeyId,
          model: item.slot.model,
          send,
        };
      }),
    };
  } catch (error) {
    for (const reservationId of reservationIds) repos.releaseSpendReservation(reservationId);
    for (const item of conversations) {
      const streaming = repos.listMessages(item.conversation.id).some((message) => message.status === "streaming");
      if (!streaming) {
        repos.removeConversation(item.conversation.id);
      }
    }
    playgroundBusy = false;
    throw error;
  }
}
