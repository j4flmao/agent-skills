---
name: ai-rag-patterns
description: >
  Use this skill when building or optimizing Retrieval-Augmented Generation systems: chunking strategies, embedding model selection, vector search (dense/sparse/hybrid), retrieval re-ranking, context window management.
  This skill enforces: chunking strategy documentation, embedding model specification, retrieval configuration, re-ranking pipeline, context budget tracking.
  Do NOT use for: prompt engineering, fine-tuning, model evaluation, vector database operations.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, rag, phase-10]
---

# RAG Patterns Agent

## Purpose
Designs retrieval-augmented generation pipelines with optimal chunking, embedding selection, retrieval strategy, and context integration.

## Agent Protocol

### Trigger
User request includes: RAG, retrieval-augmented, embedding, vector search, chunking, hybrid search, re-ranker, context window, dense retrieval, sparse retrieval.

### Protocol
1. Clarify document type, corpus size, latency requirements, and LLM context window.
2. Select chunking strategy based on document structure and retrieval goals.
3. Choose embedding model balancing quality, speed, and dimensionality.
4. Configure retrieval pipeline: dense, sparse, or hybrid with weights.
5. Design re-ranking step to improve precision of top-k results.
6. Specify context assembly strategy within LLM token budget.

## Output
RAG pipeline configuration with chunking, embedding, retrieval specs.

### Response Format
```
## RAG Pipeline Configuration
### Chunking
Strategy: {method}
Chunk Size: {tokens} | Overlap: {tokens}
Chunk Metadata: {fields tracked}

### Embedding
Model: {name} | Dimensions: {N}
Distance Metric: {cosine/euclidean/dot}
Batch Size: {N} | Normalize: {true/false}

### Retrieval
Method: {dense/sparse/hybrid}
Top-K: {N} | Score Threshold: {value}
Hybrid Weights: {dense:N, sparse:N}

### Re-Ranking
Model: {name} | Top-N: {N}
Score Type: {reciprocal rank fusion / cross-encoder}

### Context Assembly
Max Chunks: {N} | Max Tokens: {N}
Format: {concatenated / structured / summary-first}
Overflow Strategy: {truncate / summarize / fail}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Chunking strategy matches document structure and retrieval goals.
- [ ] Embedding model selected with dimensionality and metric justified.
- [ ] Retrieval method configured (dense/sparse/hybrid) with top-k and threshold.
- [ ] Re-ranker specified if precision above top-5 is required.
- [ ] Context assembly respects LLM token budget with overflow strategy.
- [ ] Pipeline latency budget documented and achievable.

## Workflow

### Step 1: Document Analysis
Classify documents: unstructured text (markdown, PDF), semi-structured (HTML, JSON), structured (tables, code). Measure average doc length and corpus size. Note hierarchical structure that chunking must preserve.

### Step 2: Chunking Strategy
- Semantic chunking: split at paragraph/topic boundaries using embedding similarity. Best for long-form prose.
- Recursive chunking: split by separators (paragraph, sentence, word). Simple, reliable, language-agnostic.
- Sentence chunking: one sentence per chunk with N-sentence sliding window. Best for QA on factual content.
- Token chunking: fixed token count with overlap. Best for code or dense data.
- Document-level: no split. Use for documents under 1k tokens.

### Step 3: Embedding Model Selection
- Quality: text-embedding-3-large (3072d), Cohere embed-english-v3 (1024d), BGE-large (1024d).
- Speed: text-embedding-3-small (512d), intfloat/e5-small-v2 (384d), sentence-transformers/all-MiniLM-L6-v2 (384d).
- Sparse: SPLADE-v2, BM25 (keyword-based, no embedding needed).
- Multilingual: multilingual-e5-large, Cohere embed-multilingual-v3.

### Step 4: Retrieval Configuration
- Dense: best for semantic similarity. Use cosine distance. Dimension reduction via Matryoshka if needed.
- Sparse (BM25): best for keyword/entity matching. Complement to dense retrieval.
- Hybrid: weighted combination of dense + sparse scores. Typical weight: 0.5/0.5. Adjust based on corpus.
- MMR (Maximum Marginal Relevance): diversify results by penalizing similarity to already-selected items.

### Step 5: Re-Ranking
Apply cross-encoder re-ranker (Cohere rerank, BGE-reranker) to top 20-100 results. Re-rankers are slower but more accurate than bi-encoders. Output top 3-10 results after re-ranking.

### Step 6: Context Assembly
Build context within LLM token limit. Prioritize highest-scoring chunks. Track source metadata per chunk. Format as structured section with citations. Handle overflow by truncating lowest-score chunks.

## Rules
- Chunk size must fit within embedding model token limit (typically 512 tokens).
- Overlap must be at least 10% of chunk size to preserve boundary context.
- Hybrid search always beats pure dense or pure sparse on varied corpora.
- Re-ranking is mandatory when precision above top-5 matters.
- Context assembly must never exceed 50% of LLM context window.
- Track full provenance (doc ID, chunk index, source URL) per chunk.

## References
  - references/chunking-strategies.md — Chunking Strategies
  - references/rag-evaluation-metrics.md — RAG Evaluation Metrics
  - references/rag-hybrid.md — Hybrid RAG
  - references/rag-patterns-advanced.md — Rag Patterns Advanced Topics
  - references/rag-patterns-fundamentals.md — Rag Patterns Fundamentals
  - references/rag-production-deployment.md — RAG Production Deployment
  - references/retrieval-optimization.md — Retrieval Optimization
  - references/retrieval-techniques.md — Retrieval Techniques
## Handoff
For vector database deployment, hand off to `ai-vector-databases`. For prompt integration with retrieved context, hand off to `ai-prompt-engineering`.
