---
name: data-workflow-orchestration
description: >
  Use this skill when designing workflow orchestration with Airflow, Prefect, Dagster, Luigi, or Argo Workflows. This skill enforces: DAG design patterns, executor configuration (Celery, K8s, Local), task typing (sensors, operators), CI/CD for pipelines, alerting and retry logic, SLA tracking, and asset lineage. Do NOT use for: CI/CD of application code (non-data), real-time stream processing, or single-step scripts.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, orchestration, workflow, phase-11]
---

# Data Workflow Orchestration

## Purpose
Design robust workflow orchestration for data pipelines. Select the right orchestrator (Airflow, Prefect, Dagster), design DAGs with proper task typing, configure executors for scale, implement CI/CD for pipeline code, and set up observability with alerting.

## Agent Protocol

### Trigger
Exact user phrases: "Airflow", "Prefect", "Dagster", "Luigi", "Argo Workflows", "DAG", "scheduler", "task", "executor", "sensor", "operator", "pipeline orchestration", "data pipeline scheduling", "workflow CI/CD", "pipeline alerting", "task retry".

### Input Context
Before activating, verify:
- Orchestrator preference (Airflow, Prefect, Dagster, Argo)
- Deployment environment (K8s, VMs, hybrid)
- Task types (Python, SQL, Spark, dbt, custom)
- Scale (DAGs count, task count per DAG, execution frequency)
- Infrastructure (database, message broker, logging, secrets)
- Team size and expertise (Python vs YAML vs UI)

### Output Artifact
Workflow orchestration architecture with DAG design, executor configuration, and CI/CD setup.

### Response Format
```
Orchestrator: {Airflow | Prefect | Dagster | Argo Workflows}
Executor: {Celery | K8sExecutor | LocalExecutor | SequentialExecutor | Subprocess}
DAG Count: {N} | Task Count: {M}
Deployment: {K8s | VMs | Serverless}
CI/CD: {GitHub Actions | GitLab CI | Atlantis}
```
```python
# DAG/flow/asset definition skeleton
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Orchestrator selected with trade-off analysis
- [ ] DAG/flow design follows best practices (idempotent, atomic tasks)
- [ ] Executor type configured for workload scale
- [ ] Task retry logic and SLA defined
- [ ] CI/CD pipeline for orchestration code set up
- [ ] Alerting and monitoring configured
- [ ] Secret management integrated
- [ ] Test strategy (unit, integration, end-to-end) defined

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Choose Orchestrator
```
Airflow (Apache):
  - Mature (2014), biggest ecosystem, rich operator library
  - DAG-based, imperative Python, scheduler + workers + webserver
  - Executors: Sequential, Local, Celery, K8s, CeleryK8s, LocalK8s
  - Best for: complex ETL, heterogeneous tasks, large teams, enterprise
  - Weakness: DAG parse time (30s+ for 1000+ DAGs), no asset lineage natively

Prefect (Prefect.io):
  - Modern Pythonic API (decorators @flow, @task)
  - Serverless workers, automations, blocks for secrets/integrations
  - Best for: dynamic task mapping, retry per task, async, ML workflows
  - Weakness: less mature operator library, fewer community plugins

Dagster (Dagster Labs):
  - Asset-centric (software-defined assets, auto-materialize)
  - DAG defined by data dependencies, not task dependencies
  - Best for: data quality focus, lineage tracking, dbt integration, team collaboration
  - Weakness: steeper learning curve, smaller community than Airflow

Argo Workflows (CNCF):
  - K8s-native, YAML DAG, per-step container, artifacts
  - Best for: K8s-centric teams, ML training steps, sidecar pattern
  - Weakness: YAML-only, no Python SDK, K8s-only
```

### Step 2: Airflow Architecture
Webserver: UI, RBAC, DAG rendering. Scheduler: reads DAG files, creates DagRuns, schedules TaskInstances, manages pools/queues. Worker (Celery/K8s): executes tasks. Database (PostgreSQL): stores DAG runs, task instances, variables, connections. Message Broker (Redis/RabbitMQ): Celery queue. DAG directory: dags/ folder, syncs across scheduler and workers.

```
User -> Webserver (UI/API)      Scheduler (reads DAGs, schedules tasks)
            |                          |
            |                    +-----+------+
            |                    | PostgreSQL |
            |                    +-----+------+
            |                          |
         (monitor)               +-----+------+
            |                    | Redis      |
            |                    | (Celery)   |
            +------[workers]------>           |
                                   +-----------+
                                   | Worker 1 |
                                   | Worker 2 |
                                   | Worker N |
                                   +-----------+

DAG sync: shared filesystem (NFS, Git-sync, S3FS) or image-based
```

### Step 3: DAG Design Principles
One DAG per data domain (sales, marketing, finance). Max 15-30 tasks per DAG — split into subDAGs or task groups for bigger workflows. Idempotent: re-run safe, produces same result. Atomic tasks: one operation per task (extract, validate, load, transform).

```python
from airflow import DAG
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.operators.python import PythonOperator
from airflow.sensors.external_task import ExternalTaskSensor
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,
    'max_retry_delay': timedelta(hours=2),
    'email_on_failure': True,
    'email': ['pagerduty@example.com'],
    'sla': timedelta(hours=1),
    'execution_timeout': timedelta(hours=4),
}

with DAG(
    'sales_daily',
    default_args=default_args,
    start_date=datetime(2024, 1, 1),
    schedule='0 6 * * *',
    catchup=False,
    tags=['sales', 'daily'],
) as dag:
    wait_extract = ExternalTaskSensor(
        task_id='wait_extract',
        external_dag_id='source_extract',
        external_task_id='complete',
        timeout=3600,
    )
    validate_raw = PythonOperator(
        task_id='validate_raw',
        python_callable=lambda: ...,
    )
    load_silver = PostgresOperator(
        task_id='load_silver',
        sql='sql/transform_orders.sql',
    )
    wait_extract >> validate_raw >> load_silver
```

### Step 4: Operator Types
```
Action operators:
  PythonOperator, BashOperator, SparkSubmitOperator, PostgresOperator
  SnowflakeOperator, KubernetesPodOperator, S3FileTransformOperator
  DockerOperator, SqliteOperator, SimpleHttpOperator

Transfer operators:
  S3ToRedshiftOperator, GCSToBigQueryOperator, MySqlToPostgresOperator
  LocalFilesystemToS3Operator

Sensors (waiting operators):
  ExternalTaskSensor, S3KeySensor, FileSensor, SqlSensor, HttpSensor
  TimeDeltaSensor, TimeSensor

Decorators (TaskFlow API, Airflow 2.0+):
  @task, @task.virtualenv, @task.docker, @task.external_python
```

### Step 5: Executor Configuration
```
LocalExecutor:   parallel tasks on single node, no HA, for development/small scale
CeleryExecutor:  distributed, workers on multiple nodes, Redis/RabbitMQ broker
                 Best for: medium-large teams, 50+ DAGs, on-premise VMs
K8sExecutor:     each task runs as a K8s pod, auto-scales, isolation per task
                 Best for: K8s-native infrastructure, heterogeneous resource needs
CeleryK8sExecutor: hybrid — Celery queue for most tasks, K8s for specific tasks
```

```yaml
# helm values for Airflow on K8s
airflow:
  executor: CeleryK8sExecutor
  config:
    celery:
      worker_concurrency: 8
      result_backend: db+postgresql://airflow:pass@postgres/airflow
    kubernetes:
      namespace: airflow
      worker_container_repository: myrepo/airflow-custom
      worker_container_tag: latest
      delete_worker_pods: true
      in_cluster: true
```

### Step 6: Prefect Flows and Tasks
```python
from prefect import flow, task
from prefect.tasks import task_input_hash
from datetime import timedelta

@task(retries=3, cache_key_fn=task_input_hash, cache_expiration=timedelta(hours=1))
def extract(source: str) -> bytes:
    return fetch_source(source)

@task(retries=2, retry_delay_seconds=30)
def transform(data: bytes) -> dict:
    return process_data(data)

@flow(name="Sales Ingestion", log_prints=True)
def sales_pipeline(sources: list[str]):
    results = extract.map(sources)
    transformed = transform.map(results)
    return transformed

if __name__ == "__main__":
    sales_pipeline(["api1", "api2", "api3"])
```

### Step 7: Dagster Assets
```python
from dagster import asset, AssetIn, materialize, Definitions
from dagster_snowflake import SnowflakeResource
import pandas as pd

@asset(key_prefix=["bronze"])
def raw_orders():
    return pd.read_csv("s3://bucket/orders.csv")

@asset(ins={"raw_orders": AssetIn(key_prefix=["bronze"])})
def cleaned_orders(raw_orders: pd.DataFrame) -> pd.DataFrame:
    return raw_orders.dropna(subset=["order_id"])

@asset(ins={"cleaned_orders": AssetIn(key_prefix=["silver"])})
def daily_revenue(cleaned_orders: pd.DataFrame) -> pd.DataFrame:
    return cleaned_orders.groupby("order_date").agg({"amount": "sum"}).reset_index()

defs = Definitions(
    assets=[raw_orders, cleaned_orders, daily_revenue],
    resources={"snowflake": SnowflakeResource(...)},
    sensors=[...],
    schedules=[...],
)
```

### Step 8: CI/CD for Pipelines
Multi-env strategy: dev -> staging -> prod. Test types: DAG integrity (import error, cycle check), unit tests (task logic isolated), integration (with test DB/Airflow), end-to-end (full DAG run on small data).

```yaml
# .github/workflows/data-pipeline-ci.yml
name: Data Pipeline CI
on: [pull_request]
jobs:
  dag-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r requirements.txt
      - name: Validate DAGs
        run: |
          python -c "
          from airflow.models import DagBag
          dagbag = DagBag(dag_folder='dags/', include_examples=False)
          assert len(dagbag.import_errors) == 0, f'Errors: {dagbag.import_errors}'
          print(f'{len(dagbag.dags)} DAGs loaded successfully')
          "
      - name: Run unit tests
        run: pytest tests/ -v
```

### Step 9: Alerting and Monitoring
Task failure: email (SMTP), Slack webhook, PagerDuty, Opsgenie. SLA miss: Airflow SLA mechanism — callback on miss. Metrics: Airflow + StatsD/Prometheus/Grafana. Logs: CloudWatch, ELK, Loki.
```python
# Slack alert on failure
from airflow.operators.python import PythonOperator
from airflow.models import Variable
import requests

def alert_failure(context):
    dag_id = context['dag'].dag_id
    task_id = context['task'].task_id
    log_url = context['task_instance'].log_url
    msg = f"FAIL: {dag_id}.{task_id} - {log_url}"
    requests.post(
        Variable.get("slack_webhook"),
        json={"text": msg}
    )

with DAG(..., on_failure_callback=alert_failure):
    ...
```

## Rules
- Every DAG/flow must be idempotent (rerun produces same result)
- Set retry with exponential backoff on all tasks (3 retries, 5-10min base)
- Max task runtime must have execution_timeout set
- At least one SLA per DAG with notification
- Never store secrets in DAG code — use connections/secrets backend
- CI pipeline must validate DAGs (import + cycle check)
- Test with same image/version in staging before prod
- Monitor queue depth, scheduler heartbeat, and missed SLAs

## References
- `references/airflow-architecture.md` — Scheduler, executor types, DAG design, operators, sensors, pools, SLA
- `references/dagster-prefect.md` — Dagster assets, software-defined assets, sensors; Prefect flows/tasks, deployments; CI/CD, testing, alerting

## Handoff
`data-etl-pipeline` for pipeline design patterns and incremental loading
`data-batch-processing` for batch query optimization in orchestrated pipelines
`data-data-quality` for validation rules integrated into workflow
