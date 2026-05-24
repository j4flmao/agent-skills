# Model Versioning & Deployment Strategies

## Versioning Schemes

| Scheme | Format | Example | Best For |
|--------|--------|---------|----------|
| Semantic | MAJOR.MINOR.PATCH | 2.1.3 | Breaking API, new features, patches |
| Date-based | YYYY.MM.DD.N | 2025.03.15.1 | Scheduled retraining, batch deployments |
| Sequential | N | v42 | Simple pipelines, one model at a time |
| Hash-based | git-{commit} | git-a1b2c3d | Tight coupling with code versioning |
| Hybrid | model-v{M}.{data} | v3-ds20250315 | Complex MLOps with data versioning |

## Model Registry

```
# MLflow model registry
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Register with metadata
client.create_registered_model("fraud-detector")
client.create_model_version(
    name="fraud-detector",
    source="runs:/abc123/models/fraud",
    run_id="abc123",
    description="XGBoost with feature engineering v3",
    tags={"dataset": "transactions_2025Q1", "auc": "0.942"},
)

# Stage transitions
client.transition_model_version_stage(
    name="fraud-detector",
    version=4,
    stage="Staging",
    archive_existing_versions=True,
)
```

## Deployment Strategies

| Strategy | Traffic Switch | Rollback | Risk | Complexity | Time |
|----------|---------------|----------|------|------------|------|
| Rolling | Gradual (per node) | Fast | Low | Medium | 5-15 min |
| Blue-green | Instant via LB | Instant | Medium | Low | <1 min |
| Canary | % based split | Gradual | Low | High | 10-60 min |
| A/B testing | % based split per user | Gradual | Low | High | Continuous |
| Shadow | Mirror to new, serve old | None | None | High | Days-weeks |

### Canary Deployment

```
# KServe canary config
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: fraud-detector
spec:
  canary:
    trafficPercent: 10
    containers:
    - image: fraud-detector:v2
  default:
    containers:
    - image: fraud-detector:v1
```

```
# Validate canary before full rollout
# Conditions for promotion:
# - Error rate: < 0.1% increase from baseline
# - Latency p95: < 10% increase
# - AUC: within 1% of baseline
# - No critical alerts in 30 minutes
```

## Model Metadata

```
model_metadata = {
    "model_name": "fraud-detector",
    "version": "2.1.0",
    "framework": "xgboost",
    "framework_version": "2.0.0",
    "training_date": "2025-03-15",
    "training_data": {
        "source": "transactions_2025Q1",
        "rows": 2500000,
        "features": 42,
        "date_range": "2025-01-01 to 2025-03-01",
    },
    "performance": {
        "auc": 0.942,
        "precision": 0.89,
        "recall": 0.91,
        "f1": 0.90,
    },
    "input_schema": {
        "features": ["amount", "merchant_id", "user_age", ...],
        "types": {"amount": "float", "merchant_id": "int"},
    },
    "output_schema": {
        "prediction": "int (0/1)",
        "probability": "float",
        "decision_threshold": 0.5,
    },
    "registered_by": "ci-pipeline",
    "git_commit": "a1b2c3d4e5f6",
    "pipeline_run": "kfp-run-20250315-001",
}
```

## Rollback Procedure

| Trigger | Action | Validation |
|---------|--------|------------|
| Error rate > 1% | Auto-rollback to previous version | Health check for 5 min |
| Latency p95 > 500ms | Auto-rollback | Compare metrics with baseline |
| AUC drop > 2% | Alert + manual rollback | Run eval on held-out set |
| Data drift detected | Alert, no auto-rollback | Investigate root cause |
| Throttling > 1% requests | Scale up then investigate | Check autoscaling config |

```
# Automated rollback script
def rollback(model_name, from_version, to_version):
    print(f"Rolling back {model_name} v{from_version} → v{to_version}")
    client.transition_model_version_stage(
        name=model_name,
        version=to_version,
        stage="Production",
        archive_existing_versions=True,
    )
    # Verify
    current = client.get_latest_versions(model_name, stages=["Production"])
    assert current[0].version == to_version
    print(f"Rollback complete. Production now uses v{to_version}")
```

## Best Practices

- Keep last 2-3 model versions for rollback at all times
- Tag every model version with training metadata (data range, git hash, metrics)
- Automate canary promotion/rollback based on metric thresholds
- Separate model version from API version — breaking API changes require new endpoint
- Pin training data version alongside model version for reproducibility
- Use shadow deployments for validation without user impact
- Document rollback procedure and test it regularly
- Monitor both model version and data version drift
- Store model lineage: data → features → training → evaluation → deployment
- Never delete old model versions — archive them with metadata
