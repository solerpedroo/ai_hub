# ADR-W01-003-keytar-and-ipc-secrets

- **Status:** accepted
- **Onda:** W01
- **Data:** 2026-09-15
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

API keys não podem ir para SQLite, logs ou estado React persistente. O renderer precisa de um caminho para **guardar** uma chave (vault na W5). IPC que devolve a chave completa é proibido.

## Decisão

- Segredos só em **keytar** (`service = ai-hub`).
- `provider_keys` guarda metadata: label, last4, `keytar_account`, status — nunca o secret.
- IPC `secrets:save` aceita o secret **uma vez**, grava no keytar, devolve DTO mascarado (`sk-…xxxx`). Depois disso o renderer só vê máscara.
- IPC nunca lista secrets em claro. Logs passam por `redactSecrets`.
- A chave mestra da DB também está no keytar (`account = db-master-key`).

## Alternativas consideradas

- **Prompt nativo no main sem IPC:** UX pior, sem formulário React.
- **Não expor save até W5:** o wrapper existiria sem prova ponta-a-ponta; ainda assim o metadata e o keytar nascem agora.

## Consequências

- O secret atravessa o preload só no save; não fica em store Zustand.
- W5 reutiliza o mesmo canal, não inventa outro.

## Referências

- `.cursorrules` §5
- `docs/IMPLEMENTATION_PLAN.md` (Wave 1)
- `docs/reviews/W01/REVIEW.md`
