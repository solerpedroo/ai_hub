const fs = require("fs");
const path = require("path");

function readStdin() {
  try { fs.readFileSync(0, "utf8"); } catch { /* stdin is optional */ }
}

readStdin();
const root = process.cwd();
const statusPath = path.join(root, "docs", "STATUS.md");
let status = "(docs/STATUS.md ausente — criar antes de implementar)";
try { status = fs.readFileSync(statusPath, "utf8"); } catch { /* keep default */ }
if (status.length > 8000) status = `${status.slice(0, 8000)}\n… [STATUS truncado]`;

const additional_context = [
  "AI Hub session bootstrap. Obedecer nesta ordem:",
  "1) docs/STATUS.md (abaixo)",
  "2) AGENTS.md",
  "3) onda atual em docs/IMPLEMENTATION_PLAN.md",
  "4) .codex/README.md e regras aplicáveis em .codex/rules/",
  "Wave close exige skill ai-hub-wave-close: review independente + docs/reviews/WXX + ADRs.",
  "",
  "--- docs/STATUS.md ---",
  status,
].join("\n");

process.stdout.write(JSON.stringify({ additional_context }));
