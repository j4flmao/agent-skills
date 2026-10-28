---
description: "j4flmao/rules — Mandatory standards when generating RAG or Vector Database code"
glob: "*"
---

# RAG & Vector Search Standards

Cursor/AI MUST follow these rules when writing code for Retrieval-Augmented Generation (RAG) or interacting with Vector Databases (Pinecone, Qdrant, Milvus, Weaviate, pgvector).

## 1. Hybrid Search by Default
- **Rule**: Default to hybrid retrieval (dense vectors + sparse keyword/BM25), fused with Reciprocal Rank Fusion or weighted scores. Use dense-only search only when the user asks for it or an evaluation shows hybrid adds nothing for the corpus.
- **Why**: Dense embeddings handle paraphrase well but often miss exact tokens such as product IDs (`XJ-928`), error codes, and rare names. Keyword search catches these, so combining them improves recall.

## 2. Two-Stage Retrieval with Re-ranking
- **Rule**: Production pipelines retrieve wide, then re-rank narrow:
  1. Fetch Top-K candidates (e.g. 30–100) from the hybrid retriever, with metadata filters (tenant, ACL, date) applied **in the query**, not after it.
  2. Re-rank with a cross-encoder (e.g. Cohere Rerank, `bge-reranker`, Voyage rerank) down to Top-N (e.g. 3–8) before building the prompt.

## 3. Structure-Aware Chunking
- **Rule**: Do not split on raw character counts that cut through sentences, code blocks, or tables.
- **Action**: Split on document structure first (headings, paragraphs, code blocks, table rows), then by tokens with overlap (e.g. 10–20%). Use parent-child retrieval (small chunk retrieved, larger parent section returned) when answers need surrounding context. Semantic chunking is an option, not a default. Adopt it only if evaluation shows a gain.
- **Action**: Store source, section path, and version metadata with each chunk so answers can cite sources.

## 4. Measure It
- **Rule**: Ship a small labeled evaluation set (queries → expected sources). Track retrieval recall@k / MRR and answer faithfulness when changing the chunking, embedding model, or K. Re-embed the whole corpus when the embedding model changes; never mix vectors from different models in one index.
