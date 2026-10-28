# Anomaly Detection Advanced: Production Systems

Running anomaly detection in production: seasonality-aware time-series detection at scale, multivariate and correlated signals, alert quality, explanations, feedback loops, drift, and system architecture. Fundamentals are in `anomaly-detection-fundamentals.md`.

## 1. Seasonality and Context

Most production false positives come from normal patterns the detector does not know about.

```python
import pandas as pd
from statsmodels.tsa.seasonal import STL

def stl_residual_flags(series: pd.Series, period: int, k: float = 3.5) -> pd.Series:
    res = STL(series, period=period, robust=True).fit()
    resid = res.resid
    median = resid.median()
    mad = (resid - median).abs().median()
    if mad == 0:
        raise ValueError(f"zero MAD in residuals for series {series.name}")
    z = 0.6745 * (resid - median) / mad
    return z.abs() > k

# hourly data with daily seasonality: period=24; with weekly: consider MSTL (statsmodels) for multiple periods
```

Alternatives:
- Forecast-based: fit a forecaster (ETS, Prophet, gradient boosting with calendar features) and flag observations outside prediction intervals.
- Hour-of-week baselines: compare each point with the robust distribution of the same hour-of-week over recent weeks.
- Calendar features for holidays and known events; suppress or model them explicitly.

## 2. Scaling to Many Series

Thousands of metrics (per customer, per host, per endpoint) need:
- Per-series models fitted in parallel (Spark `applyInPandas`, Ray, Dask) or global models trained across series with series identifiers as features.
- Minimum-history rules: series with too little data fall back to group-level baselines.
- Hierarchy awareness: an anomaly in a parent (total traffic) and many children is one incident, not hundreds.

```python
def detect(pdf: pd.DataFrame) -> pd.DataFrame:
    s = pdf.set_index("ts")["value"].asfreq("h")
    if s.count() < 24 * 14:
        return pdf.assign(is_anomaly=False, reason="insufficient_history")
    flags = stl_residual_flags(s.interpolate(limit=3), period=24)
    return pdf.assign(is_anomaly=flags.reindex(pdf["ts"]).fillna(False).values, reason="stl_residual")

result = sdf.groupBy("series_id").applyInPandas(detect, schema=out_schema)
```

## 3. Multivariate and Correlated Signals

| Approach | Use |
|---|---|
| Mahalanobis distance with robust covariance (`sklearn.covariance.MinCovDet`) | Moderate dimensions, roughly elliptical data |
| Isolation Forest / LOF on feature vectors | Tabular events |
| Autoencoders / sequence models on windows | High-dimensional sensor data |
| Correlation breaks (pairs that usually move together diverge) | Systems metrics, finance |
| Graph-based (unusual edges, communities) | Fraud rings, network security |

Group simultaneous univariate anomalies across related series into one candidate incident before alerting.

## 4. Alert Quality

| Technique | Effect |
|---|---|
| Persistence: require k of n consecutive anomalous points | Removes single-point noise |
| Minimum impact: absolute and relative deviation thresholds | Ignores statistically significant but trivial changes |
| Deduplication and grouping by entity/time window | One alert per incident |
| Suppression during maintenance/deploy windows | Avoid known noise |
| Severity scoring (deviation × business weight) | Prioritized queue |
| Alert budget per team per day | Forces threshold tuning |

Track precision of alerts per detector weekly; disable or retune detectors that fall below an agreed precision.

## 5. Explanations

Investigators act faster with reasons:
- Univariate: expected value/range vs actual, seasonal baseline, magnitude.
- Tabular models: per-feature contributions (SHAP for tree models, including `shap.TreeExplainer` on Isolation Forest) or simple "top deviating features" by robust z-score per feature.
- Include context: related series, recent deploys, similar past incidents.

```json
{"entity": "merchant_8812", "score": 0.91, "top_factors": [
  {"feature": "refund_rate_1h", "value": 0.42, "baseline": 0.03},
  {"feature": "new_card_ratio_1h", "value": 0.77, "baseline": 0.12}]}
```

## 6. Feedback Loop and Semi-Supervision

- Capture analyst dispositions (true positive, false positive, expected behaviour) with reason codes.
- Use labels to calibrate thresholds, train a supervised re-ranker on top of unsupervised scores, and build an evaluation set.
- Beware selection bias: labels exist only for alerted cases. Periodically label random samples below threshold to estimate missed anomalies.

## 7. Drift and Retraining

| Drift | Detection | Response |
|---|---|---|
| Input distribution shift | PSI / KS tests on features, score distribution shift | Retrain baseline; re-evaluate threshold |
| Concept change (new normal) | Rising alert volume with "expected" dispositions | Retrain on recent window; add context features |
| Seasonality change | Residual patterns with periodicity | Re-fit seasonal components |

Retrain on a rolling window, excluding confirmed anomalies from training data for novelty-style models. Version models and thresholds together and compare new versions in shadow mode.

## 8. Architecture

```
Sources (metrics, events, transactions)
   │
   ├─► Streaming path: feature aggregation (Flink/Spark/ksqlDB) → online scorer → alert router
   │
   └─► Batch path: feature tables → model training/evaluation → model registry
                                          │
                  thresholds + model version ─► online scorer
Alerts → case management → analyst feedback → labels store → training
```

- Keep feature computation identical between batch training and online scoring (shared code or a feature store).
- Store every score with model version, threshold, and inputs (or references) for audits.
- Latency budget dictates model choice: per-event fraud scoring often needs millisecond inference.

## 9. Adversarial Settings

In fraud and security, adversaries adapt:
- Combine rules (known patterns) with anomaly models (unknown patterns).
- Avoid exposing scores or reasons to the actors being scored.
- Monitor for probing behaviour (many small attempts near thresholds).

## Pitfalls

- One global threshold across heterogeneous entities.
- Retraining on data polluted by an ongoing incident, teaching the model the incident is normal.
- Hundreds of alerts for one root cause.
- Evaluating only on alerted cases.

## Checklist

- [ ] Seasonality and calendar effects modelled.
- [ ] Per-series fallbacks for short histories; hierarchical grouping.
- [ ] Persistence, impact, dedup, and suppression rules in alerting.
- [ ] Explanations attached to alerts.
- [ ] Feedback captured; random below-threshold sampling for recall.
- [ ] Drift monitoring and versioned model + threshold rollout via shadow mode.
