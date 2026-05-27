# Embedding Use Cases

## Overview
Embeddings transform text, images, audio, and other data into dense vector representations. Their applications span search, clustering, classification, recommendation, anomaly detection, and more. Choosing the right use case and implementation pattern is critical for success.

## Search and Retrieval

### Semantic Search
```python
import numpy as np
from sentence_transformers import SentenceTransformer

class SemanticSearcher:
    def __init__(self, model_name: str = "BAAI/bge-large-en-v1.5"):
        self.model = SentenceTransformer(model_name)
        self.documents = []
        self.embeddings = []

    def index_documents(self, documents: list[str]):
        self.documents = documents
        self.embeddings = self.model.encode(documents, normalize_embeddings=True)

    def search(self, query: str, k: int = 10, threshold: float = 0.0) -> list[dict]:
        query_embed = self.model.encode(query, normalize_embeddings=True)
        scores = np.dot(self.embeddings, query_embed)
        top_k = np.argsort(scores)[-k:][::-1]

        results = []
        for idx in top_k:
            if scores[idx] >= threshold:
                results.append({
                    "document": self.documents[idx],
                    "score": float(scores[idx]),
                    "rank": len(results) + 1,
                })
        return results

    def hybrid_search(self, query: str, bm25_weight: float = 0.3, k: int = 10):
        from rank_bm25 import BM25Okapi
        tokenized_docs = [doc.split() for doc in self.documents]
        bm25 = BM25Okapi(tokenized_docs)
        bm25_scores = bm25.get_scores(query.split())

        dense_scores = np.dot(self.embeddings, self.model.encode(query, normalize_embeddings=True))
        bm25_norm = bm25_scores / max(bm25_scores) if max(bm25_scores) > 0 else bm25_scores
        dense_norm = dense_scores / max(dense_scores) if max(dense_scores) > 0 else dense_scores

        hybrid = bm25_weight * bm25_norm + (1 - bm25_weight) * dense_norm
        top_k = np.argsort(hybrid)[-k:][::-1]

        return [
            {"document": self.documents[i], "score": float(hybrid[i])}
            for i in top_k
        ]
```

### Cross-Lingual Retrieval
```python
class CrossLingualRetriever:
    def __init__(self):
        self.model = SentenceTransformer("intfloat/multilingual-e5-large")

    def index_multilingual(self, documents: list[tuple[str, str]]):
        self.documents = []
        self.embeddings = []

        for text, lang in documents:
            prefix = "passage: " if lang != "en" else ""
            self.documents.append({"text": text, "lang": lang})
            embed = self.model.encode(f"{prefix}{text}", normalize_embeddings=True)
            self.embeddings.append(embed)

        self.embeddings = np.array(self.embeddings)

    def search(self, query: str, query_lang: str = "en", k: int = 10):
        prefix = "query: " if query_lang != "en" else ""
        query_embed = self.model.encode(f"{prefix}{query}", normalize_embeddings=True)
        scores = np.dot(self.embeddings, query_embed)
        top_k = np.argsort(scores)[-k:][::-1]

        return [{"document": self.documents[i], "score": float(scores[i])} for i in top_k]
```

## Clustering and Topic Modeling

### Document Clustering
```python
from sklearn.cluster import KMeans
from sklearn.manifold import TSNE

class DocumentClusterer:
    def __init__(self, n_clusters: int = 10):
        self.n_clusters = n_clusters
        self.model = None
        self.labels = None

    def cluster(self, documents: list[str], embeddings: np.ndarray) -> dict:
        kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        self.labels = kmeans.fit_predict(embeddings)
        self.model = kmeans

        clusters = {}
        for i, label in enumerate(self.labels):
            clusters.setdefault(int(label), []).append(documents[i])

        tsne = TSNE(n_components=2, random_state=42)
        coords = tsne.fit_transform(embeddings)

        return {
            "clusters": clusters,
            "labels": self.labels.tolist(),
            "coordinates": coords.tolist(),
            "silhouette_score": self._silhouette(embeddings),
        }

    def predict_cluster(self, embedding: np.ndarray) -> int:
        return int(self.model.predict([embedding])[0])
```

## Classification

### Zero-Shot Classification
```python
class ZeroShotClassifier:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def classify(self, text: str, labels: list[str]) -> dict:
        text_embed = self.model.encode(text, normalize_embeddings=True)
        label_embeds = self.model.encode(labels, normalize_embeddings=True)
        scores = np.dot(label_embeds, text_embed)

        results = [
            {"label": label, "score": float(score)}
            for label, score in zip(labels, scores)
        ]
        return sorted(results, key=lambda x: x["score"], reverse=True)

    def classify_batch(self, texts: list[str], labels: list[str]) -> list[dict]:
        text_embeds = self.model.encode(texts, normalize_embeddings=True)
        label_embeds = self.model.encode(labels, normalize_embeddings=True)
        scores = np.dot(text_embeds, label_embeds.T)

        results = []
        for i, text in enumerate(texts):
            predictions = [
                {"label": labels[j], "score": float(scores[i][j])}
                for j in range(len(labels))
            ]
            results.append(sorted(predictions, key=lambda x: x["score"], reverse=True))
        return results
```

## Recommendation

### Content-Based Filtering
```python
class ContentRecommender:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def fit(self, items: list[dict]):
        self.items = items
        texts = [f"{item['title']} {item.get('description', '')}" for item in items]
        self.embeddings = self.model.encode(texts, normalize_embeddings=True)

    def recommend(self, query: str, k: int = 5) -> list[dict]:
        query_embed = self.model.encode(query, normalize_embeddings=True)
        scores = np.dot(self.embeddings, query_embed)
        top_k = np.argsort(scores)[-k:][::-1]

        return [
            {**self.items[i], "score": float(scores[i])}
            for i in top_k
        ]

    def similar_items(self, item_id: int, k: int = 5) -> list[dict]:
        query_embed = self.embeddings[item_id]
        scores = np.dot(self.embeddings, query_embed)
        top_k = np.argsort(scores)[-(k + 1):][::-1]

        return [
            {**self.items[i], "score": float(scores[i])}
            for i in top_k if i != item_id
        ][:k]
```

## Anomaly Detection

```python
class EmbeddingAnomalyDetector:
    def __init__(self, contamination: float = 0.1):
        self.contamination = contamination
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def fit(self, normal_texts: list[str]):
        self.embeddings = self.model.encode(normal_texts, normalize_embeddings=True)
        self.center = np.mean(self.embeddings, axis=0)
        self.distances = np.linalg.norm(self.embeddings - self.center, axis=1)
        self.threshold = np.percentile(self.distances, (1 - self.contamination) * 100)

    def predict(self, texts: list[str]) -> list[dict]:
        embeds = self.model.encode(texts, normalize_embeddings=True)
        distances = np.linalg.norm(embeds - self.center, axis=1)

        return [
            {
                "text": text,
                "anomaly_score": float(dist),
                "is_anomaly": bool(dist > self.threshold),
            }
            for text, dist in zip(texts, distances)
        ]
```

## Deduplication

```python
class Deduplicator:
    def __init__(self, threshold: float = 0.95):
        self.threshold = threshold
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def find_duplicates(self, texts: list[str]) -> list[tuple[int, int, float]]:
        embeds = self.model.encode(texts, normalize_embeddings=True)
        similarity = np.dot(embeds, embeds.T)
        duplicates = []

        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                if similarity[i][j] >= self.threshold:
                    duplicates.append((i, j, float(similarity[i][j])))

        return sorted(duplicates, key=lambda x: x[2], reverse=True)

    def deduplicate(self, texts: list[str]) -> tuple[list[str], list[int]]:
        embeds = self.model.encode(texts, normalize_embeddings=True)
        keep = []
        keep_indices = []

        for i, text in enumerate(texts):
            is_dup = False
            for j in keep_indices:
                sim = float(np.dot(embeds[i], embeds[j]))
                if sim >= self.threshold:
                    is_dup = True
                    break
            if not is_dup:
                keep.append(text)
                keep_indices.append(i)

        return keep, keep_indices
```

## Key Points
- Embeddings enable semantic search, clustering, classification, and more
- Normalize embeddings to unit length for cosine similarity
- Hybrid search (dense + sparse) outperforms pure approaches
- Cross-lingual models enable retrieval across languages
- Zero-shot classification works well with descriptive label names
- Content-based recommendation uses embedding similarity
- Anomaly detection via distance from centroid
- Deduplication threshold typically 0.90-0.95
- Clustering quality measured via silhouette score
- Always benchmark on your specific use case and data distribution
