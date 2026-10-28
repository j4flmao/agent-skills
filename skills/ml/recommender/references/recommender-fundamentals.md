# Recommender Systems Fundamentals

Core concepts for building recommender systems: problem framing, feedback types, the main algorithm families, baselines, data splitting and the minimum evaluation needed before going online. Siblings cover matrix factorization (`cf-matrix-factorization.md`), neural models (`neural-recommender.md`), cold start (`cold-start-strategies.md`), system architecture (`recommender-architecture.md`) and metrics (`recommender-evaluation.md`).

## Problem Framing

| Question | Options |
|----------|---------|
| What is recommended? | Items (products, videos), content (articles), people, queries |
| Where is it shown? | Home feed, "similar items", "frequently bought together", email, notifications |
| What is the objective? | Clicks, watch time, purchases, retention, long-term satisfaction |
| What constraints? | Inventory, freshness, diversity, business rules, fairness to suppliers |
| Task type | Rating prediction (rare today), top-K ranking (common), next-item prediction (sessions) |

Choose an objective that correlates with long-term value; optimizing raw clicks tends to reward clickbait.

## Feedback Types

| Type | Examples | Properties |
|------|----------|-----------|
| Explicit | Ratings, likes, thumbs | Sparse, biased toward engaged users |
| Implicit | Views, clicks, purchases, dwell time | Abundant, noisy, no true negatives |

Implicit feedback: unobserved does not mean disliked. Training uses sampled negatives (random, popularity-weighted, or hard negatives) or weighted losses (e.g. confidence weighting in implicit ALS).

## Algorithm Families

| Family | Idea | Strengths | Weaknesses |
|--------|------|-----------|------------|
| Popularity / trending | Most popular items, possibly per segment | Strong baseline, cold-start friendly | Not personalized |
| Content-based | Similarity between item features and user profile | New items, explainable | Over-specialization |
| Neighborhood CF (item-item, user-user) | Similar items co-consumed by users | Simple, effective for "similar items" | Sparse data, popularity bias |
| Matrix factorization (ALS, BPR) | Latent user and item vectors | Scales, good accuracy for implicit data | Cold start; static |
| Two-tower neural retrieval | User and item encoders, dot product | Uses features, ANN-friendly | Needs data and infrastructure |
| Sequential models (GRU4Rec, SASRec, BERT4Rec) | Next item from recent sequence | Session intent | Training complexity |
| Learning-to-rank (GBDT, deep rankers) | Rank candidates with rich features | Combines many signals | Needs candidate generation first |

## Baselines First

```python
import numpy as np
import pandas as pd

def popularity_baseline(interactions: pd.DataFrame, k: int = 10, since: pd.Timestamp | None = None) -> list[str]:
    df = interactions if since is None else interactions[interactions["ts"] >= since]
    return df["item_id"].value_counts().head(k).index.tolist()
```

Recent-popularity and "items the user already interacted with" (re-consumption) baselines are surprisingly strong for many domains; new models must beat them offline and online.

## Item-Item Collaborative Filtering

```python
import numpy as np
import scipy.sparse as sp
from sklearn.preprocessing import normalize

# rows = users, cols = items, values = implicit weights (e.g. 1 or log1p(count))
R = sp.csr_matrix((weights, (user_idx, item_idx)), shape=(n_users, n_items))

item_vectors = normalize(R.T.tocsr(), norm="l2", axis=1)      # items x users
similarity = item_vectors @ item_vectors.T                      # cosine, sparse items x items

def recommend(user: int, k: int = 10) -> np.ndarray:
    user_row = R[user]
    scores = np.asarray((user_row @ similarity).todense()).ravel()
    scores[user_row.indices] = -np.inf                          # exclude already consumed
    return np.argpartition(-scores, k)[:k]
```

For large catalogues, keep only top-N neighbours per item and compute offline; libraries like `implicit` (ALS, BPR, item-kNN) handle this efficiently.

## Two-Stage Architecture (Overview)

```
Candidate generation (recall): hundreds-thousands of items from several sources
   (CF, embeddings + ANN, popularity, content similarity, business rules)
-> Ranking: score candidates with a richer model and features
-> Re-ranking / policy: diversity, deduplication, business constraints, exploration
-> Serve and log impressions + interactions
```

Logged impressions (what was shown, in which position) are essential for training rankers and correcting bias.

## Data Splitting

| Split | Use | Caveat |
|-------|-----|--------|
| Random interaction split | Quick checks | Leaks future behaviour; overly optimistic |
| Leave-last-one-out per user | Sequential recommendation | Still mixes time across users |
| Global temporal split (train before T, test after T) | Closest to production | Users/items unseen in training appear in test |

Use temporal splits for model selection; report results separately for cold and warm users/items.

## Minimum Offline Evaluation

- Ranking metrics at K: Recall@K, NDCG@K, MAP@K, MRR.
- Beyond accuracy: catalogue coverage, diversity, novelty, popularity bias.
- Compare against baselines with identical candidate pools and splits.
- Offline gains do not guarantee online gains; validate with A/B tests (see `recommender-evaluation.md`).

## Business Rules and Constraints

- Filter out-of-stock, already purchased (where re-purchase is unlikely), age-restricted or region-unavailable items.
- Deduplicate near-identical items (variants).
- Apply rules after scoring, logged so their effect is measurable.

## Privacy

- Interaction logs are personal data; apply retention limits and access control.
- Avoid inferring and exposing sensitive attributes through recommendations (health, religion).
- Offer users controls (hide item, reset history) and honour them in features.

## Checklist

- [ ] Objective and surface defined; metric aligned with long-term value
- [ ] Implicit feedback handled with appropriate negatives/weighting
- [ ] Popularity and re-consumption baselines established
- [ ] Temporal splits; cold vs warm results reported
- [ ] Impressions logged with positions
- [ ] Business filters applied after scoring and measurable
- [ ] Privacy controls for interaction data
