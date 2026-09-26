import { extensionManifestSchema, type ExtensionManifest, type MarketplacePackDto } from "@ai-hub/shared";
import { getHubDatabase } from "./persistence";

export const PROJECT_FILES_PACK_ID = "ai-hub.project-files";

interface MarketplaceCatalogEntry {
  manifest: ExtensionManifest;
  titleKey: `marketplace.pack.${string}.title`;
  descriptionKey: `marketplace.pack.${string}.description`;
  availability: "installable" | "core_integrated";
}

const manifests: readonly ExtensionManifest[] = extensionManifestSchema.array().parse([{
  apiVersion: 1,
  id: PROJECT_FILES_PACK_ID,
  version: "1.0.0",
  kind: "mcp" as const,
  name: "Project Files",
  description: "Read files only inside the project root through the Permission Center.",
  permissions: [{ toolId: "project-filesystem.read-file", operation: "read" as const, effect: "read" as const }],
  sandbox: "core",
}, {
  apiVersion: 1,
  id: "ai-hub.openai-compatible",
  version: "1.0.0",
  kind: "provider" as const,
  name: "OpenAI-compatible endpoint",
  description: "Connect any OpenAI-compatible /v1 endpoint from Provider settings.",
  permissions: [],
  sandbox: "core",
}, {
  apiVersion: 1,
  id: "ai-hub.code-review-skill",
  version: "1.0.0",
  kind: "skill" as const,
  name: "Code Review skill",
  description: "Use the built-in Code Review skill from Skills.",
  permissions: [],
  sandbox: "core",
}]);

const catalog: readonly MarketplaceCatalogEntry[] = [
  { manifest: manifests[0]!, titleKey: "marketplace.pack.project-files.title", descriptionKey: "marketplace.pack.project-files.description", availability: "installable" },
  { manifest: manifests[1]!, titleKey: "marketplace.pack.openai-compatible.title", descriptionKey: "marketplace.pack.openai-compatible.description", availability: "core_integrated" },
  { manifest: manifests[2]!, titleKey: "marketplace.pack.code-review-skill.title", descriptionKey: "marketplace.pack.code-review-skill.description", availability: "core_integrated" },
];

export function listMarketplacePacks(): MarketplacePackDto[] {
  const installed = new Set(getHubDatabase().repos.listInstalledPacks().filter((pack) => pack.enabled).map((pack) => pack.packId));
  return catalog.map(({ manifest, titleKey, descriptionKey, availability }) => {
    const { apiVersion: _apiVersion, sandbox: _sandbox, ...pack } = manifest;
    return { ...pack, permissions: [...pack.permissions], titleKey, descriptionKey, availability, installable: availability === "installable", installed: installed.has(pack.id) };
  });
}

export function installMarketplacePack(packId: string): MarketplacePackDto {
  const pack = catalog.find((item) => item.manifest.id === packId)?.manifest;
  if (!pack) throw new Error("marketplace:pack_not_found");
  if (pack.kind !== "mcp") throw new Error("marketplace:pack_not_installable");
  getHubDatabase().repos.installPack({ packId: pack.id, version: pack.version, kind: pack.kind });
  return listMarketplacePacks().find((item) => item.id === packId) ?? (() => { throw new Error("marketplace:pack_not_found"); })();
}

export function uninstallMarketplacePack(packId: string): void {
  const pack = catalog.find((item) => item.manifest.id === packId)?.manifest;
  if (!pack) throw new Error("marketplace:pack_not_found");
  if (pack.kind !== "mcp") throw new Error("marketplace:pack_not_installable");
  getHubDatabase().repos.uninstallPack(packId);
}

export function projectFilesPackInstalled(): boolean {
  return getHubDatabase().repos.isPackInstalled(PROJECT_FILES_PACK_ID);
}
