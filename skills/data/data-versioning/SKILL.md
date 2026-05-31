---
name: data-data-versioning
description: >
  Use this skill when asked about data versioning, DVC, LakeFS, data lineage, Git-like for data, data reproducibility, data branching, data diff, data snapshot, or experiment reproducibility. This skill enforces: DVC patterns for ML pipelines and data version control, LakeFS for Git-like semantics on data lakes, branching and merging data, data diff and rollback, experiment reproducibility with metrics tracking, and data lineage from source to model. Do NOT use for: code versioning with Git, database schema migrations, or application artifact versioning.
version: "1.1.0"
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

Decision tree:
- Dataset size < 100GB, ML experiments, small team? → DVC
- Data lake > 1TB, production branching, many concurrent users? → LakeFS
- Need both ML experiment tracking + production data lake? → DVC for ML, LakeFS for data lake
- Need catalog-level versioning for Iceberg tables? → Nessie

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
from pynessie import NessieClient
client = NessieClient('http://nessie:19120/api/v2')
client.create_branch('etl-job-20240501', 'main')
client.merge('etl-job-20240501', 'main')
client.create_tag('prod-20240501', 'main')
```

### Step 9: DVC Deep Integration

```bash
# DVC experiment workflow
dvc exp run --set-param train.lr=0.001 --name "lr-low"
dvc exp run --set-param train.lr=0.01 --name "lr-mid"
dvc exp run --set-param train.lr=0.1 --name "lr-high"
dvc exp show
dvc exp apply lr-mid  # rollback to best experiment
```

### Step 10: Data Lineage Tracking
Track the full lineage from source data through transformations to output models. For DVC, lineage is captured in `dvc.yaml` and `dvc.lock` files — each stage defines its dependencies and outputs. For LakeFS, lineage is tracked through commit history and metadata. For Nessie, lineage is captured at the catalog level with atomic commits. Use OpenLineage alongside these tools for end-to-end lineage across the entire data platform.

### Step 11: Data Retention and Garbage Collection
Versioning creates historical data that accumulates over time. Define retention policies: keep all versions for 30 days for rollback, weekly snapshots for 1 year, monthly snapshots for 7 years (compliance). DVC uses `dvc gc` to remove unused cache files. LakeFS garbage collection removes unreferenced objects from branches older than TTL. Nessie GC removes old snapshots not referenced by any branch or tag.

```bash
# DVC garbage collection
dvc gc --workspace -f  # keep only files referenced in workspace
dvc gc --all-branches -f  # keep all branches
dvc gc --cloud -f  # also clean remote storage

# LakeFS GC configuration
# Set branch TTLs in lakeFS configuration
lakectl branch list lakefs://data-lake | xargs -I{} lakectl branch delete lakefs://data-lake/{}
```

## Architecture / Decision Trees

### Tool Selection

```
Need data versioning?
  ├── ML experiments, <100GB datasets
  │   ├── Need pipeline DAG + experiment tracking? → DVC
  │   └── Need only snapshot versioning? → DVC Lite
  ├── Data lake, >1TB, production
  │   ├── Object store branching? → LakeFS
  │   └── Iceberg catalog versioning? → Nessie
  └── Both ML + data lake → DVC + LakeFS
```

### Branch Strategy for Data

```
main → protected, immutable, production data
  dev/ → long-lived development branches
  experiment/ → short-lived ML experiment branches
  hotfix/ → urgent data fixes bypassing dev
  release/ → release candidates, merged to main + main
  user/ → personal sandbox branches
```

### Tool Selection for Data Size

```
Data volume:
  ├── < 10 GB → DVC (simple, ML-focused)
  ├── 10 GB - 100 GB → DVC or LakeFS (depends on use case)
  ├── 100 GB - 1 TB → LakeFS (data lake branching)
  ├── 1 TB - 100 TB → LakeFS with Nessie (catalog-level + object store)
  └── > 100 TB → Nessie (metadata-only, no data duplication)
```

## Common Pitfalls

1. **DVC with large files (> 1GB)**: DVC stores file hashes only, but `dvc pull` downloads entire files. For large files, use partial checkout or shallow pull.
2. **LakeFS no zero-copy for large branches**: LakeFS branches are metadata-only (zero-copy) for the source files, but new writes create new objects. Monitor storage growth from long-lived branches.
3. **Nessie without GC**: Nessie retains all catalog snapshots. Configure garbage collection to remove old, unreferenced snapshots.
4. **Mixing code and data commits**: Don't put data files in Git. DVC uses `.dvc` pointer files in Git; data stays in remote storage.
5. **No data diff review before merge**: Merging without reviewing data changes introduces bad data. Enforce diff review in PR workflow.
6. **Experiment metadata not tracked**: Without tracking parameters, metrics, and data versions, experiments are not reproducible.
7. **Branch explosion**: Too many long-lived branches waste storage. Set branch TTLs (e.g., 30 days for experiment branches).
8. **DVC pipeline non-determinism**: shuffling, random seeds, and timestamps cause different outputs on `dvc repro`. Fix: set all random seeds and make transforms deterministic.
9. **LakeFS permissions too permissive**: all branches accessible to all users. Fix: use LakeFS RBAC to isolate branches by team.
10. **No remote storage verification**: `dvc push` succeeds but data might be corrupted. Fix: verify checksums after push.

## Best Practices

- Always version data independently of code (DVC pointer files in Git, data in remote storage).
- Tag every production data release with a semantic version and changelog.
- Run data validation in pre-commit hooks (LakeFS) or pipeline stages (DVC).
- Set retention policies: experiment branches auto-deleted after 30 days, dev branches after 90 days.
- Use data contracts to validate schema before merging data changes.
- Document data lineage: source → transformation → output dataset.
- Test rollback procedures quarterly. Verify you can recover data from any point within the retention window.
- For team collaboration: branching model mirrors Git Flow but adapted for data.
- Combine with experiment tracking (MLflow, Weights & Biases) for complete ML reproducibility.
- Use DVC `dvc.lock` as the single source of truth for pipeline state.
- Set up CI/CD that auto-deletes stale experiment branches.
- Use LakeFS hooks for automated data quality checks on commit.
- Monitor storage usage per branch for cost attribution.

## Compared With

| Feature | DVC | LakeFS | Nessie | Delta Lake Time Travel |
|---|---|---|---|---|
| Scope | Files + pipelines | Object store + tables | Iceberg catalog | Single Delta table |
| Branching | Git-based | Yes | Yes | No |
| Zero-copy | Yes (pointers) | Yes (metadata) | Yes (metadata) | No (files) |
| Experiment tracking | Built-in | No | No | No |
| Pipeline DAG | dvc.yaml | External | External | External |
| Multi-table atomic | No | Yes (commit) | Yes (commit) | No |
| Scale | < 100 GB | PB-scale | PB-scale | PB-scale |
| Rollback | dvc checkout | lakectl revert | client.merge | time travel |

DVC vs Delta Lake time travel: DVC versions entire datasets at the file level across a pipeline DAG. Delta time travel provides point-in-time queries within a single Delta table. They serve different purposes: DVC for ML experiment reproducibility, Delta time travel for analytics rollback.

DVC vs MLflow: DVC handles data and pipeline versioning. MLflow handles experiment tracking (params, metrics, artifacts) and model registry. They are complementary — use DVC for data/pipeline versioning, MLflow for experiment logging and model management.

## Performance

- DVC `dvc pull` for 10GB dataset: ~30-120 seconds (network bound).
- LakeFS branching for 1TB table: < 1 second (metadata only).
- Nessie branching: < 100ms (catalog metadata only).
- DVC experiment diff: < 1 second per file tracked.
- LakeFS diff for 100M rows: 1-5 seconds (metadata diff only).
- Delta Lake time travel: no overhead (pure metadata operation).
- Performance degrades with: millions of DVC-tracked files, thousands of LakeFS branches, Nessie snapshots without GC.
- DVC cache: local cache in `.dvc/cache` avoids re-downloading unchanged files. Use `dvc cache dir` to set a shared cache.
- LakeFS storage: new writes on branches create new objects. Storage grows with active development branches. Use GC to reclaim space.
- Nessie metadata: each commit stores a snapshot of the Iceberg catalog. Multi-table commits are atomic but increase metadata size.

Scalability: DVC works well for teams of 5-20 data scientists. LakeFS and Nessie scale to enterprise data lakes with hundreds of users. Nessie is最适合 for Iceberg-native environments where catalog-level operations are critical.

## Tooling

| Tool | Use Case |
|---|---|
| DVC | ML data versioning, pipeline DAG, experiment tracking |
| LakeFS | Data lake branching, production data versioning |
| Nessie | Iceberg catalog versioning, multi-table atomic commits |
| Delta Lake | Single-table time travel (built into Delta format) |
| Great Expectations | Data validation in pre-commit hooks |
| MLflow | Experiment tracking alongside DVC |
| NumpyCruncher / Quilt | Alternative data versioning for data science |
| OpenLineage | Cross-tool lineage tracking |
| dvcx | DVC experiment management extensions |
| lakeFS Spark Connector | Spark integration for branch-based data access |

## Rules
- Every data pipeline versioned with DVC or LakeFS
- main branch is production, all changes go through PR
- Data diff reviewed before merging to main
- Experiments reproducible from Git + DVC commits
- Data rollback possible within 30-day window
- LakeFS branches for development, tags for releases
- No direct data mutations on main branch
- CI/CD validates data before merge
- Retention policy enforced automatically
- Experiment branches TTL = 30 days, dev branches TTL = 90 days
- Tag every production release with semver
- Always version data independently of code
- Test rollback procedures quarterly
- Monitor storage growth from branching activity
- Use deterministic pipelines for reproducible experiments

## References
  - references/data-versioning-branching.md — Data Versioning Branching
  - references/data-versioning-gc-retention.md — Data Versioning GC and Retention
  - references/data-versioning-strategy.md — Data Versioning Strategy
  - references/data-versioning-tools.md — Data Versioning Tools Reference
  - references/delta-lake-time-travel.md — Delta Lake Time Travel
  - references/dvc-patterns.md — DVC Patterns
  - references/lakefs-patterns.md — LakeFS Patterns
  - references/nessie-iceberg-versioning.md — Nessie — Git for Iceberg
  - references/data-versioning-delta-lake.md — Delta Lake Deep Dive
  - references/data-versioning-lineage-tracking.md — Lineage Tracking Reference
## Handoff
`data-data-platform` for versioning infrastructure. `data-data-catalog` for cataloging versioned datasets. `data-data-observability` for monitoring version health. `data-data-quality` for quality gates on merge.
