# Batch Job Scheduling Reference

## Dependency Graphs

Batch jobs form directed acyclic graphs (DAGs) where each node is a job and edges represent dependencies.

### DAG Design Principles

- Every DAG has a single entry point (root job)
- No circular dependencies (cycles cause deadlock)
- Granularity: one atomic operation per job node
- Fan-out after upstream completion, fan-in before downstream
- Idempotent jobs for safe retry

```
                    ┌──────────────┐
                    │  Extract Raw  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Stage    │ │ Stage    │ │ Stage    │
        │ Customers│ │ Orders   │ │ Products │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                    ┌──────────────┐
                    │  Transform   │
                    │  (dbt run)   │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    ▼              ▼
              ┌──────────┐  ┌──────────┐
              │ dbt test │  │ dbt docs │
              └──────────┘  └──────────┘
```

```yaml
# dependency_graph.yaml
dag:
  - id: extract_raw
    dependencies: []
  - id: stage_customers
    dependencies: [extract_raw]
  - id: stage_orders
    dependencies: [extract_raw]
  - id: stage_products
    dependencies: [extract_raw]
  - id: dbt_run_transform
    dependencies: [stage_customers, stage_orders, stage_products]
  - id: dbt_test
    dependencies: [dbt_run_transform]
  - id: dbt_docs
    dependencies: [dbt_run_transform]
```

## SLA Management

Service Level Agreements define expected completion times for batch jobs.

### SLA Definition

```yaml
sla:
  job: daily_orders_pipeline
  schedule: "0 3 * * *"     # Runs at 3 AM
  expected_duration: "45 min"
  sla_deadline: "06:00"      # Must complete by 6 AM
  owner: data-engineering
  severity: critical
  notification:
    - slack: #data-alerts
    - pagerduty: data-pipeline-critical
```

### SLA Hierarchy

```
Pipeline SLA: 06:00 (business deadline)
  ├── Extract: 03:00-03:30 (30 min window)
  ├── Stage:   03:30-04:00 (30 min window)
  └── Transform & Test: 04:00-05:30 (90 min window)
        ├── dbt run: 04:00-05:00
        └── dbt test: 05:00-05:30
```

### SLA Monitoring

```sql
CREATE TABLE batch_sla_tracking (
    job_id STRING,
    execution_date DATE,
    scheduled_time TIMESTAMP,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    duration_seconds INT,
    sla_deadline TIMESTAMP,
    sla_met BOOLEAN,
    missed_reason STRING
);

-- SLA compliance report
SELECT
    DATE_TRUNC('month', execution_date) AS month,
    COUNT(*) AS total_runs,
    SUM(CASE WHEN sla_met THEN 1 ELSE 0 END) AS sla_hits,
    ROUND(AVG(CASE WHEN sla_met THEN 1 ELSE 0 END) * 100, 1) AS sla_pct
FROM batch_sla_tracking
WHERE execution_date >= DATEADD('month', -3, CURRENT_DATE)
GROUP BY month;
```

## Job Prioritization

Priority determines which jobs run first when resources are constrained.

### Priority Levels

| Level | Label | Examples | Resource Guarantee |
|-------|-------|----------|-------------------|
| P0 | Critical | Regulatory reporting, customer-facing dashboards | 100% reserved |
| P1 | High | Executive dashboards, revenue reports | 75% guaranteed |
| P2 | Medium | Standard business reports, ML training | 50% elastic |
| P3 | Low | Ad-hoc queries, experimental pipelines | Best effort |

### Priority-Based Scheduling

```yaml
jobs:
  - id: regulatory_filing
    priority: P0
    resources:
      cores: 16
      memory: 64GB
    schedule: "0 2 * * *"

  - id: daily_sales_report
    priority: P1
    resources:
      cores: 8
      memory: 32GB
    schedule: "0 4 * * *"

  - id: experimental_model
    priority: P3
    resources:
      cores: 4
      memory: 16GB
    schedule: "0 6 * * *"
    preemptible: true  # Can be killed for higher priority jobs
```

## Resource Allocation

### Static Allocation
Fixed resources per job slot. Simple but wasteful.

```properties
# Airflow static pool
[pool]
name = etl_pool
slots = 10
```

### Dynamic Allocation
Resources scale based on job requirements and cluster load.

```yaml
# Dynamic resource allocation
allocation:
  strategy: weighted_fair
  default_priority_weight: 1.0
  p0_weight: 10.0
  p1_weight: 5.0
  p2_weight: 2.0
  p3_weight: 1.0
  max_concurrent_jobs: 20
  overcommit_factor: 1.2
```

## Retry Logic

### Retry Configuration

```yaml
retry:
  max_retries: 3
  retry_delay_seconds: 300  # 5 minutes between retries
  retry_exponential_backoff: true
  backoff_multiplier: 2.0
  max_retry_delay: 3600     # Cap at 1 hour
  retry_on:
    - timeout
    - transient_error
    - resource_unavailable
  no_retry_on:
    - data_quality_failure
    - schema_mismatch
    - authentication_error
```

### Retry Backoff Calculation

```python
def calculate_backoff(attempt: int, base_delay: int = 300) -> int:
    """Calculate exponential backoff with jitter."""
    import random
    delay = base_delay * (2 ** (attempt - 1))
    jitter = random.uniform(0, delay * 0.1)
    return min(int(delay + jitter), 3600)

# Attempt 1: 300s + random jitter
# Attempt 2: 600s + random jitter
# Attempt 3: 1200s + random jitter
```

## Alerting

### Alert Configuration

```yaml
alerting:
  rules:
    - metric: job_duration
      condition: "> 2x expected_duration"
      severity: warning
      channels: [slack]

    - metric: job_failure
      condition: "status == failed"
      severity: critical
      channels: [slack, pagerduty, email]

    - metric: sla_miss
      condition: "current_time > sla_deadline AND status != success"
      severity: critical
      channels: [slack, pagerduty]

    - metric: retry_count
      condition: "retries_remaining == 0 AND status == failed"
      severity: critical
      channels: [slack, pagerduty]
```

### Alert Handlers

```python
def handle_job_failure(context):
    """Alert handler for batch job failures."""
    job_id = context['job_id']
    error = context['error']
    run_id = context['run_id']

    # Log to monitoring system
    log_failure(job_id, error, run_id)

    # Send notification
    notify_slack(f"Job failed: {job_id}\nError: {error}")
    create_pagerduty_incident(job_id, error)

    # Trigger compensation if needed
    if context.get('requires_compensation'):
        trigger_compensation_job(job_id)
```

## Rules
- Every DAG must be acyclic — validate before deployment
- All jobs must be idempotent for safe retry
- SLA deadlines must account for retry time
- P0 jobs must have 100% resource reservation
- Exponential backoff with jitter for retries prevents thundering herd
- Alert on both failure AND SLA miss (slow jobs)
- Document expected duration for every job
- Maintain runbook for common failure patterns
- Test retry logic with simulated failures
- Regular SLA review to adjust for data growth
