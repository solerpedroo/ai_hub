import type { SkillRecord } from "@ai-hub/db";
import { composeSkillPrompt, FACTORY_SKILLS, type PacketPrivacyMode } from "@ai-hub/shared";
import { redactSecrets } from "@ai-hub/security";
import type { SkillDto, SkillResolveResult } from "@ai-hub/shared";
import { getHubDatabase } from "./persistence";
import { interpolateStoredPrompt } from "./prompt-vars";

export function seedFactorySkills(): void {
  getHubDatabase().repos.ensureFactorySkills(FACTORY_SKILLS);
}

export function listSkillDtos(): SkillDto[] {
  seedFactorySkills();
  return getHubDatabase().repos.listSkills().map((row) => ({
    id: row.id,
    folder: row.folder,
    title: row.title,
    description: row.description,
    prompt: row.prompt,
    preferredModel: row.preferredModel,
    defaultMentions: row.defaultMentions,
    steps: row.steps,
    allowedTools: row.allowedTools,
    factoryId: row.factoryId,
    contractVersion: row.contractVersion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export function matchSkill(query: string | undefined, id: string | undefined): SkillRecord | null {
  seedFactorySkills();
  const skills = getHubDatabase().repos.listSkills();
  if (id) {
    return skills.find((item) => item.id === id) ?? null;
  }
  const needle = (query ?? "").toLowerCase().trim();
  if (needle.length === 0) {
    return null;
  }
  const exact = skills.find((item) => {
    const factory = (item.factoryId ?? "").toLowerCase().replace(/-/g, " ");
    return (
      item.title.toLowerCase() === needle ||
      factory === needle ||
      (item.factoryId ?? "").toLowerCase() === needle
    );
  });
  if (exact) {
    return exact;
  }
  const fuzzy = skills.filter((item) => {
    const factory = (item.factoryId ?? "").toLowerCase().replace(/-/g, " ");
    return item.title.toLowerCase().includes(needle) || factory.includes(needle);
  });
  return fuzzy.length === 1 ? (fuzzy[0] ?? null) : null;
}

export function resolveSkillDto(
  skillId: string | undefined,
  query: string | undefined,
  projectId: string | null,
  privacyMode: PacketPrivacyMode = "standard",
): SkillResolveResult {
  const skill = matchSkill(query, skillId);
  if (!skill) {
    throw new Error("mentions:not_found");
  }
  const composed = composeSkillPrompt(skill.prompt, skill.steps);
  const text = redactSecrets(
    interpolateStoredPrompt(getHubDatabase().repos, composed, projectId, privacyMode),
  );
  return {
    id: skill.id,
    title: skill.title,
    text,
    preferredModel: skill.preferredModel,
    defaultMentions: skill.defaultMentions,
    steps: skill.steps,
  };
}
