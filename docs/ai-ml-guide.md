# AI/ML Skills Guide

## Overview
The AI/ML skill set covers the end-to-end lifecycle of AI-powered features: prompt engineering, RAG patterns, vector databases, LLM operations, AI agents, and evaluation. These skills are designed to compose together for complex AI workflows.

## Skill Map

| Skill | When to Use | Compose With |
|---|---|---|
| `ai/prompt-engineering` | Crafting system prompts, few-shot examples, output formatting | rag-patterns, llm-ops |
| `ai/rag-patterns` | Building retrieval-augmented generation pipelines | vector-databases, prompt-engineering |
| `ai/vector-databases` | Chunking, embedding, indexing, and similarity search | rag-patterns, ai-evals |
| `ai/llm-ops` | Model selection, cost tracking, latency optimization, guardrails | all AI skills |
| `ai/ai-agents` | Multi-step agentic workflows, tool use, memory, orchestration | rag-patterns, prompt-engineering |
| `ai/ai-evals` | Test datasets, metrics, regression testing, human evaluation | all AI skills |

## Decision Tree

```
Goal: Add AI to a feature?
├── Simple Q&A or classification → prompt-engineering
├── Answer over custom data → RAG (rag-patterns + vector-databases)
├── Multi-step autonomous workflow → ai-agents (+ RAG if external data)
├── Production deployment → llm-ops (+ evals)
└── Quality assurance → ai-evals
```

## Composition Patterns

### RAG Application
rag-patterns (retrieval strategy) → vector-databases (chunking, embedding, indexing) → prompt-engineering (context formatting, answer generation) → ai-evals (accuracy, relevance, hallucination rate)

### AI Agent Application
prompt-engineering (system prompt, tool descriptions) → ai-agents (tool execution, memory, planning) → rag-patterns (if agent needs external context) → llm-ops (cost tracking, rate limiting) → ai-evals (task completion rate, tool use accuracy)

## Best Practices
- Always define evaluation criteria before building the AI system — you cannot measure what you did not define
- RAG requires careful chunking strategy — chunk size, overlap, and embedding model choice directly impact retrieval quality
- Agents should have bounded tool sets — too many tools degrade decision quality
- LLM Ops guardrails (PII detection, content moderation, rate limits) are mandatory for production — not optional
- Test with representative data, not synthetic-only — real user queries surface edge cases no evaluation set catches
- Cost-per-query should be tracked from day one — a successful AI feature can become unexpectedly expensive
- Prompt changes are the highest-risk, lowest-cost changes — always version and evaluate prompt updates

## Tools Covered
- **Vector DBs**: Pinecone, Weaviate, Qdrant, Milvus, pgvector
- **LLM Providers**: OpenAI, Anthropic, Google, AWS Bedrock, Azure OpenAI, self-hosted (vLLM, TGI)
- **Frameworks**: LangChain, LlamaIndex, Haystack, AutoGen, CrewAI
- **Eval**: LangSmith, Weights & Biases, custom eval suites, human review
- **Guardrails**: Guardrails AI, NVIDIA NeMo Guardrails, custom PII filters

## Skills List
- `skills/ai/prompt-engineering/SKILL.md`
- `skills/ai/rag-patterns/SKILL.md`
- `skills/ai/vector-databases/SKILL.md`
- `skills/ai/llm-ops/SKILL.md`
- `skills/ai/ai-agents/SKILL.md`
- `skills/ai/ai-evals/SKILL.md`
