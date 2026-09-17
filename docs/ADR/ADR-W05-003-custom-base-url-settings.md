# ADR-W05-003-custom-base-url-settings

- **Status:** accepted
- **Onda:** W05
- **Data:** 2026-09-17
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O sub-task pede um adapter OpenAI-compatible custom. A chave continua no keytar. A URL do endpoint não é segredo, mas não deve viver na mesma linha que a chave nem ir para o renderer como secret.

## Decisão

Novo provedor `custom` (migração 0003). A URL fica em `settings` com chave `custom-base-url:{keyId}` (plaintext). O save IPC aceita `baseUrl` **só** para `custom`. O DTO devolve `endpointUrl` (máscara da chave inalterada). Rotação = apagar + criar; a chave inteira nunca é reexibida.

## Alternativas consideradas

- **Coluna em `provider_keys`:** mistura metadado de endpoint com a conta keytar; exigiria schema extra sem ganho de trust.
- **Pedir a URL em todo send:** frágil e vaza o endpoint para o fluxo de chat sem necessidade.

## Consequências

- `http` e `https` são aceites (localhost).
- Userinfo (`user:pass@`) e query tipo `api_key`/`token` são rejeitados no Zod e no repositório; URLs já gravadas com credenciais não são ecoadas no DTO nem usadas no fetch.
- Remover a chave apaga a URL correspondente.
- O renderer pode mostrar a URL; nunca a chave completa.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 5)
- `docs/ADR/ADR-W01-003-keytar-and-ipc-secrets.md`
