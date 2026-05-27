# Embedding Evaluation

## Overview

Evaluating embedding quality is essential for ensuring downstream task performance. Unlike LLM evaluation, embedding evaluation focuses on the quality of the representation space: how well distances and similarities capture semantic relationships. This reference covers benchmark datasets, evaluation metrics, custom evaluation pipelines, ablation studies, and production validation techniques.

## MTEB Benchmark

### Understanding MTEB Scores

```python
from typing import Dict, List, Optional

class MTEBResult:
    def __init__(self):
        self.scores: Dict[str, float] = {}

    def add_task_score(self, task_type: str, task_name: str, score: float):
        key = f"{task_type}/{task_name}"
        self.scores[key] = score

    def average_by_type(self) -> Dict[str, float]:
        from collections import defaultdict
        by_type = defaultdict(list)
        for key, score in self.scores.items():
            task_type = key.split("/")[0]
            by_type[task_type].append(score)
        return {t: sum(scores) / len(scores) for t, scores in by_type.items()}

    def overall_average(self) -> float:
        if not self.scores:
            return 0.0
        return sum(self.scores.values()) / len(self.scores)

    def compare(self, other: "MTEBResult") -> Dict:
        comparison = {}
        all_keys = set(self.scores.keys()) | set(other.scores.keys())
        for key in sorted(all_keys):
            mine = self.scores.get(key, 0)
            theirs = other.scores.get(key, 0)
            comparison[key] = {
                "this": mine,
                "other": theirs,
                "diff": mine - theirs,
                "better": mine > theirs,
            }
        return comparison


MTEB_REFERENCE_SCORES = {
    "all-MiniLM-L6-v2": 56.08,
    "BAAI/bge-base-en-v1.5": 61.77,
    "BAAI/bge-large-en-v1.5": 63.01,
    "text-embedding-3-small": 62.3,
    "text-embedding-3-large": 64.6,
    "cohere-embed-english-v3.0": 62.0,
    "nomic-embed-text-v1.5": 64.1,
    "intfloat/e5-mistral-7b-instruct": 66.6,
}
```

### Running MTEB Evaluation

```python
from mteb import MTEB
from sentence_transformers import SentenceTransformer
from typing import List, Optional

class MTEBEvaluator:
    def __init__(self, model_name: str, task_types: Optional[List[str]] = None):
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name
        self.task_types = task_types or [
            "Classification", "Clustering", "PairClassification",
            "Reranking", "Retrieval", "STS", "Summarization",
        ]

    def evaluate(self) -> MTEBResult:
        result = MTEBResult()
        for task_type in self.task_types:
            evaluation = MTEB(task_types=[task_type])
            scores = evaluation.run(self.model, output_folder=f"results/{self.model_name}")
            for task_name, task_scores in scores.items():
                if isinstance(task_scores, dict):
                    main_score = task_scores.get("main_score", list(task_scores.values())[0])
                else:
                    main_score = task_scores
                result.add_task_score(task_type, task_name, main_score)
        return result

    def evaluate_retrieval_only(self, languages: List[str] = None) -> Dict:
        evaluation = MTEB(task_types=["Retrieval"])
        scores = evaluation.run(
            self.model,
            output_folder=f"results/{self.model_name}/retrieval",
            eval_splits=["test"],
            languages=languages or ["eng"],
        )
        return scores
```

## Custom Evaluation Pipelines

### Retrieval Quality Evaluation

```python
import numpy as np
from typing import List, Dict, Callable
from dataclasses import dataclass

@dataclass
class RetrievalEvalSample:
    query: str
    relevant_docs: List[str]
    corpus: List[str]

class RetrievalEvaluator:
    def __init__(self, embedder: Callable, top_k: int = 10):
        self.embedder = embedder
        self.top_k = top_k

    def evaluate(self, samples: List[RetrievalEvalSample]) -> Dict:
        all_queries = [s.query for s in samples]
        all_corpus = list(set(doc for s in samples for doc in s.corpus))
        query_embs = self.embedder(all_queries)
        corpus_embs = self.embedder(all_corpus)
        query_embs = np.array(query_embs)
        corpus_embs = np.array(corpus_embs)

        corpus_to_idx = {doc: idx for idx, doc in enumerate(all_corpus)}
        metrics = {"mrr": [], "recall": [], "precision": [], "ndcg": []}

        for i, sample in enumerate(samples):
            query_emb = query_embs[i:i+1]
            scores = np.dot(corpus_embs, query_emb.T).flatten()
            top_indices = np.argsort(scores)[::-1][:self.top_k]
            retrieved = [all_corpus[idx] for idx in top_indices]
            relevant = set(sample.relevant_docs)
            retrieved_set = set(retrieved)

            num_relevant = len(relevant.intersection(retrieved_set))
            metrics["recall"].append(num_relevant / max(len(relevant), 1))
            metrics["precision"].append(num_relevant / self.top_k)

            for rank, doc in enumerate(retrieved):
                if doc in relevant:
                    metrics["mrr"].append(1.0 / (rank + 1))
                    break
            else:
                metrics["mrr"].append(0.0)

            dcg = 0.0
            for rank, doc in enumerate(retrieved):
                if doc in relevant:
                    dcg += 1.0 / np.log2(rank + 2)
                idcg_val = sum(1.0 / np.log2(j + 2) for j in range(min(len(relevant), self.top_k)))
            idcg = max(idcg_val, 1.0)
            metrics["ndcg"].append(dcg / idcg)

        return {
            f"mrr@{self.top_k}": np.mean(metrics["mrr"]),
            f"recall@{self.top_k}": np.mean(metrics["recall"]),
            f"precision@{self.top_k}": np.mean(metrics["precision"]),
            f"ndcg@{self.top_k}": np.mean(metrics["ndcg"]),
            "mrr_per_sample": metrics["mrr"],
        }
```

### Similarity Evaluation

```python
from scipy.stats import spearmanr, pearsonr
from typing import List, Tuple

class SimilarityEvaluator:
    def __init__(self, embedder: Callable):
        self.embedder = embedder

    def evaluate_sts(self, pairs: List[Tuple[str, str, float]]) -> Dict:
        sentences_a = [p[0] for p in pairs]
        sentences_b = [p[1] for p in pairs]
        human_scores = [p[2] for p in pairs]
        embs_a = np.array(self.embedder(sentences_a))
        embs_b = np.array(self.embedder(sentences_b))
        norms_a = np.linalg.norm(embs_a, axis=1, keepdims=True)
        norms_b = np.linalg.norm(embs_b, axis=1, keepdims=True)
        cosine_scores = np.sum(embs_a * embs_b, axis=1) / (norms_a.flatten() * norms_b.flatten())
        cosine_scores = np.clip(cosine_scores, -1, 1)
        spearman_corr, spearman_p = spearmanr(human_scores, cosine_scores)
        pearson_corr, pearson_p = pearsonr(human_scores, cosine_scores)
        mae = np.mean(np.abs(np.array(human_scores) - cosine_scores))
        return {
            "spearman_correlation": spearman_corr,
            "spearman_p_value": spearman_p,
            "pearson_correlation": pearson_corr,
            "pearson_p_value": pearson_p,
            "mean_absolute_error": mae,
            "num_pairs": len(pairs),
        }
```

### Clustering Evaluation

```python
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score
from sklearn.cluster import KMeans

class ClusteringEvaluator:
    def __init__(self, embedder: Callable):
        self.embedder = embedder

    def evaluate(self, texts: List[str], labels: List[int]) -> Dict:
        embeddings = np.array(self.embedder(texts))
        n_clusters = len(set(labels))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        predicted = kmeans.fit_predict(embeddings)
        return {
            "adjusted_rand_score": adjusted_rand_score(labels, predicted),
            "normalized_mutual_info": normalized_mutual_info_score(labels, predicted),
            "homogeneity": self._homogeneity(labels, predicted),
            "completeness": self._completeness(labels, predicted),
            "v_measure": self._v_measure(labels, predicted),
        }

    def _homogeneity(self, labels_true, labels_pred) -> float:
        from sklearn.metrics import homogeneity_score
        return homogeneity_score(labels_true, labels_pred)

    def _completeness(self, labels_true, labels_pred) -> float:
        from sklearn.metrics import completeness_score
        return completeness_score(labels_true, labels_pred)

    def _v_measure(self, labels_true, labels_pred) -> float:
        from sklearn.metrics import v_measure_score
        return v_measure_score(labels_true, labels_pred)
```

## Ablation Studies

### Dimensionality Analysis

```python
class DimensionalityAnalyzer:
    def __init__(self, embedder, dimensions: List[int]):
        self.embedder = embedder
        self.dimensions = dimensions

    def analyze(self, eval_fn: Callable) -> Dict[int, Dict]:
        results = {}
        for dim in self.dimensions:
            truncated_results = eval_fn()
            results[dim] = {
                **truncated_results,
                "dimension": dim,
            }
        return results

    def find_optimal_dimension(self, results: Dict[int, Dict], min_score: float = 0.95) -> int:
        best_scores = list(results.values())[-1] if results else {}
        best_overall = best_scores.get("mrr@10", best_scores.get("spearman_correlation", 0))
        candidates = []
        for dim, scores in results.items():
            metric = scores.get("mrr@10", scores.get("spearman_correlation", 0))
            ratio = metric / best_overall if best_overall > 0 else 0
            if ratio >= min_score:
                candidates.append((dim, ratio))
        candidates.sort(key=lambda x: x[0])
        return candidates[0][0] if candidates else self.dimensions[-1]
```

## Production Validation

### Distribution Monitoring

```python
class EmbeddingMonitor:
    def __init__(self, reference_embeddings: np.ndarray, threshold: float = 0.1):
        self.reference_mean = np.mean(reference_embeddings, axis=0)
        self.reference_std = np.std(reference_embeddings, axis=0)
        self.threshold = threshold
        self.drift_scores: List[float] = []

    def check_drift(self, current_embeddings: np.ndarray) -> Dict:
        current_mean = np.mean(current_embeddings, axis=0)
        current_std = np.std(current_embeddings, axis=0)
        mean_diff = np.mean(np.abs(current_mean - self.reference_mean))
        std_diff = np.mean(np.abs(current_std - self.reference_std))
        drift_score = (mean_diff + std_diff) / 2
        self.drift_scores.append(drift_score)
        return {
            "drift_score": drift_score,
            "mean_difference": mean_diff,
            "std_difference": std_diff,
            "drifted": drift_score > self.threshold,
            "drift_trend": "increasing" if len(self.drift_scores) > 10 and
                np.mean(self.drift_scores[-5:]) > np.mean(self.drift_scores[-10:-5]) else "stable",
        }

    def outlier_detection(self, embeddings: np.ndarray, z_threshold: float = 3.0) -> List[int]:
        z_scores = np.abs((embeddings - self.reference_mean) / (self.reference_std + 1e-8))
        outliers = np.any(z_scores > z_threshold, axis=1)
        return np.where(outliers)[0].tolist()
```

## Key Points

- MTEB is the standard benchmark for embedding quality across 7 task categories.
- Use retrieval-specific metrics (MRR, Recall@K, NDCG@K) for RAG pipeline evaluation.
- Use Spearman correlation for semantic textual similarity (STS) evaluation.
- Use adjusted Rand score and NMI for clustering quality assessment.
- Run ablation studies on embedding dimension to find the optimal size-quality tradeoff.
- Monitor embedding drift in production to detect data distribution changes.
- Implement outlier detection to catch anomalous inputs that produce poor embeddings.
- Compare your embedding model against MTEB reference scores for benchmarking.
- Evaluate on task-specific datasets rather than relying solely on MTEB averages.
- Use statistical significance testing when comparing embedding model variants.
- Test with multiple random seeds to account for initialization variance in clustering.
- Validate embedding quality with downstream task performance (retrieval, classification).
- Consider both quality metrics and operational metrics (latency, memory) in model selection.
- Sample production embeddings regularly to build a reference distribution.
- Retrain or update embeddings when drift exceeds acceptable thresholds.
- Document evaluation methodology including dataset splits, metrics, and significance tests.
- Use cross-validation when evaluating on small datasets to reduce variance.
- Compare embedding models on equal footing by controlling for dimension and normalization.
