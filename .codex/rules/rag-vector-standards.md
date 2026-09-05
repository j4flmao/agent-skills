---
description: "j4flmao/rules — Mandatory standards when generating RAG or Vector Database code"
glob: "*"
---

# RAG & Vector Search Standards

Cursor/AI MUST follow these rules when writing code for Retrieval-Augmented Generation (RAG) or interacting with Vector Databases (Pinecone, Qdrant, Milvus, pgvector).

## 1. Hybrid Search is Mandatory
- **Rule**: Never implement a purely Dense Vector (Cosine Similarity) search unless explicitly commanded. You MUST implement Hybrid Search (Dense Vector + Sparse Keyword/BM25).
- **Why**: Dense vectors are terrible at exact keyword matching (e.g., searching for a specific product ID like `XJ-928` or a unique name). Combining Semantic Search with Keyword Search guarantees maximum recall.

## 2. Implement Re-ranking
- **Rule**: Standard pipeline implementation must include a Two-Stage Retrieval process.
  1. Fetch Top-K (e.g., 50) results using the Vector DB.
  2. Re-rank the results using a Cross-Encoder (e.g., Cohere Rerank) down to Top-N (e.g., 5) before passing them to the final LLM.

## 3. Forbid Naive Chunking
- **Rule**: Do not use blind character splitters (e.g., `RecursiveCharacterTextSplitter(chunk_size=1000)`). 
- **Alternative**: You must implement Semantic Chunking or Parent-Child Chunking (where the retrieved chunk is small, but the context returned to the LLM encompasses the larger parent document).
