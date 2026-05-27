# Airflow Best Practices

## DAG Design Principles
- Idempotency: Every DAG run should produce the same result given the same input data. Tasks must be idempotent to support retries and backfills without side effects.
- Atomicity: Each task should perform one logical operation. This makes debugging easier and allows granular retries.
- Lineage: Track data dependencies explicitly. Use Airflow's inlets and outlets parameters to document data flow between tasks.

## Task Configuration
| Parameter | Recommendation | Reason |
|-----------|---------------|--------|
| etries | 2-3 | Handle transient failures |
| etry_delay | 5-10 minutes | Avoid rapid retry storms |
| xecution_timeout | Set per task | Prevent hung tasks |
| sla | Optional | Alert on slow tasks |
| mail_on_failure | True | Immediate notification |

## Using TaskFlow API
The TaskFlow API (Airflow 2.0+) simplifies DAG writing by using Python decorators:

`python
from airflow.decorators import dag, task
from datetime import datetime

@dag(schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False)
def etl_pipeline():
    @task
    def extract():
        return {"data": [1, 2, 3]}

    @task
    def transform(data: dict):
        processed = [x * 2 for x in data["data"]]
        return {"result": processed}

    @task
    def load(result: dict):
        print(f"Loading: {result}")
        return "success"

    data = extract()
    transformed = transform(data)
    load(transformed)

etl_instance = etl_pipeline()
`

## Dynamic DAGs
Generate DAGs programmatically for similar pipelines:

`python
import json
from pathlib import Path

def generate_dag(config_file):
    with open(config_file) as f:
        configs = json.load(f)

    for cfg in configs:
        dag_id = f"pipeline_{cfg['name']}"
        globals()[dag_id] = create_dag(dag_id, cfg)

def create_dag(dag_id, config):
    @dag(dag_id=dag_id, schedule=config["schedule"], start_date=datetime(2024, 1, 1), catchup=False)
    def dynamic_dag():
        @task
        def process(source, dest):
            print(f"Processing {source} -> {dest}")
            return True

        process(config["source"], config["destination"])
    return dynamic_dag()
`

## Pool Management
Use Airflow pools to control resource contention:

`python
with DAG("pool_example", ...):
    heavy_task = PythonOperator(
        task_id="heavy_computation",
        python_callable=run_heavy_job,
        pool="high_cpu",
        pool_slots=2,
    )
`

## SLAs and Alerts
`python
default_args = {
    "sla": timedelta(hours=2),
    "sla_miss_callback": sla_callback,
}

def sla_callback(dag, task_list, blocking_task_list, slas, blocking_tis):
    send_alert(f"SLA missed for {dag.dag_id}")
`

## Testing DAGs
`python
import pytest
from airflow.models import DagBag

def test_dag_loading():
    dagbag = DagBag(dag_folder="dags/", include_examples=False)
    assert len(dagbag.import_errors) == 0, "DAG import errors found"

def test_dag_structure():
    dagbag = DagBag(dag_folder="dags/")
    dag = dagbag.get_dag("etl_pipeline")
    assert dag is not None
    tasks = dag.tasks
    assert len(tasks) == 3
`

## Deployment Patterns
- Use Helm charts for Kubernetes-based Airflow deployments
- Store DAGs in Git and sync via GitSync or persistent volumes
- Use secrets backend (Vault, AWS SSM) for sensitive configs
- Enable udit_log for compliance tracking

## Performance Tuning
| Optimization | Impact |
|-------------|--------|
| Increase parallelism in airflow.cfg | More concurrent tasks |
| Tune dag_concurrency per DAG | Control DAG-level concurrency |
| Use celery or kubernetes_executor | Horizontal scaling |
| Enable 	ask_fail_alert | Quick failure detection |

## Security Best Practices
- Use RBAC roles (Admin, Op, User, Viewer)
- Variable encryption: irflow.cfg -> ernet_key
- Network isolation for workers
- Regular secret rotation
- Audit logging for all DAG mutations

## Key Points
- Always design for idempotency and retries
- Use TaskFlow API for cleaner DAG code from Airflow 2.0+
- Leverage pools for resource management
- Test DAGs in CI/CD pipeline before deployment
- Monitor with SLAs and proper alerting
- Use Git-based DAG synchronization for version control
- Implement proper security with RBAC and encryption
