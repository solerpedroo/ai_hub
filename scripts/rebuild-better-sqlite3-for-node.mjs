import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { rmSync } from "node:fs";

const require = createRequire(import.meta.url);

function isNodeAbi() {
  try {
    const Database = require("better-sqlite3");
    const db = new Database(":memory:");
    db.close();
    return true;
  } catch {
    return false;
  }
}

if (isNodeAbi()) {
  process.exit(0);
}

const pkgDir = dirname(require.resolve("better-sqlite3/package.json"));
rmSync(join(pkgDir, "build"), { recursive: true, force: true });

const env = { ...process.env };
for (const key of [
  "npm_config_runtime",
  "npm_config_target",
  "npm_config_arch",
  "npm_config_target_arch",
  "npm_config_disturl",
  "npm_config_build_from_source",
]) {
  delete env[key];
}

execSync("npx --yes prebuild-install || npx --yes node-gyp rebuild --release", {
  cwd: pkgDir,
  env,
  stdio: "inherit",
  shell: true,
});
