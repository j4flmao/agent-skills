# Feature Store Operations: Monitoring, Backfills, Versioning, and Governance

Running a feature store in production: monitoring freshness, quality and drift; backfilling safely; versioning features without breaking models; governance and access control; online store capacity and cost; and embedding features. Concepts are in `feature-store-fundamentals.md`.

## Operational SLOs

| SLO | Definition | Example target |
|-----|-----------|----------------|
| Freshness | Age of the newest value in the online store vs now | Batch: < 26 h; streaming: < 5 min |
| Online latency | p99 of `get_online_features` for a feature service | < 10–20 ms within region |
| Availability | Successful online reads / total | ≥ 99.9% for tier-1 models |
| Completeness | Share of requested entities with non-null values | Per feature, baseline-relative |
| Materialization success | Jobs completed on schedule | 100% with alerting |

Track SLOs per feature view and per consuming model; one stale view can degrade many models.

## Monitoring Feature Quality

| Check | Method |
|-------|--------|
| Schema | Types and presence enforced at write (validation in pipeline) |
| Null / default rate | Compare to rolling baseline |
| Range and distribution | Summary stats; PSI or Jensen–Shannon distance vs training distribution |
| Cardinality | Distinct entities per day; sudden drops signal upstream breaks |
| Skew | Compare online-served values (logged at inference) with offline recomputation for the same entities and timestamps |

```python
import numpy as np

def psi(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    edges = np.unique(np.quantile(expected, np.linspace(0, 1, bins + 1)))
    e = np.histogram(expected, edges)[0] / len(expected)
    a = np.histogram(actual, edges)[0] / len(actual)
    e, a = np.clip(e, 1e-6, None), np.clip(a, 1e-6, None)
    return float(np.sum((a - e) * np.log(a / e)))
```

PSI thresholds (often ~0.1 "watch", ~0.25 "investigate") are rules of thumb; calibrate per feature by checking which shifts actually hurt model performance.

### Log What Was Served

Log the exact feature vector used for each prediction (with model version and request ID). It enables skew detection, debugging, and training on served features ("log and wait"), which eliminates skew for features computed at request time.

## Backfills

Backfills recompute historical feature values after a bug fix or a new feature definition.

1. Write backfilled data to a new version or isolated table; do not overwrite in place while models train on it.
2. Recompute with the same code path as production pipelines, parameterized by date range.
3. Preserve correct event timestamps (and availability timestamps); a backfill must not make values appear earlier than they were knowable.
4. Validate distributions against the previous version; investigate large differences.
5. Re-materialize the online store only if current values changed.
6. Communicate to consumers: models trained on old values may need retraining.

Streaming features: backfill by replaying retained events through the same stream job (or a batch equivalent with identical logic).

## Versioning Strategy

| Change | Handling |
|--------|---------|
| New feature | Add to the feature view; consumers opt in |
| Logic change (same meaning, bug fix) | New version (`spend_30d_v2`) or backfill + announce; never silently change values used by deployed models |
| Semantic change (different meaning) | New feature name |
| Deprecation | Mark deprecated in registry; track consumers; remove after migration |

Pin each model version to a **feature service** (named list of features + versions). Deploying a new model version should never change features for the old one.

## Governance and Access Control

- Registry metadata: owner, description, source tables, transformation code link, PII classification, allowed uses.
- Access control at the feature view level; sensitive features (e.g. derived from health or financial data) restricted to approved models.
- Lineage from raw sources → features → models → endpoints for audits and impact analysis.
- Regulatory review for features that may proxy protected attributes (fairness and anti-discrimination requirements).
- Retention and deletion: erasure requests must remove entity data from offline history and online stores.

## Online Store Capacity and Cost

| Factor | Effect |
|--------|-------|
| Entities × features × value size | Memory/storage footprint |
| Read QPS × features per request | Throughput and cost (per-request priced stores) |
| TTL | Expired entries reduce footprint |
| Hot keys | Popular entities concentrate load |

- Fetch features per model request in one batched call; avoid N sequential lookups.
- Keep online only the features needed for real-time inference; batch-only models read the offline store.
- Choose stores by latency and pricing model: in-memory (Redis/Valkey) for lowest latency, DynamoDB/Bigtable/Cassandra for large footprints, or the platform's managed online store.
- Plan multi-region replication if inference runs in multiple regions.

## Streaming Feature Operations

- Window semantics (sliding/tumbling, event time, watermarks) must match training computation; recompute training features from the same stream logic or a verified batch equivalent.
- Monitor consumer lag and end-to-end freshness.
- Handle late events: decide whether online values are corrected; training data should reflect what was served at the time.

## Embeddings as Features

- Store embeddings (user/item vectors) as features with model version metadata; an embedding is only valid with the model that produced it.
- Re-embedding after a model change requires a full backfill and coordinated rollout of downstream models.
- For similarity search, use a vector database or vector-capable store; the feature store serves the vector for a known entity key.

## Incident Playbook

| Symptom | First checks |
|---------|-------------|
| Model performance drop | Feature freshness, null rates, skew logs, upstream schema changes |
| Online latency spike | Store health, hot keys, request fan-out, network |
| Materialization failures | Source availability, permissions, quota |
| Sudden distribution shift | Upstream logic or unit changes (e.g. cents vs units), new data sources |

Fallbacks: serve defaults with an explicit "degraded" flag, switch to a simpler model that needs fewer features, or use last-known-good values within a TTL.

## Pitfalls

- Overwriting feature history during backfills.
- Model and feature versions not pinned together.
- No logging of served features, making skew invisible.
- Online store sized for average QPS without hot-key analysis.

## Checklist

- [ ] Freshness, latency, availability SLOs with alerts per feature view
- [ ] Distribution and skew monitoring using served-feature logs
- [ ] Backfill runbook preserving timestamps and versions
- [ ] Feature services pin model ↔ feature versions
- [ ] Registry with ownership, classification, lineage, access controls
- [ ] Online store capacity plan including hot keys and regions
- [ ] Degraded-mode fallbacks defined
