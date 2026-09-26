# ADR-W29-001-declarative-internal-marketplace

- **Status:** accepted
- **Onda:** W29
- **Data:** 2026-09-26
- **Deciders:** Codex / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O marketplace precisa instalar packs MCP e integrá-los ao Permission Center sem conceder acesso a keytar, Node ou ao renderer. Executar código de terceiros no processo do aplicativo não oferece isolamento adequado e não é necessário para o primeiro pack interno.

## Decisão

O marketplace desta onda é declarativo e interno. O catálogo é empacotado no processo principal; cada manifesto tem versão, tipo, permissões declaradas e não contém JavaScript, caminho executável ou segredo. A instalação persiste somente a identidade, versão, tipo e estado do pack. A execução continua em APIs do core, no main process.

O primeiro pack é `ai-hub.project-files`, que expõe a leitura MCP já limitada à raiz do projeto. A instalação não concede acesso: cada leitura segue a permissão por projeto e ferramenta já mediada pelo Permission Center. Packs de terceiros permanecem fora desta onda; requerem host isolado, verificação de assinatura e um capability broker próprios.

## Alternativas consideradas

- Executar JavaScript ou binários de packs: rejeitado por romper a fronteira de confiança.
- Baixar ou invocar `npx` para um GitHub MCP: rejeitado por introduzir execução remota não verificada e dependência externa.
- Usar o pack sem persistir a instalação: rejeitado porque não demonstraria o fluxo do marketplace.

## Consequências

- Não há acesso de pack a keytar, banco, rede ou preload.
- O catálogo interno pode crescer com providers, MCP packs e skills declarativos.
- Abertura a terceiros é trabalho futuro com uma fronteira de processo dedicada.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 29)
- `docs/reviews/W29/REVIEW.md`
- `docs/ADR/ADR-W22-001-project-scoped-mcp.md`
