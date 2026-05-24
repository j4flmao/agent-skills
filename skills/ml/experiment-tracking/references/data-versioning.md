# Data Versioning

## DVC

```bash
# Initialize
dvc init

# Track dataset
dvc add data/raw/images/
# Creates data/raw/images.dvc + updates .gitignore
git add data/raw/images.dvc .gitignore
git commit -m "add raw images dataset"

# Track model
dvc add models/model.pkl

# Push to remote storage
dvc remote add -d myremote s3://my-bucket/dvc-store
dvc push

# Pull on another machine
dvc pull

# Switch to previous version
git checkout <old-commit>
dvc checkout
```

## DVC Pipelines

```bash
# Define pipeline stages
dvc run -n train \
  -p train.lr,train.epochs \
  -d data/processed \
  -d src/train.py \
  -o models/model.pkl \
  -M metrics.json \
  python src/train.py

# Reproduce (incremental)
dvc repro

# Compare across experiments
dvc metrics diff
dvc params diff
```

## lakeFS

```bash
# Branch the data
lakectl branch create spark-engine \
  -s lakefs://myrepo/main

# Merge data changes
lakectl merge \
  lakefs://myrepo/spark-engine \
  lakefs://myrepo/main

# Diff data versions
lakectl diff \
  lakefs://myrepo/main~1 \
  lakefs://myrepo/main
```

| Feature | DVC | lakeFS | Delta Lake |
|---------|-----|--------|------------|
| Scope | ML projects | Data lakes | Data lakehouse |
| Storage | S3, GCS, local | S3, GCS, Azure | Delta Lake format |
| Versioning | Git-like | Git-like branching | Time travel |
| Granularity | File/directory | Object/table | Row/partition |
| CI/CD integration | dvc repro | CI on data branches | Pipeline integration |

## Data Lineage

```python
# MLflow data lineage
import mlflow

with mlflow.start_run() as run:
    # Log dataset info
    dataset = mlflow.data.from_pandas(
        df, source="s3://my-bucket/data/raw/orders.parquet",
        name="orders_dataset"
    )
    mlflow.log_input(dataset, context="training")

    # Log model with data reference
    mlflow.pytorch.log_model(
        model,
        artifact_path="model",
        registered_model_name="order_forecast"
    )
    # Model card includes: data version, schema, hash
```

## Experiment-to-Data Traceability

| Component | Versioning | Traceability Method |
|-----------|------------|-------------------|
| Code | Git commit | Commit SHA in experiment |
| Data | DVC hash / lakeFS commit | Data version in experiment metadata |
| Model | MLflow registry | Model version + data version link |
| Environment | Conda/pip freeze | Requirements file logged in run |
| Hyperparameters | Params dict | Logged with experiment |
| Metrics | Metrics dict | Logged with experiment |
