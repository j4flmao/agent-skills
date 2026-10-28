# ETL Pipeline Deployment Strategies

How to ship pipeline code and schema changes safely: packaging and deploying Airflow/Dagster, CI/CD for dbt with slim CI and deferral, environment promotion, blue/green tables and write-audit-publish, backfills, and rollback.

## What Gets Deployed

| Artifact | Examples | Deployed to |
|---|---|---|
| Orchestration code | Airflow DAGs, Dagster definitions | Scheduler/DAG bundle, code location image |
| Transformation code | dbt models, Spark jobs, SQL | Git ref used by runs, job artifacts (wheels/JARs) |
| Infrastructure | Clusters, warehouses, buckets, IAM | Terraform/Pulumi |
| Schemas and data | DDL, migrations, backfilled tables | Warehouse/lakehouse |

Each has its own rollback story; plan them together.

## Airflow Deployment

### Helm on Kubernetes
```bash
helm repo add apache-airflow https://airflow.apache.org
helm upgrade --install airflow apache-airflow/airflow \
  --namespace airflow --create-namespace \
  -f values-prod.yaml --version <pinned-chart-version>
```
```yaml
# values-prod.yaml (excerpt)
executor: KubernetesExecutor
images:
  airflow:
    repository: registry.example.com/data/airflow
    tag: "2026.10.27-3f2c1ab"          # immutable tag per build
dags:
  gitSync:
    enabled: false                     # DAGs baked into image for reproducibility
logs:
  persistence:
    enabled: false
config:
  logging:
    remote_logging: "True"
    remote_base_log_folder: "s3://airflow-logs/prod"
data:
  metadataSecretName: airflow-metadata-db
```
Options for DAG delivery:
| Method | Pros | Cons |
|---|---|---|
| Baked into image | Reproducible, versioned with deps | Redeploy for every change |
| git-sync sidecar | Fast changes | DAG and dependency versions can drift |
| DAG bundles (Airflow 3, versioned) | Runs pin the bundle version they started with | Requires Airflow 3 setup |

### Managed services
MWAA, Cloud Composer, Astronomer: deploy by uploading DAGs/requirements or images via their CLIs; still version and test them in CI.

## Dagster Deployment
- Package each code location as an image; the webserver/daemon load it via gRPC.
- Deploy new image tag, then reload the code location; running runs keep their image.
- Branch deployments (Dagster+) give per-PR environments.

## dbt CI/CD

```
PR opened
  -> dbt build --select state:modified+ --defer --state prod-manifest/ --target ci
       (builds only changed models and children; unchanged parents resolved from prod)
  -> data diff on changed models (row counts, key overlap) vs prod
  -> review
merge to main
  -> dbt build --target prod (or job in dbt Cloud)
  -> upload manifest.json as the new prod state
```

GitHub Actions example:
```yaml
name: dbt-ci
on: pull_request
jobs:
  slim-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - name: Fetch prod manifest
        run: aws s3 cp s3://dbt-artifacts/prod/manifest.json prod-state/manifest.json
      - name: Build modified models
        env:
          DBT_TARGET: ci
          SNOWFLAKE_ACCOUNT: ${{ secrets.SNOWFLAKE_ACCOUNT }}
          SNOWFLAKE_USER: ${{ secrets.SNOWFLAKE_CI_USER }}
          SNOWFLAKE_PRIVATE_KEY_PATH: /tmp/key.p8
        run: |
          printf '%s' "${{ secrets.SNOWFLAKE_CI_KEY }}" > /tmp/key.p8
          uv run dbt deps
          uv run dbt build --select state:modified+ --defer --state prod-state
```
CI schemas are per PR (`dbt_pr_<number>`) and dropped on close.

## Promotion Model

```
feature branch -> dev (personal schemas)
               -> CI (ephemeral schemas, sampled data)
main           -> staging (full-size masked data, scheduled runs)
release tag    -> prod
```
Promote the **same artifact** (image tag, wheel, git SHA) through environments; only config changes.

## Safe Data Releases

### Blue/green tables
```sql
-- build new version alongside
create or replace table analytics.orders_v2_green as select ...;
-- validate
select count(*), count(distinct order_id) from analytics.orders_v2_green;
-- atomic swap (Snowflake)
alter table analytics.orders swap with analytics.orders_v2_green;
```
Equivalent: view repointing (`create or replace view orders as select * from orders_v2`), BigQuery table copy/rename, Iceberg branch fast-forward, Delta `RESTORE`/shallow clones.

### Write-audit-publish
Run quality checks on staged output before exposing it; failures block publish and alert, leaving yesterday's data in place.

### Schema changes
| Change | Safe approach |
|---|---|
| Add column | Additive; consumers unaffected |
| Rename/remove column | Expand-contract: add new, dual-write, migrate consumers, then remove |
| Change grain or keys | New model/version (`orders_v2`), deprecate old with a date |
| dbt model versions / contracts | `contract: {enforced: true}` and `versions:` for public models |

## Backfills
- Run through the orchestrator (`airflow backfill create`, Dagster partition backfills) with limited concurrency.
- Backfill into a staging table, validate, then swap partitions.
- Announce backfills that change historical numbers; record them in a change log.

## Rollback
| Failure | Rollback |
|---|---|
| Bad DAG/code deploy | Redeploy previous image tag / bundle version |
| Bad data published | Time travel restore (Snowflake `AT`/`BEFORE`, BigQuery `FOR SYSTEM_TIME AS OF`, Delta `RESTORE`, Iceberg rollback to snapshot) then rerun with fixed code |
| Bad schema migration | Forward fix preferred; keep old columns until consumers migrate |

Check time-travel retention settings so rollback windows cover your detection time.

## Pitfalls
- Deploying DAG changes that rename task IDs mid-run, orphaning history.
- `dbt run --full-refresh` in prod without approval.
- No prod manifest, forcing full builds in CI.
- Different dependency versions between scheduler and workers.

## Checklist
- [ ] Immutable artifacts promoted across environments
- [ ] Slim CI with deferral and per-PR schemas
- [ ] Data releases gated by quality checks (WAP / blue-green)
- [ ] Expand-contract for breaking schema changes
- [ ] Documented rollback with sufficient time-travel retention
