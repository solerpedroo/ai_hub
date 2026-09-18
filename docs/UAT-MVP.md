# UAT — MVP (Wave 8)

Checklist operacional alinhado a `docs/IMPLEMENTATION_PLAN.md` §8. Cobertura do escopo §47 + D3, D4, D7, D9, D10, D11, D12 (D1 v0; D2 ainda não).

**Como:** e2e mock (`pnpm --filter @ai-hub/desktop test:e2e`) cobre o núcleo sem chaves reais. Itens manuais precisam de instalador NSIS e, para providers, BYOK.

## Desktop

- [x] Instala no Windows (NSIS) — artefacto `AI-Hub-Setup-0.1.0.exe` gerado no close gate (`pnpm --filter @ai-hub/desktop dist`). Instalar numa máquina limpa continua residual UAT.
- [x] Abre, restaura sessão — e2e + `settings:getSession`
- [x] Auto-update check não quebra o app se o feed estiver fora — `updates:check` devolve `skipped`/`unavailable`, nunca throw

## Chat

- [x] Nova conversa, histórico, streaming, Markdown, code blocks — W3–W4 + e2e send
- [x] Copiar, regenerar (irmão), editar (ramo), Stop — e2e stop/regenerate
- [x] Crash/kill no stream → parcial + `interrupted` — ADR-W02-003 / e2e abort

## Providers

- [x] OpenAI, Anthropic, Gemini, Groq, custom, **OpenRouter** — adapters W5 (UAT real ainda residual)
- [x] Teste de conexão; key mascarada; remover credencial — Settings + e2e OpenRouter na lista

## Organização

- [x] Projetos, conversas, busca, tags — e2e W6
- [x] Troca de modelo no fio com packet v0 — e2e GPT→Claude

## Segurança / transparência

- [x] Key no Credential Manager, não no SQLite — testes db
- [x] Redaction básica no composer — e2e aviso + redact
- [x] Receipt em toda resposta — e2e receipt dialog
- [x] Spend cap bloqueia — e2e cap 0 + allow-once
- [x] Health na status bar — W7
- [x] Fallback pede confirmação — UI dialog W7

## Onboarding

- [x] First token no caminho feliz (1 provider) — e2e wizard + mock; cronometrar <90s com chave real em UAT manual

## Ainda não no MVP (ok)

macOS signed, import Hub, packet portátil completo, arquivos/RAG, mentions, artifacts, skills, Quick AI, Council, MCP.
