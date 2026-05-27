# Data Pipeline Monitoring

## Why Monitoring Matters
Production data pipelines fail silently. Unlike application servers that return 500 errors, a DAG that produces wrong data or skips execution can go unnoticed for days. Comprehensive monitoring covers infrastructure, data quality, timeliness, and business impact.

## Metrics Categories

### Infrastructure Metrics
| Metric | Tool | Alert Threshold |
|--------|------|----------------|
| Worker CPU/memory | CloudWatch, Datadog | > 80% for 5min |
| Task duration p99 | Airflow statsd | > 2x baseline |
| Queue depth | Celery/RabbitMQ | > 1000 |
| DB connections | PostgreSQL metrics | > 80% of max |
| Disk usage | Node exporter | > 85% |

### Data Quality Metrics
- Record count anomalies (deviation > 10% from 7-day rolling average)
- Schema validation failures
- NULL ratio spikes in critical columns
- Freshness: time since last successful load
- Duplicate detection: primary key violations

### Timeliness Metrics
- SLA miss rate per DAG/task
- Landing time distribution (hourly histograms)
- Time from source availability to warehouse availability
- Backfill completion percentage

## Monitoring Stack

`yaml
# docker-compose monitoring stack
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    depends_on:
      - prometheus
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
    ports:
      - "3000:3000"

  airflow-exporter:
    image: airflow-metrics-exporter
    environment:
      - AIRFLOW_ENDPOINT=http://airflow:8080
`

## Setting Up Airflow Monitoring with Prometheus

### StatsD Configuration
`python
# airflow.cfg
[metrics]
statsd_on = True
statsd_host = localhost
statsd_port = 8125
statsd_prefix = airflow
statsd_allow_list = task_*_duration, dag_*_duration, operator_*_failures
`

### Custom Metrics in Tasks
`python
from airflow.stats import Stats

@task
def monitored_extract():
    start = time.time()
    try:
        data = extract_from_source()
        Stats.incr("extract.success")
        Stats.timing("extract.duration", (time.time() - start) * 1000)
        return data
    except Exception as e:
        Stats.incr("extract.failure")
        Stats.timing("extract.duration", (time.time() - start) * 1000)
        raise
`

## Alerting Configuration

### PagerDuty Integration
`python
def pagerduty_alert(context):
    import pdpyras
    events_client = pdpyras.EventsAPIClident("your_routing_key")
    payload = {
        "summary": f"DAG Failed: {context['dag'].dag_id}",
        "severity": "critical",
        "source": "airflow",
        "custom_details": {
            "task": context["task"].task_id,
            "execution_date": str(context["execution_date"]),
        }
    }
    events_client.trigger(payload)
`

### Slack Notifications
`python
def slack_alert(context):
    from slack_sdk import WebhookClient
    webhook = WebhookClient("https://hooks.slack.com/services/xxx")
    dag_id = context["dag"].dag_id
    task_id = context["task"].task_id
    message = f":red_circle: *DAG Failed*\nDAG: {dag_id}\nTask: {task_id}"
    webhook.send(text=message, username="Airflow Monitor")
`

## Data Freshness Monitoring

### dbt Source Freshness
`yaml
# sources.yml
version: 2
sources:
  - name: orders
    tables:
      - name: orders_raw
        freshness:
          warn_after: {count: 2, period: hour}
          error_after: {count: 6, period: hour}
        loaded_at_field: _etl_timestamp
`

### Custom Freshness Check
`sql
-- freshness_check.sql
SELECT
    source_name,
    max_timestamp,
    EXTRACT(EPOCH FROM (NOW() - max_timestamp)) / 3600 AS hours_since_update,
    CASE
        WHEN EXTRACT(EPOCH FROM (NOW() - max_timestamp)) / 3600 > 24 THEN 'CRITICAL'
        WHEN EXTRACT(EPOCH FROM (NOW() - max_timestamp)) / 3600 > 6 THEN 'WARNING'
        ELSE 'OK'
    END AS status
FROM (
    SELECT 'orders' AS source_name, MAX(updated_at) AS max_timestamp FROM orders.orders
    UNION ALL
    SELECT 'customers', MAX(created_at) FROM customers.customers
) AS sources;
`

## Anomaly Detection

### Statistical Methods
`python
import numpy as np
from scipy import stats

def detect_anomaly(current_value, historical_values, method="zscore"):
    arr = np.array(historical_values)
    if method == "zscore":
        z = (current_value - arr.mean()) / arr.std()
        return abs(z) > 3
    elif method == "iqr":
        q1, q3 = np.percentile(arr, [25, 75])
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        return current_value < lower or current_value > upper
    return False
`

## Log Aggregation Strategy
- Centralize all worker logs via Filebeat -> Elasticsearch
- Index DAG logs with dag_id and un_id fields
- Set up log retention: 30 days for INFO, 90 days for ERROR
- Create Kibana dashboards for task failure patterns

## Dashboard Design

### Airflow Operational Dashboard
| Panel | Query | Visualization |
|-------|-------|--------------|
| Active DAG runs | count(dag_runs{status="running"}) | Stat |
| Task success rate | sum(rate(task_success_total[5m])) | Time series |
| SLA misses | count(sla_miss_total) | Stat |
| Longest running tasks | Top 10 by duration | Table |
| Failure rate by DAG | sum by(dag_id)(rate(task_failed_total[1h])) | Bar chart |

## Runbook Integration
- Link alert notifications to runbook documentation
- Include remediation steps in alert payloads
- Auto-create Jira tickets for repeated failures
- Maintain postmortem template for major incidents

## Key Points
- Monitor at every layer: infrastructure, data quality, freshness, business impact
- Use structured alerting with proper severity levels and runbook links
- Implement anomaly detection for proactive issue identification
- Centralize logs for effective debugging and trend analysis
- Design dashboards that tell a clear operational story
- Integrate with incident management systems (PagerDuty, OpsGenie)
- Track data freshness and quality as first-class metrics alongside uptime
- Automate runbook creation and postmortem documentation
