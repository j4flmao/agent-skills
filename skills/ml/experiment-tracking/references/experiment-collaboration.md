# Experiment Collaboration

## Team Workflows

| Team Size | Workflow | Tooling |
|-----------|----------|---------|
| 1-3 researchers | Ad-hoc sharing, shared tracking server | MLflow local |
| Data science team | Centralized tracking, model registry | MLflow server, W&B |
| Multiple teams | Project-based experiments, RBAC | MLflow + Neptune |
| Enterprise | Governance, audit, compliance | SageMaker, Vertex AI, MLflow Enterprise |

## Notebook Tracking

```python
# MLflow in Jupyter/Colab
import mlflow
mlflow.set_tracking_uri("http://mlflow-server:5000")
mlflow.set_experiment("research-notebooks")

with mlflow.start_run(run_name="exploration-v3"):
    # Log hyperparameters
    mlflow.log_params({
        "embedding_dim": 128,
        "learning_rate": 0.001,
        "architecture": "two-tower"
    })

    # Log code context
    mlflow.log_param("notebook_name", "recsys_exploration.ipynb")
    mlflow.log_param("user", "alice")

    # Log any artifact
    mlflow.log_artifact("eda/output/embeddings_visualization.png")
    mlflow.log_artifact("models/temp_model.pkl")
```

## Report Generation

```python
# MLflow evaluation with comparison report
mlflow.evaluate(
    model="runs:/<run-id>/model",
    data=eval_data,
    targets="ground_truth",
    model_type="regressor",
    evaluators=["default"],
    feature_importance=True,
)

# Generate comparison report across runs
from mlflow import MlflowClient
client = MlflowClient()

runs = client.search_runs(
    experiment_ids=["1", "2"],
    filter_string="metrics.rmse < 0.5",
    order_by=["metrics.accuracy DESC"],
    max_results=5
)

# Export comparison as HTML report
mlflow.run_comparison_report(runs, output_path="comparison.html")
```

## Model Comparison Dashboards

| Feature | MLflow UI | W&B | Neptune |
|---------|-----------|-----|---------|
| Run list | Table with metrics, params | Table with auto-generated columns | Table with custom views |
| Compare runs | Side-by-side metric/param | Parallel coordinates, scatter plots | Grid comparison |
| Chart builder | Limited | Full chart builder | Custom chart builder |
| Model registry | Stages (Staging/Production) | Full lifecycle | Custom stages |
| Embeddings | Not supported | 2D/3D projector | 2D/3D visualizer |
| Collaboration | Shared server | Teams, reports, comments | Teams, dashboards |

## CI/CD for Model Comparison

```yaml
# GitHub Actions: Compare candidate vs production model
name: Model Comparison
on:
  push:
    branches: [experiments/*]
jobs:
  compare:
    runs-on: ubuntu-latest
    steps:
    - name: Train candidate
      run: mlflow run . --experiment-name ci-candidates
    - name: Compare with production
      run: |
        CANDIDATE_METRIC=$(mlflow runs list \
          --experiment ci-candidates --format json | jq '.metrics.accuracy')
        PRODUCTION_METRIC=$(mlflow runs list \
          --experiment production --format json | jq '.metrics.accuracy')
        if (( $(echo "$CANDIDATE_METRIC < $PRODUCTION_METRIC" | bc -l) )); then
          echo "Candidate ($CANDIDATE_METRIC) < Production ($PRODUCTION_METRIC)"
          exit 1
        fi
```

## Best Practices

- One experiment per logical project, not per person
- Naming convention: `<team>/<project>/<purpose>`
- Log all parameters, including environment and code version
- Tag runs with metadata (git SHA, dataset version, author)
- Set up alerts for training failures and metric regressions
- Archive old experiments (3+ months) to reduce tracking server load
