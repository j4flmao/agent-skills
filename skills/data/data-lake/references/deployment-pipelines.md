# CI/CD Pipelines for Lake Tables and Jobs

How to build, test and deploy lake pipeline code and table schema changes: CI stages, schema migration gating, artifact packaging and environment promotion. Release strategies for data (WAP, shadow tables) are in `deployment_strategies.md`.

## Pipeline Stages

| Stage | Runs | Blocks merge on |
|---|---|---|
| Lint / type check | ruff, mypy, sqlfluff | any error |
| Unit tests | pure transformations on local Spark | failure |
| Integration tests | jobs against a temporary catalog + MinIO/local warehouse | failure |
| Schema diff | compare `tables/` + `migrations/` with target catalog | destructive change without approval |
| Package | wheel / container image with pinned JARs | build failure |
| Deploy dev → staging → prod | apply migrations, then deploy jobs | failed smoke checks |

## GitHub Actions Example

```yaml
name: lake-pipelines
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write          # OIDC to cloud, no static keys

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      minio:
        image: minio/minio:latest
        ports: ["9000:9000"]
        env:
          MINIO_ROOT_USER: ${{ secrets.CI_MINIO_USER }}
          MINIO_ROOT_PASSWORD: ${{ secrets.CI_MINIO_PASSWORD }}
        options: >-
          --health-cmd "curl -f http://localhost:9000/minio/health/live"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: "17" }
      - uses: astral-sh/setup-uv@v6
      - run: uv sync --locked
      - run: uv run ruff check . && uv run mypy src
      - run: uv run pytest -q tests/unit
      - run: uv run pytest -q tests/integration
        env:
          LAKE_WAREHOUSE: s3://ci-warehouse
          AWS_ENDPOINT_URL: http://localhost:9000

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging      # protection rules / required reviewers on prod
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.DEPLOY_ROLE_ARN }}
          aws-region: eu-west-1
      - uses: astral-sh/setup-uv@v6
      - run: uv run python -m lakejobs.migrate --env staging
      - run: uv run python -m lakejobs.deploy --env staging
```

Pin third-party actions to a full commit SHA in production pipelines.

Note: `minio/minio:latest` is used for brevity; pin a tag or digest you have validated.

## Schema Migrations

Classify every change:

| Change | Risk | Gate |
|---|---|---|
| Add nullable column | safe | auto |
| Add partition field (Iceberg) / change clustering keys | safe (metadata) | auto |
| Widen type | safe if all readers support it | auto + compatibility check |
| Rename column | breaks SQL consumers | approval + consumer notice |
| Drop column / table | destructive | approval + deprecation window |
| Enable table feature / format upgrade | can lock out old readers | approval + reader inventory |

Migration runner contract:
1. Read applied migrations from `_schema_migrations` control table.
2. Apply pending files in order, one transaction (statement) each.
3. Record each success with checksum; fail fast on checksum mismatch of an applied file.

```python
def apply_pending(spark, applied: set[str], files: list[Path]) -> None:
    for f in sorted(files):
        if f.name in applied:
            continue
        sql = f.read_text(encoding="utf-8")
        spark.sql(sql)
        spark.sql(
            "INSERT INTO lake.ops._schema_migrations VALUES (?, current_timestamp(), ?)",
            args=[f.name, sha256(sql.encode()).hexdigest()],
        )
```

(Positional `?` parameters with `args=[...]` require Spark 3.5+; Spark 3.4 supports named `:param` markers with a dict.)

## Packaging

- Python jobs: build a wheel (`uv build`) and ship it with the container or as a dependency of the Spark submit.
- JVM dependencies (Iceberg runtime, cloud bundles) baked into the image with exact versions; no `--packages` resolution at runtime in production.
- Image tagged with the git SHA; deploy manifests reference the digest.

## Environment Promotion

- Separate catalogs/warehouses per environment (`dev`, `staging`, `prod`); never point staging jobs at prod tables for writes.
- Staging runs on a sampled or masked copy (Delta shallow clone, Iceberg snapshot/branch, or masked extract).
- Prod deploy: migrations first (additive only), then job code, then removal of old columns in a later release.

## Smoke Checks After Deploy

- Job completes on the latest partition.
- Row counts within expected range versus previous run.
- Schema of produced table equals the declared DDL.
- No new commit conflicts or failed commits in the last N runs.

## Checklist
- [ ] CI uses OIDC/workload identity, no long-lived cloud keys
- [ ] Unit and integration tests run on every PR
- [ ] Destructive schema changes require approval
- [ ] Migrations recorded with checksums
- [ ] Artifacts versioned by git SHA with pinned dependencies
- [ ] Post-deploy smoke checks automated
