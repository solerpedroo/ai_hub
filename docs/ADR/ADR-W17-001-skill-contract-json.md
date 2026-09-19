# ADR-W17-001-skill-contract-json

- **Status:** accepted
- **Onda:** W17
- **Data:** 2026-09-19
- **Deciders:** agent / Pedro
- **Supersedes:** —
- **Superseded by:** —

## Contexto

D8 pede uma entidade Skill com `steps[]` e um contrato que a W23 possa ligar a MCP/tools sem reescrever a library. Não há tools nesta onda.

## Decisão

O contrato versionado é JSON `version: 1`, `kind: "skill"`, com `prompt`, `steps[]` (`id`, `title`, `section`), `defaultMentions[]` e `tools: []` (tuplo vazio). Os passos são secções do prompt, compostos numa única fatia `Applied skill:` no Compiler. Um run de skill é um `sendChat` (caps e `privacyMode` iguais ao chat).

## Alternativas consideradas

- **Um send por passo:** multiplicaria custo e caps; o plano diz que passos são secções do prompt.
- **Permitir `tools` já na v1:** half-build de W23.

## Consequências

- Positivas: W23 pode evoluir o contrato sem mudar a tabela.
- Negativas: o “passo atual” na UI é um stepper do SOP, não orquestração.
- Riscos aceitos: `tools: []` é só hook.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` Wave 17 / D8
- `docs/reviews/W17/REVIEW.md`
- ADR-W15-002 (`@prompt`), ADR-W13-002 (`@skill` stub)
