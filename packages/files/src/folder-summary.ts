import type { FolderFileInput, FolderSummary } from "./types";

function hasFile(files: FolderFileInput[], name: string): boolean {
  const needle = name.toLowerCase();
  return files.some((item) => item.relativePath.replace(/\\/g, "/").toLowerCase().endsWith(needle));
}

function readFile(files: FolderFileInput[], name: string): string {
  const needle = name.toLowerCase();
  const match = files.find((item) => item.relativePath.replace(/\\/g, "/").toLowerCase().endsWith(needle));
  return match?.content?.trim() ?? "";
}

function detectStack(files: FolderFileInput[]): string {
  if (hasFile(files, "package.json")) {
    return "Node.js";
  }
  if (hasFile(files, "pyproject.toml") || hasFile(files, "requirements.txt")) {
    return "Python";
  }
  if (hasFile(files, "cargo.toml")) {
    return "Rust";
  }
  if (hasFile(files, "go.mod")) {
    return "Go";
  }
  return "unknown";
}

function parsePackageJson(raw: string): { name: string; deps: string[]; managerHint: string } {
  try {
    const parsed = JSON.parse(raw) as {
      name?: unknown;
      dependencies?: unknown;
      devDependencies?: unknown;
      packageManager?: unknown;
    };
    const name = typeof parsed.name === "string" ? parsed.name : "";
    const deps = [
      ...Object.keys(parsed.dependencies && typeof parsed.dependencies === "object" ? parsed.dependencies : {}),
      ...Object.keys(
        parsed.devDependencies && typeof parsed.devDependencies === "object" ? parsed.devDependencies : {},
      ),
    ].slice(0, 24);
    const managerHint =
      typeof parsed.packageManager === "string"
        ? parsed.packageManager.split("@")[0] ?? parsed.packageManager
        : "";
    return { name, deps, managerHint };
  } catch {
    return { name: "", deps: [], managerHint: "" };
  }
}

function architecture(files: FolderFileInput[]): string {
  const tops = new Set<string>();
  for (const item of files) {
    const normalized = item.relativePath.replace(/\\/g, "/");
    const first = normalized.split("/")[0];
    if (first && first !== ".") {
      tops.add(first);
    }
  }
  return [...tops].sort().slice(0, 16).join(", ");
}

export function summarizeFolder(input: {
  rootName: string;
  files: FolderFileInput[];
}): FolderSummary {
  const stack = detectStack(input.files);
  const pkg = parsePackageJson(readFile(input.files, "package.json"));
  const readme = readFile(input.files, "readme.md") || readFile(input.files, "readme");
  const manager =
    pkg.managerHint ||
    (hasFile(input.files, "pnpm-lock.yaml")
      ? "pnpm"
      : hasFile(input.files, "yarn.lock")
        ? "yarn"
        : hasFile(input.files, "package-lock.json")
          ? "npm"
          : "");
  const lines = [
    "Project summary v1",
    `Name: ${pkg.name || input.rootName}`,
    `Stack: ${stack}`,
    manager ? `Package manager: ${manager}` : null,
    pkg.deps.length > 0 ? `Dependencies: ${pkg.deps.join(", ")}` : null,
    `Architecture: ${architecture(input.files) || "(flat)"}`,
    readme ? `README:\n${readme.slice(0, 4_000)}` : "README: (none)",
  ].filter((line): line is string => line !== null);
  return { text: lines.join("\n"), stack };
}
