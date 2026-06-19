---
name: ml-recommender
description: >
  Use this skill when building recommendation systems: collaborative filtering, matrix factorization, neural recommenders, two-tower models, content-based filtering, hybrid recommenders, cold start strategies, ranking.
  This skill enforces: algorithm selection by data type (explicit/implicit), matrix factorization setup (SVD/ALS/BPR), candidate generation + ranking two-stage design, two-tower architecture for retrieval, cold start strategy, evaluation with precision@k/recall@k/NDCG.
  Do NOT use for: search ranking (use search-patterns skill), time-series forecasting (use ml-time-series), simple popularity-based ranking, or ad targeting.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, recommender, recommendation, phase-11]
---

# ML Recommender System

## Purpose
Design recommendation system architectures with appropriate algorithm selection, candidate generation, ranking, cold start handling, and evaluation metrics.

## Architecture/Decision Trees

### Algorithm Selection Decision Tree
```
Data type
  ├── Explicit feedback (ratings 1-5 stars)
  │   ├── SVD / SVD++ (surprise library, Netflix prize style)
  │   ├── Neural MF (non-linear matrix factorization)
  │   └── Baseline: user/item mean (always start here)
  ├── Implicit feedback (clicks, views, purchases)
  │   ├── <100K interactions → BPR (pairwise ranking, good with sparse data)
  │   ├── 100K-10M → ALS with confidence weights (scales well, parallel)
  │   ├── >10M → Two-Tower with sampled softmax (scales to billions)
  │   └── Baseline: Weighted Popularity (most popular with time decay)
  ├── Cold start (no history)
  │   ├── Content-based → cosine similarity on item features
  │   ├── Demographic → average ratings per age/gender/location
  │   └── Hybrid → ensemble content + collaborative when available
  └── Hybrid
      ├── Weighted combination
      ├── Feature-augmented matrix factorization
      └── Wide & Deep (memorization + generalization)
```

### Two-Stage Architecture
```
Stage 1: Retrieval (Candidate Generation)
  Goal: Narrow millions → 100-500 candidates
  Methods:
    ├── Matrix factorization → user vector, ANN on item vectors
    ├── Two-tower → query encoder + item encoder, dot product
    ├── Content-based → item similarity to user history
    └── Popularity → top-N popular items (fallback)

Stage 2: Ranking
  Goal: Rank 100-500 → top 10-50
  Features:
    ├── User features (embedding, demographics, history count)
    ├── Item features (embedding, category, popularity)
    ├── Interaction features (user-item dot product, cross features)
    ├── Context features (hour, day, device, location)
    └── Position features (for bias correction)
  Models:
    ├── Gradient boosting (LightGBM/XGBoost lambdarank)
    ├── Deep neural (Wide & Deep, DeepFM, DCN v2)
    └── Ensemble (blend multiple rankers)
```

### Cold Start Strategy
```
New user (no interactions)
  ├── Onboarding → ask preferences (select interests/categories)
  ├── Demographic → popular items for user's age/gender/location
  ├── Content-based → items matching onboarding signals
  └── Exploration → epsilon-greedy or Thompson sampling
  Transition to collaborative filtering after 3-5 interactions

New item (no interactions)
  ├── Content → similarity to existing items (title, category, image)
  ├── Metadata → use item features to predict embedding
  ├── Exploration bonus → boost score by α/√(exposures+1)
  └── Hybrid → weight collaborative score by confidence level
```

## Agent Protocol

### Trigger
User request includes: recommendation system, recommender, collaborative filtering, matrix factorization, SVD, implicit feedback, ALS, two-tower, neural recommenders, cold start.

### Input Context
Before activating, verify:
- Data type: explicit ratings, implicit (clicks, views), or content features.
- Scale: number of users, items, and interactions. Sparsity level.
- Cold start scenario: new users, new items, or both.
- Business objective: engagement, conversion, retention, diversity.
- Real-time vs batch requirements.

### Output Artifact
Recommendation system architecture with algorithm selection, model design, cold start strategy, evaluation.

### Response Format
```
## Recommender Architecture
### Data Profile
Users: {N} | Items: {N} | Interactions: {N}
Density: {value}% | Type: {explicit / implicit}

### Algorithm
Primary: {SVD / ALS / BPR / Two-Tower / Hybrid}
Embedding Dim: {N} | Regularization: {value}

### Architecture (Two-Stage)
Retrieval: {model} | Top-K: {N}
Ranking: {model} | Features: [{f1}, {f2}]

### Cold Start
Users: {popular / content-based / exploration}
Items: {content-based / metadata / popularity fallback}
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Algorithm selected matching data type and scale.
- [ ] Two-stage architecture defined with retrieval + ranking.
- [ ] Cold start strategy for users and items documented.
- [ ] Negative sampling strategy defined for implicit feedback.
- [ ] Offline evaluation metrics selected with k value.
- [ ] A/B testing plan for online evaluation.

## Workflow

### Step 1: Data Characterization
Explicit feedback: use SVD, SVD++, NMF. Normalize ratings (subtract user mean). Implicit feedback: ALS with confidence weights (c_ui = 1 + α*r_ui, α=20-40). BPR for pairwise ranking. High sparsity (>99.9%): use content-based or hybrid. Large scale: two-tower + ANN.

```python
import numpy as np
from scipy.sparse import csr_matrix

def create_implicit_matrix(interactions, users, items):
    """Create implicit feedback matrix with confidence weights."""
    user_map = {u: i for i, u in enumerate(users)}
    item_map = {i: j for j, i in enumerate(items)}

    rows = [user_map[u] for u in interactions["user_id"]]
    cols = [item_map[i] for i in interactions["item_id"]]
    data = np.ones(len(interactions))  # or interaction count

    matrix = csr_matrix((data, (rows, cols)), shape=(len(users), len(items)))
    return matrix
```

### Step 2: Candidate Generation (Retrieval)
Goal: narrow millions → 100-500 candidates. Matrix factorization retrieval: user vector → nearest item vectors. FAISS for ANN: IndexFlatIP (<10K), IndexIVFFlat + HNSW (millions). Two-tower: query encoder + item embedding, dot product.

```python
import faiss
import numpy as np

class RetrievalService:
    def __init__(self, item_embeddings, index_type="flat"):
        self.item_embeddings = item_embeddings.astype(np.float32)
        self.dim = item_embeddings.shape[1]
        faiss.normalize_L2(self.item_embeddings)

        if index_type == "flat":
            self.index = faiss.IndexFlatIP(self.dim)
        elif index_type == "ivf":
            self.index = faiss.IndexIVFFlat(
                faiss.IndexFlatIP(self.dim), self.dim, 100,
                faiss.METRIC_INNER_PRODUCT,
            )
            self.index.train(self.item_embeddings)
        self.index.add(self.item_embeddings)

    def retrieve(self, user_embedding, k=100):
        user_embedding = user_embedding.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(user_embedding)
        scores, indices = self.index.search(user_embedding, k)
        return indices[0], scores[0]

# HNSW for high-recall approximate search
def build_hnsw_index(embeddings, M=32, ef_construction=200):
    index = faiss.IndexHNSWFlat(len(embeddings[0]), M)
    index.hnsw.efConstruction = ef_construction
    index.add(embeddings.astype(np.float32))
    return index
```

### Step 3: Ranking
Goal: rank 100-500 → top 10-50. Features: user/item embeddings, dot product, cross features, context (hour, day, device). Model: gradient boosting (LightGBM lambdarank) or neural (Wide & Deep, DeepFM).

```python
import lightgbm as lgb

def train_ranking_model(train_df, val_df):
    feature_cols = [c for c in train_df.columns if c not in ("user_id", "item_id", "label", "query_id")]

    train_data = lgb.Dataset(
        train_df[feature_cols],
        label=train_df["label"],
        group=train_df.groupby("query_id").size().values,
    )
    val_data = lgb.Dataset(
        val_df[feature_cols],
        label=val_df["label"],
        group=val_df.groupby("query_id").size().values,
        reference=train_data,
    )

    params = {
        "objective": "lambdarank",
        "metric": "ndcg",
        "ndcg_eval_at": [5, 10],
        "boosting_type": "gbdt",
        "learning_rate": 0.05,
        "num_leaves": 31,
        "min_data_in_leaf": 50,
    }

    model = lgb.train(
        params, train_data,
        valid_sets=[val_data],
        num_boost_round=500,
        callbacks=[lgb.early_stopping(50)],
    )
    return model
```

### Step 4: Cold Start
New users: popularity per demographic, epsilon-greedy exploration. New items: content similarity to existing items, exploration bonus (α/√(exposures+1)). Hybrid: weight collaborative score by confidence.

```python
def cold_start_bonus(item_id, exposures, alpha=1.0):
    """Exploration bonus for new items."""
    return alpha / np.sqrt(exposures.get(item_id, 0) + 1)

def hybrid_score(cf_score, content_score, n_interactions, threshold=5):
    """Weighted hybrid: collaborative when confident, content when not."""
    weight = min(1.0, n_interactions / threshold)
    return weight * cf_score + (1 - weight) * content_score
```

### Step 5: Offline Evaluation
Precision@k: fraction of relevant in top-k. Recall@k: fraction of relevant retrieved. NDCG@k: graded relevance with position discount. Hit Rate@k: any relevant in top-k.

```python
from sklearn.metrics import ndcg_score

def evaluate_recommendations(y_true, y_pred, ks=[5, 10, 20]):
    metrics = {}
    for k in ks:
        metrics[f"precision@{k}"] = precision_at_k(y_true, y_pred, k)
        metrics[f"recall@{k}"] = recall_at_k(y_true, y_pred, k)
        metrics[f"ndcg@{k}"] = ndcg_score([y_true], [y_pred], k=k)
    return metrics

def precision_at_k(y_true, y_pred, k):
    top_k = np.argsort(y_pred)[-k:][::-1]
    return np.mean(y_true[top_k])

def recall_at_k(y_true, y_pred, k):
    top_k = np.argsort(y_pred)[-k:][::-1]
    n_rel = np.sum(y_true)
    return np.sum(y_true[top_k]) / n_rel if n_rel > 0 else 0.0
```

## Anti-Patterns

- **Starting with complex neural models**: Popularity and matrix factorization first.
- **Random splits for evaluation**: Temporal split is more realistic.
- **Ignoring position bias**: Clicks at position 1 are inflated by visibility.
- **Ignoring cold start for new items**: Items with no interactions never get recommended.
- **Precision/recall without NDCG**: NDCG accounts for ranking order.
- **Too high embedding dimension on sparse data**: Overfitting to few interactions.
- **Offline only without online A/B**: Offline metrics weakly correlate with user engagement.
- **Not filtering already-interacted items**: Degrades user experience.

## Production Considerations

### Monitoring
- CTR, conversion rate, engagement time per slot.
- Diversity (intra-list similarity) — decreasing indicates filter bubble.
- Coverage — % of items ever recommended.
- Freshness — % of new items in recommendations.
- p50/p95/p99 inference latency for retrieval + ranking.

### Deployment
- Precompute item embeddings on refresh cadence.
- FAISS index with HNSW for ANN retrieval.
- REST/gRPC service with request caching.
- Gradual rollout: 5% traffic ramp-up.
- Auto-rollback if primary metric drops >5%.
- Log requests, candidates, scores, displays for offline analysis.

## Two-Tower Architecture — Detailed Implementation

### Architecture Overview
```
Query Tower (user-side)              Item Tower (item-side)
    user_id                              item_id
    user_features                        item_features
    user_history (seq)                   item_metadata
         |                                    |
    [Embedding Layer]                   [Embedding Layer]
         |                                    |
    [Dense Layers]                      [Dense Layers]
    (128 -> 64 -> 32)                   (128 -> 64 -> 32)
         |                                    |
    [L2 Normalize]                      [L2 Normalize]
         |                                    |
    query_embedding (32d)            item_embedding (32d)
         |                                    |
         +-----------> [Score = dot(q, i)] <--+
                           or cosine sim
```

### Training with In-Batch Negatives
```python
import torch
import torch.nn.functional as F

class TwoTowerModel(torch.nn.Module):
    def __init__(self, num_users, num_items, user_dim, item_dim, emb_dim=32):
        super().__init__()
        self.user_emb = torch.nn.Embedding(num_users, user_dim)
        self.item_emb = torch.nn.Embedding(num_items, item_dim)
        self.user_tower = torch.nn.Sequential(
            torch.nn.Linear(user_dim, 128),
            torch.nn.ReLU(),
            torch.nn.Linear(128, 64),
            torch.nn.ReLU(),
            torch.nn.Linear(64, emb_dim),
        )
        self.item_tower = torch.nn.Sequential(
            torch.nn.Linear(item_dim, 128),
            torch.nn.ReLU(),
            torch.nn.Linear(128, 64),
            torch.nn.ReLU(),
            torch.nn.Linear(64, emb_dim),
        )

    def forward(self, user_ids, item_ids, user_features, item_features):
        user_vec = F.normalize(self.user_tower(user_features), dim=1)
        item_vec = F.normalize(self.item_tower(item_features), dim=1)
        scores = torch.mm(user_vec, item_vec.t())  # (batch, batch)
        return scores

def in_batch_negative_loss(scores, temperature=0.07):
    # positive pairs are on diagonal, negatives in-batch
    labels = torch.arange(scores.size(0), device=scores.device)
    loss = F.cross_entropy(scores / temperature, labels)
    return loss
```

### ANN Retrieval Setup
```python
import faiss
import numpy as np

class ANNSearcher:
    def __init__(self, emb_dim=32, index_type="HNSW"):
        self.emb_dim = emb_dim
        if index_type == "HNSW":
            self.index = faiss.IndexHNSWFlat(emb_dim, 32)  # M=32 neighbors
            self.index.hnsw.efConstruction = 200
            self.index.hnsw.efSearch = 64
        elif index_type == "IVFFlat":
            self.index = faiss.IndexIVFFlat(
                faiss.IndexFlatL2(emb_dim), emb_dim, 100  # 100 centroids
            )

    def build(self, item_embeddings: np.ndarray):
        self.index.train(item_embeddings)
        self.index.add(item_embeddings)

    def search(self, query_embedding: np.ndarray, k: int = 100):
        distances, indices = self.index.search(query_embedding, k)
        return indices  # item_ids of top-k candidates

    def update(self, new_item_embeddings: np.ndarray):
        self.index.add(new_item_embeddings)  # incremental addition
```

## Cold Start Strategies — Detailed Comparison

### New User Cold Start

| Strategy | Data Required | Cold Start Speed | Best For |
|----------|--------------|-----------------|----------|
| Popularity fallback | None | Instant | First session |
| Demographic-based | Signup attributes | Instant | Age/gender/region |
| Onboarding survey | Explicit preferences | < 5 min | Good for taste-based |
| Fast-session features | 3-5 clicks | < 2 min | Engagement-based |
| Cross-device | Device fingerprint | Instant | Known device |
| Explore-then-exploit | Implicit feedback | 1-2 sessions | Long-term learning |

Implementation — Popularity Fallback:
```python
def get_candidates(user_id: str, recent_items: List[str], top_popular: List[str]):
    if user_id is None:
        return top_popular[:20]  # completely new anonymous user
    if has_any_history(user_id):
        return personal_recs(user_id)
    # cold user with some history
    return hybrid(top_popular[:10] + similar_to_recent(recent_items))
```

### New Item Cold Start

| Strategy | When to Use | Volume | Update Frequency |
|----------|------------|--------|-----------------|
| Static metadata recs | Item has attributes | Any | Real-time |
| Explore rate | Boost new items | Low | Per-batch |
| Content-based (image/text) | Rich metadata | Medium | Offline |
| Random exploration | Very new platform | Any | Per-request |
| Publisher trust score | Known publishers | High | Real-time |

Implementation — Explore Rate:
```python
def apply_explore_rate(candidates: List[Dict], new_item_ids: Set[str],
                       explore_rate: float = 0.05):
    """Replace some recommendations with new items for exploration."""
    if random.random() < explore_rate:
        # Replace one candidate with a new item
        idx = random.randint(0, len(candidates) - 1)
        candidates[idx] = random.choice(list(new_item_ids))
    return candidates
```

## Evaluation Metrics for Recommender Systems

### Offline Metrics
| Metric | Formula | Use Case |
|--------|---------|----------|
| Hit Rate (HR@k) | HR@k = (hits @ k) / (total users) | Is the relevant item in top-k? |
| NDCG@k | Discounted cumulative gain / ideal DCG | Ranking quality with graded relevance |
| Mean Reciprocal Rank (MRR) | MRR = 1/rank(first relevant) | First relevant position matters |
| Coverage | % of items recommended | Diversity of recommendations |
| Intra-list diversity | avg(1 - sim(i, j)) over all pairs | How diverse are the recs? |

### Online Metrics
| Metric | What It Measures | Trade-off |
|--------|-----------------|-----------|
| CTR | Engagement with recs | Clickbait risk |
| Conversion Rate | Actual purchases/actions | Downstream metric |
| Revenue per Visit | Monetary impact | Short-term |
| Session Duration | Engagement quality | Long-term |
| User Retention | Long-term value | Hard to measure |
| Churn Rate | User loss | Lagging indicator |

## Position Bias Correction
```python
# Inverse Propensity Weighting (IPW)
def ipw_correction(rank: int):
    # propensity of being examined at rank
    # estimated from logged data
    propensities = {1: 0.8, 2: 0.6, 3: 0.5, 5: 0.3, 10: 0.1}
    return 1.0 / propensities.get(rank, 0.05)

def ipw_weighted_loss(predictions, labels, positions):
    weights = torch.tensor([ipw_correction(pos) for pos in positions])
    loss = F.binary_cross_entropy(predictions, labels, weight=weights)
    return loss
```

## Recommender Anti-Patterns
1. **Filter Bubbles**: Users only see items similar to their past behavior
   Fix: Add diversity loss, curate discovery slots, inject random items
2. **Popularity Bias**: Recommending only popular items, ignoring long-tail
   Fix: Sample negatives from popularity distribution, re-rank for diversity
3. **Position Bias in Training**: Model learns position as a signal
   Fix: IPW correction, randomized position during training
4. **Stale Embeddings**: User/item embeddings never updated
   Fix: Online embedding updates, freshness decay
5. **No Re-ranking**: ANN results served directly without diversity/novelty
   Fix: Add a lightweight re-ranker for diversity + business rules

## Rules
- Start with simple popularity baseline.
- Two-stage: retrieval quality limits ranking quality.
- ALS handles implicit feedback naturally.
- BPR = standard pairwise loss for implicit feedback ranking.
- Two-tower scales to billions with ANN.
- Cold start for new items more critical than new users.
- NDCG preferred over precision/recall for graded relevance.
- Position bias correction via IPW or position feature.
- Maintain diversity to prevent filter bubbles.
- Freshness matters: decay old item scores.

## References
  - references/cf-matrix-factorization.md — Collaborative Filtering & Matrix Factorization
  - references/cold-start-strategies.md — Cold Start Strategies
  - references/neural-recommender.md — Neural Recommender Systems
  - references/recommender-advanced.md — Recommender Advanced Topics
  - references/recommender-architecture.md — Recommender System Architecture
  - references/recommender-evaluation.md — Recommender System Evaluation
  - references/recommender-fundamentals.md — Recommender Fundamentals
## Handoff
Hand off to ml-experiment-tracking for training runs. For search relevance improvements, hand off to search-patterns.
