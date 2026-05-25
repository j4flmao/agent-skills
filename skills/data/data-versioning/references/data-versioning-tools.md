# Data Versioning Tools Reference

## DVC — Data Version Control

Version data via pointer files in Git. Data lives in S3/GCS/SSH remote.

```bash
dvc init
dvc remote add -d myremote s3://my-bucket/dvc-store
dvc add data/raw/customers.csv
git add data/raw/customers.csv.dvc .gitignore
git commit -m "add customers dataset"
```

### Pipeline Versioning

```yaml
# dvc.yaml
stages:
  prepare:
    cmd: python src/prepare.py
    deps: [data/raw/customers.csv, src/prepare.py]
    params: [prepare.test_split]
    outs: [data/processed/]
  train:
    cmd: python src/train.py
    deps: [data/processed/, src/train.py]
    params: [train.lr, train.epochs]
    outs: [models/model.pkl]
    metrics: [metrics/accuracy.json]
```

### Experiments

```bash
dvc exp run --set-param train.lr=0.01 --name "lr-001"
dvc exp show  # compare accuracy, loss
dvc exp apply lr-001  # rollback to best
dvc exp push origin lr-001
```

### CI/CD

```yaml
steps:
  - uses: actions/checkout@v4
  - run: dvc pull && dvc repro
  - run: dvc diff --json > drift.json
  - if: github.ref == 'refs/heads/main'
    run: dvc push && git add dvc.lock && git commit -m "update pipeline"
```

## LakeFS — Git for Data Lakes

Zero-copy branching on object stores. Branches are cheap metadata operations.

```bash
lakectl branch create lakefs://data-lake/refs/heads/etl-dev
lakectl commit lakefs://data-lake/etl-dev -m "normalize currency"
lakectl diff lakefs://data-lake/main lakefs://data-lake/etl-dev
lakectl merge lakefs://data-lake/etl-dev lakefs://data-lake/main
lakectl revert lakefs://data-lake/main --commit <bad-hash>
lakectl tag lakefs://data-lake/v1.2.0 lakefs://data-lake/main
```

### Hooks

```yaml
hooks:
  pre-commit:
    - id: validate_schema
      type: webhook
      url: http://validator:8080/check-schema
  pre-merge:
    - id: check_compatibility
      type: webhook
      url: http://validator:8080/check-compatibility
  post-merge:
    - id: trigger_pipeline
      type: webhook
      url: http://airflow:8080/api/v1/dags/data-pipeline/dagRuns
```

## Nessie — Git for Iceberg Catalogs

Catalog-level branching with multi-table atomic commits (not object store branching like LakeFS).

```python
client = NessieClient("http://nessie:19120/api/v2")
client.create_branch("ml-experiment-42", "main")
# Spark reads: spark.read.format("iceberg").option("nessie.ref", "ml-experiment-42")
client.merge("ml-experiment-42", "main")
client.create_tag("production-2026-05-01", "main")
```

## Delta Lake Time Travel

Built into Delta — no separate tool.

```sql
SELECT * FROM analytics.orders VERSION AS OF 42;
SELECT * FROM analytics.orders TIMESTAMP AS OF '2026-04-28 12:00:00';
DESCRIBE HISTORY analytics.orders;
RESTORE TABLE analytics.orders TO VERSION AS OF 40;
```

## Tool Selection Matrix

| Tool | Scope | Branching | Best For |
|------|-------|-----------|----------|
| **DVC** | ML pipelines, file-level | Git-based | ML experiment reproducibility |
| **LakeFS** | Data lakes, table-level | Zero-copy object store | Production data lakes, CI/CD |
| **Nessie** | Iceberg catalogs, multi-table atomic | Zero-copy metadata | Iceberg ecosystems |
| **Delta TT** | Delta tables | No branching | Simple rollback, point-in-time |
| **Git LFS** | Code repos, binary files | Git-based | Small-medium binaries in repos |
