import { z } from "zod";
import { mentionTypeSchema } from "./gateway";
import { interpolatePrompt, PROMPT_FOLDERS, type PromptFolder, type PromptVariableValues } from "./prompts";
import { skillAllowedToolSchema } from "./tools";

export const SKILL_FOLDERS = PROMPT_FOLDERS;
export type SkillFolder = PromptFolder;

export const SKILL_CONTRACT_VERSION = 2 as const;

export const skillStepSchema = z
  .object({
    id: z.string().min(1).max(40),
    title: z.string().trim().min(1).max(80),
    section: z.string().trim().min(1).max(4_000),
  })
  .strict();

export type SkillStep = z.infer<typeof skillStepSchema>;

export const skillDefaultMentionSchema = z
  .object({
    type: mentionTypeSchema,
    query: z.string().trim().min(1).max(260),
  })
  .strict();

export type SkillDefaultMention = z.infer<typeof skillDefaultMentionSchema>;

export const skillContractV1Schema = z
  .object({
    version: z.literal(1),
    kind: z.literal("skill"),
    prompt: z.string().trim().min(1).max(16_000),
    steps: z.array(skillStepSchema).max(12),
    defaultMentions: z.array(skillDefaultMentionSchema).max(8),
    tools: z.tuple([]),
  })
  .strict();

export type SkillContractV1 = z.infer<typeof skillContractV1Schema>;

export const skillContractV2Schema = z
  .object({
    version: z.literal(SKILL_CONTRACT_VERSION),
    kind: z.literal("skill"),
    prompt: z.string().trim().min(1).max(16_000),
    steps: z.array(skillStepSchema).max(12),
    defaultMentions: z.array(skillDefaultMentionSchema).max(8),
    allowedTools: z.array(skillAllowedToolSchema).max(8),
  })
  .strict();

export type SkillContractV2 = z.infer<typeof skillContractV2Schema>;
export type SkillContract = SkillContractV1 | SkillContractV2;

export function isSkillFolder(value: string): value is SkillFolder {
  return (SKILL_FOLDERS as readonly string[]).includes(value);
}

export function composeSkillPrompt(prompt: string, steps: readonly SkillStep[]): string {
  const parts = [prompt.trim()];
  steps.forEach((step, index) => {
    parts.push(`## Step ${index + 1}: ${step.title}\n${step.section.trim()}`);
  });
  return parts.filter((part) => part.length > 0).join("\n\n");
}

export function interpolateSkillText(template: string, vars: PromptVariableValues): string {
  return interpolatePrompt(template, vars);
}

export function parseSkillSlashDraft(draft: string): { query: string | null; remainder: string } | null {
  const match = /(^|\n)[ \t]*\/skill(?=\s|$)[ \t]*([^\n]*)/i.exec(draft);
  if (!match || match.index === undefined) {
    return null;
  }
  const afterSkill = (match[2] ?? "").trim();
  const at = afterSkill.search(/@/);
  const query = (at >= 0 ? afterSkill.slice(0, at) : afterSkill).trim() || null;
  const leftover = at >= 0 ? afterSkill.slice(at).trim() : "";
  const lineStart = match.index + (match[1] === "\n" ? 1 : 0);
  const before = draft.slice(0, lineStart);
  const after = draft.slice(match.index + match[0].length);
  const remainder = `${before}${leftover}${leftover && after.trim().length > 0 ? "\n" : ""}${after}`
    .replace(/^\n/, "")
    .trim();
  return { query, remainder };
}

export const FACTORY_SKILLS: readonly {
  factoryId: "code-review" | "summarize-pdf" | "meeting-prep" | "explain-error" | "write-rfc";
  folder: SkillFolder;
  title: string;
  description: string;
  preferredModel: string | null;
  prompt: string;
  steps: SkillStep[];
  defaultMentions: SkillDefaultMention[];
}[] = [
  {
    factoryId: "code-review",
    folder: "development",
    title: "Code Review",
    description: "Review a diff with summary, risks, and suggestions.",
    preferredModel: null,
    prompt: `You are a senior code reviewer for {{project}}.
Project goal: {{goal}}
Respond in {{language}}.
Follow every step heading below in the same order. Do not skip a heading.`,
    steps: [
      {
        id: "summary",
        title: "Summary",
        section: "Summarize what the change does in 3-6 sentences. Name the main files or areas touched.",
      },
      {
        id: "risks",
        title: "Risks",
        section:
          "List findings by severity (blocker, high, medium, low). If the diff looks safe, say so under Risks.",
      },
      {
        id: "suggestions",
        title: "Suggestions",
        section: "Propose the smallest concrete follow-ups. Ask for a missing diff if none was provided.",
      },
    ],
    defaultMentions: [],
  },
  {
    factoryId: "summarize-pdf",
    folder: "work",
    title: "Summarize PDF",
    description: "Turn a PDF extract into decisions and open questions.",
    preferredModel: null,
    prompt: `Summarize the attached document for {{project}}.
Goal: {{goal}}
Write in {{language}}.
Follow every step heading below.`,
    steps: [
      {
        id: "overview",
        title: "Overview",
        section: "Give a short overview of the document and who it is for.",
      },
      {
        id: "decisions",
        title: "Decisions",
        section: "List explicit decisions or claims. Quote only when needed.",
      },
      {
        id: "questions",
        title: "Open questions",
        section: "List gaps, contradictions, and what to verify next.",
      },
    ],
    defaultMentions: [],
  },
  {
    factoryId: "meeting-prep",
    folder: "work",
    title: "Prepare meeting",
    description: "Build an agenda and talking points from context.",
    preferredModel: null,
    prompt: `Prepare a meeting brief for {{project}}.
Goal: {{goal}}
Write in {{language}}.
Follow every step heading below.`,
    steps: [
      {
        id: "agenda",
        title: "Agenda",
        section: "Propose a timed agenda with owners when known.",
      },
      {
        id: "talking-points",
        title: "Talking points",
        section: "List the points the user should raise, with evidence from the context.",
      },
      {
        id: "risks",
        title: "Risks",
        section: "Call out sensitive topics and missing brief items.",
      },
    ],
    defaultMentions: [],
  },
  {
    factoryId: "explain-error",
    folder: "development",
    title: "Explain error",
    description: "Diagnose an error and propose the smallest next experiment.",
    preferredModel: null,
    prompt: `You are debugging an issue in {{project}}.
Project goal: {{goal}}
Respond in {{language}}.
Follow every step heading below.`,
    steps: [
      {
        id: "read",
        title: "What failed",
        section: "Restate the error, stack, and the last successful step.",
      },
      {
        id: "hypotheses",
        title: "Hypotheses",
        section: "Give the two most likely causes, with what would disprove each.",
      },
      {
        id: "next",
        title: "Next experiment",
        section: "Propose the smallest next experiment. Do not rewrite the whole system.",
      },
    ],
    defaultMentions: [],
  },
  {
    factoryId: "write-rfc",
    folder: "development",
    title: "Write RFC",
    description: "Draft a short RFC from the current context.",
    preferredModel: null,
    prompt: `Draft an RFC for {{project}}.
Goal: {{goal}}
Write in {{language}}.
Follow every step heading below.`,
    steps: [
      {
        id: "context",
        title: "Context",
        section: "State the problem, constraints, and non-goals.",
      },
      {
        id: "proposal",
        title: "Proposal",
        section: "Describe the proposed change and why it is the smallest that works.",
      },
      {
        id: "rollout",
        title: "Rollout",
        section: "List rollout, rollback, and open questions.",
      },
    ],
    defaultMentions: [],
  },
];

export function factorySkillContract(item: (typeof FACTORY_SKILLS)[number]): SkillContractV2 {
  return skillContractV2Schema.parse({
    version: SKILL_CONTRACT_VERSION,
    kind: "skill",
    prompt: item.prompt,
    steps: item.steps,
    defaultMentions: item.defaultMentions,
    allowedTools: [],
  });
}
