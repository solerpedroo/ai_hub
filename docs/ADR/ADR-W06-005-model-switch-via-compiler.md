# ADR-W06-005 — Troca de modelo no mesmo fio via Compiler

- **Status:** accepted
- **Onda:** W06
- **Data:** 2026-09-17
- **Deciders:** agent
- **Supersedes:** —
- **Superseded by:** —

## Contexto

O DoD pede GPT→Claude no mesmo fio sem o usuário colar um resumo. O Compiler v0 já monta o path ativo + instruções do projeto. Trocar de modelo não deve criar conversa nova nem pedir “explica de novo”.

## Decisão

Trocar modelo (ou chave/provider) na conversa aberta só altera o próximo `chat:send`. O main compila o path ativo com as instruções do projeto. Não há summarizer, fallback silencioso, nem reset do grafo. A UI avisa que o histórico será compilado para o modelo novo.

Preferências de projeto (`preferred_model`, `preferred_provider`) aplicam-se ao **selecionar o projeto**, e só se existir chave ativa daquele provider — sem cair em outro provider.

## Alternativas consideradas

- **Nova conversa ao trocar modelo:** força paste/resumo; rejeitado.
- **Fallback automático de chave:** muda custo/privacy sem confirmação; rejeitado.

## Consequências

- Positivas: DoD do model switch é o Compiler, não um feature paralelo.
- Negativas: o modelo novo vê o transcript cru, que pode ser longo (aviso de overflow da W6).
- Riscos aceitos: Claude e GPT interpretam o mesmo packet de forma diferente; isso é esperado.

## Referências

- `docs/IMPLEMENTATION_PLAN.md` (Wave 6)
- `docs/ADR/ADR-W04-003-compiler-active-path.md`
- `docs/reviews/W06/REVIEW.md`
