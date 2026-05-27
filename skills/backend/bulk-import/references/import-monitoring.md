# Import Monitoring

## Monitor Architecture

### Metrics Pipeline
```
Application Metrics → OpenTelemetry Collector → Metrics Backend → Dashboard
                           ↓
                    Alert Manager → Notifications
```

### Key Metrics

| Metric | Type | Description | Threshold |
|--------|------|-------------|-----------|
| `import.jobs.total` | Counter | Total import jobs created | — |
| `import.jobs.active` | Gauge | Currently running jobs | < 50 |
| `import.jobs.duration_seconds` | Histogram | Job completion time | p99 < 300s |
| `import.rows.processed` | Counter | Rows processed | — |
| `import.rows.failed` | Counter | Rows failed | < 1% |
| `import.bytes.received` | Counter | Upload size | — |
| `import.errors.by_type` | Counter | Error categorization | — |

## Instrumentation

### OpenTelemetry Setup
```python
from opentelemetry import metrics
from opentelemetry.exporter.otlp import OTLPMetricExporter
from opentelemetry.sdk.metrics import MeterProvider

meter = metrics.get_meter("import-service")

job_counter = meter.create_counter(
    name="import.jobs.total",
    description="Total number of import jobs",
    unit="1",
)

active_jobs = meter.create_up_down_counter(
    name="import.jobs.active",
    description="Currently active import jobs",
    unit="1",
)

job_duration = meter.create_histogram(
    name="import.jobs.duration_seconds",
    description="Import job duration",
    unit="s",
)

rows_processed = meter.create_counter(
    name="import.rows.processed",
    description="Rows processed during import",
    unit="1",
)

rows_failed = meter.create_counter(
    name="import.rows.failed",
    description="Rows that failed validation or processing",
    unit="1",
)
```

### Instrumenting the Import Pipeline
```python
class MonitoredImportService:
    def __init__(self, import_service):
        self.import_service = import_service

    async def process_import(self, job_id: str):
        start_time = time.time()
        job_counter.add(1, {"job_type": "import"})
        active_jobs.add(1)

        try:
            async for event in self.import_service.process(job_id):
                if event.type == "row_processed":
                    rows_processed.add(1, {"status": event.status.value})
                elif event.type == "row_failed":
                    rows_failed.add(1, {
                        "error_type": event.error.code,
                        "stage": event.stage,
                    })
        except Exception as e:
            rows_failed.add(1, {"error_type": "fatal", "stage": "overall"})
            raise
        finally:
            duration = time.time() - start_time
            job_duration.record(duration, {"status": "completed"})
            active_jobs.add(-1)
```

## Progress Tracking

### Job Progress Model
```python
@dataclass
class ImportProgress:
    job_id: str
    total_rows: int
    processed_rows: int
    failed_rows: int
    current_stage: str
    stage_progress: float  # 0.0 to 1.0
    eta_seconds: float
    errors: list[ImportError]
```

### Real-Time Progress via WebSocket
```python
from fastapi import WebSocket, WebSocketDisconnect

class ProgressBroadcaster:
    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        self.connections.setdefault(job_id, []).append(websocket)

    async def broadcast_progress(self, job_id: str, progress: ImportProgress):
        if job_id not in self.connections:
            return
        message = {
            "type": "progress",
            "job_id": job_id,
            "total_rows": progress.total_rows,
            "processed_rows": progress.processed_rows,
            "failed_rows": progress.failed_rows,
            "percentage": (
                progress.processed_rows / progress.total_rows * 100
                if progress.total_rows > 0 else 0
            ),
            "current_stage": progress.current_stage,
            "stage_progress": progress.stage_progress,
            "eta_seconds": progress.eta_seconds,
        }
        stale = []
        for ws in self.connections.get(job_id, []):
            try:
                await ws.send_json(message)
            except WebSocketDisconnect:
                stale.append(ws)
        for ws in stale:
            self.connections[job_id].remove(ws)
```

## Dashboard

### Prometheus Rules
```yaml
groups:
  - name: import_alerts
    rules:
      - alert: ImportJobFailing
        expr: rate(import_rows_failed_total[5m]) / rate(import_rows_processed_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Import job failure rate exceeds 1%"

      - alert: ImportJobStuck
        expr: time() - import_job_start_timestamp > 3600
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Import job running for over 1 hour"

      - alert: ImportQueueBacklog
        expr: import_jobs_queued > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Import queue backlog exceeds 100 jobs"
```

### Grafana Dashboard JSON
```json
{
  "title": "Import Pipeline Dashboard",
  "panels": [
    {
      "title": "Active Imports",
      "type": "stat",
      "targets": [{
        "expr": "sum(import_jobs_active)",
        "legendFormat": "Active"
      }]
    },
    {
      "title": "Import Throughput",
      "type": "graph",
      "targets": [{
        "expr": "rate(import_rows_processed_total[5m])",
        "legendFormat": "Rows/s"
      }]
    },
    {
      "title": "Error Rate",
      "type": "graph",
      "targets": [{
        "expr": "rate(import_rows_failed_total[5m]) / rate(import_rows_processed_total[5m])",
        "legendFormat": "Error %"
      }]
    },
    {
      "title": "Job Duration P50/P95/P99",
      "type": "graph",
      "targets": [
        {"expr": "histogram_quantile(0.5, rate(import_jobs_duration_seconds_bucket[1h]))"},
        {"expr": "histogram_quantile(0.95, rate(import_jobs_duration_seconds_bucket[1h]))"},
        {"expr": "histogram_quantile(0.99, rate(import_jobs_duration_seconds_bucket[1h]))"}
      ]
    }
  ]
}
```

## Alerting

### Alert Rules
```yaml
alerts:
  high_failure_rate:
    condition: failure_rate > 0.05 for 5m
    severity: critical
    channels: [pagerduty, slack-critical]

  import_stuck:
    condition: duration > 1h
    severity: warning
    channels: [slack-imports]

  queue_backlog:
    condition: queued_jobs > 50 for 10m
    severity: warning
    channels: [slack-imports]

  disk_space:
    condition: upload_disk_usage > 85%
    severity: warning
    channels: [slack-infra]
```

### Notification Templates
```python
class ImportNotifier:
    def __init__(self, slack_client, email_client):
        self.slack = slack_client
        self.email = email_client

    async def notify_completion(self, job: ImportJob):
        await self.slack.send_message(
            channel="#imports",
            text=(
                f"✅ Import completed\n"
                f"Job: `{job.id}`\n"
                f"File: `{job.filename}`\n"
                f"Rows: {job.processed_rows} processed, {job.failed_rows} failed\n"
                f"Duration: {job.duration_seconds:.1f}s"
            ),
        )

    async def notify_failure(self, job: ImportJob, error: Exception):
        await self.slack.send_message(
            channel="#imports-critical",
            text=(
                f"❌ Import failed\n"
                f"Job: `{job.id}`\n"
                f"Error: `{error}`\n"
                f"Please investigate: {self.get_job_url(job.id)}"
            ),
        )
```

## Audit Logging

### Import Audit Trail
```python
class ImportAuditLogger:
    def __init__(self, audit_store):
        self.audit_store = audit_store

    async def log_import_event(self, event: ImportEvent):
        await self.audit_store.record(
            action="import",
            resource_type="import_job",
            resource_id=event.job_id,
            actor=event.actor_id,
            details={
                "filename": event.filename,
                "file_size": event.file_size,
                "row_count": event.row_count,
                "format": event.format,
                "result": event.result,
                "error_count": event.error_count,
                "duration_ms": event.duration_ms,
            },
            timestamp=event.timestamp,
        )
```

## Error Analysis

### Error Categorization Dashboard
```sql
SELECT
    error_code,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM import_errors
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY error_code
ORDER BY count DESC;
```

### Trend Analysis
```python
async def analyze_import_trends(error_store):
    weekly_stats = await error_store.get_weekly_stats()
    for stat in weekly_stats:
        if stat.failure_rate > 0.05:
            print(f"Week {stat.week}: Failure rate {stat.failure_rate:.2%}")
            print(f"Top errors:")
            for error in stat.top_errors[:3]:
                print(f"  - {error.code}: {error.count} occurrences")
```

## Job History

### Job History Table
```sql
CREATE TABLE import_job_history (
    id UUID PRIMARY KEY,
    filename TEXT NOT NULL,
    format VARCHAR(20) NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_by UUID NOT NULL,
    organization_id UUID NOT NULL
);

CREATE INDEX idx_import_history_org ON import_job_history(organization_id, started_at DESC);
CREATE INDEX idx_import_history_status ON import_job_history(status);
```

### History Query Service
```python
class ImportHistoryService:
    async def get_recent_imports(
        self, org_id: str, limit: int = 20, offset: int = 0
    ) -> list[ImportJob]:
        return await self.db.fetch_all(
            """
            SELECT * FROM import_job_history
            WHERE organization_id = $1
            ORDER BY started_at DESC
            LIMIT $2 OFFSET $3
            """,
            org_id, limit, offset,
        )

    async def get_import_summary(
        self, org_id: str, days: int = 30
    ) -> dict:
        return await self.db.fetch_one(
            """
            SELECT
                COUNT(*) as total_imports,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                AVG(duration_seconds) as avg_duration,
                SUM(processed_rows) as total_rows
            FROM import_job_history
            WHERE organization_id = $1
              AND started_at >= NOW() - INTERVAL '1 day' * $2
            """,
            org_id, days,
        )
```

## Key Points
- Instrument import pipeline with OpenTelemetry metrics for real-time visibility
- Track job count, active jobs, duration, row throughput, error rate
- Broadcast progress via WebSocket for live UI updates
- Grafana dashboards visualize import pipeline health
- Alert on failure rate spikes, stuck jobs, and queue backlog
- Audit logging provides compliance trail for all import operations
- Error categorization and trend analysis identify systemic issues
- Job history table enables retrospective analysis and reporting
