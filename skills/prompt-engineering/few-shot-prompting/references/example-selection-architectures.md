---
name: example-selection-architectures
description: >
  Comprehensive guide to architectural patterns
  for selecting and routing few-shot examples
  in prompt engineering.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [few-shot, architecture, selection]
---

# Example Selection Architectures for Few-Shot Prompting

## 1. Introduction and Core Algorithms

In the realm of large language models, few-shot prompting is a highly effective technique for adapting models to new tasks without updating their weights. However, the performance of few-shot prompting is highly dependent on the quality, relevance, and ordering of the examples provided in the context window. This document outlines the architectural patterns for dynamically selecting and managing these examples in a production environment.

The selection of examples can be formalized as a retrieval problem. Given an input query $Q$ and a pool of candidate examples $E = \{e_1, e_2, ..., e_n\}$, the goal is to select a subset $S \subset E$ of size $k$ that maximizes the probability of the model generating the correct output $Y$.

### 1.1 Semantic Search (Dense Retrieval)
Semantic search uses dense vector representations (embeddings) to compute the similarity between the input query and the candidate examples.
- **Algorithm**: Compute embeddings $v_Q$ and $v_{e_i}$ using an encoder model (e.g., text-embedding-ada-002). Calculate the cosine similarity $sim(v_Q, v_{e_i}) = \frac{v_Q \cdot v_{e_i}}{||v_Q|| ||v_{e_i}||}$.
- **Advantages**: Captures semantic meaning, handles paraphrasing and synonyms well.
- **Disadvantages**: Requires an embedding model, can be computationally expensive for very large pools.

### 1.2 Lexical Search (Sparse Retrieval)
Lexical search relies on exact word matches and term frequency.
- **Algorithm**: BM25 (Best Matching 25) is the standard algorithm. It scores examples based on the frequency of query terms in the example, weighted by the inverse document frequency (IDF) of the terms.
- **Advantages**: Fast, effective for keyword-heavy queries, no embedding model required.
- **Disadvantages**: Fails to capture semantic meaning, sensitive to exact phrasing.

### 1.3 Hybrid Search
Hybrid search combines the scores from both semantic and lexical search.
- **Algorithm**: Normalize the scores from both methods and combine them using a weighted sum: $score_{hybrid} = \alpha \cdot score_{semantic} + (1 - \alpha) \cdot score_{lexical}$.
- **Advantages**: Combines the strengths of both approaches, often yields the best results.

### 1.4 Diversity-Based Selection
Selecting only the most similar examples can lead to redundancy. Diversity-based selection aims to provide a diverse set of examples to cover different aspects of the task.
- **Algorithm**: Maximum Marginal Relevance (MMR). Iteratively select examples that are highly relevant to the query but dissimilar to the already selected examples.

## 2. Decision Matrices and Mathematical Models

Choosing the right architecture depends on the specific constraints of the application. The following decision matrix provides a guide:

```text
+-----------------------+-------------------------+-------------------------+-------------------------+
| Feature               | Semantic Search         | Lexical Search          | Hybrid Search           |
+-----------------------+-------------------------+-------------------------+-------------------------+
| Latency               | Medium-High             | Low                     | High                    |
| Cost                  | Medium (API calls)      | Low                     | Medium-High             |
| Recall                | High                    | Medium                  | Very High               |
| Setup Complexity      | Medium                  | Low                     | High                    |
| Best For              | Conceptual matching     | Exact term matching     | Production grade apps   |
+-----------------------+-------------------------+-------------------------+-------------------------+
```

### 2.1 MMR Formulation
The MMR algorithm balances relevance and diversity. In each iteration, it selects the example $e_i$ that maximizes:
$$ MMR = \lambda \cdot sim(Q, e_i) - (1 - \lambda) \cdot \max_{e_j \in S} sim(e_i, e_j) $$
Where $\lambda$ is a hyperparameter controlling the trade-off between relevance ($\lambda = 1$) and diversity ($\lambda = 0$).

## 3. Advanced Implementation (TypeScript)

The following TypeScript implementation demonstrates a robust hybrid selection architecture.

```typescript
import { cosineSimilarity } from 'mathjs';
import { BM25 } from 'bm25-node'; // Hypothetical library

export interface Example {
  id: string;
  input: string;
  output: string;
  embedding?: number[];
}

export interface SelectionConfig {
  k: number;
  alpha: number; // Weight for hybrid search (0 to 1)
  mmrLambda?: number; // Weight for MMR (0 to 1)
}

export class ExampleSelector {
  private bm25: BM25;

  constructor(
    private candidatePool: Example[],
    private embedder: (text: string) => Promise<number[]>
  ) {
    this.bm25 = new BM25();
    this.candidatePool.forEach(ex => this.bm25.addDocument(ex.input));
  }

  public async selectExamples(query: string, config: SelectionConfig): Promise<Example[]> {
    const queryEmbedding = await this.embedder(query);
    
    // Compute Semantic Scores
    const semanticScores = this.candidatePool.map(ex => ({
      example: ex,
      score: cosineSimilarity(queryEmbedding, ex.embedding!)
    }));

    // Compute Lexical Scores
    const lexicalScores = this.bm25.search(query);
    const lexicalScoreMap = new Map(lexicalScores.map(res => [res.id, res.score]));

    // Normalize Scores (simplified normalization)
    const maxSemantic = Math.max(...semanticScores.map(s => s.score));
    const maxLexical = Math.max(...Array.from(lexicalScoreMap.values()));

    // Combine Scores
    const combinedScores = semanticScores.map(ss => {
      const semScoreNorm = ss.score / (maxSemantic || 1);
      const lexScoreNorm = (lexicalScoreMap.get(ss.example.id) || 0) / (maxLexical || 1);
      const finalScore = config.alpha * semScoreNorm + (1 - config.alpha) * lexScoreNorm;
      
      return { example: ss.example, score: finalScore };
    });

    combinedScores.sort((a, b) => b.score - a.score);

    if (config.mmrLambda !== undefined) {
      return this.applyMMR(combinedScores, config.k, config.mmrLambda);
    }

    return combinedScores.slice(0, config.k).map(res => res.example);
  }

  private applyMMR(scoredExamples: {example: Example, score: number}[], k: number, lambda: number): Example[] {
    const selected: Example[] = [];
    const candidates = [...scoredExamples];

    while (selected.length < k && candidates.length > 0) {
      if (selected.length === 0) {
        selected.push(candidates.shift()!.example);
        continue;
      }

      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i].example;
        const relevance = candidates[i].score;
        
        // Calculate max similarity to already selected examples
        let maxSimToSelected = -Infinity;
        for (const sel of selected) {
          const sim = cosineSimilarity(candidate.embedding!, sel.embedding!);
          if (sim > maxSimToSelected) maxSimToSelected = sim;
        }

        const mmrScore = lambda * relevance - (1 - lambda) * maxSimToSelected;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      selected.push(candidates.splice(bestIndex, 1)[0].example);
    }

    return selected;
  }
}
```

## 4. Advanced Implementation (Python)

A parallel implementation in Python, utilizing popular data science libraries.

```python
import numpy as np
from typing import List, Dict, Optional
from rank_bm25 import BM25Okapi

class Example:
    def __init__(self, id: str, input_text: str, output_text: str, embedding: Optional[np.ndarray] = None):
        self.id = id
        self.input = input_text
        self.output = output_text
        self.embedding = embedding

class HybridExampleSelector:
    def __init__(self, candidate_pool: List[Example], embedder_func):
        self.candidate_pool = candidate_pool
        self.embedder_func = embedder_func
        
        # Initialize BM25
        tokenized_corpus = [doc.input.split(" ") for doc in self.candidate_pool]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def _cosine_similarity(self, v1: np.ndarray, v2: np.ndarray) -> float:
        return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

    def select_examples(self, query: str, k: int, alpha: float = 0.5, mmr_lambda: Optional[float] = None) -> List[Example]:
        query_embedding = self.embedder_func(query)
        tokenized_query = query.split(" ")

        # Semantic Scores
        semantic_scores = np.array([self._cosine_similarity(query_embedding, ex.embedding) for ex in self.candidate_pool])
        
        # Lexical Scores
        lexical_scores = np.array(self.bm25.get_scores(tokenized_query))

        # Normalize
        if np.max(semantic_scores) > 0:
            semantic_scores = semantic_scores / np.max(semantic_scores)
        if np.max(lexical_scores) > 0:
            lexical_scores = lexical_scores / np.max(lexical_scores)

        # Combine
        combined_scores = alpha * semantic_scores + (1 - alpha) * lexical_scores

        if mmr_lambda is not None:
            return self._apply_mmr(combined_scores, k, mmr_lambda)
        
        # Standard Top-K
        top_k_indices = np.argsort(combined_scores)[::-1][:k]
        return [self.candidate_pool[i] for i in top_k_indices]

    def _apply_mmr(self, initial_scores: np.ndarray, k: int, mmr_lambda: float) -> List[Example]:
        selected_indices = []
        candidate_indices = list(range(len(self.candidate_pool)))
        
        while len(selected_indices) < k and candidate_indices:
            if not selected_indices:
                best_idx = candidate_indices[np.argmax(initial_scores[candidate_indices])]
                selected_indices.append(best_idx)
                candidate_indices.remove(best_idx)
                continue
                
            mmr_scores = []
            for idx in candidate_indices:
                relevance = initial_scores[idx]
                
                # Max similarity to selected
                similarities = [self._cosine_similarity(self.candidate_pool[idx].embedding, self.candidate_pool[s_idx].embedding) for s_idx in selected_indices]
                max_sim = max(similarities)
                
                mmr_score = mmr_lambda * relevance - (1 - mmr_lambda) * max_sim
                mmr_scores.append((mmr_score, idx))
                
            # Select max MMR
            best_mmr_idx = max(mmr_scores, key=lambda x: x[0])[1]
            selected_indices.append(best_mmr_idx)
            candidate_indices.remove(best_mmr_idx)
            
        return [self.candidate_pool[i] for i in selected_indices]
```

## 5. Configuration Templates (YAML/JSON)

Proper configuration of the selection architecture is crucial for maintaining performance across different environments.

### 5.1 System Configuration Schema

```yaml
version: "1.0"
selector_architecture:
  mode: "hybrid" # Options: semantic, lexical, hybrid
  fallback_mode: "lexical"
  
  semantic_settings:
    embedding_model: "text-embedding-ada-002"
    dimension: 1536
    similarity_metric: "cosine"
    cache_ttl_seconds: 3600
    
  lexical_settings:
    algorithm: "bm25"
    tokenizer: "standard"
    stemming: true
    stop_words: "english"
    
  hybrid_settings:
    alpha: 0.7 # 70% semantic, 30% lexical
    normalization_strategy: "min-max"
    
  diversity_settings:
    enabled: true
    algorithm: "mmr"
    lambda: 0.5
    
  pool_management:
    max_pool_size: 10000
    update_frequency: "daily"
    eviction_policy: "lru"
    
  runtime:
    target_k: 5
    max_latency_ms: 200
    timeout_ms: 500
```

### 5.2 Example Schema Validation (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Example Selection Config",
  "type": "object",
  "properties": {
    "mode": {
      "type": "string",
      "enum": ["semantic", "lexical", "hybrid"]
    },
    "alpha": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "k": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50
    }
  },
  "required": ["mode", "k"]
}
```

## 6. Best Practices and Anti-patterns

### 6.1 Best Practices
1. **Pre-compute Embeddings**: Never compute embeddings for the candidate pool at runtime. Embeddings should be pre-computed and stored in a vector database (e.g., Pinecone, Weaviate, pgvector).
2.  **Monitor Latency**: Semantic search can introduce significant latency. Implement caching for frequent queries and set strict timeouts.
3.  **Tuning Alpha**: The optimal `alpha` value for hybrid search varies by task. Use an evaluation set to empirically determine the best value. Keyword-heavy tasks generally require a lower alpha.
4.  **Continuous Updates**: The candidate pool should be dynamic. Incorporate user feedback to add new, high-quality examples and remove confusing ones.
5.  **Context Window Limits**: Always calculate the total token count of the selected examples before appending them to the prompt. If the limit is exceeded, truncate the list of examples, not the individual examples.

### 6.2 Anti-patterns
- **Static Examples**: Hardcoding the same 5 examples for every query completely negates the benefits of a dynamic selection architecture and leads to brittle prompts.
- **Ignoring Diversity**: Selecting the absolute top-k most similar examples often results in retrieving 5 variations of the exact same scenario, providing no new information to the model.
- **Over-fetching**: Retrieving 50 examples when the context window can only hold 5 is a waste of compute and bandwidth.
- **Synchronous Embedding API Calls**: Blocking the main application thread while waiting for an external embedding API can cause severe performance bottlenecks. Always use asynchronous calls.

## 7. Deep Dive: Vector Database Integration

When the candidate pool exceeds a few thousand examples, keeping them in memory becomes unfeasible. At this point, integrating a vector database is mandatory.

### 7.1 Architecture Diagram

```text
+-------------+      Query      +-------------------+
| Application | --------------> | Example Selector  |
+-------------+                 +-------------------+
                                  |               |
                         1. Embed |               | 2. Lexical
                            Query |               |    Search
                                  v               v
                        +-------------+   +---------------+
                        | Embedding   |   | Lexical Index |
                        | API         |   | (e.g., Redis) |
                        +-------------+   +---------------+
                                  |
                      3. Semantic |
                           Search |
                                  v
                        +-------------+
                        | Vector DB   |
                        | (Pinecone,  |
                        |  Milvus)    |
                        +-------------+
```

### 7.2 Integration Considerations
- **Indexing Strategy**: Choose the right index type in your vector DB (e.g., HNSW for fast approximate nearest neighbor search).
- **Metadata Filtering**: Store metadata (e.g., task type, difficulty) alongside the vector. This allows for pre-filtering the candidate pool before performing the similarity search, drastically improving relevance and speed.

## 8. Conclusion

Implementing a robust example selection architecture is a critical step in moving few-shot prompting from an experimental technique to a production-ready system. By carefully balancing semantic and lexical search, and ensuring diversity through algorithms like MMR, developers can significantly improve the accuracy and reliability of their LLM applications.
