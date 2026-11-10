# Search & Retrieval Engineer

**Who this is for:** You build product search, relevance ranking and vector retrieval.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-search-patterns`](../../skills/backend/universal/search-patterns/SKILL.md) | `backend/universal/search-patterns` | Design search architecture with indexing strategy, query design, and relevance tuning. |
| [`data-search-engine`](../../skills/data/search-engine/SKILL.md) | `data/search-engine` | Design and configure search engine clusters for full-text search, log analytics, and real-time data exploration with proper indexing, query… |
| [`data-vector-databases`](../../skills/data/vector-databases/SKILL.md) | `data/vector-databases` | Store embedding vectors with metadata and return the nearest neighbors of a query vector fast enough for interactive use. |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`llm-rag-retrieval-internals`](../../skills/ai/llm-engineering/rag-architecture/SKILL.md) | `ai/llm-engineering/rag-architecture` | Retrieval quality caps RAG quality: the generator cannot use a passage that was never retrieved. |
| [`prompt-rag-query-design`](../../skills/prompt-engineering/rag-design/SKILL.md) | `prompt-engineering/rag-design` | User questions are often short, ambiguous, or compositional, and a single embedding search misses what they need. |
| [`backend-caching`](../../skills/backend/universal/caching/SKILL.md) | `backend/universal/caching` | Design consistent, production-grade caching layers. |
| [`data-streaming`](../../skills/data/streaming/SKILL.md) | `data/streaming` | Design streaming data pipelines with Kafka topic architecture, Flink/Kafka Streams processing, schema evolution, and reliability guarantees. |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ml-recommendation-systems`](../../skills/ml/recommendation-systems/SKILL.md) | `ml/recommendation-systems` | Rank items for a user (or context) so that they engage, buy, or return. |
| [`ml-nlp`](../../skills/ml/nlp/SKILL.md) | `ml/nlp` | Design NLP pipelines for text processing and transformer-based models with appropriate framework selection, model architecture, fine-tuning… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-search-patterns --skill data-search-engine --skill data-vector-databases --skill security-data-security
```

**Level 1 + 2 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill backend-search-patterns --skill data-search-engine --skill data-vector-databases --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill backend-caching --skill data-streaming --skill security-data-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`data-engineering`](../bundles.md#data-engineering) | 45 | Data engineering: pipelines, orchestration, streaming/CDC, lakes and lakehouses, warehousing, modeling, quality, governance |
| [`ai-engineering`](../bundles.md#ai-engineering) | 26 | AI engineering: LLM apps, RAG, prompting, fine-tuning, inference, vector search, agent harnesses |

## Combine with

- [LLM Application Developer](llm-app.md)
- [E-commerce Engineer](ecommerce.md)

## Watch out

Hybrid search (keyword + vector) with re-ranking is the default per `.claude/rules/rag-vector-standards.md`.
