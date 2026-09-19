import type { HubRepos } from "@ai-hub/db";
import { interpolatePrompt } from "@ai-hub/shared";

export function promptVarsForProject(
  repos: HubRepos,
  projectId: string | null,
): { project: string; language: string; goal: string } {
  const project = projectId ? repos.getProject(projectId) : null;
  return {
    project: project?.name ?? "",
    language: repos.getAppearance().locale,
    goal: project?.instructions ?? "",
  };
}

export function interpolateStoredPrompt(
  repos: HubRepos,
  body: string,
  projectId: string | null,
): string {
  return interpolatePrompt(body, promptVarsForProject(repos, projectId));
}
