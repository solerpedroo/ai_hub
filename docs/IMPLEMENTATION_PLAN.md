# AI Hub Desktop — Implementation Plan

> **Status:** Plano ativo  
> **Origem:** [AI_Hub_Desktop_Escopo.md](./AI_Hub_Desktop_Escopo.md)  
> **Escopo extra:** diferenciais outlier (este documento) — **obrigatórios**, não backlog opcional  
> **Plataformas:** Windows first no ship do MVP; macOS first-class na arquitetura  
> **Hipótese a validar (MVP):** as pessoas querem um app desktop único onde conectam as próprias IAs e conversam sem trocar de plataforma?

Este plano cobre o produto **do zero até a visão de AI Operating Layer**: ondas, sub-tasks, critérios de pronto, decisões de arquitetura e os diferenciais que separam o AI Hub de “mais um chat BYOK”.

---

## 1. Como usar este documento

- Cada **onda** é um incremento shippável: o app abre, a feature é usável, o fluxo tem teste.
- Implementar **em ordem**. Dependências estão explícitas.
- Não pular diferenciais “para depois”. Eles são o produto.
- O MVP (Marco B, até a Wave 8) valida a hipótese. Waves 9–10 fecham o MVP+ antes de abrir V1.
- Estimativa informal para 1 engenheiro focado: Waves 0–8 ≈ 8–12 semanas até um binário Windows utilizável.

---

## 2. Leitura sênior do escopo

O escopo original está certo no diagnóstico e no posicionamento. O risco é tentar ser ChatGPT + Cursor + Raycast + Notion + MCP desktop de uma vez.

O diferencial real **não** é “vários modelos num chat” (TypingMind, Chatbox, LibreChat já fazem isso). É:

> **Projeto, contexto, dados e custo ficam com o usuário; o modelo é um plug substituível.**

O núcleo não é o chat. O núcleo é **Context Compiler** + **AI Gateway** + **Project workspace**. O chat é a superfície.

```text
Desktop UI (Chat, Projects, Palette, Quick AI)
        │
Application Core (Context Compiler, Memory, Files, Tools, Skills)
        │
AI Gateway (Adapters, Retry, Fallback explícito, Receipts, Firewall)
        │
OpenAI | Anthropic | Gemini | Groq | OpenRouter | Custom | Ollama
```

---

## 3. Decisões de arquitetura (travadas)

Estas decisões evitam retrabalho nas ondas 0–8.

| Decisão | Escolha | Por quê |
|---|---|---|
| Shell | Electron + electron-vite | MCP, SDKs Node, sqlite, terminal e Keychain mais maduros que Tauri neste produto |
| Monorepo | pnpm + Turborepo | Pacotes reais, sem over-split |
| Pacotes no MVP | `apps/desktop`, `packages/shared`, `packages/db`, `packages/security`, `packages/ai-gateway` | Providers **dentro** de `ai-gateway` até haver motivo de versionar separado |
| Trust boundary | Main process | API keys, SQLite, rede e filesystem **nunca** no renderer |
| IPC | Preload explícito + Zod | Renderer só vê DTOs |
| DB | Drizzle + better-sqlite3 | Migrations versionadas; FTS5 para busca |
| Segredos | keytar (Credential Manager / Keychain) | Nunca em SQLite, código ou log |
| Dados em repouso | SQLCipher **ou** envelope AES-256-GCM | Conversas não ficam plaintext no disco |
| Streaming | Gateway unificado (AI SDK no main ou camada equivalente) | Mesma interface para todos os adapters |
| UI | React + TS + Tailwind + shadcn/ui + Zustand | Densidade desktop (Linear/Cursor), não chat web |
| i18n | i18next, pt-BR + en desde a Wave 0 | Mercado local + produto global |
| Ship | electron-builder + electron-updater | NSIS no MVP; macOS assinado depois |
| Testes | Vitest nos pacotes; Playwright nos fluxos críticos; fixtures de stream | Sem keys reais no CI |

Estrutura alvo no MVP:

```text
ai_hub/
├── apps/desktop/             # electron/ + renderer/
├── packages/
│   ├── shared/               # types, zod, i18n keys, model catalog
│   ├── db/                   # schema, migrations, repos
│   ├── security/             # keytar, encryption, redaction
│   └── ai-gateway/           # adapters, compiler, retry, receipts
└── docs/
```

Pacotes `memory`, `files`, `tools`, `ui` só nascem quando a onda precisar.

---

## 4. Diferenciais outlier — requisitos de produto

Estes 12 itens **não são ideias**. São features com onda, DoD e aceite. O escopo original continua válido; isto **soma** e, em alguns casos, antecipa o que o escopo deixava para V1/V2.

### D1. Context Compiler + Portable Context Packet

**Problema:** trocar de modelo (ou de conversa) obriga a “explicar de novo”.  
**Solução:** um compilador que monta um pacote **independente de provider**.

```text
compile({
  project,
  conversation,
  files,
  memories,
  skills,
  mentions,
  privacyMode
}) → ProviderAgnosticPacket
```

O pacote contém: instruções do projeto, recorte de histórico, memórias ativas, arquivos citados, skill aplicada, modo de privacidade, estimativa de tokens.

**Aceite:**

- Trocar GPT → Claude no meio da conversa **sem** o usuário reescrever o contexto.
- Preview do pacote antes de enviar (o que entra / o que fica de fora).
- Exportar/importar o pacote (JSON) entre projetos.
- Aviso explícito se a context window do modelo destino estourar, com opção de compactar.

**Ondas:** 2 (v0), 6 (switch no chat), 10 (pacote portátil completo).

### D2. Import Hub — ChatGPT, Claude, Gemini

**Problema:** o custo de troca mata adoção.  
**Solução:** importar export oficial (e o melhor esforço de cada vendor).

**Aceite:**

- Importar ZIP/JSON do ChatGPT (conversations).
- Importar export Claude (quando o formato existir / HTML/JSON disponível).
- Importar Gemini (best-effort; documentar limitações).
- Mapear conversas para projetos (inbox “Importadas” + “mover para projeto”).
- Relatório pós-import: N conversas, N puladas, erros.
- Idempotência: reimportar não duplica (hash estável).

**Onda:** 9.

### D3. OpenRouter first-class no MVP

**Problema:** cinco cadastros de API para validar o produto.  
**Solução:** OpenRouter como provider de primeira classe — uma key, dezenas de modelos — **sem** substituir adapters nativos.

**Aceite:**

- Conectar OpenRouter no mesmo fluxo de OpenAI/Anthropic.
- Catálogo de modelos OpenRouter no picker (nome, contexto, preço, capacidades).
- Receipts usam o preço real quando a API devolver; senão catálogo local.
- Adapters nativos continuam existindo (não “só OpenRouter”).

**Onda:** 5.

### D4. Conversation branching (git de conversa)

**Problema:** editar ou regenerar destrói o caminho anterior. Comparar modelos no mesmo fio fica impossível.  
**Solução:** cada edit/regenerate cria um **ramo**. A conversa é um grafo, não uma lista.

**Aceite:**

- Editar mensagem do usuário cria ramo a partir daquele nó.
- Regenerar cria irmão da resposta.
- UI: indicador de ramo, “N alternativas”, navegar entre irmãos.
- Árvore da conversa (painel): ver forks, nomear ramo, voltar.
- Export respeita o ramo ativo (com opção “exportar árvore”).

**Onda:** 4 (modelo de dados já nasce na Wave 1).

### D5. Artifacts canvas

**Problema:** resposta é um muro de Markdown. Trabalho real precisa de documento, diagrama, preview.  
**Solução:** superfície ao lado do chat para artefatos vivos.

**Aceite:**

- Detectar e abrir: Markdown documento, Mermaid, HTML sandbox, bloco de código grande.
- Painel split: chat | artifact.
- Versões do artifact (regenerar não apaga a anterior).
- Copiar / exportar / pin no projeto.
- HTML em sandbox (sem rede, sem Node). Sem “run código nativo” nesta onda.

**Onda:** 16.

### D6. @-mentions no composer

**Problema:** contexto mágico (a IA “adivinha” o arquivo) gera erro e desconfiança.  
**Solução:** contexto **explícito**, estilo Slack/Cursor.

**Aceite:**

- `@file`, `@prompt`, `@memory`, `@conversation`, `@skill`, `@packet`.
- Autocomplete com busca; preview do que será injetado (tokens estimados).
- Menções entram no Context Compiler, não concatenadas cruas no texto visível (o usuário vê o chip; o modelo recebe o conteúdo).
- Remover a menção remove o contexto.

**Onda:** 13 (depois de arquivos e prompts existirem).

### D7. Spend caps

**Problema:** medo de “estourar a fatura” impede uso no trabalho.  
**Solução:** hard-stop configurável, não só dashboard.

**Aceite:**

- Cap por request, por dia, por projeto, por provider.
- Aviso em 80%; bloqueio em 100% (não envia).
- Override explícito “permitir esta vez” (com audit local).
- Estimativa **pré-envio** quando possível (tokens de input × preço).

**Onda:** 7 (núcleo) + 18 (dashboard + caps por projeto polidos).

### D8. Skills / workflows

**Problema:** prompts soltos não são processo.  
**Solução:** SOP reutilizável: prompt + modelo preferido + menções padrão + (depois) tools.

```text
Skill: "Revisar PR"
  modelo: claude-sonnet
  prompt: ...
  anexos: @file:diff
  passos: resumir → riscos → sugestões
```

**Aceite:**

- CRUD de skills; pastas; variáveis `{{project}}`, `{{language}}`, `{{goal}}`.
- Rodar skill a partir da palette, do composer (`/skill`) ou de um atalho.
- Skills de fábrica: Code Review, Resumir PDF, Preparar reunião, Explicar erro, Escrever RFC.
- Na era de agentes (Wave 22), skill pode orquestrar tools — o contrato da skill já prevê `steps`.

**Onda:** 17.

### D9. Time-to-first-token < 90s no first-run

**Problema:** apps desktop de IA morrem no setup.  
**Solução:** wizard obsessivamente curto.

**Aceite:**

- Cold start: idioma → 1 provider (OpenRouter recomendado) → teste de conexão → campo “mande sua primeira pergunta”.
- Cronometrado: se o caminho feliz passar de 90s, o wizard está errado (cortar passos).
- Skip para quem já tem key; nunca pedir conta cloud.
- Empty state do chat = a própria primeira pergunta, não um tour de 12 telas.

**Onda:** 8.

### D10. Crash-safe streaming

**Problema:** crash ou kill no meio do stream perde a resposta.  
**Solução:** persistência incremental.

**Aceite:**

- Flush da assistant message a cada N tokens / N ms (batch).
- Reabrir o app mostra a resposta parcial + estado `interrupted`.
- Botão “continuar” (quando o provider permitir) ou “regenerar a partir daqui”.
- Abort do usuário também persiste o parcial.

**Onda:** 2.

### D11. Provider health

**Problema:** “não funciona” sem saber se é a key, a rede ou o Claude fora.  
**Solução:** pulso visível.

**Aceite:**

- Status bar: latência recente, taxa de erro, último status por provider.
- “Claude fora · GPT ok” com base nas últimas N requests (e teste manual).
- Health **não** envia dados a servidor nosso; é 100% local.
- Fallback (Wave 7) lê health para sugerir o próximo modelo.

**Onda:** 7.

### D12. Receipt em toda mensagem

**Problema:** custo e modelo são opacos. Isso quebra o princípio “Transparent AI”.  
**Solução:** recibo como default na bolha, não tela escondida.

**Aceite:**

- Toda assistant message mostra: provider, model, input/output tokens, latência, custo estimado, data.
- Clique abre detalhe (sem secrets, sem headers crús com auth).
- Conversas e projetos agregam custo.
- Receipts alimentam caps, dashboard e export JSON.

**Ondas:** 2 (engine), 7 (UI).

---

## 5. Mapa de marcos e ondas

```text
Marco A  Foundation          W0 — W2
Marco B  MVP + MVP+          W3 — W10     ← ship Windows em W8; W9–W10 fecham diferenciais de troca
Marco C  V1 workspace        W11 — W20
Marco D  V2 agents + local   W21 — W24
Marco E  V3 ecosystem        W25 — W29
```

| Wave | Nome | Marco | Diferenciais |
|---:|---|---|---|
| 0 | Repo, shell, design system | A | — |
| 1 | Trust boundary, DB, segurança | A | schema de branches/receipts/caps |
| 2 | AI Gateway + crash-safe + receipts engine + Compiler v0 | A | D1 v0, D10, D12 engine |
| 3 | Chat core | B | — |
| 4 | Conversation branching | B | D4 |
| 5 | Providers + OpenRouter + vault | B | D3 |
| 6 | Projetos, tags, busca, model switch | B | D1 switch |
| 7 | Receipts UI + spend caps + provider health | B | D7, D11, D12 UI |
| 8 | Onboarding <90s + installer + ship MVP | B | D9 |
| 9 | Import Hub | B+ | D2 |
| 10 | Portable Context Packet | B+ | D1 completo |
| 11 | Teclado-primeiro | C | — |
| 12 | Arquivos e multimodal | C | — |
| 13 | @-mentions | C | D6 |
| 14 | RAG + memória + Conversation Workspace | C | — |
| 15 | Prompt Library + Playground | C | — |
| 16 | Artifacts canvas | C | D5 |
| 17 | Skills / workflows | C | D8 |
| 18 | Privacy Center + Firewall + Cost Tracker | C | D7 polido |
| 19 | Superpoderes desktop | C | — |
| 20 | Multi-modelo, Council, Router | C | — |
| 21 | MCP + Permission Center | D | — |
| 22 | Agentes | D | skills orquestram tools |
| 23 | Developer mode | D | — |
| 24 | Ollama + offline | D | — |
| 25 | Research, Study, Notes, Tasks | E | — |
| 26 | Voice Mode | E | — |
| 27 | Plugins + marketplace | E | — |
| 28 | Sync opcional | E | — |
| 29 | Team / Enterprise | E | — |

**Gate de produto após Wave 8:** só avançar pesado em V1 se a hipótese for verdadeira no uso real (você + 2–3 pessoas). Waves 9–10 ainda assim entram: import e pacote portátil são o que torna a troca irreversível.

O que **não** entra no MVP (W0–W8), mesmo sendo tentador: RAG, Council, MCP, agentes, terminal, sync, team, voice, marketplace, artifacts, skills, @-mentions. Arquitetura deixa gancho; código não.

---

## Marco A — Foundation

### Wave 0 — Repo, shell, design system

**Objetivo:** o app Electron abre, hot reload, tema, layout esqueleto.  
**Depende de:** nada.

**Sub-tasks:**

- [ ] Init pnpm + Turborepo + TypeScript strict + ESLint + Prettier
- [ ] `apps/desktop` com electron-vite (main, preload, renderer)
- [ ] Layout: titlebar, sidebar, main pane, status bar (vazios, navegáveis)
- [ ] Tema dark / light / system; tokens; tipografia; densidade desktop
- [ ] shadcn/ui + base: Button, Input, Dialog, Tooltip, Command, ScrollArea
- [ ] i18n pt-BR / en com chaves do chrome
- [ ] `.gitignore`, EditorConfig, script `pnpm dev` / `pnpm build`
- [ ] CI GitHub Actions: lint + typecheck
- [ ] README de setup local

**DoD:** `pnpm dev` abre janela no Windows; tema troca; nenhum secret no renderer; CSP no renderer.

---

### Wave 1 — Trust boundary, DB, segurança

**Objetivo:** persistência local criptografada + IPC seguro. O schema **já nasce** pronto para diferenciais.  
**Depende de:** Wave 0.

**Sub-tasks:**

- [ ] Schema Drizzle mínimo:
  - `projects`, `conversations`, `messages`
  - `message_receipts`
  - `message_branches` (ou `messages.parent_id` + `messages.branch_id`)
  - `providers`, `provider_keys` (só metadata mascarada — secret no keytar)
  - `settings`, `tags`, `conversation_tags`
  - `spend_caps`, `health_samples` (tabelas vazias ok, contrato existe)
  - `import_jobs` (contrato; implementação na W9)
  - `context_packets` (contrato; implementação na W10)
- [ ] Migrations versionadas
- [ ] FTS5 nas mensagens (pode popular de verdade na W6)
- [ ] `packages/security`: keytar wrapper; envelope encryption; redaction regex (API keys, tokens, `sk-`, Bearer)
- [ ] Preload com API explícita; Zod em **todo** IPC
- [ ] Repos: CRUD projeto / conversa / mensagem
- [ ] Sem logs de secrets; Content-Security-Policy; renderer sem `fs`/`net`/`child_process`

**DoD:** criar projeto/conversa sobrevive a restart; keys nunca em SQLite; renderer não importa Node APIs; schema aceita `parent_id` nulo (conversa linear) e não-nulo (ramo).

---

### Wave 2 — AI Gateway + crash-safe streaming + receipts + Compiler v0

**Objetivo:** um adapter real, contrato de provider, os engines de D1/D10/D12.  
**Depende de:** Wave 1.

**Sub-tasks:**

- [ ] Interface `ProviderAdapter`: `listModels`, `chatStream`, `testConnection`, `capabilities`
- [ ] Adapter OpenAI (chat + streaming + abort)
- [ ] Context Compiler v0: system + history + project instructions → `ProviderAgnosticPacket`
- [ ] Receipt writer: model, provider, tokens in/out, latency, estimated cost (catálogo local JSON)
- [ ] Catálogo inicial de preços/modelos versionado em `packages/shared`
- [ ] Error taxonomy: timeout, rate limit, auth, context overflow, insufficient quota, network
- [ ] Crash-safe: flush parcial da assistant message a cada batch; estado `streaming | interrupted | complete | aborted`
- [ ] Persistência do receipt mesmo em erro (tokens parciais se existirem)
- [ ] Vitest com fixtures de stream (sem rede)

**DoD:** mensagem de teste contra OpenAI (key no Keychain) faz stream em UI de debug; abort persiste parcial; reabrir mostra `interrupted`; receipt gravado; packet v0 inspecionável em log de debug (sem secrets).

---

## Marco B — MVP (hipótese) + MVP+ (troca irreversível)

### Wave 3 — Chat core

**Objetivo:** conversa utilizável no dia a dia. Linear nesta onda; o grafo entra na W4.  
**Depende de:** Wave 2.

**Sub-tasks:**

- [ ] Nova conversa / lista / histórico
- [ ] Composer: Enter envia, Shift+Enter quebra linha, Stop, modelo no header
- [ ] Streaming na bolha; Markdown + syntax highlight + copy em code block
- [ ] Copiar resposta, regenerar (ainda substitui — W4 transforma em irmão)
- [ ] Editar mensagem do user (ainda rebase linear — W4 transforma em ramo)
- [ ] Estados: empty, sending, streaming, error, aborted, interrupted
- [ ] Restore de sessão (última conversa)
- [ ] Acessibilidade: foco, atalhos básicos, contraste
- [ ] Playwright: enviar mensagem mockada → bolha assistente aparece

**DoD:** ciclo local: escrever → stream → markdown → stop → reabrir no mesmo ponto, inclusive se o stream foi interrompido.

---

### Wave 4 — Conversation branching

**Objetivo:** a conversa vira um grafo. D4 completo.  
**Depende de:** Wave 3.

**Sub-tasks:**

- [ ] Modelo: `parent_id`, `branch_id`, `is_active_branch`
- [ ] Regenerar cria **irmão** da assistant message; UI “2 alternativas”
- [ ] Editar user message cria ramo; ramo antigo permanece
- [ ] Navegar irmãos (← →) sem perder o outro caminho
- [ ] Painel “Árvore”: nós, nomes de ramo opcionais, voltar a um nó
- [ ] Composer sempre envia no ramo ativo
- [ ] Compiler usa só o path ativo (raiz → folha)
- [ ] Export do ramo ativo; opção avançada “exportar árvore JSON”
- [ ] Testes: 3 ramos, switch, persistência após restart

**DoD:** usuário consegue testar duas respostas no mesmo ponto, voltar, e continuar no ramo escolhido sem perder o outro.

---

### Wave 5 — Providers + OpenRouter + vault

**Objetivo:** BYOK de verdade. OpenRouter é first-class.  
**Depende de:** Wave 2 (adapters), Wave 3 (chat).

**Sub-tasks:**

- [ ] Adapters: Anthropic, Gemini, Groq, OpenAI-compatible custom
- [ ] Adapter **OpenRouter** first-class (list models, stream, pricing quando disponível)
- [ ] Tela Providers: conectar, mascarar key (`sk-…xxxx`), remover, testar conexão, status
- [ ] Multi-key por provider (label: work / personal)
- [ ] Model picker com catálogo: context window, vision, tools, preço
- [ ] Capability gating (esconder vision se o modelo não tem)
- [ ] Parâmetros: temperature, max tokens, system extra
- [ ] Key **nunca** reexibida inteira; rotate = apagar + criar
- [ ] Teste de conexão grava sample de health (W7 consome)

**DoD:** conectar ≥2 providers (um deles OpenRouter), testar, conversar com cada um; key nunca em SQLite nem no renderer.

---

### Wave 6 — Projetos, tags, busca, model switch

**Objetivo:** o projeto vira a unidade de trabalho; Compiler entra no caminho feliz.  
**Depende de:** Waves 3–5.

**Sub-tasks:**

- [ ] CRUD de projetos: nome, cor, instruções, modelo preferido, provider preferido
- [ ] Conversas pertencem a um projeto; inbox “Avulsas”
- [ ] Tags em conversas
- [ ] Busca FTS5 por título/mensagem (não RAG)
- [ ] Trocar modelo no meio da conversa via Compiler
- [ ] Aviso se context window estourar + ação “compactar histórico”
- [ ] Preview mínimo do packet (badge: N tokens estimados)
- [ ] Empty states; atalhos New Project / New Chat
- [ ] Instruções do projeto sempre entram no packet

**DoD:** 3 projetos; busca acha mensagem antiga; instruções entram no packet; GPT→Claude no mesmo fio **sem** o usuário colar resumo.

---

### Wave 7 — Receipts UI + spend caps + provider health

**Objetivo:** app de trabalho: transparência, freio de custo, diagnóstico.  
**Depende de:** Waves 2, 5, 6.

**Sub-tasks:**

- [ ] Receipt visível em toda assistant message (modelo, tokens, ms, custo)
- [ ] Detalhe do receipt (modal) sem secrets
- [ ] Agregado de custo na conversa e no projeto (header)
- [ ] Spend caps: por request, por dia, global
- [ ] Aviso 80% / hard-stop 100%; override “permitir esta vez” com log local
- [ ] Estimativa pré-envio no composer quando houver preço no catálogo
- [ ] Status bar: health por provider (latência, erros, último status)
- [ ] Retry com backoff; timeout; rate limit UX
- [ ] Fallback **explícito** (nunca silencioso): “Claude fora → tentar GPT?” — sugestão usa health
- [ ] Tela Debug/Observability (meta da request, retries, sem headers de auth)
- [ ] Tratamento: modelo inexistente, contexto estourado, sem crédito, offline

**DoD:** desligar rede / key inválida → UX clara; cap bloqueia envio; receipt bate com o provider; health reflete a última falha; fallback pede confirmação.

---

### Wave 8 — Onboarding <90s + installer + ship MVP

**Objetivo:** outra pessoa instala e tem first token em menos de 90 segundos.  
**Depende de:** Waves 3–7.

**Sub-tasks:**

- [ ] First-run wizard: idioma → 1 provider (OpenRouter em destaque, nativos ao lado) → teste → primeira pergunta
- [ ] Medir TTFT do wizard em dev; cortar passos se >90s no caminho feliz
- [ ] Auto-redaction no composer (aviso se colar `sk-` / token)
- [ ] electron-builder NSIS (Windows); ícone; app id
- [ ] Auto-update (GitHub Releases ou generic)
- [ ] Crash reporter **opt-in**, sem PII, sem conteúdo de conversa
- [ ] Checklist UAT do MVP (seção 8 deste doc)
- [ ] README: limitações do MVP (sem macOS signed, sem RAG, sem MCP)

**DoD:** instalador Windows; wizard até primeira resposta; update check; escopo §47 coberto (exceto build macOS assinado).

**Gate:** usar 1 semana de verdade antes de inflar o escopo. W9–W10 ainda são o fechamento da troca de plataforma.

---

### Wave 9 — Import Hub

**Objetivo:** zerar o custo de migração. D2 completo.  
**Depende de:** Waves 6–8.

**Sub-tasks:**

- [ ] Parser ChatGPT export (ZIP/JSON `conversations.json`)
- [ ] Parser Claude export (formato oficial disponível; senão HTML/JSON documentado)
- [ ] Parser Gemini best-effort + nota de limitações
- [ ] Job de import: progresso, cancelar, relatório (ok / skip / erro)
- [ ] Idempotência por hash da conversa origem (`provider + external_id`)
- [ ] Destino: projeto escolhido ou inbox “Importadas”
- [ ] Mapear mensagens user/assistant; timestamps; título
- [ ] Receipts das importadas: `source=import`, custo `null`
- [ ] Não importar attachments binários nesta onda (placeholder “arquivo não importado”)
- [ ] Testes com fixtures reais anonimizados (pequenos)

**DoD:** um export real de ChatGPT vira conversas navegáveis no Hub, sem duplicar no reimport.

---

### Wave 10 — Portable Context Packet

**Objetivo:** o contexto é um artefato, não um efeito colateral do chat. D1 completo.  
**Depende de:** Waves 2, 6, 9.

**Sub-tasks:**

- [ ] Schema `context_packets`: payload JSON versionado, token estimate, privacy mode, origem
- [ ] Preview rico pré-envio: o que entra / o que não entra / tokens / destino
- [ ] Compactação: sumarizar ramos inativos, cortar mensagens antigas, manter pins
- [ ] Export packet (arquivo `.aihub-packet.json`)
- [ ] Import packet para outro projeto
- [ ] “Usar este packet nesta conversa” (substitui o compile ad hoc)
- [ ] Compatibilidade: packet não contém API keys nem conteúdo de outros projetos
- [ ] Testes de contrato do JSON (versionamento v1)

**DoD:** exportar packet no Projeto A, importar no Projeto B, continuar a tarefa em outro modelo com preview visível.

**DoD Marco B+:** MVP shippável + import + contexto portátil. Hipótese do §60 testável de verdade.

---

## Marco C — V1 (workspace, produtividade, inteligência)

### Wave 11 — Teclado-primeiro

**Depende de:** Wave 8.

**Sub-tasks:**

- [ ] Command Palette `Ctrl/Cmd+K`: nova conversa, modelo, projeto, export, providers, settings, import
- [ ] Cheatsheet de atalhos (in-app)
- [ ] Slash commands no composer: `/model`, `/clear`, `/compact`, `/packet`, `/cap`
- [ ] Paleta busca conversas/projetos (FTS)

**DoD:** usuário avançado usa o Hub 10 minutos sem mouse para os fluxos principais.

---

### Wave 12 — Arquivos e multimodal básico

**Depende de:** Wave 6.

**Sub-tasks:**

- [ ] Drag/drop: PDF, DOCX, TXT, MD, CSV, imagens, código
- [ ] Extração de texto; preview; armazenamento no projeto
- [ ] Imagem para modelos com vision (capability gate da W5)
- [ ] Pasta → resumo do projeto v1 (arquitetura, stack, deps, README)
- [ ] Limite de tamanho + aviso de tokens antes de injetar
- [ ] Arquivos passam pelo redactor antes de ir ao provider

**DoD:** arrastar um PDF e perguntar “resuma a seção 3”; arrastar pasta Node e obter stack detectada.

---

### Wave 13 — @-mentions

**Objetivo:** D6 completo.  
**Depende de:** Waves 11–12 (prompts ainda podem ser stub até W15; `@prompt` liga quando a library existir).

**Sub-tasks:**

- [ ] Trigger `@` no composer com autocomplete
- [ ] Tipos: `@file`, `@conversation`, `@memory` (stub até W14), `@prompt` (W15), `@skill` (W17), `@packet` (W10)
- [ ] Chip visual; backspace remove menção e o contexto
- [ ] Preview lateral: trecho + tokens estimados
- [ ] Compiler injeta menções de forma estruturada (não concatena no texto do usuário)
- [ ] Cap de tokens de menções; aviso se estourar

**DoD:** `@file:README.md o que este repo faz?` injeta só aquele arquivo; o texto visível não vira um dump.

---

### Wave 14 — RAG + memória + Conversation Workspace

**Depende de:** Waves 12–13.

**Sub-tasks:**

- [ ] Chunking + embeddings (local se possível; senão API **explícita** e paga no cap)
- [ ] Retrieval por projeto; citações na resposta (link para o chunk/arquivo)
- [ ] Memória por projeto: sugerir salvar, editar, apagar, opt-out
- [ ] `@memory` passa a resolver de verdade
- [ ] Workspace da conversa: resumo, decisões, pins, tarefas extraídas
- [ ] Duplicar conversa; transformar conversa → projeto
- [ ] Memórias entram no packet; modo Privado as exclui (W18 liga o modo)

**DoD:** projeto com 10 PDFs responde com citação; memória “usamos PostgreSQL” reaparece na conversa seguinte; usuário pode apagar a memória.

---

### Wave 15 — Prompt Library + Playground

**Depende de:** Waves 5, 11.

**Sub-tasks:**

- [ ] Library com pastas (Desenvolvimento, Estudos, Trabalho)
- [ ] Variáveis `{{project}}`, `{{language}}`, `{{goal}}`
- [ ] Inserir prompt no composer; `@prompt`
- [ ] Playground: mesmo prompt em N modelos, lado a lado
- [ ] Salvar a melhor versão na library
- [ ] Prompts de fábrica: code review, debug, resumo, professor

**DoD:** playground em 2 modelos; vencedor salvo; prompt com variáveis resolve contra o projeto ativo.

---

### Wave 16 — Artifacts canvas

**Objetivo:** D5 completo.  
**Depende de:** Wave 3 (markdown), Wave 15 ajuda mas não é bloqueante.

**Sub-tasks:**

- [ ] Detector de artifact na resposta (fence `mermaid`, `html`, doc longo, código >N linhas)
- [ ] Painel split chat | canvas
- [ ] Render: Markdown doc, Mermaid, HTML sandbox (sem rede)
- [ ] Code artifact: highlight + copy; **sem** execução nativa nesta onda
- [ ] Versionamento do artifact (v1, v2…)
- [ ] Pin no projeto; export MD/HTML/SVG (mermaid)
- [ ] Abrir artifact antigo a partir do workspace da conversa

**DoD:** “desenhe a arquitetura deste fluxo” abre Mermaid editável/versionado ao lado do chat.

---

### Wave 17 — Skills / workflows

**Objetivo:** D8 completo (tools entram na W22).  
**Depende de:** Waves 11, 15, 13.

**Sub-tasks:**

- [ ] Entidade Skill: nome, descrição, prompt, modelo preferido, menções padrão, `steps[]`
- [ ] CRUD + pastas; skills de fábrica (Code Review, Resumir PDF, Preparar reunião, Explicar erro, Escrever RFC)
- [ ] Rodar via palette, `/skill`, atalho, menção `@skill`
- [ ] UI de execução: passo atual (mesmo sem tools: passos são seções do prompt)
- [ ] Skill respeita spend cap e privacy mode
- [ ] Contrato JSON versionado para no futuro ligar MCP/tools

**DoD:** `/skill Code Review` + `@file:diff` produz revisão no formato da skill, no modelo configurado.

---

### Wave 18 — Privacy Center + Context Firewall + Cost Tracker

**Depende de:** Waves 7, 12, 14.

**Sub-tasks:**

- [ ] Pre-flight: o que será enviado / o que não será (modelo, arquivos, memórias, packet)
- [ ] Modos Privado / Normal / Máximo — alteram o Compiler
- [ ] Firewall: secrets, CPF, e-mail, tokens → Bloquear / Mascarar / Permitir
- [ ] Prompt-injection heuristics básicas (instruções em arquivo colado)
- [ ] Dashboard mensal: tokens, requests, custo por modelo/projeto
- [ ] Alerta 80% do cap; caps **por projeto** e por provider (além dos globais da W7)
- [ ] Privacy Center como settings, não modal em todo send (pre-flight compacto no composer)

**DoD:** colar `sk-` é mascarado; modo Privado não manda memórias nem outros arquivos do projeto; dashboard fecha com os receipts.

---

### Wave 19 — Superpoderes desktop

**Depende de:** Waves 8, 11.

**Sub-tasks:**

- [ ] Quick AI overlay global `Ctrl+Shift+Space` (caixa pequena, modelo, Enter)
- [ ] Overlay pode “mandar para o projeto atual” ou “avulsa”
- [ ] Clipboard Intelligence: JSON → formatar / explicar / interface TS; stack trace → diagnosticar
- [ ] Seleção contextual “Ask AI” (Windows; macOS quando houver signed build)
- [ ] Tray icon; app em background; quit vs hide
- [ ] Não quebrar o cap: overlay também estima e respeita spend cap

**DoD:** com o Hub minimizado, atalho global pergunta e devolve resposta; copiar JSON oferece ações.

---

### Wave 20 — Multi-modelo, Council, Router

**Depende de:** Waves 4, 5, 7, 10.

**Sub-tasks:**

- [ ] Comparação side-by-side (N modelos, mesma pergunta, mesmo packet)
- [ ] Highlight de divergência (não só duas colunas)
- [ ] Cada coluna é um ramo da W4
- [ ] AI Council: papéis (Arquiteto, Revisor, Segurança, UX…); síntese final por um modelo escolhido
- [ ] Model Router: modo Automático com **motivo + custo + velocidade**; usuário confirma
- [ ] Smart Cost Router: simples → barato; código difícil → frontier; **sempre visível e overridable**
- [ ] Council e comparação respeitam spend cap (estimar N× antes de disparar)

**DoD:** uma pergunta gera debate visível + síntese; router explica “por que Claude” e o usuário pode recusar.

**DoD V1:** escopo §48 + D1–D12. Workspace de verdade.

---

## Marco D — V2 (agentes e local)

### Wave 21 — MCP + Permission Center

**Depende de:** Waves 17–18.

**Sub-tasks:**

- [ ] Tool Router interno; MCP client (stdio / sse)
- [ ] Permissões: uma vez / sempre neste projeto / negar
- [ ] Confirmação extra para destrutivo (delete, overwrite em massa)
- [ ] Conectores iniciais: filesystem **scoped ao projeto**, 1 MCP de referência
- [ ] Tool calls na observabilidade (nome, args redigidos, resultado truncado)
- [ ] Skills podem declarar tools permitidas (contrato da W17)

**DoD:** agente/chat lê arquivo do projeto via MCP só depois de “Permitir uma vez”; negar funciona.

---

### Wave 22 — Agentes

**Depende de:** Wave 21.

**Sub-tasks:**

- [ ] Plano de etapas visível; pause / cancel / max steps / budget (liga no spend cap)
- [ ] Agente de fábrica: “analisar este projeto” (ler → mapear → report em artifact)
- [ ] Loop infinito impossível: teto de steps + teto de custo + teto de tempo
- [ ] Cada step é inspecionável; falha de tool não engole o plano
- [ ] Skill com `steps[]` passa a executar tools de verdade quando declaradas

**DoD:** usuário acompanha 6 passos num relatório, cancela no 3, estado persiste.

---

### Wave 23 — Developer mode

**Depende de:** Waves 12, 21–22.

**Sub-tasks:**

- [ ] Explorer, terminal integrado, Git status/diff
- [ ] AI Code Review no diff (bug, security, perf, smell, manutenibilidade)
- [ ] Geração de testes / explicação de arquitetura via skills + tools
- [ ] Terminal e git passam pelo Permission Center
- [ ] Review vira artifact + opcionalmente comentários por arquivo

**DoD:** abrir um repo, pedir review do `git diff`, receber findings acionáveis sem o agente commitar sozinho.

---

### Wave 24 — Ollama + offline

**Depende de:** Waves 5, 14.

**Sub-tasks:**

- [ ] Adapter Ollama; detecção de daemon; listar modelos locais
- [ ] Embeddings locais para RAG offline
- [ ] Modo offline explícito: o que funciona / o que não (badge)
- [ ] Fallback local quando a internet cai — **com aviso** (nunca silencioso)
- [ ] Receipts de modelos locais: custo `0`, latency real

**DoD:** desligar Wi-Fi, conversar com Llama local, RAG do projeto continua nos PDFs já indexados.

**DoD V2:** escopo §49 menos sync (Wave 28). MCP + um agente confiável + Git/terminal + Ollama.

---

## Marco E — V3 (ecossistema)

### Wave 25 — Research, Study, Notes, Tasks

**Depende de:** Waves 14, 16, 20.

**Sub-tasks:**

- [ ] Research Mode: plano → fontes → síntese → relatório citável (artifact)
- [ ] Study Mode: professor / examinador / tutor / avaliador
- [ ] AI Notes: resposta → nota (projeto, tags, data)
- [ ] AI Tasks: resposta → checklist persistente no projeto
- [ ] Notes/Tasks no workspace e na busca

**DoD:** “pesquisa X” gera relatório com fontes; “vire tarefas” cria checklist editável.

---

### Wave 26 — Voice Mode

**Depende de:** Wave 8. Prioridade **depois** de W25. Diferencial menor que Compiler/Packet.

**Sub-tasks:**

- [ ] STT → LLM → TTS
- [ ] Conversa contínua, interrupção, histórico
- [ ] Escolha de voz; fallback se STT/TTS for cloud (aviso de privacidade)
- [ ] Respeita modo Privado (não gravar áudio em disco sem opt-in)

**DoD:** hands-free de uma pergunta; usuário vê o transcript e o receipt.

---

### Wave 27 — Plugins + marketplace

**Depende de:** Wave 21.

**Sub-tasks:**

- [ ] API de extensão estável (manifest, permissões, sandbox)
- [ ] Marketplace interno: providers + MCP packs + skills
- [ ] Custom OpenAI-compatible como “adicione qualquer endpoint”
- [ ] Plugin não acessa keytar direto; só APIs do core
- [ ] Um plugin interno real (ex.: GitHub MCP pack) antes de abrir a terceiros

**DoD:** instalar um pack MCP pelo marketplace interno e usar no projeto com Permission Center.

---

### Wave 28 — Sync opcional

**Depende de:** Waves 10, 8. **Nunca** antes de export/import local confiável (W9–W10).

**Sub-tasks:**

- [ ] Sync seletivo: conversas / projetos / settings / packets / skills
- [ ] **Nunca** sincronizar API keys
- [ ] E2E encryption; conflito LWW por entidade + aviso
- [ ] Windows ↔ macOS
- [ ] Opt-in explícito; local-first permanece o default

**DoD:** dois dispositivos, mesmo projeto, conversa nova aparece; keys continuam só no OS de cada máquina.

---

### Wave 29 — Team / Enterprise

**Depende de:** Waves 18, 21, 28.

**Sub-tasks:**

- [ ] Orgs, projetos compartilhados, providers centralizados
- [ ] Governance: allowlist de modelos, bloqueio de PII, tool policy
- [ ] Audit log; cost limits por time
- [ ] Analytics agregado (opt-in)
- [ ] Billing **somente** se o negócio sair de BYOK puro — não assumir no código agora

**DoD:** escopo §50. Visão §58 (AI Operating Layer) é norte, não checklist de um trimestre.

---

## 6. Trilho transversal (desde a Wave 0)

Não é feature isolada. Recusar PR que quebre isto.

- Atalhos Cmd vs Ctrl; paths; Keychain; depois notarização Apple (onda de signed build pós-MVP Windows)
- Auto-update assinado
- Testes de contrato de cada adapter em CI (recordings, sem keys reais)
- Catálogo de preços/modelos versionado (JSON local + update opcional)
- Telemetria **opt-in** alinhada ao escopo §55: time to first response, providers conectados, conversas/projeto, fallback rate, custo/tarefa, TTFT do wizard
- i18n: string nova em pt-BR **e** en
- Acessibilidade: teclado, contraste, não depender só de cor no receipt/health

---

## 7. O que um sênior recusa no início

- Conta cloud obrigatória
- Chat “bonito” antes do vault de keys
- Agentes com filesystem irrestrito
- Split de 8 pacotes vazios
- Marketplace antes de 1 plugin interno real
- Sync antes de export/import local confiável (W9–W10)
- Voice como prioridade (custo alto, diferencial baixo vs Compiler/Packet)
- Troca **silenciosa** de modelo (viola custo e privacidade)
- Esconder receipt ou custo
- Tratar OpenRouter como “custom URL” escondida em vez de provider de primeira classe
- Apagar ramo antigo no regenerate
- Import que duplica conversas

---

## 8. Checklist UAT — MVP (Wave 8)

Cobertura do escopo §47 + diferenciais D3, D4, D7, D9, D10, D11, D12 (D1 v0, D2 ainda não).

**Desktop**

- [ ] Instala no Windows (NSIS)
- [ ] Abre, restaura sessão
- [ ] Auto-update check não quebra o app se o feed estiver fora

**Chat**

- [ ] Nova conversa, histórico, streaming, Markdown, code blocks
- [ ] Copiar, regenerar (irmão), editar (ramo), Stop
- [ ] Crash/kill no stream → parcial + `interrupted`

**Providers**

- [ ] OpenAI, Anthropic, Gemini, Groq, custom OpenAI-compatible, **OpenRouter**
- [ ] Teste de conexão; key mascarada; remover credencial

**Organização**

- [ ] Projetos, conversas, busca, tags
- [ ] Troca de modelo no fio com packet v0

**Segurança / transparência**

- [ ] Key no Keychain, não no SQLite
- [ ] Redaction básica no composer
- [ ] Receipt em toda resposta
- [ ] Spend cap bloqueia
- [ ] Health na status bar
- [ ] Fallback pede confirmação

**Onboarding**

- [ ] First token &lt; 90s no caminho feliz (1 provider)

**Ainda não no MVP (ok):** macOS signed, import Hub, packet portátil completo, arquivos/RAG, mentions, artifacts, skills, Quick AI, Council, MCP.

UAT extra **MVP+ (W9–W10):** import ChatGPT real; export/import de packet entre projetos.

---

## 9. Checklist UAT — V1 (Wave 20)

Escopo §48 + D1–D12 fechados.

- [ ] Arquivos, PDF, vision, pasta → resumo
- [ ] RAG com citações; memória editável
- [ ] @-mentions reais
- [ ] Prompt library + playground
- [ ] Artifacts (mermaid/html/md) versionados
- [ ] Skills de fábrica executáveis
- [ ] Privacy Center + Firewall
- [ ] Cost tracker + caps por projeto
- [ ] Command Palette + Quick AI + clipboard
- [ ] Comparação + Council + Router com confirmação
- [ ] Import Hub + Portable Packet

---

## 10. Modelo de dados (visão)

```text
User (local)
 ├── Projects
 │    ├── Conversations → Messages (grafo: parent_id, branch_id)
 │    │                      └── Receipts
 │    ├── Files → Chunks / Embeddings
 │    ├── Memories
 │    ├── Instructions
 │    ├── Artifacts (versioned)
 │    ├── Notes / Tasks
 │    └── Spend caps (override)
 ├── Providers → Keys (metadata) + Models
 ├── Prompts / Skills / Packets
 ├── Import jobs
 ├── Health samples
 └── Settings (privacy mode, caps globais, i18n, telemetry opt-in)
```

Secrets: **somente** OS keychain. Packet JSON: sem keys. Sync futuro: sem keys.

---

## 11. Métricas de sucesso (ligar na telemetria opt-in)

Do escopo §55, mais as dos diferenciais:

| Métrica | Alvo de produto |
|---|---|
| Tempo até primeira resposta (wizard) | &lt; 90s |
| Providers conectados no first week | ≥ 1, ideal ≥ 2 |
| Conversas por projeto | projeto deixa de ser “pasta vazia” |
| Taxa de troca de modelo no mesmo fio | > 0 (senão o Compiler não está sendo usado) |
| Imports bem-sucedidos | ChatGPT import é o canal #1 de onboarding |
| Fallback silencioso | **0** |
| Requests bloqueados por cap vs surpresa na fatura | cap > surpresa |
| Crash com perda de stream | **0** (interrupted é sucesso) |

---

## 12. Princípios (não negociar)

1. Provider agnostic  
2. User owns the data  
3. Local-first  
4. Explicit permissions  
5. Transparent AI (modelo, custo, dados enviados, tools)  
6. Model independence (trocar modelo sem perder o projeto)  
7. **Contexto explícito** (menções e preview do packet; nada de magia opaca)  
8. **Nunca silencioso** em custo, fallback, privacidade ou execução de tool  

---

## 13. Ordem de implementação sugerida (resumo executivo)

1. Fundação que não mente: vault, IPC, DB, gateway, stream à prova de crash, receipt.  
2. Chat + ramos + BYOK (OpenRouter incluso) + projetos.  
3. Freio de custo, health, wizard &lt;90s, instalador Windows.  
4. Import + packet portátil — a troca de plataforma fica irreversível.  
5. Teclado, arquivos, @, RAG, memória.  
6. Prompts, artifacts, skills — o Hub vira ferramenta de trabalho.  
7. Privacy, custo, overlay desktop, council/router.  
8. MCP, agentes, Git/terminal, Ollama.  
9. Modos (research/study), voice, plugins, sync, team.

A visão final continua a do escopo §58: o usuário não pergunta “qual site de IA eu abro?”. Pergunta “o que eu preciso fazer?”. O AI Hub é a camada que resolve isso — com o modelo como peça trocável, o contexto como artefato, e o custo/privacidade sempre visíveis.
