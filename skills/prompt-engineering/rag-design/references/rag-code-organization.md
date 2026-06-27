# RAG CODE ORGANIZATION Reference Guide

## Purpose
This document provides an exhaustive, multi-faceted reference for rag code organization in Retrieval-Augmented Generation (RAG) architectures.
It covers algorithms, formulations, data schemas, code examples, configuration templates, decision matrices, and mathematical formulas.

## Iteration 1: Deep Dive into rag code organization

### 1.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 1.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-1
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 1.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 1
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 1
        return [];
    }
}
```

### 1.4 Configuration Templates
```json
{
  "iteration": 1,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 1.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 1.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 2: Deep Dive into rag code organization

### 2.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 2.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-2
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 2.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 2
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 2
        return [];
    }
}
```

### 2.4 Configuration Templates
```json
{
  "iteration": 2,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 2.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 2.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 3: Deep Dive into rag code organization

### 3.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 3.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-3
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 3.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 3
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 3
        return [];
    }
}
```

### 3.4 Configuration Templates
```json
{
  "iteration": 3,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 3.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 3.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 4: Deep Dive into rag code organization

### 4.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 4.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-4
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 4.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 4
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 4
        return [];
    }
}
```

### 4.4 Configuration Templates
```json
{
  "iteration": 4,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 4.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 4.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 5: Deep Dive into rag code organization

### 5.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 5.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-5
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 5.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 5
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 5
        return [];
    }
}
```

### 5.4 Configuration Templates
```json
{
  "iteration": 5,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 5.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 5.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 6: Deep Dive into rag code organization

### 6.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 6.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-6
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 6.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 6
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 6
        return [];
    }
}
```

### 6.4 Configuration Templates
```json
{
  "iteration": 6,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 6.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 6.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 7: Deep Dive into rag code organization

### 7.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 7.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-7
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 7.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 7
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 7
        return [];
    }
}
```

### 7.4 Configuration Templates
```json
{
  "iteration": 7,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 7.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 7.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 8: Deep Dive into rag code organization

### 8.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 8.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-8
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 8.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 8
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 8
        return [];
    }
}
```

### 8.4 Configuration Templates
```json
{
  "iteration": 8,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 8.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 8.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 9: Deep Dive into rag code organization

### 9.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 9.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-9
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 9.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 9
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 9
        return [];
    }
}
```

### 9.4 Configuration Templates
```json
{
  "iteration": 9,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 9.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 9.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 10: Deep Dive into rag code organization

### 10.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 10.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-10
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 10.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 10
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 10
        return [];
    }
}
```

### 10.4 Configuration Templates
```json
{
  "iteration": 10,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 10.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 10.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 11: Deep Dive into rag code organization

### 11.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 11.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-11
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 11.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 11
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 11
        return [];
    }
}
```

### 11.4 Configuration Templates
```json
{
  "iteration": 11,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 11.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 11.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 12: Deep Dive into rag code organization

### 12.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 12.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-12
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 12.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 12
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 12
        return [];
    }
}
```

### 12.4 Configuration Templates
```json
{
  "iteration": 12,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 12.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 12.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 13: Deep Dive into rag code organization

### 13.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 13.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-13
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 13.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 13
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 13
        return [];
    }
}
```

### 13.4 Configuration Templates
```json
{
  "iteration": 13,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 13.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 13.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 14: Deep Dive into rag code organization

### 14.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 14.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-14
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 14.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 14
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 14
        return [];
    }
}
```

### 14.4 Configuration Templates
```json
{
  "iteration": 14,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 14.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 14.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 15: Deep Dive into rag code organization

### 15.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 15.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-15
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 15.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 15
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 15
        return [];
    }
}
```

### 15.4 Configuration Templates
```json
{
  "iteration": 15,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 15.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 15.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 16: Deep Dive into rag code organization

### 16.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 16.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-16
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 16.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 16
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 16
        return [];
    }
}
```

### 16.4 Configuration Templates
```json
{
  "iteration": 16,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 16.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 16.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 17: Deep Dive into rag code organization

### 17.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 17.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-17
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 17.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 17
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 17
        return [];
    }
}
```

### 17.4 Configuration Templates
```json
{
  "iteration": 17,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 17.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 17.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 18: Deep Dive into rag code organization

### 18.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 18.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-18
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 18.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 18
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 18
        return [];
    }
}
```

### 18.4 Configuration Templates
```json
{
  "iteration": 18,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 18.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 18.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 19: Deep Dive into rag code organization

### 19.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 19.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-19
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 19.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 19
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 19
        return [];
    }
}
```

### 19.4 Configuration Templates
```json
{
  "iteration": 19,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 19.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 19.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 20: Deep Dive into rag code organization

### 20.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 20.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-20
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 20.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 20
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 20
        return [];
    }
}
```

### 20.4 Configuration Templates
```json
{
  "iteration": 20,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 20.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 20.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 21: Deep Dive into rag code organization

### 21.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 21.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-21
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 21.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 21
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 21
        return [];
    }
}
```

### 21.4 Configuration Templates
```json
{
  "iteration": 21,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 21.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 21.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 22: Deep Dive into rag code organization

### 22.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 22.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-22
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 22.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 22
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 22
        return [];
    }
}
```

### 22.4 Configuration Templates
```json
{
  "iteration": 22,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 22.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 22.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 23: Deep Dive into rag code organization

### 23.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 23.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-23
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 23.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 23
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 23
        return [];
    }
}
```

### 23.4 Configuration Templates
```json
{
  "iteration": 23,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 23.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 23.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 24: Deep Dive into rag code organization

### 24.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 24.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-24
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 24.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 24
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 24
        return [];
    }
}
```

### 24.4 Configuration Templates
```json
{
  "iteration": 24,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 24.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 24.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 25: Deep Dive into rag code organization

### 25.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 25.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-25
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 25.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 25
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 25
        return [];
    }
}
```

### 25.4 Configuration Templates
```json
{
  "iteration": 25,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 25.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 25.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 26: Deep Dive into rag code organization

### 26.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 26.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-26
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 26.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 26
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 26
        return [];
    }
}
```

### 26.4 Configuration Templates
```json
{
  "iteration": 26,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 26.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 26.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 27: Deep Dive into rag code organization

### 27.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 27.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-27
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 27.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 27
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 27
        return [];
    }
}
```

### 27.4 Configuration Templates
```json
{
  "iteration": 27,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 27.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 27.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 28: Deep Dive into rag code organization

### 28.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 28.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-28
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 28.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 28
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 28
        return [];
    }
}
```

### 28.4 Configuration Templates
```json
{
  "iteration": 28,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 28.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 28.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 29: Deep Dive into rag code organization

### 29.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 29.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-29
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 29.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 29
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 29
        return [];
    }
}
```

### 29.4 Configuration Templates
```json
{
  "iteration": 29,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 29.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 29.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 30: Deep Dive into rag code organization

### 30.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 30.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-30
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 30.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 30
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 30
        return [];
    }
}
```

### 30.4 Configuration Templates
```json
{
  "iteration": 30,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 30.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 30.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 31: Deep Dive into rag code organization

### 31.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 31.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-31
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 31.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 31
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 31
        return [];
    }
}
```

### 31.4 Configuration Templates
```json
{
  "iteration": 31,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 31.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 31.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 32: Deep Dive into rag code organization

### 32.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 32.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-32
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 32.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 32
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 32
        return [];
    }
}
```

### 32.4 Configuration Templates
```json
{
  "iteration": 32,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 32.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 32.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 33: Deep Dive into rag code organization

### 33.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 33.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-33
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 33.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 33
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 33
        return [];
    }
}
```

### 33.4 Configuration Templates
```json
{
  "iteration": 33,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 33.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 33.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 34: Deep Dive into rag code organization

### 34.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 34.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-34
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 34.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 34
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 34
        return [];
    }
}
```

### 34.4 Configuration Templates
```json
{
  "iteration": 34,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 34.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 34.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 35: Deep Dive into rag code organization

### 35.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 35.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-35
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 35.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 35
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 35
        return [];
    }
}
```

### 35.4 Configuration Templates
```json
{
  "iteration": 35,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 35.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 35.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 36: Deep Dive into rag code organization

### 36.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 36.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-36
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 36.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 36
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 36
        return [];
    }
}
```

### 36.4 Configuration Templates
```json
{
  "iteration": 36,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 36.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 36.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 37: Deep Dive into rag code organization

### 37.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 37.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-37
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 37.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 37
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 37
        return [];
    }
}
```

### 37.4 Configuration Templates
```json
{
  "iteration": 37,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 37.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 37.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 38: Deep Dive into rag code organization

### 38.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 38.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-38
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 38.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 38
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 38
        return [];
    }
}
```

### 38.4 Configuration Templates
```json
{
  "iteration": 38,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 38.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 38.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 39: Deep Dive into rag code organization

### 39.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 39.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-39
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 39.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 39
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 39
        return [];
    }
}
```

### 39.4 Configuration Templates
```json
{
  "iteration": 39,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 39.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 39.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 40: Deep Dive into rag code organization

### 40.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 40.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-40
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 40.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 40
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 40
        return [];
    }
}
```

### 40.4 Configuration Templates
```json
{
  "iteration": 40,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 40.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 40.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 41: Deep Dive into rag code organization

### 41.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 41.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-41
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 41.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 41
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 41
        return [];
    }
}
```

### 41.4 Configuration Templates
```json
{
  "iteration": 41,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 41.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 41.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 42: Deep Dive into rag code organization

### 42.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 42.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-42
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 42.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 42
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 42
        return [];
    }
}
```

### 42.4 Configuration Templates
```json
{
  "iteration": 42,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 42.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 42.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 43: Deep Dive into rag code organization

### 43.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 43.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-43
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 43.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 43
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 43
        return [];
    }
}
```

### 43.4 Configuration Templates
```json
{
  "iteration": 43,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 43.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 43.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 44: Deep Dive into rag code organization

### 44.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 44.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-44
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 44.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 44
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 44
        return [];
    }
}
```

### 44.4 Configuration Templates
```json
{
  "iteration": 44,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 44.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 44.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 45: Deep Dive into rag code organization

### 45.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 45.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-45
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 45.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 45
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 45
        return [];
    }
}
```

### 45.4 Configuration Templates
```json
{
  "iteration": 45,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 45.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 45.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 46: Deep Dive into rag code organization

### 46.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 46.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-46
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 46.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 46
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 46
        return [];
    }
}
```

### 46.4 Configuration Templates
```json
{
  "iteration": 46,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 46.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 46.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 47: Deep Dive into rag code organization

### 47.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 47.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-47
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 47.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 47
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 47
        return [];
    }
}
```

### 47.4 Configuration Templates
```json
{
  "iteration": 47,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 47.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 47.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 48: Deep Dive into rag code organization

### 48.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 48.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-48
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 48.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 48
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 48
        return [];
    }
}
```

### 48.4 Configuration Templates
```json
{
  "iteration": 48,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 48.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 48.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 49: Deep Dive into rag code organization

### 49.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 49.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-49
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 49.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 49
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 49
        return [];
    }
}
```

### 49.4 Configuration Templates
```json
{
  "iteration": 49,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 49.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 49.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 50: Deep Dive into rag code organization

### 50.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 50.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-50
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 50.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 50
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 50
        return [];
    }
}
```

### 50.4 Configuration Templates
```json
{
  "iteration": 50,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 50.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 50.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 51: Deep Dive into rag code organization

### 51.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 51.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-51
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 51.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 51
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 51
        return [];
    }
}
```

### 51.4 Configuration Templates
```json
{
  "iteration": 51,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 51.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 51.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 52: Deep Dive into rag code organization

### 52.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 52.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-52
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 52.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 52
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 52
        return [];
    }
}
```

### 52.4 Configuration Templates
```json
{
  "iteration": 52,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 52.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 52.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 53: Deep Dive into rag code organization

### 53.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 53.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-53
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 53.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 53
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 53
        return [];
    }
}
```

### 53.4 Configuration Templates
```json
{
  "iteration": 53,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 53.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 53.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.

## Iteration 54: Deep Dive into rag code organization

### 54.1 Algorithms and Formulations
The core algorithm involves encoding and retrieval.
Let $\mathcal{D}$ be the document corpus. The embedding function $E: \mathcal{D} \rightarrow \mathbb{R}^d$ maps documents to vectors.
For a query $q$, the retrieval function $\mathcal{R}(q, k)$ returns the top $k$ documents.
$$ \mathcal{R}(q, k) = \arg\max_{d \in \mathcal{D}, |S|=k} \sum_{d_j \in S} \text{sim}(E(q), E(d_j)) $$
This formulation is central to the retrieval stage.

### 54.2 Data Schemas (JSON/YAML)
```yaml
apiVersion: rag.system/v1
kind: RetrievalConfig
metadata:
  name: config-54
spec:
  vectorDb:
    type: milvus
    endpoint: http://milvus:19530
  embeddingModel:
    name: text-embedding-ada-002
    dimension: 1536
  topK: 10
```

### 54.3 Code Examples (Python, TypeScript)
```python
from typing import List
import numpy as np

class DocumentStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.vectors = []
        self.metadata = []

    def add(self, vector: np.ndarray, meta: dict):
        # Adding item 54
        self.vectors.append(vector)
        self.metadata.append(meta)

    def search(self, query: np.ndarray, k: int) -> List[dict]:
        if not self.vectors: return []
        vecs = np.vstack(self.vectors)
        scores = np.dot(vecs, query)
        top_indices = np.argsort(scores)[::-1][:k]
        return [self.metadata[idx] for idx in top_indices]
```
```typescript
interface DocumentMeta {
    id: string;
    source: string;
}

class VectorSearch {
    async search(queryVector: number[], k: number): Promise<DocumentMeta[]> {
        // Implementation for iteration 54
        return [];
    }
}
```

### 54.4 Configuration Templates
```json
{
  "iteration": 54,
  "retrievalStrategy": "hybrid",
  "semanticWeight": 0.7,
  "keywordWeight": 0.3,
  "chunkSize": 512,
  "chunkOverlap": 64
}
```

### 54.5 Decision Matrices
```text
+-------------------+-------------------+-------------------+
| Strategy          | Pros              | Cons              |
+-------------------+-------------------+-------------------+
| Dense Retrieval   | High Semantics    | Out of Domain Bad |
| Sparse Retrieval  | Exact Match       | Low Semantics     |
| Hybrid Retrieval  | Best of Both      | Slower, Complex   |
+-------------------+-------------------+-------------------+
```

### 54.6 Best Practices and Anti-patterns
- **Best Practice**: Always normalize vectors before ingestion.
- **Anti-pattern**: Storing full document text directly in the vector DB index instead of a separate document store.
- **Best Practice**: Implement a reranking step after initial retrieval to improve precision.