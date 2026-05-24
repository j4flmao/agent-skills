# Recommender System Evaluation

## Offline Evaluation Metrics

| Metric | Range | What It Measures | K Value |
|--------|-------|-----------------|---------|
| Precision@k | [0, 1] | Fraction of relevant items in top-k | 5-20 |
| Recall@k | [0, 1] | Fraction of relevant items retrieved | 10-50 |
| NDCG@k | [0, 1] | Graded relevance with position discount | 5-20 |
| Hit Rate@k | [0, 1] | Any relevant item in top-k | 5-20 |
| MAP | [0, 1] | Average precision across users | Varies |
| MRR | [0, 1] | Reciprocal rank of first relevant | 1 |
| AUC | [0, 1] | Ranking quality (pairwise) | N/A |

## Implementation

```
import numpy as np
from sklearn.metrics import ndcg_score

def precision_at_k(y_true, y_pred, k=10):
    """y_true: binary relevance, y_pred: ranked item indices"""
    top_k = y_pred[:k]
    relevant = sum(1 for item in top_k if y_true[item] == 1)
    return relevant / k

def recall_at_k(y_true, y_pred, k=10):
    top_k = y_pred[:k]
    relevant = sum(1 for item in top_k if y_true[item] == 1)
    total_relevant = sum(y_true)
    return relevant / total_relevant if total_relevant > 0 else 0

def ndcg_at_k(y_true, y_pred, k=10):
    """y_true: relevance scores (multi-graded)"""
    return ndcg_score([y_true], [y_pred], k=k)

def hit_rate_at_k(y_true, y_pred, k=10):
    top_k = y_pred[:k]
    return 1.0 if any(y_true[item] == 1 for item in top_k) else 0.0
```

## Evaluation Protocol

### Temporal Split

```
# Never use random split for recommender evaluation
# Use temporal split: train on past, evaluate on future
from sklearn.model_selection import TimeSeriesSplit

def temporal_recommender_split(interactions, test_days=30):
    max_date = interactions["timestamp"].max()
    cutoff = max_date - pd.Timedelta(days=test_days)

    train = interactions[interactions["timestamp"] <= cutoff]
    test = interactions[interactions["timestamp"] > cutoff]

    # Only evaluate on users and items present in training
    test = test[
        test["user_id"].isin(train["user_id"].unique()) &
        test["item_id"].isin(train["item_id"].unique())
    ]
    return train, test
```

### Leave-One-Out

```
def leave_one_out_evaluation(interactions):
    """Leave last interaction per user as test"""
    test = interactions.groupby("user_id").last().reset_index()
    train = interactions.drop(test.index)
    return train, test
```

## Online Evaluation (A/B Testing)

| Metric | What It Measures | Importance |
|--------|-----------------|------------|
| CTR | Click-through rate | Primary engagement |
| Conversion rate | Purchase/signup rate | Revenue impact |
| Engagement time | Time spent per session | Quality signal |
| Retention | 7-day/30-day return rate | Long-term value |
| Diversity | Intra-list similarity | UX quality |
| Coverage | % of catalog recommended | Exploration health |
| Freshness | % of new items recommended | Relevance |

### Experiment Design

```
# A/B test configuration
ab_config = {
    "min_duration_days": 14,  # 1 week for novelty + 1 week for weekly pattern
    "min_users_per_variant": 10000,
    "primary_metric": "ctr",
    "guardrail_metrics": ["diversity", "coverage", "latency_p95"],
    "significance_level": 0.05,
    "minimum_effect": 0.01,  # 1% relative improvement
    "ramp_steps": [
        {"traffic": 0.05, "duration": "1 day"},
        {"traffic": 0.25, "duration": "2 days"},
        {"traffic": 0.50, "duration": "3 days"},
        {"traffic": 1.00, "duration": "remaining"},
    ],
}
```

## Dashboard Metrics

```
recommender_dashboard = {
    "offline": {
        "NDCG@10": 0.42,
        "Recall@20": 0.38,
        "Precision@10": 0.29,
    },
    "online": {
        "ctr": "4.2%",
        "conversion": "1.8%",
        "retention_7d": "62%",
    },
    "health": {
        "coverage": "15%",
        "diversity": 0.65,
        "freshness": "8%",
        "cold_start_ctr": "1.1%",
    },
    "system": {
        "retrieval_p95_ms": 45,
        "ranking_p95_ms": 28,
        "total_p95_ms": 85,
        "qps": 1200,
    },
}
```

## Common Pitfalls

- Random train/test split on time-ordered data — always use temporal split
- Evaluating on interactions the model was trained on — removes new user/item performance
- Reporting only mean metrics without distribution — some users may have no good recommendations
- Over-relying on offline metrics — they correlate weakly with online user satisfaction
- Ignoring position bias — items at position 1 get more clicks regardless of relevance
- Not measuring diversity — optimizing only for CTR leads to filter bubbles
- Setting K too high for the application — top-20 matters less than top-5 for search

## Best Practices

- Always evaluate on a temporal holdout — never random split
- Report per-user metric distribution (median, p25, p75) not just mean
- Evaluate separately on cold vs warm users/items to identify coverage gaps
- Use NDCG for multi-graded relevance, precision/recall for binary relevance
- Run online A/B tests for minimum 2 weeks to account for novelty effect
- Monitor guardrail metrics (diversity, coverage, freshness) alongside primary metrics
- Set up automated evaluation pipeline that runs after every training cycle
- Log all recommendation requests with candidate sets for offline replay evaluation
- Compare against simple baselines (popularity, recent) — complex model must beat them
- Document evaluation methodology: split method, metrics, K values, significance testing
