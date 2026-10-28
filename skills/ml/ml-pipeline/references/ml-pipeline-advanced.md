# ML Pipeline Advanced Patterns

Patterns for mature ML pipelines: training/serving consistency, data validation gates, step caching and incremental runs, champion/challenger promotion, automated retraining, lineage, distributed training steps, and cost control. Fundamentals are in `ml-pipeline-fundamentals.md`.

## 1. Training/Serving Skew

| Source of skew | Prevention |
|---|---|
| Different feature code in training and serving | Single feature definitions (feature store such as Feast, Tecton, Databricks/Vertex feature stores) or shared library |
| Point-in-time leakage in training features | Point-in-time joins (`as of` event timestamp) when building training sets |
| Different preprocessing versions | Package preprocessing with the model artifact |
| Online data freshness differs from training assumptions | Log served features; compare distributions to training |

Log the exact feature vector used for every online prediction (or a sample) to enable skew analysis and future training.

## 2. Data Validation Gates

```python
import pandera.pandas as pa      # pandera >= 0.24; older versions: import pandera as pa

schema = pa.DataFrameSchema({
    "tenure_days": pa.Column(int, pa.Check.ge(0)),
    "monthly_spend": pa.Column(float, pa.Check.in_range(0, 100_000), nullable=False),
    "plan": pa.Column(str, pa.Check.isin(["free", "pro", "enterprise"])),
    "churned": pa.Column(int, pa.Check.isin([0, 1])),
}, strict=True)

def gate(df):
    schema.validate(df, lazy=True)          # raises SchemaErrors listing all failures
    rate = df["churned"].mean()
    if not 0.01 <= rate <= 0.30:
        raise ValueError(f"label rate {rate:.3f} outside expected range; check upstream data")
```

Also compare the new snapshot with the previous one (row-count change, per-feature PSI/KS) and fail or warn on large shifts. Tools: pandera, Great Expectations, TFDV, Evidently.

## 3. Caching and Incremental Execution

- Make each step a pure function of its inputs (data version, code version, config). Cache outputs keyed by a hash of those inputs; skip unchanged steps.
- Orchestrators support this natively (Kubeflow/Vertex step caching, Dagster asset materialization with code versions, Metaflow resume).
- Expensive feature backfills run incrementally by partition; training reads a declared window.

```python
import hashlib, json

def step_key(step: str, data_version: str, code_sha: str, config: dict) -> str:
    payload = json.dumps({"step": step, "data": data_version, "code": code_sha, "config": config},
                         sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()
```

## 4. Champion/Challenger Promotion

```python
def promote_if_better(client, name: str, challenger_version: str, eval_fn, *,
                      min_gain: float = 0.005) -> bool:
    champion = client.get_model_version_by_alias(name, "champion")
    c_metrics = eval_fn(f"models:/{name}/{champion.version}")
    n_metrics = eval_fn(f"models:/{name}/{challenger_version}")
    if n_metrics["pr_auc"] < c_metrics["pr_auc"] + min_gain:
        return False
    for slice_name, value in n_metrics["slices"].items():       # no regressions on key segments
        if value < c_metrics["slices"][slice_name] - 0.01:
            return False
    client.set_registered_model_alias(name, "champion", challenger_version)
    return True
```

- Evaluate both models on the same, current holdout set.
- Check slices (segments, regions, protected attributes where relevant) and operational metrics (latency, size).
- For high-impact models, follow offline promotion with an online A/B test or shadow deployment before full rollout.

## 5. Automated Retraining Triggers

| Trigger | Notes |
|---|---|
| Schedule (weekly/monthly) | Simple; may retrain unnecessarily |
| Data volume (N new labelled rows) | Ties retraining to new information |
| Drift detected (features or predictions) | Investigate root cause; drift may be a data bug |
| Performance drop (once labels arrive) | Most meaningful; labels may be delayed |

Retraining runs the full pipeline including validation and champion comparison; it never auto-promotes without gates.

## 6. Lineage and Governance

Record for each model version:
- Training data versions and feature definitions.
- Code commit, container image digest, pipeline run ID.
- Hyperparameters, metrics, evaluation report, approval record.
- Intended use, limitations, and owners (model card).

Regulated domains (credit, insurance, healthcare; EU AI Act high-risk systems) require documentation, human oversight, and logging; design the pipeline to produce these artifacts automatically.

## 7. Distributed and GPU Steps

- Keep data preparation on CPU clusters (Spark, Ray Data) and run training on GPU nodes only for the training step.
- Use PyTorch DDP/FSDP or framework launchers (`torchrun`, Ray Train, Kubeflow Training Operator) for multi-GPU training.
- Checkpoint regularly to object storage so preemptible/spot GPUs can resume.
- Mixed precision with `torch.amp.autocast(device_type="cuda", dtype=torch.bfloat16)` on supported GPUs reduces memory and time.

## 8. Pipeline Testing

| Test | Scope |
|---|---|
| Unit tests | Feature functions, preprocessing, metric code |
| Pipeline smoke test | Full pipeline on a small fixture dataset in CI |
| Data contract tests | Upstream schemas match expectations |
| Model behaviour tests | Invariance (irrelevant changes do not flip predictions), directional expectations, minimum performance on curated cases |
| Serving tests | Load model artifact in the serving image; predict on input example |

## 9. Cost Control

- Cache and skip unchanged steps.
- Right-size compute per step; autoscale clusters to zero between runs.
- Sample data for hyperparameter search; train the final model on full data.
- Track cost per pipeline run and per model version.

## Pitfalls

- Feature store adopted for online serving while training still uses separate SQL: skew persists.
- Auto-promotion on a single aggregate metric, hiding slice regressions.
- Retraining on drifted data caused by an upstream bug.
- Missing lineage, making audits and rollbacks guesswork.

## Checklist

- [ ] Shared feature definitions with point-in-time correct training sets.
- [ ] Validation gates on schema, ranges, label rate, and distribution shift.
- [ ] Step caching keyed by data, code, and config versions.
- [ ] Champion/challenger with slice checks; online validation for high-impact models.
- [ ] Retraining triggers with full gates; no ungated promotion.
- [ ] Lineage and model cards produced automatically.
