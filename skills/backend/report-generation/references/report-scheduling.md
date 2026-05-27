# Report Scheduling

## Overview
Report scheduling enables automated generation and delivery of reports at predefined intervals or triggered by specific events. A robust scheduling system reduces manual effort, ensures stakeholders receive timely data, and supports business operations with consistent reporting cadences.

## Scheduling Models

### Time-Based Scheduling
Time-based schedules run reports at fixed calendar intervals:

```
Cron Expressions:
  Every hour:     0 * * * *
  Daily at 8 AM:  0 8 * * *
  Weekly Monday:  0 8 * * 1
  Monthly 1st:    0 8 1 * *
  Quarter-end:    0 8 L 3,6,9,12 *
```

```python
from datetime import datetime, timedelta
from croniter import croniter

class TimeBasedSchedule:
    def __init__(self, cron_expression: str):
        self.cron = cron_expression
        self.iter = croniter(cron_expression, datetime.utcnow())

    def next_run(self) -> datetime:
        return self.iter.get_next(datetime)

    def should_run(self, last_run: datetime | None) -> bool:
        now = datetime.utcnow()
        next_run = self.iter.get_next(datetime)
        return now >= next_run
```

### Event-Driven Scheduling
Trigger report generation based on system events or data conditions:

```python
class EventDrivenSchedule:
    def __init__(self, event_type: str, condition: callable):
        self.event_type = event_type
        self.condition = condition

    def evaluate(self, event: dict) -> bool:
        if event.get("type") != self.event_type:
            return False
        return self.condition(event.get("payload", {}))

threshold_trigger = EventDrivenSchedule(
    event_type="inventory_update",
    condition=lambda p: p.get("stock_level", 0) < p.get("reorder_point", 100)
)
```

### Hybrid Scheduling
Combining time and event triggers for complex scenarios:

```python
class HybridSchedule:
    def __init__(self, time_schedule: TimeBasedSchedule,
                 event_triggers: list[EventDrivenSchedule],
                 cooldown_minutes: int = 60):
        self.time_schedule = time_schedule
        self.event_triggers = event_triggers
        self.cooldown = timedelta(minutes=cooldown_minutes)
        self.last_triggered: datetime | None = None

    def should_generate(self, event: dict | None = None) -> bool:
        now = datetime.utcnow()
        if self.last_triggered and (now - self.last_triggered) < self.cooldown:
            return False
        if self.time_schedule.should_run(self.last_triggered):
            self.last_triggered = now
            return True
        if event and any(t.evaluate(event) for t in self.event_triggers):
            self.last_triggered = now
            return True
        return False
```

## Scheduling Architecture

### Core Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Schedule Store  │────▶│   Scheduler      │────▶│  Report Runner   │
│  (DB/Redis)      │     │   (Cron/Worker)  │     │  (Executor)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Notification    │     │  Output Store   │
                        │  (Email/Slack)   │     │  (S3/GCS/Share) │
                        └──────────────────┘     └─────────────────┘
```

### Schedule Store Schema

```sql
CREATE TABLE report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report_definitions(id),
    name VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('cron', 'event', 'hybrid')),
    cron_expression VARCHAR(100),
    event_type VARCHAR(100),
    event_condition JSONB,
    parameters JSONB DEFAULT '{}',
    output_format VARCHAR(20) NOT NULL DEFAULT 'pdf',
    delivery_config JSONB NOT NULL DEFAULT '{"email":[],"slack":[],"webhook":[]}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedules_active ON report_schedules(is_active, next_run_at);
CREATE INDEX idx_schedules_report ON report_schedules(report_id);
```

## Delivery Mechanisms

### Email Delivery

```python
class EmailDelivery:
    def __init__(self, smtp_config: dict):
        self.config = smtp_config

    async def deliver(self, report: ReportResult,
                      recipients: list[str]) -> DeliveryResult:
        message = MIMEMultipart()
        message["Subject"] = f"Report: {report.name}"
        message["From"] = self.config["from_address"]
        message["To"] = ", ".join(recipients)

        message.attach(MIMEText(self._build_body(report), "html"))

        with open(report.file_path, "rb") as f:
            attachment = MIMEBase(
                "application", "octet-stream"
            )
            attachment.set_payload(f.read())
            encoders.encode_base64(attachment)
            attachment.add_header(
                "Content-Disposition",
                f"attachment; filename={report.filename}"
            )
            message.attach(attachment)

        async with smtplib.SMTP_SSL(
            self.config["host"], self.config["port"]
        ) as server:
            server.login(
                self.config["username"],
                self.config["password"]
            )
            await server.send_message(message)

        return DeliveryResult(
            status="sent",
            recipients=recipients,
            timestamp=datetime.utcnow()
        )

    def _build_body(self, report: ReportResult) -> str:
        return f"""
        <html>
        <body>
            <h2>{report.name}</h2>
            <p>Generated: {report.generated_at}</p>
            <p>Period: {report.period_start} to {report.period_end}</p>
            <p>This report is attached automatically.</p>
        </body>
        </html>
        """
```

### Slack Delivery

```python
class SlackDelivery:
    def __init__(self, webhook_url: str, bot_token: str):
        self.webhook_url = webhook_url
        self.bot_token = bot_token

    async def deliver(self, report: ReportResult,
                      channels: list[str]) -> DeliveryResult:
        summary = self._extract_summary(report)
        blocks = [
            {"type": "header", "text": {"type": "plain_text", "text": report.name}},
            {"type": "section", "text": {"type": "mrkdwn", "text": summary}},
            {"type": "divider"}
        ]

        for channel in channels:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"https://slack.com/api/files.upload",
                    headers={"Authorization": f"Bearer {self.bot_token}"},
                    data={
                        "channels": channel,
                        "file": open(report.file_path, "rb"),
                        "filename": report.filename,
                        "title": report.name,
                        "initial_comment": f"*{report.name}* - {report.generated_at}"
                    }
                ) as resp:
                    result = await resp.json()
                    if not result.get("ok"):
                        raise SlackDeliveryError(result.get("error"))

        return DeliveryResult(status="sent", channels=channels, timestamp=datetime.utcnow())

    def _extract_summary(self, report: ReportResult) -> str:
        return f"*Generated:* {report.generated_at}\n*Period:* {report.period_start} → {report.period_end}\n*Records:* {report.record_count:,}"
```

## Scheduler Implementation

### Distributed Scheduler with Celery

```python
from celery import Celery
from celery.schedules import crontab

app = Celery("report_scheduler", broker="redis://localhost:6379/0")

app.conf.beat_schedule = {
    "daily-sales-report": {
        "task": "reports.tasks.generate_report",
        "schedule": crontab(hour=8, minute=0),
        "args": ("sales_report", {"date": "yesterday"})
    },
    "weekly-analytics": {
        "task": "reports.tasks.generate_report",
        "schedule": crontab(hour=9, minute=0, day_of_week=1),
        "args": ("weekly_analytics", {"week_offset": 1})
    },
    "monthly-financial": {
        "task": "reports.tasks.generate_report",
        "schedule": crontab(hour=7, minute=0, day_of_month=1),
        "args": ("financial_summary", {"month_offset": 1})
    }
}

@app.task(bind=True, max_retries=3)
def generate_report(self, report_name: str, params: dict):
    try:
        report_def = get_report_definition(report_name)
        runner = ReportRunner(report_def)
        result = runner.run(params)
        schedule_id = self.request.properties.get("schedule_id")
        if schedule_id:
            update_schedule_status(schedule_id, "success", result)
        return result
    except Exception as exc:
        self.retry(countdown=60 * (2 ** self.request.retries))
        raise
```

### In-Process Scheduler

```python
import asyncio
import logging

class InProcessScheduler:
    def __init__(self):
        self.schedules: dict[str, ReportSchedule] = {}
        self.tasks: dict[str, asyncio.Task] = {}
        self._running = False

    def add_schedule(self, schedule: ReportSchedule):
        self.schedules[schedule.id] = schedule
        if self._running:
            self.tasks[schedule.id] = asyncio.create_task(
                self._run_loop(schedule)
            )

    def remove_schedule(self, schedule_id: str):
        if schedule_id in self.tasks:
            self.tasks[schedule_id].cancel()
            del self.tasks[schedule_id]
        self.schedules.pop(schedule_id, None)

    async def start(self):
        self._running = True
        for sid, schedule in self.schedules.items():
            if schedule.is_active:
                self.tasks[sid] = asyncio.create_task(
                    self._run_loop(schedule)
                )

    async def stop(self):
        self._running = False
        for task in self.tasks.values():
            task.cancel()
        await asyncio.gather(*self.tasks.values(), return_exceptions=True)
        self.tasks.clear()

    async def _run_loop(self, schedule: ReportSchedule):
        while self._running:
            try:
                now = datetime.utcnow()
                if schedule.next_run_at and now >= schedule.next_run_at:
                    await self._execute(schedule)
                    schedule.last_run_at = now
                    schedule.next_run_at = schedule.compute_next_run()
                    persist_schedule(schedule)
                await asyncio.sleep(30)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Schedule {schedule.id} error: {e}")
                await asyncio.sleep(60)

    async def _execute(self, schedule: ReportSchedule):
        logging.info(f"Executing schedule: {schedule.name}")
        result = await run_report(schedule.report_id, schedule.parameters)
        await deliver_report(result, schedule.delivery_config)
        return result
```

## Monitoring and Observability

### Execution Tracking

```sql
CREATE TABLE schedule_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES report_schedules(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending','running','success','failed','cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    output_size_bytes BIGINT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB
);

CREATE INDEX idx_executions_schedule ON schedule_executions(schedule_id, started_at DESC);
```

### Health Checks

```python
class SchedulerHealth:
    def __init__(self, scheduler: InProcessScheduler):
        self.scheduler = scheduler

    async def check(self) -> dict:
        results = {}
        for sid, schedule in self.scheduler.schedules.items():
            status = "healthy"
            issues = []

            if not schedule.is_active:
                status = "inactive"

            last = self._get_last_execution(sid)
            if last and last.status == "failed":
                issues.append(f"Last execution failed: {last.error_message}")

            if schedule.next_run_at:
                delay = (datetime.utcnow() - schedule.next_run_at).total_seconds()
                if delay > 300:
                    issues.append(f"Overdue by {delay:.0f}s")
                    status = "delayed"

            results[sid] = {
                "name": schedule.name,
                "status": status,
                "issues": issues,
                "last_run": schedule.last_run_at.isoformat() if schedule.last_run_at else None,
                "next_run": schedule.next_run_at.isoformat() if schedule.next_run_at else None
            }

        return results

    def _get_last_execution(self, schedule_id: str) -> dict | None:
        result = db.execute("""
            SELECT * FROM schedule_executions
            WHERE schedule_id = %s
            ORDER BY started_at DESC LIMIT 1
        """, (schedule_id,))
        return result.fetchone()
```

## Retry and Failure Handling

```python
class RetryPolicy:
    def __init__(self, max_retries: int = 3,
                 base_delay: int = 60,
                 max_delay: int = 3600,
                 exponential_backoff: bool = True):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_backoff = exponential_backoff

    def get_delay(self, attempt: int) -> int:
        if not self.exponential_backoff:
            return self.base_delay
        delay = self.base_delay * (2 ** attempt)
        return min(delay, self.max_delay)

    def should_retry(self, error: Exception, attempt: int) -> bool:
        if attempt >= self.max_retries:
            return False
        non_retriable = (
            PermissionError, FileNotFoundError,
            InvalidReportDefinition, QuotaExceededError
        )
        if isinstance(error, non_retriable):
            return False
        return True

class SchedulerExecutor:
    def __init__(self, retry_policy: RetryPolicy):
        self.retry_policy = retry_policy

    async def execute_with_retry(self, schedule: ReportSchedule) -> ExecutionResult:
        attempt = 0
        while True:
            try:
                result = await self._run_report_task(schedule)
                return ExecutionResult(status="success", result=result)
            except Exception as e:
                attempt += 1
                if self.retry_policy.should_retry(e, attempt):
                    delay = self.retry_policy.get_delay(attempt)
                    logging.warning(
                        f"Schedule {schedule.id} attempt {attempt} "
                        f"failed: {e}. Retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    await self._notify_retry(schedule, attempt, delay)
                else:
                    return ExecutionResult(
                        status="failed",
                        error=str(e),
                        attempts=attempt
                    )

    async def _notify_retry(self, schedule: ReportSchedule,
                            attempt: int, delay: int):
        if attempt == 1:
            notification = {
                "type": "retry_notification",
                "schedule_id": schedule.id,
                "attempt": attempt,
                "delay": delay,
                "scheduled_at": schedule.next_run_at.isoformat()
            }
            await publish_notification(notification)
```

## Deadline and Timeout Management

```python
class DeadlineManager:
    def __init__(self, default_timeout: int = 300):
        self.default_timeout = default_timeout
        self.running: dict[str, datetime] = {}

    async def run_with_deadline(self, schedule: ReportSchedule,
                                coro: callable) -> Any:
        timeout = schedule.parameters.get("timeout", self.default_timeout)
        execution_id = str(uuid.uuid4())
        self.running[execution_id] = datetime.utcnow()

        try:
            result = await asyncio.wait_for(coro(), timeout=timeout)
            return result
        except asyncio.TimeoutError:
            raise ReportTimeoutError(
                f"Schedule {schedule.id} timed out after {timeout}s"
            )
        finally:
            self.running.pop(execution_id, None)

    async def cancel_stale_schedules(self, max_runtime: int = 600):
        now = datetime.utcnow()
        for eid, started in list(self.running.items()):
            elapsed = (now - started).total_seconds()
            if elapsed > max_runtime:
                logging.warning(
                    f"Cancelling stale execution {eid} "
                    f"running for {elapsed:.0f}s"
                )
                self.running.pop(eid, None)
```

## Calendar and Timezone Handling

```python
from zoneinfo import ZoneInfo
import holidays

class CalendarService:
    def __init__(self):
        self.business_calendars: dict[str, list] = {}

    def register_country(self, country_code: str):
        self.business_calendars[country_code] = holidays.country_holidays(
            country_code
        )

    def is_business_day(self, date: datetime, country: str = "US") -> bool:
        if date.weekday() >= 5:
            return False
        cal = self.business_calendars.get(country, holidays.US())
        return date not in cal

    def next_business_day(self, date: datetime, country: str = "US") -> datetime:
        next_date = date + timedelta(days=1)
        while not self.is_business_day(next_date, country):
            next_date += timedelta(days=1)
        return next_date

    def adjust_schedule_for_timezone(self, schedule: ReportSchedule,
                                     target_timezone: str) -> ReportSchedule:
        tz = ZoneInfo(target_timezone)
        now = datetime.now(tz)
        iter = croniter(schedule.cron_expression, now)
        schedule.next_run_at = iter.get_next(datetime)
        schedule.timezone = target_timezone
        return schedule
```

## Rate Limiting and Throttling

```python
class RateLimiter:
    def __init__(self, max_concurrent: int = 5,
                 rate_per_minute: int = 10):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.rate_limit = rate_per_minute
        self.tokens = rate_per_minute
        self.last_refill = datetime.utcnow()

    async def acquire(self):
        await self._refill_tokens()
        async with self.semaphore:
            while self.tokens <= 0:
                await asyncio.sleep(1)
                await self._refill_tokens()
            self.tokens -= 1
            return True

    async def _refill_tokens(self):
        now = datetime.utcnow()
        elapsed = (now - self.last_refill).total_seconds()
        refill = int(elapsed / 60 * self.rate_limit)
        if refill > 0:
            self.tokens = min(self.tokens + refill, self.rate_limit)
            self.last_refill = now
```

## Dependencies Between Schedules

```python
class DependencyGraph:
    def __init__(self):
        self.graph: dict[str, set[str]] = {}

    def add_dependency(self, schedule_id: str, depends_on: str):
        if schedule_id not in self.graph:
            self.graph[schedule_id] = set()
        self.graph[schedule_id].add(depends_on)

    def get_ready_schedules(self, completed: set[str]) -> list[str]:
        ready = []
        for sid, deps in self.graph.items():
            if sid not in completed and deps.issubset(completed):
                ready.append(sid)
        return ready

    def get_execution_order(self) -> list[list[str]]:
        visited = set()
        order = []
        remaining = set(self.graph.keys())

        while remaining:
            current_level = [
                n for n in remaining
                if all(d in visited for d in self.graph.get(n, set()))
                or n not in self.graph
            ]
            if not current_level:
                raise CircularDependencyError(
                    "Circular dependency detected"
                )
            order.append(current_level)
            visited.update(current_level)
            remaining -= set(current_level)

        return order
```

## Audit Logging

```python
class ScheduleAuditLogger:
    def __init__(self, log_table: str = "schedule_audit_log"):
        self.log_table = log_table

    async def log_event(self, event: AuditEvent):
        query = f"""
            INSERT INTO {self.log_table}
                (schedule_id, event_type, details, ip_address, actor)
            VALUES (%s, %s, %s, %s, %s)
        """
        await db.execute(query, (
            event.schedule_id,
            event.event_type,
            json.dumps(event.details),
            event.ip_address,
            event.actor
        ))

    async def get_history(self, schedule_id: str,
                          limit: int = 50) -> list[AuditEvent]:
        query = f"""
            SELECT * FROM {self.log_table}
            WHERE schedule_id = %s
            ORDER BY created_at DESC LIMIT %s
        """
        rows = await db.fetch(query, (schedule_id, limit))
        return [AuditEvent(**row) for row in rows]

audit_logger = ScheduleAuditLogger()

async def pause_schedule(schedule_id: str, actor: str):
    schedule = get_schedule(schedule_id)
    schedule.is_active = False
    persist_schedule(schedule)
    await audit_logger.log_event(AuditEvent(
        schedule_id=schedule_id,
        event_type="schedule_paused",
        details={"reason": "manual pause"},
        actor=actor
    ))
```

## Key Points

- Report scheduling integrates time-based cron expressions, event-driven triggers, or hybrid approaches.
- A distributed scheduler (Celery/Redis) scales horizontally; an in-process scheduler suits single-server deployments.
- Delivery mechanisms include email with attachments, Slack with file upload and summary blocks, and webhooks.
- Retry policies should use exponential backoff and distinguish retriable from non-retriable errors.
- Calendar services must handle timezone conversions, business days, and holidays to avoid off-hours deliveries.
- Dependency graphs ensure reports execute in the correct order when downstream reports depend on upstream data.
- Rate limiting and concurrency controls prevent system overload during peak scheduling windows.
- Deadline management prevents runaway schedule executions from consuming resources indefinitely.
- Audit logging provides traceability for all schedule lifecycle events including creation, modification, pause, and failure.
