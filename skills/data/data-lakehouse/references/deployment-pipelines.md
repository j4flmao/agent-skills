# CI/CD Pipelines for Lakehouse Code

How to build, test, and deploy lakehouse jobs, dbt models, and table DDL through CI/CD. Release strategies for the data itself (write-audit-publish, branching, backfills) are in `deployment_strategies.md`.

## 1. What Gets Deployed

| Artifact | Built as | Deployed to |
|---|---|---|
| Spark/Flink job code | Python wheel or JAR | Artifact store; referenced by job definitions |
| Job definitions | Databricks Asset Bundle, Airflow DAG, Dagster code location, EMR/Dataproc templates | Orchestrator |
| Table DDL / migrations | SQL files | Applied by a migration job per environment |
| dbt project | dbt artifacts (`manifest.json`) | dbt runner (Airflow, Dagster, dbt platform) |
| Maintenance jobs | Same package as jobs | Scheduled per table |
| Grants / policies | Terraform or SQL | Catalog (Unity Catalog, Lake Formation, Polaris) |

## 2. Pipeline Stages

```
PR opened
  ├─ lint + type check (ruff, mypy, sqlfluff)
  ├─ unit tests (local Spark, no cloud)
  ├─ dbt parse + dbt build --select state:modified+ against a CI schema
  ├─ integration tests (local catalog + MinIO in containers)
  └─ plan: show DDL migrations and grant changes
merge to main
  ├─ build + publish versioned artifact
  ├─ deploy to staging: apply migrations, update job definitions
  ├─ run smoke pipeline on sample/branch data
  └─ manual approval
deploy to prod
  ├─ apply migrations (idempotent)
  ├─ update job definitions to the new artifact version
  └─ post-deploy checks: freshness, row counts, quality metrics
```

## 3. GitHub Actions Example

```yaml
name: lakehouse-ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: "17" }
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - run: uv run ruff check . && uv run mypy src
      - run: uv run pytest tests/unit -q
      - run: uv run pytest tests/integration -q
  dbt-ci:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - name: Fetch prod manifest for state comparison
        run: uv run python scripts/fetch_manifest.py --env prod --out prod-manifest/
      - run: uv run dbt build --select state:modified+ --defer --state prod-manifest --target ci
        env:
          DBT_CI_SCHEMA: ci_pr_${{ github.event.number }}
  deploy-staging:
    if: github.ref == 'refs/heads/main'
    needs: [test, dbt-ci]
    runs-on: ubuntu-latest
    environment: staging
    permissions: { id-token: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: databricks/setup-cli@main   # pin to a release tag or commit SHA
      - run: databricks bundle deploy --target staging
```

Use OIDC federation (`id-token: write`) to obtain cloud or Databricks credentials instead of long-lived tokens stored as secrets. Pin third-party actions to a release tag or commit SHA in production pipelines.

## 4. Databricks Asset Bundles (example)

```yaml
# databricks.yml
bundle:
  name: lakehouse
targets:
  staging:
    workspace: { host: https://adb-123.azuredatabricks.net }
    variables: { catalog: staging }
  prod:
    mode: production
    workspace: { host: https://adb-456.azuredatabricks.net }
    variables: { catalog: prod }
resources:
  jobs:
    silver_orders:
      name: silver_orders_merge
      tasks:
        - task_key: merge
          python_wheel_task:
            package_name: lakehouse
            entry_point: silver_orders_merge
            parameters: ["--env", "${var.catalog}"]
          libraries:
            - whl: ./dist/*.whl
```

Commands: `databricks bundle validate`, `databricks bundle deploy -t <target>`, `databricks bundle run -t <target> silver_orders`.

## 5. Applying DDL Migrations

```python
def apply_migrations(spark, catalog: str, files: list[Path]) -> None:
    spark.sql(f"CREATE TABLE IF NOT EXISTS {catalog}.ops.schema_migrations "
              "(id STRING, applied_at TIMESTAMP) USING iceberg")
    done = {r.id for r in spark.table(f"{catalog}.ops.schema_migrations").collect()}
    for f in sorted(files):
        if f.stem in done:
            continue
        spark.sql(f.read_text().replace("${catalog}", catalog))
        spark.sql(f"INSERT INTO {catalog}.ops.schema_migrations VALUES ('{f.stem}', current_timestamp())")
```

- Migrations run before new job code that depends on them.
- Additive changes first, code next, removal of old columns in a later release (expand/contract).

## 6. Environment Isolation

| Approach | Isolation | Cost |
|---|---|---|
| Separate catalogs/workspaces per env | Strong | Duplicate infrastructure |
| Same catalog, env-prefixed namespaces | Medium | Risk of cross-env writes via misconfig |
| Per-PR schemas (dbt CI) | Per change | Cleanup job required |
| Iceberg/Nessie branches for CI | Data-level, zero-copy | Requires branch-aware catalog/tooling |

Production write permissions belong only to the production deploy identity.

## Pitfalls

- Deploying job code before its DDL migration: first run fails or creates a table with default properties.
- CI that runs against production data with write access.
- Unpinned engine versions: a runtime upgrade silently changes defaults (file size, distribution mode).
- No cleanup for per-PR schemas: storage and catalog clutter.

## Checklist

- [ ] Unit + integration tests run without cloud access.
- [ ] dbt slim CI (`state:modified+`) against an isolated schema.
- [ ] Artifacts versioned; job definitions reference explicit versions.
- [ ] Migrations idempotent and tracked.
- [ ] OIDC-based deploy credentials; prod deploy gated by approval.
