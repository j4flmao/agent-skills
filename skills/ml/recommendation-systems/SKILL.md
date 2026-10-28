---
name: ml-recommendation-systems
description: >
  Use this skill when the user says 'recommendation system', 'recommender', 'collaborative filtering', 'matrix factorization', 'ALS', 'implicit feedback', 'two-tower', 'candidate generation', 'ranking model', 'cold start', 'recall@k', 'ndcg'. Designs and builds recommenders: data/feedback modeling, baselines, matrix factorization, two-stage retrieval + ranking, offline evaluation without leakage, cold start and online testing. Do NOT use for: generic tabular classification (ml-classical-ml), vector database operations (data-vector-database-internals), A/B test statistics (data-science-experimentation), search relevance with BM25 (data-search-engine).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [ml, recommender-systems, collaborative-filtering, matrix-factorization, ranking]
---

# Recommendation Systems

## Purpose
Rank items for a user (or context) so that they engage, buy, or return. Production systems are usually two-stage: cheap candidate generation over the full catalog, then a richer ranking model over a few hundred candidates. Success is measured with time-split offline ranking metrics first, then with online experiments, because offline gains often fail to transfer.

## Agent Protocol

### Trigger
"recommendation system", "recommender", "collaborative filtering", "matrix factorization", "ALS", "implicit feedback", "two-tower", "candidate generation", "re-ranking", "cold start", "recall@k", "ndcg@k", "you may also like".

### Input Context
- Interaction data (explicit ratings vs implicit clicks/views/purchases), volume, catalog size, user/item features.
- Business objective (CTR, conversion, watch time, diversity), latency budget, freshness needs.

### Output Artifact
Architecture + model choice + evaluation protocol (+ code). No file unless requested.

### Response Format
```
Feedback: {explicit|implicit} users={n} items={n} density={%}
Baseline: {popularity / item-item}
Candidate gen: {method} Ranker: {method}
Offline eval: {split} {Recall@K, NDCG@K, coverage}
Online: {A/B metric, guardrails}
```

### Completion Criteria
- [ ] Popularity and item-item baselines reported.
- [ ] Time-based split; no future interactions leak into training features.
- [ ] Ranking metrics at the K actually shown in the UI.
- [ ] Cold-start path defined for new users and new items.

## Model Choice
| Situation | Approach |
|-----------|----------|
| Small data, need fast baseline | Popularity (global/segment), item-item co-occurrence or cosine similarity |
| Implicit feedback, medium/large | ALS / weighted matrix factorization, BPR |
| Explicit ratings | Biased matrix factorization (Funk-SVD style) |
| Rich features, large scale | Two-tower retrieval (user tower, item tower) + ANN index, then gradient-boosted or neural ranker |
| Sequence matters (sessions) | Sequential models (GRU4Rec, SASRec-style transformers) |
| New items with content | Content embeddings (text/image) blended with CF (hybrid) |

## Implicit Feedback
Clicks/views are positive-only signals with noise; absence is not a negative. Weight by confidence (e.g. 1 + α·count), sample negatives for training, and debias for position/exposure when using logged data.

## Example: ALS on Implicit Data (`implicit` library)
```python
import numpy as np
import scipy.sparse as sp
from implicit.als import AlternatingLeastSquares

# interactions: arrays of user_idx, item_idx, counts (already mapped to 0..n-1)
user_items = sp.csr_matrix((counts.astype(np.float32), (user_idx, item_idx)),
                           shape=(n_users, n_items))
alpha = 20.0
model = AlternatingLeastSquares(factors=64, regularization=0.05, iterations=20)
model.fit(alpha * user_items)                      # rows = users, cols = items

ids, scores = model.recommend(user_id, user_items[user_id], N=10,
                              filter_already_liked_items=True)
similar_ids, sim_scores = model.similar_items(item_id, N=10)
```

## Example: Explicit Ratings (Surprise)
```python
from surprise import SVD, Dataset
from surprise.model_selection import cross_validate

data = Dataset.load_builtin("ml-100k")            # downloads MovieLens 100k on first use
algo = SVD(n_factors=100, reg_all=0.02)            # biased MF trained with SGD, not a true SVD
results = cross_validate(algo, data, measures=["RMSE", "MAE"], cv=5)
print(results["test_rmse"].mean())
```
RMSE on ratings rarely correlates with ranking quality; use it only when predicting a rating is the product requirement.

## Two-Stage Architecture
```
user/context → candidate generators (two-tower ANN, item-item, popular, recent) → ~500 candidates
            → feature join (user, item, cross, real-time) → ranker (GBDT / DNN) → business rules
            (dedupe, diversity, freshness, filters) → top-K shown → log impressions + outcomes
```
Log impressions (what was shown), not only clicks, so you can build unbiased training data and compute CTR.

## Offline Evaluation
| Metric | Use |
|--------|-----|
| Recall@K / HitRate@K | Candidate generation: did the true item make the list? |
| NDCG@K, MAP@K, MRR | Ranking quality with position discount |
| Coverage, diversity, novelty | Catalog health; avoid popularity collapse |
| Calibration / AUC | Ranker click-probability models |
Protocol: train on interactions before time T, evaluate on after T; rank against the full catalog (or a large, documented negative sample, since sampled metrics can change model rankings).

## Cold Start
- New users: popular-in-segment, onboarding preferences, context (device, location, referrer), fast session-based updates.
- New items: content-based embeddings, exploration slots (bandits), boost with decay.

## Anti-Patterns
- Random train/test splits on time-ordered interactions (leaks the future).
- Reporting only RMSE for a top-K product.
- Not filtering already-consumed or unavailable items.
- Training on clicks from the current model's own recommendations without accounting for exposure bias (feedback loop).
- Skipping the popularity baseline; it is often hard to beat.

## References
- `../recommender/references/recommender-fundamentals.md`
- `../recommender/references/cf-matrix-factorization.md`
- `../recommender/references/recommender-architecture.md`
- `../recommender/references/neural-recommender.md`
- `../recommender/references/recommender-evaluation.md`
- `../recommender/references/cold-start-strategies.md`
- `../recommender/references/recommender-advanced.md`
