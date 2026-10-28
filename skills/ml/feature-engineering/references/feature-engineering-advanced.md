# Feature Engineering: Advanced Topics

Advanced feature engineering for production ML: point-in-time correct temporal features, high-cardinality and target-based encodings without leakage, feature selection methods, learned embeddings as features, feature stores and training-serving consistency, drift monitoring, and scaling computation. Fundamentals are in `feature-engineering-fundamentals.md`; leakage diagnostics in `validation-leakage.md`; automated FE in `automated-fe.md`.

## Point-in-Time Correctness

Each training example has a prediction timestamp `t`. Every feature must be computed only from data with event time `< t` (and available by `t`, accounting for pipeline delays).

```python
import pandas as pd

# labels: one row per (user_id, prediction_ts)
# events: transactions with (user_id, event_ts, amount)
labels = labels.sort_values("prediction_ts")
daily = (
    events.set_index("event_ts")
    .groupby("user_id")["amount"]
    .rolling("30D", closed="left")          # exclude the current timestamp
    .agg(["sum", "count"])
    .reset_index()
    .rename(columns={"sum": "amt_sum_30d", "count": "txn_count_30d", "event_ts": "feature_ts"})
    .sort_values("feature_ts")
)
train = pd.merge_asof(
    labels, daily,
    left_on="prediction_ts", right_on="feature_ts",
    by="user_id", direction="backward", allow_exact_matches=False,
)
```

- `merge_asof` (pandas), `ASOF JOIN` (DuckDB, ClickHouse, Snowflake), or feature store point-in-time joins (Feast `get_historical_features`) implement this.
- Model **data availability latency**: if transactions land in the warehouse with a 6-hour delay, shift the cutoff by 6 hours for training to match serving.
- Validate with a time-based split (train on earlier periods, validate on later).

## High-Cardinality Categoricals

| Technique | Notes |
|-----------|-------|
| Frequency / count encoding | Simple, leak-free if counts come from training data (or past-only windows) |
| Target encoding with out-of-fold fitting | `sklearn.preprocessing.TargetEncoder` uses internal cross fitting in `fit_transform`; add smoothing for rare categories |
| Ordered target statistics | CatBoost's native categorical handling avoids target leakage via ordered boosting |
| Feature hashing | `FeatureHasher`; fixed dimension, handles unseen values, collisions acceptable for large spaces |
| Learned embeddings | Entity embeddings from neural nets or two-tower models, reused as features |

```python
from sklearn.preprocessing import TargetEncoder

enc = TargetEncoder(target_type="binary", smooth="auto", cv=5, random_state=0)
X_train_enc = enc.fit_transform(X_train[["merchant_id"]], y_train)   # cross-fitted
X_valid_enc = enc.transform(X_valid[["merchant_id"]])                 # full-train fit
```

Never call `fit(X, y).transform(X)` on the same rows for target encoding; that leaks the label.

## Feature Selection

| Method | Type | Notes |
|--------|------|-------|
| Variance / missing-rate filters | Filter | Remove constant and mostly-empty features |
| Correlation clustering | Filter | Keep one representative per highly correlated group |
| Mutual information | Filter | Captures non-linear relevance; noisy for small samples |
| L1-regularized models | Embedded | Sparse linear selection |
| Tree-based importance (gain) | Embedded | Biased toward high-cardinality features |
| Permutation importance on validation | Wrapper-ish | Model-agnostic; correlated features share importance |
| SHAP values | Attribution | Global importance plus interaction insight |
| Recursive feature elimination (RFECV) | Wrapper | Expensive; nested CV to avoid optimistic estimates |
| Boruta / shadow features | Wrapper | Compares against shuffled copies |

Selection must happen inside cross-validation (nested or within pipelines); selecting on the full dataset then cross-validating inflates scores.

## Embeddings as Features

- Text: sentence-transformer embeddings for descriptions or tickets; reduce dimension (PCA) for tree models.
- Images: pretrained vision backbones' pooled features.
- Behaviour: item2vec / sequence models over user actions; graph embeddings over transaction networks.
- Version the embedding model; recompute all embeddings when it changes; never mix embeddings from different models in one feature.

## Feature Stores and Training-Serving Consistency

| Concern | Practice |
|---------|----------|
| Single definition | Define features once (SQL/Python) and materialize to offline (training) and online (serving) stores |
| Point-in-time joins | Feature store generates training sets from historical values |
| Freshness | Streaming features (Flink/Spark Structured Streaming) for minute-level signals; batch for daily |
| Skew detection | Log served feature values, compare distributions with training data |
| Ownership and reuse | Registry with owners, descriptions, SLAs |

Tools: Feast (open source), Tecton, Databricks Feature Store, Vertex AI Feature Store, SageMaker Feature Store. See the `ml/feature-store` skill for details.

## Drift Monitoring

- Monitor input feature distributions (PSI, Jensen-Shannon distance, Kolmogorov-Smirnov for continuous features), missing rates, and category vocabulary changes.
- Monitor prediction distribution and, when labels arrive, performance by segment.
- Alerts tuned per feature importance: drift in an unimportant feature matters less.
- Upstream schema changes (unit changes, new categories, default values) cause most "drift" incidents; data contracts and validation (Great Expectations, Pandera) catch them earlier.

## Scaling Feature Computation

- Columnar engines: Polars (lazy API, streaming), DuckDB for single-node analytics on Parquet; Spark for distributed workloads.
- Push aggregations into the warehouse with window functions; materialize incremental results instead of recomputing full history.
- Cache expensive intermediate tables keyed by data version; track lineage.

```python
import polars as pl

features = (
    pl.scan_parquet("events/*.parquet")
    .filter(pl.col("event_ts") < pl.lit(cutoff))
    .group_by("user_id")
    .agg(
        pl.col("amount").sum().alias("amt_sum"),
        pl.col("amount").mean().alias("amt_mean"),
        pl.len().alias("n_events"),
        (pl.lit(cutoff) - pl.col("event_ts").max()).dt.total_days().alias("days_since_last"),
    )
    .collect()
)
```

## Fairness and Sensitive Features

- Document whether protected attributes (or proxies like postcode) are used; legal constraints vary by domain (credit, employment, insurance).
- Evaluate model performance and error rates per group even when the attribute is not a model input.

## Checklist

- [ ] Every temporal feature point-in-time correct, including ingestion delay
- [ ] Target-based encodings cross-fitted; no same-row leakage
- [ ] Feature selection performed inside CV
- [ ] Embedding models versioned; full recompute on change
- [ ] One feature definition serves training and inference; skew monitored
- [ ] Drift metrics and data validation on inputs
- [ ] Sensitive attributes and proxies reviewed
