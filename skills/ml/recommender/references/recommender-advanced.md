# Recommender Systems: Advanced Topics

Production techniques beyond basic collaborative filtering: embedding-based retrieval with approximate nearest neighbour search, multi-objective ranking, sequential and generative recommendation, bias correction with logged impressions, exploration, diversity and re-ranking, real-time features, and feedback loops. Builds on `recommender-fundamentals.md`; architecture details in `recommender-architecture.md`.

## Embedding Retrieval (Two-Tower)

```
user tower: user id embedding + recent history + context features  -> u (d-dim)
item tower: item id embedding + content features                   -> v (d-dim)
score = u · v      (or cosine)
```

Training:
- In-batch negatives with sampled softmax; apply **logQ correction** (subtract log of item sampling probability) so popular items are not over-penalized as negatives.
- Mix in hard negatives (items shown but not clicked, or nearest neighbours) carefully; too many hard negatives destabilize training.
- Temperature-scaled softmax on normalized embeddings is common.

Serving:
- Precompute item vectors; index with ANN (FAISS IVF/HNSW, ScaNN, HNSW in vector databases).
- Compute the user vector online from fresh features and query top-K.
- Track ANN recall against exact search on a sample; tune index parameters (efSearch, nprobe) for the latency budget.

## Multi-Source Candidate Generation

Combine retrieval sources (two-tower, item-item CF, trending, follow graph, content similarity, editorial) with per-source quotas, then deduplicate. Log the source of each candidate to measure contribution and avoid starving new sources.

## Ranking Models

| Model | Notes |
|-------|-------|
| GBDT (LightGBM/XGBoost) with LambdaMART objectives | Strong with engineered features; fast to iterate |
| Deep rankers (DCN-v2, DLRM-style) | Learn feature crosses; handle large sparse IDs |
| Multi-task models (shared bottom, MMoE, PLE) | Predict several outcomes (click, purchase, dwell, dislike) jointly |

### Multi-Objective Scoring

```
final_score = w1 * P(click) + w2 * P(purchase) * value + w3 * E[watch_time] - w4 * P(dislike)
```

- Calibrate each prediction (isotonic/Platt) before combining.
- Tune weights with online experiments; document trade-offs (engagement vs revenue vs satisfaction).
- Include negative feedback (hides, skips, unsubscribes) explicitly.

## Sequential and Generative Recommendation

- Transformer-based sequence models (SASRec, BERT4Rec) predict the next item from recent interactions; strong for session-heavy products.
- Generative retrieval represents items with semantic IDs (quantized content embeddings) and decodes IDs autoregressively, improving cold-start generalization.
- LLMs help with item understanding (generating attributes, descriptions, embeddings) and conversational recommendation; cost and latency usually confine them to offline enrichment or re-ranking small candidate sets.

## Bias in Logged Data

| Bias | Cause | Correction |
|------|-------|-----------|
| Position bias | Top positions get more clicks regardless of relevance | Position as a training feature (set to a constant at inference), or inverse propensity weighting with estimated examination probabilities |
| Exposure/selection bias | Only shown items get feedback | IPS with logged propensities, randomized exploration traffic |
| Popularity bias | Popular items dominate training | logQ correction, re-ranking for coverage, calibrated recommendations |

Counterfactual (off-policy) evaluation: with logged propensities, estimate a new policy's value using IPS, self-normalized IPS or doubly robust estimators before an A/B test. Requires that the logging policy gave non-zero probability to actions the new policy takes.

## Exploration

- Epsilon-greedy slots, Thompson sampling or UCB-style bandits for new items and uncertain candidates.
- Boost new items for a limited impression budget (cold-start exploration), then let learned scores take over.
- Log propensities for every exploratory decision so data stays usable for off-policy learning.

## Diversity and Re-Ranking

```python
def mmr(candidates, scores, sim, k, lam=0.7):
    """Maximal Marginal Relevance: balance relevance and novelty vs already selected."""
    selected = []
    pool = list(candidates)
    while pool and len(selected) < k:
        best = max(pool, key=lambda i: lam * scores[i] - (1 - lam) * max((sim(i, j) for j in selected), default=0.0))
        selected.append(best)
        pool.remove(best)
    return selected
```

- Alternatives: determinantal point processes, category caps per page, calibration to the user's historical interest distribution.
- Supplier/creator fairness constraints may be required by business or regulation (e.g. the EU Digital Services Act requires very large platforms to explain main parameters of recommender systems and offer at least one option not based on profiling).

## Real-Time Signals

- Session features (items viewed in the last minutes), real-time counters (item CTR in last hour), and inventory/price updates via streaming pipelines.
- Online feature store for low-latency reads; consistent definitions with training (see the feature-engineering and feature-store skills).
- Latency budget split across retrieval, feature fetch and ranking; cache user embeddings per session where acceptable.

## Feedback Loops and Long-Term Effects

- Recommenders shape the data they learn from; without exploration, the catalogue narrows and new items starve.
- Monitor coverage, concentration (Gini of impressions), and new-item exposure over time.
- Optimize proxies of long-term value (retention, satisfaction surveys) and run long-duration holdouts to detect slow harms.

## Experimentation

- A/B tests with guardrail metrics (latency, complaints, diversity, revenue).
- Interleaving (team-draft) for sensitive ranker comparisons with less traffic.
- Watch novelty effects; run long enough to observe stabilized behaviour.

## Checklist

- [ ] Two-tower retrieval trained with logQ-corrected sampled softmax; ANN recall monitored
- [ ] Candidate sources logged and evaluated
- [ ] Multi-task ranker with calibrated outputs and explicit negative feedback
- [ ] Position and exposure bias addressed; propensities logged
- [ ] Exploration budget for new and uncertain items
- [ ] Diversity/calibration re-ranking with measurable constraints
- [ ] Real-time features consistent between training and serving
- [ ] Long-term holdouts and ecosystem metrics monitored
