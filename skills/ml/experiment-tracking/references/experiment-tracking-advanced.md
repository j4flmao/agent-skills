# Experiment Tracking Advanced Topics

Running experiment tracking as shared infrastructure: production tracking-server architecture, security, hyperparameter sweeps and nested runs, distributed training logging, lineage from data to deployed model, tracking LLM and GenAI work (traces and evaluations), automated promotion gates, and data retention.

## Tracking Server Architecture (MLflow)

```text
clients (training jobs, notebooks, CI)
   │ HTTPS + auth
   ▼
reverse proxy / auth gateway (OIDC)
   ▼
mlflow server (stateless, N replicas)
   ├─ backend store: PostgreSQL / MySQL (runs, params, metrics, registry)
   └─ artifact store: S3 / GCS / Azure Blob (models, files)  ← proxied through the server or direct
```

```bash
mlflow server \
  --host 0.0.0.0 --port 5000 \
  --backend-store-uri "postgresql+psycopg2://mlflow:${DB_PASSWORD}@db.internal:5432/mlflow" \
  --artifacts-destination s3://ml-artifacts/mlflow \
  --serve-artifacts \
  --workers 4
```

- `--serve-artifacts` proxies artifact uploads/downloads through the server, so clients need no direct bucket credentials; disable it and grant scoped bucket access only when artifact traffic must bypass the server for throughput.
- Use a managed relational database with backups; never SQLite for shared servers.
- Run database migrations (`mlflow db upgrade <uri>`) as a controlled step when upgrading MLflow.
- Put large-metric workloads (per-step metrics for thousands of runs) on a database sized for write throughput; batch metric logging (`log_metrics`, `log_batch`).

### Security
| Concern | Control |
|---------|---------|
| Authentication | SSO via reverse proxy (OIDC), or MLflow's built-in basic auth app (`--app-name basic-auth`) for small setups |
| Authorization | Per-experiment/registered-model permissions (built-in auth) or a managed platform (Databricks, SageMaker, Azure ML) |
| Secrets in params/tags | Never log API keys, connection strings or PII; scan or redact |
| Artifact access | Bucket encryption, least-privilege IAM, no public buckets |
| Model loading | Pickled models execute code on load; only load models from trusted registries |

## Sweeps and Nested Runs

```python
import optuna
import mlflow

def objective(trial: optuna.Trial) -> float:
    params = {
        "lr": trial.suggest_float("lr", 1e-5, 1e-2, log=True),
        "depth": trial.suggest_int("depth", 4, 12),
    }
    with mlflow.start_run(nested=True, run_name=f"trial-{trial.number}"):
        mlflow.log_params(params)
        score = train_and_evaluate(params)
        mlflow.log_metric("val_auc", score)
    return score

with mlflow.start_run(run_name="optuna-sweep-2026-10") as parent:
    mlflow.set_tag("sweep", "optuna-tpe")
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=50)
    mlflow.log_params({f"best_{k}": v for k, v in study.best_params.items()})
    mlflow.log_metric("best_val_auc", study.best_value)
```

- Parent run = sweep definition and best result; children = trials.
- Log the search space and sampler as tags/params so the sweep can be rerun.
- After the sweep, retrain the best config with several seeds and report mean/std before promoting.
- W&B Sweeps provide hosted search controllers with agents on your compute.

## Distributed Training

Only one process should create the run and log metrics, or logs are duplicated and races occur.

```python
import os
import torch.distributed as dist

is_main = int(os.environ.get("RANK", "0")) == 0

if is_main:
    mlflow.start_run(run_name="ddp-8xgpu")
    mlflow.log_params(cfg)

for step, batch in enumerate(loader):
    loss = train_step(batch)
    if step % 50 == 0:
        reduced = loss.detach().clone()
        dist.all_reduce(reduced, op=dist.ReduceOp.AVG)   # average across ranks
        if is_main:
            mlflow.log_metric("train/loss", reduced.item(), step=step)

if is_main:
    mlflow.end_run()
```

Log aggregated values (all-reduced) rather than rank-0's local value. Frameworks (PyTorch Lightning, Hugging Face `Trainer` with `report_to=["mlflow"]` or `["wandb"]`) handle rank-zero logging for you.

## Lineage

Connect every deployed model back to its inputs:

```text
raw data snapshot ─► feature pipeline run ─► training dataset version ─► training run ─► model version ─► deployment
     (lakeFS/Delta version)   (orchestrator run ID)     (DVC hash / table version)     (run ID)      (registry alias)  (service revision)
```

- Log dataset inputs explicitly (`mlflow.log_input(mlflow.data.from_pandas(df, source=..., name=...), context="training")`) so the run records dataset name, digest and source.
- Tag model versions with the training run ID and data version; tag deployments with the model version.
- Store the orchestrator run ID (Airflow, Kubeflow, Dagster) in the run's tags.

## LLM and GenAI Tracking

Classic params/metrics are not enough for prompt- and LLM-based systems:

| Need | Approach |
|------|----------|
| Prompt and configuration versions | Version prompts (prompt registry or files in Git) and log prompt version as a param |
| Request-level traces | Tracing (MLflow Tracing, W&B Weave, OpenTelemetry GenAI semantic conventions) capturing inputs, outputs, tool calls, latency, token usage |
| Quality evaluation | Evaluation datasets + automated scorers (exact match, LLM-as-judge with rubric, groundedness) logged as metrics per run |
| Cost | Tokens and cost per evaluation run |

```python
import mlflow

mlflow.openai.autolog()          # traces OpenAI client calls; similar integrations exist for other SDKs/frameworks

@mlflow.trace
def answer(question: str) -> str:
    context = retrieve(question)
    return generate(question, context)
```

Treat LLM-judge scores as noisy: calibrate judges against human labels and track judge prompt/model versions.

## Automated Promotion Gates

```python
client = mlflow.MlflowClient()
challenger = client.get_model_version_by_alias("churn-classifier", "challenger")
champion = client.get_model_version_by_alias("churn-classifier", "champion")

c_auc = client.get_run(challenger.run_id).data.metrics["test_auc"]
p_auc = client.get_run(champion.run_id).data.metrics["test_auc"]

if c_auc >= p_auc + 0.005 and fairness_checks_pass(challenger) and latency_ok(challenger):
    client.set_registered_model_alias("churn-classifier", "champion", challenger.version)
else:
    raise RuntimeError(f"challenger v{challenger.version} rejected: auc {c_auc:.4f} vs champion {p_auc:.4f}")
```

Gates belong in CI/CD with evaluation on a frozen test set, plus checks for fairness slices, calibration, latency and model size. Record the gate decision as a tag on the model version.

## Retention and Cost

- Artifact storage grows fastest: set lifecycle rules for checkpoints of non-registered runs (e.g. delete after N days) while keeping registered model artifacts.
- Archive or delete abandoned experiments; MLflow soft-deletes runs, and `mlflow gc` permanently removes deleted runs and their artifacts.
- Downsample per-step metrics for very long training runs.
- Keep audit-relevant runs (deployed models) for the period your governance requires.

## Checklist

- [ ] Tracking server with RDBMS backend, object-store artifacts, SSO and backups
- [ ] No secrets/PII in params, tags or artifacts; trusted-source model loading
- [ ] Sweeps as parent/child runs with search space recorded; best config re-run with seeds
- [ ] Rank-zero logging of all-reduced metrics in distributed jobs
- [ ] Dataset inputs and orchestrator IDs logged for lineage
- [ ] Traces and evaluation runs for LLM systems with versioned prompts and judges
- [ ] Promotion gates automated with recorded decisions
- [ ] Retention policies and garbage collection scheduled
