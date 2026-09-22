# ADR-W23-002-persisted-bounded-agent-runs

- **Status:** accepted
- **Onda:** W23
- **Data:** 2026-09-21
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

Uma corrida de agente pode sobreviver à UI, parar por cap ou ser cancelada no meio. Estado em React não prova execução, não é recuperável após reinício e não permite auditar a ferramenta sem expor conteúdo de arquivos.

## Decisão

`agent_runs` e `agent_steps` registram a corrida e cada etapa com conteúdo/argumentos/resultados cifrados, status, limites de passos/orçamento/tempo e métricas. O main marca corridas ativas como interrompidas ao iniciar. Antes de cada etapa, o runner verifica teto de seis passos, orçamento da corrida e deadline; caps normais de chat continuam hard-stop em cada inferência, sem `__skipCaps` e sem fallback silencioso.

## Alternativas consideradas

- **Um JSON no settings ou no renderer:** recusado por não ser seguro nem recuperável.
- **Reusar somente receipts de chat:** recusado; não representa steps de tools, pausas e cancelamento.

## Consequências

- Pausar/cancelar deixa etapas restantes em estado terminal inspecionável.
- O relatório final é um artifact Markdown existente, ligado à corrida; não é preciso criar um formato paralelo.
- Resumos expostos ao renderer são redigidos e limitados; conteúdos de arquivo não são gravados em campos plaintext.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 23)
- `docs/ADR/ADR-W07-001-spend-caps-hard-stop.md`
- `docs/ADR/ADR-W16-001-artifacts-versioned-encrypted.md`
