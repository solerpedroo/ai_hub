# ADR-W10-002-context-packets-apply

- **Status:** accepted
- **Onda:** W10
- **Data:** 2026-09-18
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A tabela `context_packets` existe desde W1 só como hook (`payload_cipher`, `token_estimate`). D1 pede persistir o pacote, importar noutro projeto e “usar este packet nesta conversa” no lugar do compile ad hoc.

## Decisão

Migration 7:

- `context_packets.privacy_mode`, `origin`, `version`
- `conversations.active_packet_id` (nullable)
- `messages.pinned` (0/1)

Payload no SQLite é o envelope portátil (JSON) **cifrado** (envelope AES-GCM, como o resto). DTO de lista: id, tokens, privacy, origin, labels, createdAt — **sem** payload. Apply só se `packet.projectId` é o mesmo da conversa (cópia importada para o projeto B).

Send com packet aplicado: `payload.messages` + mensagens da conversa criadas **depois** do apply; o grafo local continua a gravar os turnos novos. Clear remove só o ponteiro.

Export/import de ficheiro: diálogo no main + ticket opaco (mesmo padrão W9). e2e: `AI_HUB_E2E_PACKET_FILE`.

## Alternativas consideradas

- **Packet só em memória / settings:** perde-se no restart; o DoD pede artefato.
- **Apply injeta mensagens no grafo:** duplicaria o histórico e misturaria ids; rejeitado.
- **Permitir apply cross-project:** violaria “sem conteúdo de outros projetos”.

## Consequências

- Positivas: Projeto A → ficheiro → Projeto B → apply → outro modelo, sem “explica de novo”.
- Negativas: packet aplicado ignora ramos locais anteriores ao apply.
- Riscos aceitos: um packet grande cabe na row SQLite; sem compressão nesta onda.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 10
- `docs/ADR/ADR-W01-001-envelope-encryption-at-rest.md`
- `docs/ADR/ADR-W09-004-vendor-parsers-and-opaque-ticket.md`
- `docs/reviews/W10/REVIEW.md`
