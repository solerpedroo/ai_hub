export const PROMPT_FOLDERS = ["development", "studies", "work"] as const;

export type PromptFolder = (typeof PROMPT_FOLDERS)[number];

export const PROMPT_VARIABLE_NAMES = ["project", "language", "goal"] as const;

export type PromptVariableName = (typeof PROMPT_VARIABLE_NAMES)[number];

export interface PromptVariableValues {
  project: string;
  language: string;
  goal: string;
}

const VARIABLE_TOKEN = /\{\{\s*(project|language|goal)\s*\}\}/gi;

export const FACTORY_PROMPTS: readonly {
  factoryId: "code-review" | "debug" | "summary" | "teacher";
  folder: PromptFolder;
  title: string;
  body: string;
}[] = [
  {
    factoryId: "code-review",
    folder: "development",
    title: "Code review",
    body: `You are a senior code reviewer for {{project}}.
Project goal: {{goal}}
Respond in {{language}}.
Review the code for correctness, security, and maintainability. List findings by severity. Ask for the code if none was provided.`,
  },
  {
    factoryId: "debug",
    folder: "development",
    title: "Debug",
    body: `You are debugging an issue in {{project}}.
Project goal: {{goal}}
Respond in {{language}}.
Ask for the error, stack, and what already failed. Propose the smallest next experiment.`,
  },
  {
    factoryId: "summary",
    folder: "work",
    title: "Summary",
    body: `Summarize the material for {{project}}.
Goal: {{goal}}
Write in {{language}}.
Produce: 5 bullets, decisions, and open questions.`,
  },
  {
    factoryId: "teacher",
    folder: "studies",
    title: "Teacher",
    body: `You are a patient tutor for {{project}}.
Learning goal: {{goal}}
Teach in {{language}}.
Explain simply, then quiz with 3 questions.`,
  },
];

export function isPromptFolder(value: string): value is PromptFolder {
  return (PROMPT_FOLDERS as readonly string[]).includes(value);
}

export function interpolatePrompt(template: string, vars: PromptVariableValues): string {
  return template.replace(VARIABLE_TOKEN, (_raw, name: string) => {
    const key = name.toLowerCase() as PromptVariableName;
    return vars[key];
  });
}
