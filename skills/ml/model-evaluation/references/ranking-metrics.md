# Ranking & Recommendation Evaluation

## Ranking Metrics

| Metric | Range | What It Measures | Use Case |
|--------|-------|-----------------|----------|
| MAP@k | [0, 1] | Average precision across all queries | Information retrieval |
| NDCG@k | [0, 1] | Rank quality with position discount | Search results |
| MRR | [0, 1] | Rank of first relevant result | Q&A, navigation |
| Precision@k | [0, 1] | Relevance in top-k | Recommendation |
| Recall@k | [0, 1] | Coverage of relevant items in top-k | Discovery |
| HitRate@k | [0, 1] | User clicked any of top-k | Recommendation |
| AHR (Average Hit Rank) | [1, N] | Average rank of clicked items | Implicit feedback |

```python
def ndcg_at_k(y_true, y_score, k=10):
    """NDCG@k for ranking evaluation."""
    from sklearn.metrics import ndcg_score
    return ndcg_score(y_true.reshape(1, -1), y_score.reshape(1, -1), k=k)

def map_at_k(y_true, y_score, k=10):
    """Mean Average Precision at k."""
    from sklearn.metrics import average_precision_score
    # Per-query AP, then average
    ap_scores = []
    for true, score in zip(y_true, y_score):
        if true.sum() > 0:  # Skip queries with no relevant items
            ap = average_precision_score(true[:k], score[:k])
            ap_scores.append(ap)
    return np.mean(ap_scores) if ap_scores else 0.0

def hit_rate_at_k(y_true, y_score, k=10):
    """Hit Rate@k: did user engage with ANY top-k item."""
    top_k_indices = np.argsort(y_score, axis=1)[:, -k:]
    hits = [1 if y_true[i, top_k_indices[i]].sum() > 0 else 0
            for i in range(len(y_true))]
    return np.mean(hits)
```

## Recommendation-Specific Metrics

| Metric | Explanation | Target |
|--------|-------------|--------|
| Coverage | % of items recommended at least once | > 80% |
| Diversity | Intra-list similarity (lower = more diverse) | Depends on domain |
| Serendipity | Unexpected but relevant recommendations | Measure via novelty |
| Novelty | % of items user hasn't seen before | > 40% |
| Freshness | % of recently added items recommended | Depends on catalog |
| Personalization | Pairwise similarity of user recommendation lists | Lower = more personalized |

## A/B Testing for ML Models

```python
# A/B test analysis
from scipy import stats

def analyze_ab_test(control_metrics, treatment_metrics, metric="revenue_per_user"):
    control = np.array(control_metrics[metric])
    treatment = np.array(treatment_metrics[metric])

    # Simple t-test
    t_stat, p_value = stats.ttest_ind(control, treatment)

    # Lift
    lift = (treatment.mean() - control.mean()) / control.mean()

    # Required sample size for significance
    effect_size = (treatment.mean() - control.mean()) / np.sqrt(
        (control.std()**2 + treatment.std()**2) / 2
    )
    required_n = stats.tt_ind_solve_power(
        effect_size=effect_size, alpha=0.05, power=0.8, alternative='two-sided'
    )

    return {
        "lift_pct": lift * 100,
        "p_value": p_value,
        "significant": p_value < 0.05,
        "treatment_mean": treatment.mean(),
        "control_mean": control.mean(),
        "required_sample_size": int(required_n),
    }
```

## Evaluation Pitfalls

| Pitfall | Effect | Solution |
|---------|--------|----------|
| Position bias | Overestimates top-ranked items | Use inverse propensity weighting |
| Selection bias | Only observed interactions (not random) | Use IPS or causal methods |
| Popularity bias | Recommends only popular items | Evaluate on long-tail items |
| Exposure bias | Items not shown can't be rated | Use counterfactual evaluation |
| Temporal bias | Old data doesn't reflect current preferences | Time-based train/test split |
| Presentation bias | Click ≠ relevance | Consider dwell time, scroll depth |
