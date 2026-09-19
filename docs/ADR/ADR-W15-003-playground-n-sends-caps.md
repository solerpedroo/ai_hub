# ADR-W15-003-playground-n-sends-caps

- **Status:** accepted
- **Onda:** W15
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O playground corre o mesmo prompt em N modelos lado a lado. Caps são hard-stop; fallback silencioso é proibido. `chat:send` só admite um stream por conversa.

## Decisão

- IPC `playground:run`: 2–4 slots (`providerKeyId` + `model`) explícitos. Cria uma conversa `kind=playground` por slot e chama `sendChat` em cada uma.
- Preflight: soma as estimativas e avalia caps **uma vez** contra N× custo. Se bloquear, nenhuma coluna dispara.
- `listConversations` / busca da paleta **excluem** `kind=playground` para não poluir a sidebar.
- Falha de um modelo: evento de erro dessa coluna; **não** troca o modelo. O user grava o vencedor na library (`prompts:create`).
- Sem council, sem orquestração, sem segundo LLM para “escolher o melhor”.

## Alternativas consideradas

- **N× `chat:send` só no renderer:** risco de duas avaliações 1× passarem o teto diário em paralelo (receipts ainda sem `costUsd`).
- **Persistir na conversa atual:** mistura playground com o chat do projeto e viola um-stream-por-conversa.

## Consequências

- Positivas: receipts e abort por coluna; mesmo caminho de caps do chat.
- Negativas: conversas playground acumulam na DB até o user/app limpar (sem GC nesta onda).
- Riscos aceitos: e2e usa mock; custo real N× não é exercitado com chaves reais.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 15
- `docs/reviews/W15/REVIEW.md`
- ADR-W07-001, ADR-W07-003
