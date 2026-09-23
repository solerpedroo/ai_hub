# W25 Review — Developer Mode

- Wave: W25
- Date: 2026-09-22
- Reviewer: Codex + independent W25 delta reviewers
- HEAD/branch: working tree (uncommitted)

## DoD

**Pass:** abrir um repo, pedir review do `git diff`, receber findings acionáveis sem o agente commitar sozinho.

Subtasks:

- **Pass** — Explorer, terminal estruturado, Git status/diff.
- **Pass** — AI Code Review com categorias de bug, segurança, performance, smell e manutenibilidade.
- **Pass** — Geração de testes e explicação de arquitetura via factory skills persistidas + tools.
- **Pass** — Git usa grants por projeto; terminal e review exigem consentimento pontual no Permission Center.
- **Pass** — Review cria artifact Markdown; comentários por arquivo permanecem opcionais.

## Checklist §9.4

- **Pass** — Renderer usa somente DTOs Zod via preload; filesystem, child process, provider e DB permanecem no main.
- **Pass** — Comandos são allowlisted, `shell:false`, limitados e sem operações de mutação Git.
- **Pass** — Git resolve binário fora da raiz e usa ambiente PATH restrito.
- **Pass** — Secrets e diffs passam por redaction/firewall; não há fallback silencioso de modelo.
- **Pass** — Novos contratos IPC e skills possuem testes; typecheck/lint/build checks passaram.
- **Pass** — UI possui pt-BR e en para os novos controles.

## Findings

| Severity | Finding | Status |
|---|---|---|
| High | Terminal inicial era apenas `--version`. | fixed: painel estruturado com status/diff/log/node version |
| High | Developer actions não liquidavam atividade. | fixed: atividade marca completed/failed |
| High | Factory skills não entravam em bancos existentes. | fixed: seed reconcilia itens ausentes sempre |
| High | Leitura Git podia autorizar exfiltração do diff. | fixed: review tem tool id e consentimento próprio com provider/model |
| High | Executable search poderia sofrer hijacking Windows. | fixed: Git absoluto, PATH restrito e validação realpath |

## Residual risks and correlations

- PTY/shell livre continua fora do escopo por segurança; o terminal é deliberadamente estruturado.
- A validação visual E2E cobre a presença dos controles; execução nativa de diálogos depende de UAT Windows.
- W26 pode reutilizar os contratos de launcher sem ampliar autoridade sem novo ADR.

## Artifacts

- Diff revisado: `docs/reviews/W25/DIFF.patch`
- ADR: `docs/ADR/ADR-W25-001-main-owned-read-only-developer-tools.md`

## Verification

- `pnpm --filter @ai-hub/shared test` — 117 passed
- `pnpm --filter @ai-hub/db test` — 31 passed
- `pnpm --filter @ai-hub/desktop typecheck` — passed
- `pnpm --filter @ai-hub/desktop lint` — passed
- `git diff --check` — passed
