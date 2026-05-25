---
name: data-data-versioning
description: >
  Use this skill when asked about data versioning, DVC, LakeFS, data lineage, Git-like for data, data reproducibility, data branching, data diff, data snapshot, or experiment reproducibility. This skill enforces: DVC patterns for ML pipelines and data version control, LakeFS for Git-like semantics on data lakes, branching and merging data, data diff and rollback, experiment reproducibility with metrics tracking, and data lineage from source to model. Do NOT use for: code versioning with Git, database schema migrations, or application artifact versioning.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, versioning, reproducibility, phase-11]
---

# Data Data Versioning

## Purpose
Implement data versioning with DVC or LakeFS for reproducibility, branching, diff, rollback, and experiment tracking across data pipelines and ML workflows.

## Agent Protocol

### Trigger
Exact user phrases: "data versioning", "DVC", "LakeFS", "data lineage", "Git-like for data", "data reproducibility", "data branching", "data diff", "data snapshot", "experiment reproducibility", "data rollback", "data version control".

### Input Context
- Data storage platform (S3, GCS, ADLS, MinIO)
- ML/analytics pipeline framework
- Existing Git workflow for code
- Team size and collaboration patterns
- Experiment tracking needs
- Compliance requirements for data lineage

### Output Artifact
Data versioning strategy with DVC or LakeFS, branching model, experiment reproducibility workflow, data diff and rollback procedures.

### Response Format
```yaml
# Versioning tool selection
# Branching model
# DVC/LakeFS configuration
# Experiment tracking setup
# Data diff + rollback workflow
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Versioning tool selected (DVC vs LakeFS) with rationale
- [ ] Branching model defined for data development
- [ ] DVC or LakeFS configured with remote storage
- [ ] Data diff and rollback procedures documented
- [ ] Experiment reproducibility workflow established
- [ ] Data lineage tracked from source to output
- [ ] CI/CD integration for data versioning

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Select Versioning Tool

| Tool | Best For | Model | Storage |
|---|---|---|---|
| **DVC** | ML experiments, small-medium data, file-based | Pointer files in Git | S3/GCS/SSH/local |
| **LakeFS** | Large data lakes, production pipelines, tabular data | Git-like semantics on object store | S3/GCS/ADLS |

Default: DVC for ML/experimentation workflows (datasets up to 100GB). LakeFS for enterprise data lakes, large-scale pipelines, and production branching. Use both if ML + data lake.

### Step 2: DVC Pattern

```bash
# Initialize
git init && dvc init

# Add remote storage
dvc remote add -d myremote s3://my-bucket/dvc-store
dvc remote modify myremote region us-east-1

# Track data
dvc add data/raw/customers.csv
git add data/raw/customers.csv.dvc .gitignore
git commit -m "add raw customers dataset"

# Create pipeline (dvc.yaml)
dvc stage add -n train \
  -p params.yaml:lr,epochs \
  -d data/processed/train.csv \
  -d src/train.py \
  -o models/model.pkl \
  -M metrics/accuracy.json \
  python src/train.py

# Reproduce pipeline
dvc repro

# Track experiments
dvc exp run --set-param train.lr=0.01
dvc exp show
dvc exp apply exp-abc123  # rollback to experiment
```

### Step 3: LakeFS Pattern

```bash
# Create branch
lakectl branch create spark://main@data-lake/refs/heads/etl-dev

# Work on branch (Spark job reads from etl-dev branch)
spark.read.format("iceberg").option("branch", "etl-dev").table("analytics.fct_orders")

# Commit changes
lakectl commit lakefs://data-lake/etl-dev -m "add revenue column to fct_orders"

# Diff
lakectl diff lakefs://data-lake/main lakefs://data-lake/etl-dev

# Merge
lakectl merge lakefs://data-lake/etl-dev lakefs://data-lake/main

# Rollback
lakectl revert lakefs://data-lake/main --commit <bad-commit-hash>

# Tag
lakectl tag lakefs://data-lake/v1.0.0 lakefs://data-lake/main
```

### Step 4: Branching Model

```
main (production data, immutable)
  ├── dev/feature-name (data development)
  ├── experiment/user-name (ML experiments)
  └── hotfix/issue (urgent data fixes)
      ↓ merge via PR with data diff review
```

Rules: no direct writes to `main`. All changes via branch → PR → data diff review → merge. `experiment/*` branches can diverge without merging. `dev/*` branches merge to main when ready. Tags for releases and audit points.

### Step 5: Experiment Reproducibility

```
Experiment:
  - Git commit (code): a1b2c3d
  - DVC commit (data): e4f5g6h
  - Parameters: lr=0.01, epochs=50
  - Metrics: accuracy=0.923, loss=0.18
  - Output: models/exp-a1b2c3d.pkl

Reproduce:
  git checkout a1b2c3d
  dvc checkout e4f5g6h
  dvc repro
  # → identical metrics if pipeline is deterministic
```

### Step 6: Data Diff

```bash
# DVC diff between Git commits
dvc diff a1b2c3d e4f5g6h
# Shows: added/deleted/modified files, size changes

# LakeFS diff
lakectl diff lakefs://data-lake/main lakefs://data-lake/dev-feature
# Shows: rows added, rows modified, rows removed, schema changes
```

LakeFS diff per table: `+2,345 rows / -1,234 rows / ~567 rows modified (total_amount column)`. DVC diff per file: `+data/raw/customers.csv (1.2 MB → 1.5 MB)`.

### Step 7: CI/CD Integration

```yaml
# .github/workflows/data-pipeline.yml
jobs:
  data-pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: dvc pull
      - run: dvc repro
      - run: dvc push
      - name: Check data drift
        run: |
          dvc diff --json > diff.json
          jq '.added, .modified' diff.json
```

LakeFS hooks: `pre-commit` (validate schema), `pre-merge` (check compatibility), `post-merge` (trigger pipeline).

### Step 8: Nessie — Git for Iceberg
Nessie provides Git-like version control for data lakes at the Iceberg catalog level. Unlike LakeFS (object store branching), Nessie operates on table metadata via the Iceberg REST Catalog API. A Nessie commit captures all table states atomically, enabling multi-table atomic operations. Branches are zero-copy — instant creation regardless of data size since only metadata references are copied. Key operations: `CREATE BRANCH dev FROM main` for isolated data development; `MERGE dev INTO main` for atomic promotion of all table changes; `TAG release-1.0` for reproducible snapshots. Integrates with Spark, Flink, Trino, and Dremio. Use Nessie for catalog-level Iceberg versioning, multi-table atomic commits, and CI/CD pipeline isolation for data engineering.

```python
# Nessie Python API
from pynessie import NessieClient
client = NessieClient('http://nessie:19120/api/v2')
client.create_branch('etl-job-20240501', 'main')
# Spark reads from branch
# spark.read.format('iceberg').option('branch', 'etl-job-20240501').table('analytics.orders')
# After validation:
client.merge('etl-job-20240501', 'main')
client.create_tag('prod-20240501', 'main')
```

### Step 9: DVC Deep Integration
Beyond basic versioning, DVC provides ML pipeline management. `dvc.yaml` defines stages with dependencies, outputs, parameters, and metrics. `dvc repro` selectively re-runs only stages affected by hash changes. DVC experiments (`dvc exp run`) run pipeline variants with different parameters, track metrics (accuracy, F1), and compare results via `dvc exp show`. `dvc exp apply` rolls back workspace to any experiment state. DVC Studio provides web UI for experiment comparison. For large datasets: shallow checkout (pull only needed files), granular per-file tracking. CI/CD: `dvc pull` → `dvc repro` → `dvc push` → `dvc diff` for data drift detection. Use deep DVC features for ML reproducibility without MLOps platforms.

```bash
# DVC experiment workflow
dvc exp run --set-param train.lr=0.001 --name "lr-low"
dvc exp run --set-param train.lr=0.01 --name "lr-mid"
dvc exp run --set-param train.lr=0.1 --name "lr-high"
dvc exp show
# ─────────────────────────────────────────────────────────
# Experiment  lr    epochs  accuracy   loss
# ─────────────────────────────────────────────────────────
# workspace   -     -       0.923      0.18
# lr-low      0.001 50      0.912      0.21
# lr-mid      0.01  50      0.931      0.15
# lr-high     0.1   50      0.895      0.29
# ─────────────────────────────────────────────────────────
dvc exp apply lr-mid  # rollback to best experiment
```

## Rules
- Every data pipeline versioned with DVC or LakeFS
- main branch is production, all changes go through PR
- Data diff reviewed before merging to main
- Experiments reproducible from Git + DVC commits
- Data rollback possible within 30-day window
- LakeFS branches for development, tags for releases
- No direct data mutations on main branch
- CI/CD validates data before merge

## References
- `references/data-versioning-tools.md` — DVC, lakeFS, Nessie, Delta Lake time travel, Git LFS comparison, CLI workflows, CI/CD integration patterns
- `references/dvc-patterns.md` — DVC setup, pipeline versioning, remote storage, experiment tracking, metrics comparison
- `references/lakefs-patterns.md` — LakeFS branches, hooks, diff, merge, rollback, CI/CD integration, Graveler
- `references/nessie-iceberg-versioning.md` — Nessie Git-for-Iceberg, catalog-level branching, multi-table atomic commits, engine integration, GC

## Handoff
`data-data-platform` for versioning infrastructure. `data-data-catalog` for cataloging versioned datasets. `data-data-observability` for monitoring version health. `data-data-quality` for quality gates on merge.
