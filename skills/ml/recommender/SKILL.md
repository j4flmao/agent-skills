---
name: ml-recommender
description: >
  Use this skill when building recommendation systems: collaborative filtering, matrix factorization, neural recommenders, two-tower models, content-based filtering, hybrid recommenders, cold start strategies, ranking.
  This skill enforces: algorithm selection by data type (explicit/implicit), matrix factorization setup (SVD/ALS/BPR), candidate generation + ranking two-stage design, two-tower architecture for retrieval, cold start strategy, evaluation with precision@k/recall@k/NDCG.
  Do NOT use for: search ranking (use search-patterns skill), time-series forecasting (use ml-time-series), simple popularity-based ranking, or ad targeting.
version: "1.0.0"
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

## Agent Protocol

### Trigger
User request includes: recommendation system, recommender, collaborative filtering, matrix factorization, SVD, implicit feedback, ALS, two-tower, neural recommenders, content-based, hybrid, cold start, ranking, candidate generation, user-item embeddings.

### Input Context
Before activating, verify:
- Data type available: explicit ratings (1-5 stars), implicit (clicks, views, purchases, dwell time), or content features (text, categories, metadata).
- Scale: number of users, items, and interactions. Sparsity level.
- Cold start scenario: new users, new items, or both.
- Business objective: engagement (clicks, views), conversion (purchases), retention (repeat use), diversity.
- Real-time vs batch recommendation requirements.

### Output Artifact
Recommendation system architecture with algorithm selection, model design, cold start strategy, evaluation metrics.

### Response Format
```
## Recommender Architecture
### Data Profile
Users: {N} | Items: {N} | Interactions: {N}
Density: {value}% | Type: {explicit / implicit}

### Algorithm
Primary: {SVD / ALS / BPR / Two-Tower / Hybrid}
Loss: {MSE / BPR / Cross-Entropy / pairwise}
Embedding Dim: {N} | Regularization: {value}

### Architecture (Two-Stage)
Retrieval: {model / method} | Top-K: {N}
Ranking: {model} | Features: [{f1}, {f2}]

### Cold Start
Users: {popular / content-based / exploration}
Items: {content-based / metadata / popularity fallback}

### Evaluation
Offline: {precision@k / recall@k / NDCG / HR@k}
Online: {CTR / engagement / conversion / diversity}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Algorithm selected matching data type and scale.
- [ ] Two-stage architecture defined with retrieval + ranking.
- [ ] Cold start strategy for users and items documented.
- [ ] Negative sampling strategy defined for implicit feedback.
- [ ] Offline evaluation metrics selected with k value.
- [ ] A/B testing plan for online evaluation.
- [ ] Embedding dimension and regularization specified.

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Data Characterization
Explicit feedback (ratings 1-5 stars): use SVD, SVD++, or neural matrix factorization. Normalize ratings by subtracting user mean to remove rating scale bias. Implicit feedback (clicks, views, purchases, dwell time): use ALS with confidence weights, BPR for pairwise ranking, two-tower with sampled softmax. Confidence weight c_ui = 1 + alpha * r_ui where r_ui is interaction count. Typical alpha range 20-40. High sparsity (>99.9%): use content-based or hybrid to supplement interactions. Item cold start especially problematic — items need interactions to get recommended. Large scale (millions of users, millions of items): use two-tower for efficient retrieval with ANN, ALS factorizes at scale with MapReduce implementation. BPR scales to millions but training is slower per iteration than ALS. Embedding dimension: 50-100 for small to medium datasets, 100-200 for large datasets. Higher dimensions capture more patterns but overfit with sparse data.

### Step 2: Candidate Generation (Retrieval)
Goal: narrow from millions of items to 100-500 candidates. Matrix factorization retrieval: compute user vector from interactions, find nearest item vectors in embedding space. Use FAISS (Facebook AI Similarity Search): IndexFlatIP for exact search (<10K items) or IndexIVFFlat with HNSW for approximate search (millions of items). HNSW parameters: M=16-64 (connections per node), efConstruction=200-500 (build quality), efSearch=64-256 (search depth). Two-tower retrieval: encode user (user features + interaction history) into query embedding. Precompute item embeddings offline. Use dot product between query and item embeddings for scoring. Approximate nearest neighbor (ANN): trade recall for speed. Target >90% recall at top-100. Popularity-based fallback: recommend globally most popular items (weighted by recency) when personalization signals are weak. Ensure popularity doesn't dominate — cap popularity score contribution. Multiple retrieval strategies: combine results from collaborative filtering, content-based, and popularity. Merge and deduplicate before ranking.

### Step 3: Ranking
Goal: rank candidates from 100-500 down to top 10-50. Features: user embedding, item embedding, dot product (from retrieval), cross features (user_category x item_category), context features (hour, day, device, location), interaction history features (user's past CTR with item category, last interaction time). Model: gradient boosting (LightGBM, XGBoost with objective=rank:ndcg or lambdarank) for tabular features and strong cross-feature learning. Deep neural network (Wide & Deep, DeepFM, DCN v2) for automatic feature interaction learning. Position features: add position (1-100) as feature during training. At inference, either set position to 0 (ideal position) or use position as input and ignore its coefficient. Loss functions: pairwise loss (BPR, RankNet) — compare candidate pairs and optimize ranking order. Listwise loss (ListMLE, LambdaRank, SoftRank) — optimize ranking metric directly (NDCG, MAP). Calibration: check that predicted scores match actual engagement rates. Use Platt scaling or isotonic regression for calibration. Popularity debiasing: use inverse propensity weighting (IPW) to correct for popularity bias — items are recommended because they're popular, not necessarily relevant.

### Step 4: Cold Start
New users (no interactions): ask preferences via onboarding (select interests, categories). Recommend globally popular items per demographic (age, gender, location based). Use content-based: find content similar to any signal from onboarding. Multi-armed bandit: epsilon-greedy (show popular recommendations with 20% exploration), Thompson sampling (sample from beta distribution for each item's CTR). Transition to collaborative filtering after N interactions (typically 3-5). New items (no user interactions): use content features (title, category, description, image embeddings). Initialize collaborative embedding from similar items using content similarity weights. Apply exploration bonus: add N boost to item score, decay with exposure count. Exploration bonus formula: bonus = alpha / sqrt(exposures + 1). Item cold start is more critical than user cold start because items need exposure to prove relevance. Freshness bias: penalize items without recent interactions by decaying their predicted scores. Hybrid: combine collaborative filtering score with content-based score. Weight collaborative score by confidence (interaction count) and content score by availability of content features.

### Integration with Feature Store and Serving
Store user and item embeddings in a feature store (Feast, Tecton) for online access during inference.
Precompute item embeddings and refresh on cadence (hourly for content-based, daily for collaborative).
Deploy retrieval service using FAISS with HNSW index for fast approximate nearest neighbor search.
Deploy ranking service using ONNX-exported gradient boosting or neural model for low-latency scoring.
Implement request-level caching for identical queries within short time window to reduce load.
Monitor recommendation quality in production: CTR, diversity, coverage, freshness, latency.
Log all recommendation requests and responses for offline evaluation, debugging, and replay analysis.

### Step 5: Offline Evaluation
Precision at k: fraction of top-k recommendations that are relevant. Does not consider ranking order within top-k. Recall at k: fraction of all relevant items retrieved in top-k. Depends on how relevance is defined (purchase vs view). NDCG at k: graded relevance with position discount. Best metric when relevance is multi-level (view=1, add-to-cart=2, purchase=3). Hit rate at k: did any relevant item appear in top-k? Simple, commonly used in research papers. Mean Average Precision (MAP): average precision across all users. Precision at every relevant position. AUC for ranking: probability that a random positive is ranked above a random negative. Independent of k. For all metrics: set k based on application — k=5 for search-like, k=10-20 for browse, k=50 for recommendations page. Report per-user metric distribution (median, percentiles) not just mean — some users have great recommendations, others may have none.

### Integration with Feature Store and Serving
Store user and item embeddings in a feature store (Feast, Tecton) for online access.
Precompute item embeddings and refresh on cadence (hourly for content, daily for collaborative signals).
Deploy retrieval service using FAISS for fast ANN search with HNSW index.
Deploy ranking service using ONNX-exported gradient boosting or neural model.
Implement request-level caching for identical queries within short time window.
Monitor recommendation quality in production: CTR, diversity, coverage, freshness.
Log all recommendation requests and responses for offline evaluation and debugging.

### Step 6: A/B Testing
Minimum duration: 2 weeks (1 week for weekly seasonality + 1 week for novelty effect decay). Primary metric: CTR (click-through rate), conversion rate, engagement time (dwell time), revenue per user, retention rate. Guardrail metrics: diversity (intra-list similarity, coverage), freshness (percentage of new items in recommendations), relevance (human evaluation on sample), latency (p95 response time). Novelty effect: new algorithms often get higher initial CTR due to curiosity. Novelty decays over 1-2 weeks. Start with small traffic (5-10%), ramp up gradually. Interleaving experiments: show results from both A and B side-by-side, user clicks on preferred one. Faster convergence (2-5x fewer users needed) but only measures relative preference, not absolute metrics. Holdout: keep a control group on the old algorithm for long-term comparison.

### Common Pitfalls
Starting with complex neural models instead of simple baselines — popularity and matrix factorization first.
Training and evaluating on random splits — temporal split is more realistic for recommendation.
Not handling position bias in click data — clicks at position 1 are inflated by visibility.
Ignoring cold start for new items — items with zero interactions never get recommended.
Using only precision/recall without NDCG — NDCG accounts for ranking order, not just presence.
Training with too high embedding dimension on sparse data — overfitting to few interactions.
Evaluating offline metrics without online A/B testing — offline metrics correlate weakly with user engagement.
Forgetting to filter already-interacted items from recommendations — degrades user experience.

## Rules
- Always start with a simple popularity baseline — if your model doesn't beat popularity, fix the model.
- Two-stage architecture: retrieval quality limits ranking quality — invest in good retrieval first.
- ALS handles implicit feedback naturally — use confidence weights for interaction frequency.
- BPR is the standard pairwise loss for implicit feedback ranking.
- Two-tower models scale to billions of users/items with ANN retrieval.
- Cold start for new items matters more than for new users — items need exposure to get interactions.
- Never evaluate only on held-out interactions — also evaluate on cold items (no prior interactions).
- NDCG is preferred over precision/recall for multi-graded relevance (purchase > click > view).
- Position bias correction: use inverse propensity weighting (IPW) or train with position feature.
- Online metrics often diverge from offline metrics — expected but track correlation over time.
- Maintain diversity to prevent filter bubbles: cap per-category recommendations, interleave popular and niche.
- Freshness matters: decay old item scores and boost new item exploration.
- Monitor recommendation coverage — <10% item coverage means the system is too narrow.

### Production Monitoring
Track CTR, conversion rate, and engagement time per recommendation slot to detect degradation.
Monitor recommendation diversity (intra-list similarity) — decreasing diversity indicates filter bubble formation.
Track coverage — percentage of items ever recommended — low coverage means system is too narrow.
Monitor freshness — percentage of new items in recommendations — low freshness means stale recommendations.
Track p50/p95/p99 inference latency for both retrieval and ranking stages.
Log recommendation request metadata: user features, candidate count, ranking features, displayed items.
Set up A/B testing dashboard comparing new models against production baseline on primary metrics.

### Troubleshooting Guide
Low CTR despite good offline metrics → offline metrics may not capture user behavior; run A/B test.
All users getting same recommendations → popularity bias overwhelming personalization signals; debias training data.
New items never getting recommended → cold start strategy not working; check exploration bonus and content features.
High latency in retrieval → reduce index size, use HNSW with lower ef_search, or reduce candidate pool size.
Model performance degrading over time → user preferences drift; retrain on recent data, add time decay.
High false positive rate in ranking → calibration off; recalibrate scores using Platt scaling or isotonic regression.
Diversity too low → add diversity penalty in ranking loss, interleave with popularity-based candidates.
A/B test inconclusive after 2 weeks → novelty effect may mask real difference; analyze per-week trends separately.

### Deployment Checklist
Precompute item embeddings on a refresh cadence matching content update frequency for sub-100ms retrieval.
Deploy FAISS index with HNSW for ANN retrieval; tune ef_search for latency/recall tradeoff.
Expose model prediction as a REST/gRPC service with request caching for identical queries.
Implement gradual rollout: 5% traffic to new model, ramp up if metrics are neutral or positive.
Set up automatic rollback if primary metric drops by more than 5% within 24 hours.
Monitor recommendation diversity, freshness, and coverage as guardrail metrics during rollout.
Log all recommendation requests, candidate sets, ranking scores, and final displays for offline analysis.
Version embeddings and ranking models independently to enable isolated rollbacks.

## References
- references/cf-matrix-factorization.md — User-based/item-based CF, SVD, ALS for implicit, BPR, evaluation precision@k/recall@k/NDCG
- references/neural-recommender.md — Two-tower model, embedding layers, negative sampling, cold start, candidate generation, ranking, feature store integration
- references/cold-start-strategies.md — New user/item cold start, content-based initialization, exploration bonus, multi-armed bandit, onboarding
- references/recommender-evaluation.md — Offline metrics (NDCG, Recall@k), temporal split, leave-one-out, A/B testing, dashboard metrics, common pitfalls

### Edge Cases and Special Scenarios
Sequential/session-based recommendation: use GRU4Rec, SR-GNN, SASRec, BERT4Rec for next-item prediction.
News recommendation: use content embeddings (BERT for headlines), recency bias, topic diversity maximization.
Marketplace recommendation (buyers + sellers): model both sides, balance buyer relevance with seller exposure fairness.
Location-based recommendation: use geohash features, distance decay weighting, local popularity signals.
Cold start with side information: use content features (text, images, categories), metadata embeddings, warm-start via feature-based initialization.
Cross-domain recommendation: use shared user embeddings across domains, domain adaptation techniques, CDCF (cross-domain CF).
Multimedia recommendation: combine collaborative signals with visual/audio embeddings from pretrained models.

### Framework Integration
Surprise: SVD, SVD++, NMF, KNN, CoClustering for explicit rating prediction (pip install scikit-surprise).
Implicit: ALS, BPR, Bayesian Personalised Ranking for implicit feedback (pip install implicit).
LightFM: hybrid recommender combining collaborative and content-based signals with metadata features.
Microsoft Recommenders: popular algorithms (SAR, ALS, BPR, VowpalWabbit, DeepRec) with evaluation utilities.
Spotify Annoy: approximate nearest neighbor library for efficient retrieval at scale.
TensorFlow Recommenders: two-tower, multi-task, retrieval and ranking models in TF.
PyTorch RecSys: deep learning recommender models (NCF, Wide&Deep, DCN) in PyTorch.

### Advanced Recommender Tips
Use HNSW index with product quantization (PQ) for memory-efficient ANN retrieval at billion-item scale.
Implement score calibration to ensure recommendation scores match expected engagement probabilities.
For session-based recommendation, use GRU4Rec or SR-GNN for capturing short-term user intent.
Use contextual bandits (LinUCB, Thompson sampling) for explore-exploit in cold start scenarios.
Implement fairness constraints in recommendation: ensure demographic parity in exposure across groups.
Use diversity-aware ranking: MMR (Maximum Marginal Relevance) or DPP (Determinantal Point Process).
For real-time personalization, update user embeddings incrementally without full model retraining.
Implement two-level retrieval: coarse retrieval with smaller embeddings, fine retrieval with full embeddings.

## Handoff
Hand off to ml-experiment-tracking for training runs. For search relevance improvements, hand off to search-patterns. For feature store setup, hand off to data-feature-store.
