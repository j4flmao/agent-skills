---
name: data-airflow-dbt-orchestration
description: >
  Use this skill when the user says 'airflow dbt', 'run dbt from airflow', 'astronomer cosmos', 'DbtCloudRunJobOperator', 'dbt in airflow dag', 'airflow 3 dbt', 'orchestrate dbt models', 'dbt build schedule'. Wires dbt (Core or Cloud) into Apache Airflow 3: choosing the integration pattern, writing the DAG, model-level retries and lineage, data-aware scheduling with Assets, and CI for both. Do NOT use for: general ETL/ELT pipeline architecture (data-etl-pipeline), dbt modeling style and metrics (data-science-analytics-engineering), streaming (data-streaming), pipeline CI/CD beyond Airflow+dbt (data-pipeline-cicd).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [data, airflow, dbt, orchestration, elt, cosmos]
---

# Airflow + dbt Orchestration

## Purpose
Run dbt transformations on a schedule or when upstream data lands, with retries, alerting and lineage, without turning Airflow into a compute engine. Airflow decides *when* and *in what order*; the warehouse does the work; dbt defines the SQL models and tests. The main design decision is how much of the dbt graph Airflow should see.

## Agent Protocol

### Trigger
"airflow dbt", "run dbt from airflow", "cosmos", "DbtCloudRunJobOperator", "dbt task group", "dbt in dag", "airflow 3 migration dbt", "orchestrate dbt".

### Input Context
- Airflow version/distribution (OSS, Astronomer, MWAA, Cloud Composer), dbt Core vs dbt Cloud (platform), warehouse.
- Project size (number of models), runtime, SLAs, upstream ingestion triggers.

### Output Artifact
Integration choice + DAG code + dbt selectors/tests + CI steps. No file unless requested.

### Response Format
```
Pattern: {Cosmos per-model|dbt Cloud job|single dbt build task|KubernetesPodOperator}
Schedule: {cron|Asset-triggered}
Selectors: {dbt --select ...}
Failure handling: {retries, alerts, partial reruns}
```

### Completion Criteria
- [ ] DAG uses Airflow 3 APIs (`schedule=`, `airflow.sdk` imports), `catchup` set explicitly.
- [ ] dbt tests run in the same flow (`dbt build`) and failures stop downstream publishing.
- [ ] Credentials come from Airflow connections/secret backend, never from code.
- [ ] Reruns possible for a failed model subset.

## Integration Patterns
| Pattern | Pros | Cons | Use when |
|---------|------|------|----------|
| Astronomer Cosmos (`DbtDag` / `DbtTaskGroup`) | One Airflow task per model/test: retries, lineage, timing per model | Large projects create big DAGs; parse time | dbt Core, < ~1000 models, want model-level visibility |
| dbt Cloud job (`DbtCloudRunJobOperator`) | dbt platform handles environments, docs, state | Opaque inside Airflow; extra cost | Team already on dbt Cloud |
| Single `dbt build` task (Bash/Kubernetes pod) | Simplest, one container image | All-or-nothing retry; less visibility | Small projects, early stage |
| `KubernetesPodOperator` with dbt image | Isolated deps, scalable | Pod startup overhead | dbt deps conflict with Airflow deps |

Keep dbt and Airflow Python dependencies isolated (separate virtualenv or container); they conflict frequently.

## Airflow 3 Essentials
- `schedule_interval` and `timetable` arguments were removed; use `schedule=`.
- DAG authoring imports come from `airflow.sdk` (`dag`, `task`, `DAG`, `Asset`); old `airflow.models`/`airflow.decorators` paths are deprecated.
- `execution_date` was removed; use `logical_date`. `catchup` now defaults to False.
- Datasets were renamed Assets; Asset-triggered DAGs replace sensors for "run when upstream lands".
- Core operators moved to providers, e.g. `airflow.providers.standard.operators.bash.BashOperator`.
- Ruff rules `AIR30x` flag removed/moved APIs during upgrades.

## Example: Cosmos (dbt Core, model-level tasks)
```python
from datetime import datetime
from pathlib import Path

from cosmos import DbtDag, ExecutionConfig, ProfileConfig, ProjectConfig
from cosmos.profiles import PostgresUserPasswordProfileMapping

DBT_PROJECT = Path("/usr/local/airflow/dbt/analytics")

profile_config = ProfileConfig(
    profile_name="analytics",
    target_name="prod",
    profile_mapping=PostgresUserPasswordProfileMapping(
        conn_id="warehouse_postgres",           # Airflow connection holds credentials
        profile_args={"schema": "analytics"},
    ),
)

analytics_dbt = DbtDag(
    dag_id="analytics_dbt",
    project_config=ProjectConfig(DBT_PROJECT),
    profile_config=profile_config,
    execution_config=ExecutionConfig(dbt_executable_path="/usr/local/airflow/dbt_venv/bin/dbt"),
    schedule="0 5 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    default_args={"retries": 2},
)
```
Check the Cosmos release notes for the minimum version that supports your Airflow version.

## Example: dbt Cloud Job Triggered by an Upstream Asset
```python
from datetime import datetime

from airflow.sdk import Asset, dag
from airflow.providers.dbt.cloud.operators.dbt import DbtCloudRunJobOperator

raw_orders = Asset("s3://lake/raw/orders/")       # produced by the ingestion DAG

@dag(schedule=[raw_orders], start_date=datetime(2026, 1, 1), catchup=False)
def dbt_cloud_orders():
    DbtCloudRunJobOperator(
        task_id="run_orders_job",
        dbt_cloud_conn_id="dbt_cloud",
        job_id=12345,                              # dbt Cloud job id
        wait_for_termination=True,
        check_interval=30,
        timeout=3600,
    )

dbt_cloud_orders()
```
The ingestion task declares `outlets=[raw_orders]`; when it succeeds, this DAG runs.

## Example: Single `dbt build` Task
```python
from datetime import datetime

from airflow.sdk import dag
from airflow.providers.standard.operators.bash import BashOperator

@dag(schedule="@daily", start_date=datetime(2026, 1, 1), catchup=False)
def dbt_build_daily():
    BashOperator(
        task_id="dbt_build",
        bash_command=(
            "cd /opt/dbt/analytics && "
            "dbt build --target prod --select tag:daily --fail-fast"
        ),
        retries=1,
    )

dbt_build_daily()
```

## dbt Practices That Matter for Orchestration
- `dbt build` runs models, tests, seeds and snapshots in DAG order; a failing test skips its downstream models.
- Layers: `staging` (1:1 with sources, renamed/cast) → `intermediate` → `marts`. Tag or path-select layers for separate schedules.
- Tests: `unique`, `not_null`, `relationships`, `accepted_values` under `data_tests:` (dbt 1.8+ name), plus unit tests for complex SQL logic.
- Source freshness: `dbt source freshness` before building marts to avoid publishing stale data.
- Incremental models with `is_incremental()` and a `unique_key`; schedule periodic `--full-refresh` only when needed.

## CI
```bash
dbt build --select state:modified+ --defer --state ./prod-manifest --target ci   # slim CI: changed models + children
ruff check dags/ --select AIR                                                  # Airflow upgrade/lint rules
python -c "from airflow.models import DagBag; db = DagBag('dags/', include_examples=False); assert not db.import_errors, db.import_errors"
```

## Anti-Patterns
- Heavy pandas transformations inside Airflow workers instead of the warehouse.
- One giant DAG with every dbt model plus ingestion plus reverse ETL.
- Sensors polling for hours instead of Asset-based scheduling or deferrable operators.
- Hardcoded warehouse credentials in `profiles.yml` committed to git.
- Running `dbt run` without tests, publishing untested marts.

## References
- Related skills: `../etl-pipeline/SKILL.md` (pipeline architecture), `../data-pipeline-cicd/SKILL.md`, `../data-quality/SKILL.md`.
- Apache Airflow 3 upgrade guide and public interface docs; Astronomer Cosmos docs; dbt docs (`dbt build`, data tests, state selection).
