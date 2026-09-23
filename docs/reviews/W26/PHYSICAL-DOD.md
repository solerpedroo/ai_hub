# W26 — Prova física DoD

- Data: 2026-09-23T20:25:30-03:00
- Modelo: `llama3.2:1b`
- Runtime: `CUDA_VISIBLE_DEVICES=-1` / `OLLAMA_NUM_GPU=0` (CPU; GPU CUDA inválida nesta máquina — `device kernel image is invalid`)
- Adapter: Wi-Fi
- Modelos no daemon: `llama3.2:1b`
- Embeddings locais (`packages/memory` vitest): PASS

## Sequência

1. Wi-Fi desligado: **SIM** (elevado)
2. Reachability externa `1.1.1.1`: falhou (esperado offline)
3. Chat loopback `127.0.0.1:11434/api/chat`: **PASS**
   - Reply: `Local okay.`
   - Latency: 272 ms
   - Tokens in/out: 30/4
   - Cost no app: `0.000000`
4. Wi-Fi restaurado: **SIM**

## Veredito

- DoD físico (Wi-Fi off + Llama local): **PASS**
- RAG em PDFs já indexados: embeddings hashed locais independem de rede (**PASS** unitário + E2E fixture `offline.spec.ts` / `rag.spec.ts`)
