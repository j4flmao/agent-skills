# ML Pipeline Monitoring

## Pipeline Observability

```yaml
pipeline_metrics:
  run_duration:
    p50: 15min
    p95: 30min
    alert_threshold: 60min
  success_rate:
    target: 99.5%
    alert_below: 99.0%
  data_volume:
    expected: 100K-500K rows
    alert_outside: 3σ from moving average
  feature_drift:
    psi_threshold: 0.2
    alert_on: any_feature_drift
```

## Run Tracking

```python
# Track every pipeline run
class PipelineRunTracker:
    def track_start(self, pipeline_name, run_id, params):
        self.log_metric("run.started", 1, tags={
            "pipeline": pipeline_name,
            "run_id": run_id,
            "params": json.dumps(params)
        })

    def track_end(self, run_id, status, metrics):
        self.log_metric("run.completed", 1, tags={
            "run_id": run_id,
            "status": status
        })
        for name, value in metrics.items():
            self.log_metric(f"run.metric.{name}", value, tags={"run_id": run_id})

    def track_error(self, run_id, error_type, error_msg):
        self.log_metric("run.error", 1, tags={
            "run_id": run_id,
            "error_type": error_type,
            "error_message": error_msg[:200]
        })
```

## Data Quality Gates

```python
# Great Expectations in pipeline
import great_expectations as gx

def validate_data_quality(df) -> bool:
    context = gx.get_context()
    suite = context.suites.get("pipeline_validation")

    batch = data_asset.get_batch({"dataframe": df})

    expectations = [
        batch.expect_column_values_to_not_be_null("order_id"),
        batch.expect_column_values_to_be_between(
            "total_amount", min_value=0, max_value=100000
        ),
        batch.expect_column_pair_values_to_be_in_set(
            "status", "is_completed",
            value_pairs=[("paid", True), ("pending", False)]
        ),
    ]

    all_passed = all(e.success for e in expectations)
    if not all_passed:
        failed = [e for e in expectations if not e.success]
        logger.error(f"Data quality failed: {len(failed)} expectations broken")
        return False
    return True
```

## Drift Monitoring in Pipeline

| Drift Type | Detection Point | Action |
|------------|-----------------|--------|
| Data drift | At feature computation | Flag model for retraining |
| Schema drift | At data ingestion | Update pipeline, alert |
| Label drift | At evaluation | Investigate label source |
| Prediction drift | After inference | Shadow deploy new model |
| Feature importance drift | Weekly comparison | Feature engineering review |

## Alerting

```yaml
alerts:
  pipeline_failure:
    condition: run_status == "failed"
    notification:
      - type: pagerduty
        severity: high
      - type: slack
        channel: "#ml-alerts"

  data_quality_failure:
    condition: quality_gate_passed == False
    notification:
      - type: slack
        channel: "#data-quality"
        message: "{{ pipeline }}: Data quality gate failed for {{ run_id }}"

  training_accuracy_drop:
    condition: accuracy < baseline_accuracy - 0.02
    notification:
      - type: slack
        channel: "#ml-metrics"
```

## Cost Tracking

```python
# Track pipeline cost
def track_pipeline_cost(run_id, compute_used, storage_used):
    # Compute cost
    gpu_hours = compute_used.get("gpu_hours", 0)
    cpu_hours = compute_used.get("cpu_hours", 0)

    cost = {
        "gpu_cost": gpu_hours * GPU_COST_PER_HOUR,
        "cpu_cost": cpu_hours * CPU_COST_PER_HOUR,
        "storage_cost": storage_used.get("gb_days", 0) * STORAGE_COST_PER_GB_DAY,
        "total": 0
    }
    cost["total"] = sum(cost.values())

    log_metric("pipeline_cost", cost["total"], tags={"run_id": run_id})
    return cost
```
