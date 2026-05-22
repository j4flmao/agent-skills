# Airflow Architecture Reference

## Scheduler

```
Scheduler loop (runs continuously):
  1. Parse DAG files from dags_folder (every dag_dir_list_interval, default 5min)
  2. Create DagRuns for DAGs that need scheduling
  3. Create TaskInstances for tasks ready to run
  4. Set tasks to QUEUED state in metadata DB
  5. Push tasks to executor (Celery queue or K8s API)
  6. Monitor task completion (heartbeats from workers)
  7. Handle retries, SLA misses, callbacks

Critical config:
  scheduler.dag_dir_list_interval: 300   (how often to scan for new DAGs)
  min_file_process_interval: 30           (minimum time between file parses)
  max_dagruns_per_loop_to_schedule: 10    (DAG runs created per loop)
  scheduler_heartbeat_sec: 5              (scheduler liveness)
  job_heartbeat_sec: 10                   (worker heartbeat frequency)
  parallelism: 32                         (max tasks across entire scheduler)
  dag_concurrency: 16                     (max tasks per DAG)
  max_active_tasks_per_dag: 16            (per DAG run)
  max_active_runs_per_dag: 16
```

## Executor Types

```
SequentialExecutor:
  - Runs 1 task at a time, single-process
  - Uses SQLite (no concurrency)
  - Use: dev/test only, never production

LocalExecutor:
  - Runs tasks in parallel subprocesses on scheduler node
  - parallelism config controls concurrent tasks
  - Use: small-scale production (< 10 DAGs), single node

CeleryExecutor:
  - Distributed task queue with Redis/RabbitMQ
  - Workers on multiple nodes
  - Queue types: default (most tasks), priority queues for urgent work
  - Use: 50+ DAGs, multi-node, HA requirements

KubernetesExecutor:
  - Each task runs in its own K8s pod
  - Pod template for custom resource specs per task
  - Native logging (stdout -> K8s log), Garbage collection of old pods
  - Use: K8s-native infrastructure, per-task isolation, variable resource needs

CeleryK8sExecutor:
  - Celery queue for most tasks
  - K8s pods for specific high-resource tasks (via queue routing)
  - Use: hybrid workloads, transition to full K8s
```

```yaml
# CeleryExecutor config
celery:
  broker_url: redis://redis:6379/0
  result_backend: db+postgresql://airflow:pass@postgres/airflow
  worker_concurrency: 8           # tasks per worker process

# K8sExecutor config
kubernetes:
  namespace: airflow
  worker_container_repository: myrepo/airflow
  worker_container_tag: latest
  delete_worker_pods: true
  delete_worker_pods_on_failure: false
  in_cluster: true
  pod_template_file: /opt/airflow/pod_template.yaml
```

## DAG Design Patterns

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from airflow.utils.task_group import TaskGroup

with DAG('complex_etl', schedule='0 6 * * *', catchup=False) as dag:

    with TaskGroup('extract_group') as extract:
        t1 = PythonOperator(task_id='extract_source_a', python_callable=extract_a)
        t2 = PythonOperator(task_id='extract_source_b', python_callable=extract_b)
        t3 = PythonOperator(task_id='extract_source_c', python_callable=extract_c)
        t1 >> t2  # a before b
        [t1, t2] >> t3  # c after a and b

    validate = PythonOperator(task_id='validate', python_callable=validate)

    with TaskGroup('load_parallel') as load:
        for table in ['fact_orders', 'dim_customers', 'dim_products']:
            PythonOperator(
                task_id=f'load_{table}',
                python_callable=load_table,
                op_kwargs={'table': table}
            )

    slack_alert = PythonOperator(task_id='slack', python_callable=send_slack)

    extract >> validate >> load >> slack_alert
```

## Operators and Sensors

```python
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.sensors.time_delta import TimeDeltaSensor
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor

# Spark job
spark_job = SparkSubmitOperator(
    task_id='run_etl',
    application='/opt/spark/etl.py',
    conn_id='spark_default',
    conf={'spark.executor.memory': '4g'},
    java_class='com.example.Main',
    executor_cores=2,
    driver_memory='2g',
)

# SQL transform
run_sql = PostgresOperator(
    task_id='run_transform',
    postgres_conn_id='warehouse',
    sql='sql/transform.sql',
)

# Sensor: wait for file in S3
wait_for_file = S3KeySensor(
    task_id='wait_for_file',
    bucket_key='s3://incoming/orders_{data_interval_start.strftime("%Y%m%d")}.csv',
    wildcard_match=False,
    timeout=3600,
    poke_interval=30,
)

# Time sensor: wait until a specific time
wait_for_time = TimeDeltaSensor(
    task_id='wait_until_4am',
    delta=timedelta(hours=4),
)
```

## Pools and SLAs

```python
from airflow.models import Pool

# Pool: limit concurrency per resource (DB connections, API rate limits)
Pool.create_or_update_pool(
    name='external_api',
    slots=5,
    description='Limit concurrent API calls to 5'
)

# Task that uses pool
api_call = PythonOperator(
    task_id='call_api',
    python_callable=call_api,
    pool='external_api',
    pool_slots=2,          # each task uses 2 slots
)

# SLA: task must complete within 1 hour of scheduled time
dag = DAG(
    'sla_dag',
    schedule='0 6 * * *',
    sla_miss_callback=send_sla_miss_alert,
    default_args={'sla': timedelta(hours=1)},
)
```

## Airflow Configuration Reference

```properties
# airflow.cfg (production settings)
core:
  executor = CeleryExecutor
  sql_alchemy_conn = postgresql+psycopg2://airflow:pass@postgres:5432/airflow
  load_examples = False
  dagbag_import_timeout = 120
  default_timezone = UTC

scheduler:
  min_file_process_interval = 30
  dag_dir_list_interval = 300
  max_dagruns_per_loop_to_schedule = 10
  schedule_after_task_execution = True
  use_job_schedule = True
  parsing_processes = 4

webserver:
  rbac = True
  auth_backend = airflow.providers.fab.auth_manager.api.auth.backend.basic_auth
  default_ui_timezone = UTC

logging:
  remote_logging = True
  remote_log_conn_id = s3_logging
  remote_base_log_folder = s3://airflow-logs/
```
