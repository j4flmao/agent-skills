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

### Step 10: Dagster Deep Dive
Dagster's asset-centric model goes beyond DAGs. Software-defined assets (SDAs) explicitly define what pipelines produce. Auto-materialization evaluates freshness policies and triggers runs automatically. Asset sensors trigger on upstream changes. Dagster's dbt integration loads dbt models as Dagster assets with column-level lineage, test visibility, and health checks. Configurable resources provide dependency injection via I/O managers. Code locations split pipelines across repos with a unified UI. Use Dagster when asset lineage, data quality at transform time, and dbt integration are priorities.

### Step 11: Temporal and Kestra
Temporal is workflow-as-code for long-running, fault-tolerant stateful workflows. A Temporal Workflow is a function that pauses, awaits signals, executes idempotent activities, and survives process restarts. Guarantees: exactly-once activity execution, infinite retry with backoff, event-sourced workflow state. Use Temporal for multi-step business processes and microservice orchestration where state must survive crashes.

Kestra combines YAML declarative flows with event-driven triggers. Flows define tasks (Python, dbt, shell, API) with dependencies, retries, and error handlers. Supports scheduled, event (S3/Kafka/webhook), and flow-triggered execution. Built-in dashboard for execution history, logs, and SLA tracking. Git-native workflow definitions. Use Kestra for GitOps data pipelines with declarative YAML.

### Orchestration Patterns

#### Dependency Strategies

```yaml
dependency_types:
  linear:
    description: "Tasks execute in sequence"
    pattern: "task1 >> task2 >> task3"
    best_for: "Simple ETL, linear data flow"
  
  fan_out:
    description: "One task triggers multiple parallel tasks"
    pattern: "task1 >> [task2a, task2b, task2c]"
    best_for: "Parallel processing of independent partitions"
  
  fan_in:
    description: "Multiple tasks converge to one"
    pattern: "[task1a, task1b] >> task2"
    best_for: "Join/union after parallel extraction"
  
  conditional_branch:
    description: "Choose path based on data or result"
    pattern: "BranchPythonOperator → choose path"
    best_for: "Different processing for incremental vs full refresh"
  
  dynamic_tasks:
    description: "Tasks created at runtime based on input"
    pattern: "expand() in Dagster, DynamicTaskMapping in Airflow"
    best_for: "Variable number of partitions, shards"
```

#### Error Handling Strategies

```python
# Retry with exponential backoff
from airflow.utils.timeout import timeout
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=60, min=60, max=600),
    reraise=True
)
def extract_with_retry(source_config):
    """Extract with 3 retries, 1min-10min backoff"""
    return extract_from_source(source_config)

# Circuit breaker pattern
class CircuitBreaker:
    def __init__(self, failure_threshold=5, reset_timeout=300):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.reset_timeout:
                self.state = "HALF_OPEN"
            else:
                raise Exception("Circuit breaker OPEN")
        try:
            result = func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
            self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            raise e
```

#### Orchestrator Comparison

```yaml
orchestrator_selection:
  airflow:
    strengths: ["Mature ecosystem", "Python-native", "Huge community"]
    weaknesses: ["Scripting bottlenecks for complex branching", "No built-in asset lineage"]
    best_for: "General-purpose data pipeline orchestration, heterogeneous tech stack"
  
  dagster:
    strengths: ["Asset-centric model", "dbt integration", "Auto-materialization", "Column-level lineage"]
    weaknesses: ["Smaller community", "Steeper learning curve for DAG developers"]
    best_for: "dbt-native pipelines, software-defined assets, data quality at orchestration"
  
  prefect:
    strengths: ["Python-native", "Automatic retry", "Event-driven", "Serverless option"]
    weaknesses: ["Limited enterprise features (OSS)", "Dependency management"]
    best_for: "Python-heavy pipelines, serverless execution, retry-heavy workflows"
  
  temporal:
    strengths: ["Long-running stateful workflows", "Exactly-once execution", "Survives crashes"]
    weaknesses: ["Not data-specific (general purpose)", "No built-in scheduling"]
    best_for: "Stateful multi-step business processes, microservice orchestration"
  
  kestra:
    strengths: ["YAML declarative", "Git-native", "Event-driven triggers"]
    weaknesses: ["Newer project", "Limited plugins vs Airflow"]
    best_for: "GitOps data pipelines, declarative YAML workflows, quick setup"
```

### Decision Tree

#### Orchestrator Selection
```
Primary pipeline model?
├── DAG-based, Python-heavy → Airflow (most flexible, largest ecosystem)
├── Asset/DAG, dbt-native → Dagster (asset lineage + dbt integration)
├── Python-native, lightweight → Prefect (simpler retry, event-driven)
├── Stateful long-running workflows → Temporal (exactly-once, crash-proof)
├── Declarative YAML/GitOps → Kestra (Git-native) or Dagster (YAML + code)
└── Kubernetes-native only → Argo Workflows (Kubernetes CRD-based)
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
- Use dynamic tasks for variable-partition workflows (expanding partitions)
- Implement circuit breaker pattern for external API calls
- Match orchestrator to pipeline model — not all orchestrators fit all patterns
- Separate orchestration logic from business logic (tasks call external code)

## References
  - references/airflow-architecture.md — Airflow Architecture Reference
  - references/airflow-best-practices.md — Airflow Best Practices
  - references/dagster-deep-guide.md — Dagster Deep Guide
  - references/dagster-prefect.md — Dagster and Prefect Reference
  - references/data-pipeline-monitoring.md — Data Pipeline Monitoring
  - references/temporal-workflows.md — Temporal Workflows
## Architecture Decision Trees

```
Orchestration Tool Selection
├── Primary use case?
│   ├── Data/ETL pipelines → Airflow / Dagster / Prefect
│   ├── Microservice workflows → Temporal / Camunda
│   └── ML pipelines → Kubeflow / Flyte / Airflow + MLflow
├── Language preference?
│   ├── Python → Airflow / Dagster / Prefect
│   ├── TypeScript → Temporal
│   └── Multi-language → Temporal / Flyte
├── Infrastructure?
│   ├── K8s-native → Dagster on K8s / Airflow K8sExecutor / Flyte
│   └── VM-based → Airflow CeleryExecutor / Prefect (serverless)
└── Execution model?
    ├── DAG-based → Airflow / Dagster / Prefect
    └── Long-running workflows → Temporal (durable execution)
```

**Decision criteria**: Evaluate team expertise, execution model (DAG vs durable), deployment target, and ecosystem integrations.

## Implementation Patterns

### Airflow DAG with Task Groups
```python
# workflow_orchestration/etl_dag.py
from airflow import DAG
from airflow.decorators import task, task_group
from datetime import datetime

with DAG("etl_pipeline", start_date=datetime(2024, 1, 1), schedule="@daily"):

    @task
    def extract(source: str) -> dict:
        return {"source": source, "records": 1000}

    @task
    def transform(data: dict) -> dict:
        data["transformed"] = True
        return data

    @task
    def load(data: dict) -> str:
        return f"Loaded {data['records']} records to warehouse"

    @task_group
    def process_source(source: str):
        raw = extract(source)
        cleaned = transform(raw)
        load(cleaned)

    sources = ["orders", "customers", "products"]
    process_tasks = [process_source(s) for s in sources]
```

### Dagster Software-Defined Asset
```python
# workflow_orchestration/dagster_assets.py
from dagster import asset, Output, AssetIn
import pandas as pd

@asset
def raw_orders() -> Output[pd.DataFrame]:
    df = pd.read_parquet("s3://data-lake/bronze/orders/")
    return Output(df, metadata={"row_count": len(df)})

@asset(ins={"orders": AssetIn("raw_orders")})
def cleaned_orders(orders: pd.DataFrame) -> Output[pd.DataFrame]:
    df = orders.dropna(subset=["order_id", "customer_id"])
    return Output(df, metadata={"dropped": len(orders) - len(df)})

@asset(ins={"orders": AssetIn("cleaned_orders")})
def order_metrics(orders: pd.DataFrame) -> Output[pd.DataFrame]:
    metrics = orders.groupby("date").agg({"total": "sum"}).reset_index()
    return Output(metrics, metadata={"days": len(metrics)})
```

## Production Considerations

- **Executor sizing**: Airflow Celery = 4-8 workers per scheduler; K8sExecutor = each task gets ephemeral pod.
- **Scheduler HA**: Deploy 2+ Airflow schedulers with HA mode; single active, others standby.
- **Task retries**: Set retries = 3 with exponential backoff (2 min → 4 min → 8 min) for transient failures.
- **Dependency management**: Pin all Python dependencies in Docker image; test image build in CI.
- **Resource limits**: Set CPU/memory per task via `executor_config`; prevent runaway tasks.
- **Alerting**: Configure email/PagerDuty on task failures; set `email_on_retry=False` to avoid noise.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| DAGs with > 100 tasks | Scheduler overhead, UI confusion | Decompose into sub-DAGs or task groups |
| No task timeouts | Zombie processes, pool exhaustion | Set `execution_timeout` on every task |
| Storing large data in XCom | Metadata DB bloat, performance | Use S3/GS for passing > 1 MB data |
| No pool management | Resource starvation across DAGs | Define pools per resource type |
| Airflow alone for ML lifecycle | No experiment tracking | Combine with MLflow for model pipeline |

## Performance Optimization

- **Parallelism tuning**: Set `parallelism = 32` and `dag_concurrency = 16` per scheduler; monitor task queue depth.
- **DAG parsing optimizations**: Enable `dagbag.sync.concurrent=True`; minimize top-level code in DAG files.
- **Task grouping**: Combine small sequential tasks into single PythonOperator for less overhead.
- **Database connections**: Set `sql_alchemy_pool_size = 20` for high-throughput workloads; use RDS Proxy.
- **Deferrable operators**: Use deferrable operators for long-polling tasks (EmrStepSensor, ExternalTaskSensor).

## Security Considerations

- **Connection secrets**: Store all DB/API credentials in Airflow connections (encrypted); never in DAG code.
- **RBAC**: Enable Airflow RBAC with roles (Admin, Op, User, Viewer); restrict DAG edit to CI/CD only.
- **Network security**: Run workers in private subnet; use VPC endpoints for AWS services.
- **Audit logging**: Enable Airflow audit logs for all DAG operations (trigger, edit, delete).
- **Image scanning**: Scan Airflow Docker images for vulnerabilities; use minimal base images.

## Handoff
`data-etl-pipeline` for pipeline design patterns and incremental loading
`data-batch-processing` for batch query optimization in orchestrated pipelines
`data-data-quality` for validation rules integrated into workflow
