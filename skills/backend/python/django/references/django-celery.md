# Django Celery Integration

## Celery Configuration

### Celery App Setup
```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("project_name")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

### __init__.py
```python
# config/__init__.py
from .celery import app as celery_app

__all__ = ("celery_app",)
```

### Settings
```python
# config/settings/celery.py
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/1")

CELERY_TIMEZONE = "UTC"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60

CELERY_TASK_DEFAULT_QUEUE = "default"
CELERY_TASK_DEFAULT_RATE_LIMIT = "100/m"

CELERY_TASK_ROUTES = {
    "apps.orders.tasks.*": {"queue": "orders"},
    "apps.notifications.tasks.*": {"queue": "notifications"},
    "apps.reports.tasks.*": {"queue": "reports"},
}

CELERY_BEAT_SCHEDULE = {
    "cleanup-expired-sessions": {
        "task": "apps.users.tasks.cleanup_expired_sessions",
        "schedule": 3600,
    },
    "send-daily-digest": {
        "task": "apps.notifications.tasks.send_daily_digest",
        "schedule": crontab(hour=8, minute=0),
    },
    "generate-hourly-report": {
        "task": "apps.reports.tasks.generate_hourly_report",
        "schedule": crontab(minute=0),
    },
}
```

## Task Definitions

### Basic Tasks
```python
# apps/orders/tasks.py
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_order_confirmation(order_id: int):
    from apps.orders.models import Order
    from apps.notifications.services import EmailService

    try:
        order = Order.objects.get(id=order_id)
        EmailService().send_order_confirmation(order)
        logger.info(f"Confirmation sent for order {order_id}")
        return {"status": "success", "order_id": order_id}
    except Order.DoesNotExist:
        logger.error(f"Order {order_id} not found")
        return {"status": "error", "error": "Order not found"}
```

### Task with Retry
```python
# apps/notifications/tasks.py
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError

@shared_task(
    bind=True,
    max_retries=5,
    default_retry_delay=60,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def send_email_notification(self, user_id: int, template: str, context: dict):
    from apps.users.models import User
    from apps.notifications.services import EmailService

    try:
        user = User.objects.get(id=user_id)
        EmailService().send_template(user.email, template, context)
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found, not retrying")
        return
    except Exception as exc:
        logger.warning(f"Failed to send email to user {user_id}: {exc}")
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for email to user {user_id}")
```

### Task Groups and Chains
```python
# apps/reports/tasks.py
from celery import shared_task, group, chain, chord

@shared_task
def fetch_data(report_id: int, source: str) -> dict:
    """Fetch data from a single source."""
    return {"source": source, "data": "..."}

@shared_task
def merge_results(results: list) -> dict:
    """Merge multiple data sources."""
    merged = {}
    for result in results:
        merged[result["source"]] = result["data"]
    return merged

@shared_task
def generate_pdf(report_data: dict) -> str:
    """Generate PDF from merged data."""
    return "/path/to/report.pdf"

@shared_task
def notify_completion(report_id: int, pdf_path: str):
    """Notify user that report is ready."""
    pass

# Usage
def generate_report(report_id: int):
    sources = ["sales", "inventory", "customers"]

    workflow = chain(
        group(fetch_data.s(report_id, source) for source in sources),
        merge_results.s(),
        generate_pdf.s(),
        notify_completion.s(report_id),
    )

    workflow()
```

## Periodic Tasks (Celery Beat)

### Scheduled Tasks
```python
# apps/maintenance/tasks.py
from celery import shared_task

@shared_task
def cleanup_expired_sessions():
    from django.contrib.sessions.models import Session
    deleted_count = Session.objects.filter(
        expire_date__lt=timezone.now()
    ).delete()[0]
    logger.info(f"Cleaned up {deleted_count} expired sessions")
    return deleted_count

@shared_task
def generate_daily_analytics():
    from apps.analytics.services import AnalyticsService
    AnalyticsService().generate_daily_report()
    logger.info("Daily analytics generated")
```

### Dynamic Schedule
```python
# apps/schedules/task_scheduler.py
from celery import current_app
from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule

class TaskScheduler:
    def schedule_report(self, report_id: int, cron: str):
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=cron.split(" ")[0],
            hour=cron.split(" ")[1],
            day_of_month=cron.split(" ")[2],
            month_of_year=cron.split(" ")[3],
            day_of_week=cron.split(" ")[4],
        )

        PeriodicTask.objects.create(
            name=f"report-{report_id}",
            task="apps.reports.tasks.generate_report",
            args=f"[{report_id}]",
            crontab=schedule,
        )

    def remove_schedule(self, report_id: int):
        PeriodicTask.objects.filter(
            name=f"report-{report_id}"
        ).delete()
```

## Result Handling

### Async Result
```python
from celery.result import AsyncResult

def check_task_status(task_id: str) -> dict:
    result = AsyncResult(task_id)

    response = {
        "task_id": task_id,
        "status": result.status,
        "ready": result.ready(),
    }

    if result.ready():
        if result.successful():
            response["result"] = result.get()
        else:
            response["error"] = str(result.result)

    return response
```

### Task Progress
```python
from celery import shared_task
from celery.result import allow_join_result

@shared_task(bind=True)
def process_large_file(self, file_path: str):
    total = get_total_lines(file_path)
    processed = 0

    with open(file_path) as f:
        for line in f:
            process_line(line)
            processed += 1

            if processed % 1000 == 0:
                self.update_state(
                    state="PROGRESS",
                    meta={
                        "current": processed,
                        "total": total,
                        "percent": int(processed / total * 100),
                    },
                )

    return {"processed": processed, "total": total}

# Check progress
result = AsyncResult(task_id)
if result.state == "PROGRESS":
    progress = result.result  # {"current": 5000, "total": 10000, "percent": 50}
```

## Monitoring

### Flower Setup
```python
# docker-compose.yml
flower:
  image: mher/flower:2.0
  command: ["celery", "--broker=redis://redis:6379/0", "flower", "--port=5555"]
  ports:
    - "5555:5555"
  depends_on:
    - redis
```

### Custom Monitoring
```python
# apps/monitoring/task_monitor.py
from django.core.cache import cache
from celery import current_app
from celery.events.state import State

class TaskMonitor:
    def get_queue_lengths(self) -> dict:
        queues = {}
        with current_app.connection() as conn:
            for queue in ["default", "orders", "notifications", "reports"]:
                with conn.channel() as channel:
                    _, count, _ = channel.queue_declare(
                        queue=queue, passive=True
                    )
                    queues[queue] = count
        return queues

    def get_worker_stats(self) -> dict:
        state = State()
        with current_app.connection() as conn:
            recv = app.events.Receiver(conn, handlers={
                "*": state.event,
            })
            recv.capture(limit=None, timeout=1)

        return {
            "workers": len(state.workers),
            "active_tasks": len(state.tasks_by_state("ACTIVE")),
            "scheduled_tasks": len(state.tasks_by_state("SCHEDULED")),
            "reserved_tasks": len(state.tasks_by_state("RESERVED")),
        }
```

## Testing

### Task Testing
```python
# apps/orders/tests/test_tasks.py
from unittest.mock import patch, Mock
from django.test import TestCase
from apps.orders.tasks import send_order_confirmation

class SendOrderConfirmationTaskTest(TestCase):
    @patch("apps.orders.tasks.EmailService")
    def test_send_order_confirmation_success(self, mock_email_service):
        order = OrderFactory()

        result = send_order_confirmation.delay(order.id)

        self.assertEqual(result.get(timeout=5)["status"], "success")
        mock_email_service.return_value.send_order_confirmation.assert_called_once_with(order)

    @patch("apps.orders.tasks.EmailService")
    def test_send_order_confirmation_not_found(self, mock_email_service):
        result = send_order_confirmation.delay(99999)

        self.assertEqual(
            result.get(timeout=5)["status"],
            "error",
        )
        mock_email_service.assert_not_called()
```

## Key Points
- Celery app is configured via Django settings with CELERY_ namespace
- @shared_task decorator makes tasks available to all registered apps
- Task retry with backoff handles transient failures gracefully
- Task routing separates workloads into dedicated queues
- Celery Beat schedules periodic tasks via database or schedule configuration
- Task groups, chains, and chords enable complex workflow orchestration
- AsyncResult provides task status checking and result retrieval
- Task progress reporting enables long-running task tracking
- Flower provides web-based monitoring of workers and tasks
- Testing tasks requires mocking external services for isolation
