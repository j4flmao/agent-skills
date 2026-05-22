# LakeFS Patterns

## Architecture

```
┌─────────────────────────────────────────────┐
│              LakeFS                          │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │  main    │  │ dev-    │  │ exp-    │     │
│  │          │  │ feature │  │ user    │     │
│  ├─────────┤  ├─────────┤  ├─────────┤     │
│  │ v1.0.0  │  │ +234    │  │ +5000   │     │
│  │ v2.0.0  │  │ rows    │  │ rows    │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│       │           │            │             │
│       └───────────┼────────────┘             │
│                   ▼                          │
│  ┌───────────────────────────────────┐      │
│  │        Graveler (metadata)        │      │
│  │  Branch → Commit → Diff → Merge   │      │
│  └───────────────────────────────────┘      │
│                    │                          │
│                    ▼                          │
│  ┌───────────────────────────────────┐      │
│  │       Object Store (S3/GCS)       │      │
│  │    Immutable objects, no copy     │      │
│  └───────────────────────────────────┘      │
└─────────────────────────────────────────────┘
```

LakeFS uses Graveler (metadata layer) to provide Git semantics on immutable object storage. No data copying on branch — metadata-only operations.

## Setup

```bash
# Docker Compose
version: "3"
services:
  lakefs:
    image: treeverse/lakefs:1.0.0
    ports:
      - "8000:8000"
    environment:
      - LAKEFS_AUTH_ENCRYPT_SECRET_KEY=${LAKEFS_SECRET}
      - LAKEFS_DATABASE_TYPE=postgres
      - LAKEFS_DATABASE_POSTGRES_CONNECTION_STRING=postgres://lakefs:lakefs@postgres/lakefs?sslmode=disable
      - LAKEFS_BLOCKSTORE_TYPE=s3
      - LAKEFS_BLOCKSTORE_S3_REGION=us-east-1

# CLI (lakectl) config
lakectl config
# endpoint: http://localhost:8000
# access_key_id: AKI...
# secret_access_key: ...
```

## Branch Operations

```bash
# List repositories
lakectl repo list

# Create repository
lakectl repo create lakefs://data-lake s3://my-bucket/data-lake

# Create branch
lakectl branch create lakefs://data-lake@refs/heads/dev-analytics

# List branches
lakectl branch list lakefs://data-lake

# Switch branch (in Spark)
spark.read.format("iceberg")
  .option("branch", "dev-analytics")
  .table("analytics.fct_orders")
```

## Hooks

```yaml
# _lakefs_actions/validate_schema.yaml
name: validate_schema
on:
  pre-commit:
    branches:
      - main
hooks:
  - id: schema_check
    type: webhook
    properties:
      url: "http://schema-validator:8080/check"
      timeout: 30s
      query_params:
        compatibility: BACKWARD
---
name: notify_on_merge
on:
  post-merge:
    branches:
      - main
hooks:
  - id: slack_notify
    type: webhook
    properties:
      url: "https://hooks.slack.com/services/T00/B00/xxx"
      timeout: 10s
```

## Diff and Merge

```bash
# Show diff
lakectl diff lakefs://data-lake/main lakefs://data-lake/dev-analytics
# ┌───────────────────────────────────────────────┐
# │      Type      │    Path        │  Changes    │
# ├───────────────────────────────────────────────┤
# │ added          │ analytics/     │ +2,345 rows │
# │                │ fct_orders/    │             │
# │ modified       │ analytics/     │ ~567 rows   │
# │                │ fct_orders/    │ (amount)    │
# └───────────────────────────────────────────────┘

# Merge
lakectl merge lakefs://data-lake/dev-analytics lakefs://data-lake/main

# Abort merge (if conflicts)
lakectl merge --abort lakefs://data-lake/dev-analytics
```

## Rollback

```bash
# Find bad commit
lakectl log lakefs://data-lake/main

# Revert specific commit
lakectl revert lakefs://data-lake/main --commit <bad-commit-hash>

# Create tag for safe point before rollback
lakectl tag lakefs://data-lake/v1.0.0-safe lakefs://data-lake/main@<good-commit>
lakectl revert lakefs://data-lake/main --commit <bad-commit-hash>

# Restore from tag
# Create a new branch from tag
lakectl branch create lakefs://data-lake/refs/heads/restore-v1.0 \
  --source lakefs://data-lake@refs/tags/v1.0.0-safe
# Merge restore branch to main
lakectl merge lakefs://data-lake/restore-v1.0 lakefs://data-lake/main
```

## CI/CD Integration

```yaml
# .github/workflows/lakefs-pipeline.yml
jobs:
  lakefs-pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create branch
        run: |
          lakectl branch create lakefs://data-lake/refs/heads/ci-${GITHUB_SHA}
      - name: Run pipeline on branch
        run: |
          spark-submit --conf spark.sql.catalog.lakefs.ref=ci-${GITHUB_SHA} src/pipeline.py
      - name: Validate data
        run: |
          python scripts/validate.py --branch ci-${GITHUB_SHA}
      - name: Merge to main
        if: success()
        run: |
          lakectl merge lakefs://data-lake/ci-${GITHUB_SHA} lakefs://data-lake/main
```
