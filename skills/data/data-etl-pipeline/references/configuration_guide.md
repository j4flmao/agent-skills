# ETL Pipeline Configuration Guide

How to configure an ETL/ELT stack so it is reproducible, environment-aware and safe: Airflow settings and connections, dbt profiles and project config, Spark job settings, pipeline parameter files, and secrets handling.

## Principles
- **Code and config in git, secrets outside git.** Values that differ per environment come from environment variables or a secret backend.
- **One config surface per environment** (dev, staging, prod), selected by a single variable (`ENV`, dbt `--target`).
- **Validate config at startup** and fail fast with a clear message.
- **Defaults are safe** (low concurrency, no destructive full refresh).

## Airflow Configuration

Settings resolve in this order: environment variable `AIRFLOW__{SECTION}__{KEY}` > `airflow.cfg` > defaults. Prefer environment variables in containers.

| Setting | Env var | Guidance |
|---|---|---|
| Executor | `AIRFLOW__CORE__EXECUTOR` | `LocalExecutor` small; `CeleryExecutor` or `KubernetesExecutor` at scale; Airflow 3 supports multiple executors |
| Parallelism | `AIRFLOW__CORE__PARALLELISM` | Max running task instances per scheduler |
| Per-DAG concurrency | `AIRFLOW__CORE__MAX_ACTIVE_TASKS_PER_DAG`, `MAX_ACTIVE_RUNS_PER_DAG` | Protect sources/warehouse |
| DAG parsing | `AIRFLOW__DAG_PROCESSOR__REFRESH_INTERVAL` (Airflow 3) | Keep top-level DAG code cheap |
| Default retries | in `default_args` | Retries with delay; idempotent tasks only |
| Remote logging | `AIRFLOW__LOGGING__REMOTE_LOGGING=True`, `REMOTE_BASE_LOG_FOLDER=s3://...` | Required with ephemeral workers |
| Secrets backend | `AIRFLOW__SECRETS__BACKEND` | Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault |
| Metadata DB | `AIRFLOW__DATABASE__SQL_ALCHEMY_CONN` | PostgreSQL; from secret |

### Secrets backend example (AWS)
```bash
export AIRFLOW__SECRETS__BACKEND=airflow.providers.amazon.aws.secrets.secrets_manager.SecretsManagerBackend
export AIRFLOW__SECRETS__BACKEND_KWARGS='{"connections_prefix": "airflow/connections", "variables_prefix": "airflow/variables"}'
```
A connection `warehouse` is then read from secret `airflow/connections/warehouse` (URI or JSON form).

### Connections and variables
- Connections: `AIRFLOW_CONN_<CONN_ID>` env var (URI or JSON) for local/dev; secrets backend for prod.
- Variables: avoid reading `Variable.get()` at DAG top level (runs on every parse); read inside tasks or use Jinja `{{ var.value.x }}`.

## Pipeline Parameter Files

Keep business parameters (source tables, schedules, thresholds) in typed config validated at load time.

```yaml
# config/pipelines/orders.yaml
pipeline: orders
schedule: "0 2 * * *"
source:
  conn_id: shop_postgres
  table: public.orders
  watermark_column: updated_at
  lookback_hours: 6
target:
  table: analytics.silver_orders
  write_mode: merge
  merge_keys: [order_id]
quality:
  min_rows: 1000
  max_null_ratio:
    customer_id: 0.0
    amount: 0.01
```

```python
from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field


class Source(BaseModel):
    conn_id: str
    table: str
    watermark_column: str
    lookback_hours: int = Field(ge=0, le=168)


class Target(BaseModel):
    table: str
    write_mode: Literal["merge", "overwrite_partition", "append"]
    merge_keys: list[str] = []


class PipelineConfig(BaseModel):
    pipeline: str
    schedule: str
    source: Source
    target: Target


def load_config(path: Path) -> PipelineConfig:
    try:
        return PipelineConfig.model_validate(yaml.safe_load(path.read_text()))
    except Exception as exc:
        raise ValueError(f"Invalid pipeline config {path}: {exc}") from exc
```
Validate all config files in CI so a typo fails the PR, not the 2 a.m. run.

## dbt Configuration

### profiles.yml (environment-specific, no secrets inline)
```yaml
analytics:
  target: "{{ env_var('DBT_TARGET', 'dev') }}"
  outputs:
    dev:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      authenticator: snowflake_jwt
      private_key_path: "{{ env_var('SNOWFLAKE_PRIVATE_KEY_PATH') }}"
      role: TRANSFORMER_DEV
      warehouse: TRANSFORM_XS
      database: ANALYTICS_DEV
      schema: "dbt_{{ env_var('USER', 'ci') }}"
      threads: 4
    prod:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      authenticator: snowflake_jwt
      private_key_path: "{{ env_var('SNOWFLAKE_PRIVATE_KEY_PATH') }}"
      role: TRANSFORMER
      warehouse: TRANSFORM_M
      database: ANALYTICS
      schema: core
      threads: 8
```

### dbt_project.yml
```yaml
name: analytics
profile: analytics
models:
  analytics:
    staging:
      +materialized: view
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table
      +on_schema_change: append_new_columns
vars:
  lookback_days: 3
tests:
  +store_failures: true
```
Override per run: `dbt run --vars '{lookback_days: 7}'`.

## Spark Job Configuration

```python
spark = (
    SparkSession.builder.appName("orders_silver")
    .config("spark.sql.adaptive.enabled", "true")                 # AQE (default on in Spark 3.2+)
    .config("spark.sql.shuffle.partitions", "auto")               # Databricks; on OSS set a number or rely on AQE coalescing
    .config("spark.sql.sources.partitionOverwriteMode", "dynamic")
    .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
    .getOrCreate()
)
```
Keep cluster sizing (executors, memory, autoscaling) in the job definition (Databricks job JSON, EMR step config, Spark-on-K8s `SparkApplication`) under version control.

## Environment Matrix

| Item | dev | staging | prod |
|---|---|---|---|
| Data | Sampled or synthetic | Prod-like, masked | Real |
| Credentials | Personal, read-mostly | Service account | Service account, least privilege |
| Schedules | Paused by default | Enabled | Enabled |
| Alerts | Off | To team channel | To on-call |
| Full refresh allowed | Yes | With approval | Change-managed |

## Pitfalls
- Secrets in `airflow.cfg`, DAG files or `profiles.yml` committed to git.
- Top-level DAG code calling databases or APIs (slow parsing, scheduler load).
- Same warehouse role for dev and prod.
- Unvalidated YAML causing silent defaults.

## Checklist
- [ ] Env-var or secret-backend driven config; nothing secret in git
- [ ] Config schemas validated in CI
- [ ] Concurrency limits per DAG/source
- [ ] Remote logging enabled
- [ ] Separate roles/warehouses per environment
