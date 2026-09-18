# ADR-W09-001-run-modes-and-agent-orchestration-waves

- **Status:** accepted
- **Onda:** W09
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O plano original amontoava “agentes” numa única Wave 22, depois de MCP. O produto precisa de orquestração (vários especialistas com handoff) e de uma superfície tipo Claude Code (modos, esforço/thinking, tokens ao vivo). Sem um lock agora, a tentação é pular o Import Hub (W09) ou fingir orquestração no Council (W20).

Esta ADR **não** implementa Import Hub nem agentes. Só trava o mapa futuro. ADRs de código da W09 (import) começam em `ADR-W09-002`.

## Decisão

1. **W21 — Run modes + HUD de tokens (D13).** `plan` | `assist` executáveis; chips `agent` / `orchestrate` visíveis e desabilitados até as ondas donas. Esforço `low`–`max` mapeia thinking/max tokens/temperatura — **nunca** troca de modelo em silêncio. HUD: tokens in/out/thinking/cache, contexto vs janela, custo da sessão. Thinking só se o adapter declarar capability.

2. **“Fine-tune” no sentido de produto = esforço + thinking + HUD.** Jobs de fine-tune / treino de pesos / LoRA **fora do Hub**. Modelo já fine-tunado pelo provider entra como id na Wave 5 (OpenRouter/custom).

3. **W22 MCP → W23 agente único → W24 orquestração (D14).** Council (W20) permanece N modelos / um packet / sem tools. Orquestração é grafo supervisor + especialistas, Permission Center, cap hard-stop, handoff inspecionável.

4. **Não pular W9–W21.** Orquestração sem MCP, permissões e um loop único é teatro. Filesystem de agente continua scoped ao projeto.

5. Marcos: C = W11–W21; D = W22–W26; E = W27–W31. Developer mode, Ollama, Research, Voice, Plugins, Sync, Team deslocam +2.

## Alternativas consideradas

- **Enfiar orquestração na W22 antiga:** uma onda inchada; loop único e multi-agente não compartilham DoD.
- **Orquestração = Council:** Council não tem tools, estado nem Permission Center.
- **HUD só na onda de agentes:** a sessão tipo Claude Code é útil no chat V1; W23 só desbloqueia `agent`.
- **Fine-tune ML no Hub:** contradiz BYOK local-first; o Hub não hospeda treino.
- **Implementar agora (pós-W08):** viola a ordem do plano; W09 (Import Hub) ainda é a próxima onda de código.

## Consequências

- Positivas: mapa honesto; D13/D14 não podem ser “depois”; Council e orquestração deixam de se confundir.
- Negativas: W21–W31 mudam de número em relação ao plano pré-2026-09-17; docs e skills de ADR passam a aceitar até W31.
- Riscos aceitos: schema `agent_runs` só nasce na W23 (não antecipar migration agora). Overlay da W19 precisará respeitar run mode quando W21 existir — correlação documentada no plano.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` §3, D13, D14, W21, W23, W24
- `docs/AI_Hub_Desktop_Escopo.md` §13, §48, §49
- `docs/STATUS.md` (próxima onda de código continua W09 Import Hub)
- Review desta decisão: não há `docs/reviews/W09/` ainda (W09 não fechada)
