# ADR-W05-004-connection-test-health-samples

- **Status:** accepted
- **Onda:** W05
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

A W5 pede teste de conexão que grava sample de health para a W7 consumir. A tabela `health_samples` já existia (hook W1) sem escrita.

## Decisão

IPC `secrets:test` recebe só `{ id }`. O main lê a chave no keytar, chama `adapter.testConnection`, grava `health_samples` (`ok`, `latency_ms`, `provider_slug`) e devolve `{ ok, latencyMs, errorCode }`. Sem secret, sem body de provider, sem mensagem crua no DTO.

## Alternativas consideradas

- **Ping HTTP genérico:** não valida o contrato de chat do adapter.
- **Guardar a mensagem de erro do provider:** risco de eco de chave; W7 usa ok/latência/código.

## Consequências

- A UI de Settings mostra o resultado imediato; a status bar de health é W7.
- Sample não inclui `error_code` na tabela (schema atual); o código vai só no resultado IPC.
- Caps (W7) ainda não bloqueiam send.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 5, Wave 7)
- `docs/ADR/ADR-W01-003-keytar-and-ipc-secrets.md`
