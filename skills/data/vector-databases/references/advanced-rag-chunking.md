# Advanced RAG: Chunking & Re-ranking

## 1. The Naive Chunking Problem
In standard RAG (Retrieval-Augmented Generation), developers take a 100-page PDF, blindly chop it into 500-token chunks, embed them, and dump them into a Vector DB.
**The Problem**: A chunk might contain the sentence *"He successfully executed the maneuver."* Without the surrounding context (Who is 'he'? What maneuver?), the vector embedding is semantically useless. When the LLM retrieves this chunk, it hallucinates.

## 2. Semantic Chunking
Instead of chopping text by arbitrary character counts (e.g., every 1000 characters), semantic chunking algorithms analyze the text.
- They embed every single sentence.
- They calculate the cosine similarity between adjacent sentences.
- If the similarity drops sharply (a "valley" in the graph), it implies a shift in topic. The algorithm cuts the chunk exactly at that semantic boundary.

## 3. Parent-Child Chunking (Auto-merging)
To balance Search Accuracy vs. LLM Context:
- **Child Chunks**: Highly granular chunks (e.g., 100 tokens). They are embedded and placed in the Vector DB. Because they are small, the semantic density is high, resulting in highly accurate vector searches.
- **Parent Chunks**: The larger original document (e.g., 2000 tokens). 
- **The Workflow**: The DB searches for the Child. If it finds a match, it does *not* send the Child to the LLM. It retrieves the Parent document linked to that Child, providing the LLM with the full, rich context surrounding the specific hit.

## 4. Two-Stage Retrieval (Cross-Encoders)
Cosine Similarity (used by Vector DBs) is a "Bi-Encoder" approach. It embeds the Query and the Document separately and checks their angle. It is fast, but lacks deep semantic understanding of how the query words interact with the document words.

**The Solution: The Re-ranker Pipeline**
1. **Stage 1 (Vector Retrieval)**: The Vector DB uses HNSW to rapidly find the Top 100 most similar documents. (Fast, but messy).
2. **Stage 2 (Cross-Encoder Re-ranking)**: A specialized NLP model (like `Cohere Rerank` or `BGE-Reranker`) takes the user's Query and feeds it *alongside* each of the 100 documents simultaneously into a Transformer network. 
   - The Cross-Encoder applies deep self-attention between the Query words and the Document words.
   - It outputs a highly accurate relevance score.
   - It resorts the list and passes only the Top 5 to the ultimate LLM for generation.
