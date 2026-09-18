# ADR-W09-004-vendor-parsers-and-opaque-ticket

- **Status:** accepted
- **Onda:** W09
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O renderer não pode ler o filesystem. Export W4 já usa diálogo nativo no main. Import precisa de ZIP/JSON de ChatGPT, Claude e Gemini (best-effort) sem mandar o ficheiro inteiro ao React.

## Decisão

- Parsers puros em `packages/shared` (Vitest, sem Electron). ZIP no main via inflate de headers locais (método 0/8).
- ChatGPT: array/`conversations` + `mapping` + walk `current_node` → parent; ramos inativos ficam de fora nesta onda (path ativo, como o utilizador viu).
- Claude: `chat_messages` + `sender` human/assistant; thinking/tool_use não viram mensagens.
- Gemini: Takeout `MyActivity.json` agrupado por id em `titleUrl`; HTML Takeout **rejeitado** com erro i18n; limitações visíveis na UI.
- Anexos binários: placeholder `[file not imported]` + contagem no relatório. Sem blobs na DB.
- IPC: `import:pickFile` devolve ticket opaco + `fileName` (não o path). `import:start` só aceita ticket. Conteúdo nunca atravessa o preload.
- Progresso: eventos `import:event` (contagens, sem texto de conversa). Cancel via AbortController no job.
- e2e: `AI_HUB_E2E_IMPORT_FIXTURE` substitui o diálogo.

## Alternativas consideradas

- **Path absoluto no renderer:** o preload poderia pedir ao main para ler qualquer ficheiro local.
- **Importar árvore ChatGPT completa:** W4 já tem ramos; nesta onda o DoD é “navegáveis, sem duplicar”. Path ativo é o mínimo honesto.
- **jszip como dependência:** evitável para ZIP store/deflate típico dos takeouts.

## Consequências

- Positivas: trust boundary; parsers testáveis com fixtures anonimizadas.
- Negativas: ZIP com data descriptor (bit 3) ou Zip64 pode falhar — o utilizador extrai o JSON.
- Riscos aceitos: Gemini é activity log, não arquivo de conversa; threads incompletos são esperados.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 9 / D2
- ADR-W04-004-export-json-main-process
- ADR-W01-003-keytar-and-ipc-secrets
