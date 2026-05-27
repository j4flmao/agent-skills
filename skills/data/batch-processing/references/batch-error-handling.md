# Batch Processing Error Handling

## Error Categories

Batch pipeline errors fall into distinct categories requiring different handling strategies.

### Error Classification

```python
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

class ErrorSeverity(Enum):
    RECOVERABLE = "recoverable"
    FATAL = "fatal"
    RETRYABLE = "retryable"
    SKIPPABLE = "skippable"

@dataclass
class PipelineError:
    stage: str
    record_id: str
    error_type: str
    message: str
    severity: ErrorSeverity
    timestamp: datetime
    retry_count: int = 0
```

### Retry Strategy

```python
import time
from functools import wraps

def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except RetryableError as e:
                    last_exception = e
                    if attempt < max_retries:
                        delay = min(
                            base_delay * (exponential_base ** attempt),
                            max_delay
                        )
                        jitter = random.uniform(0, delay * 0.1)
                        time.sleep(delay + jitter)
                except FatalError as e:
                    raise  # Don't retry fatal errors
            raise last_exception
        return wrapper
    return decorator
```

## Dead Letter Queue

### DLQ Implementation

```python
class DeadLetterQueue:
    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        self.failed_records: list[FailedRecord] = []

    def record_failure(
        self,
        record: dict,
        error: str,
        stage: str,
        exception_trace: str | None = None
    ):
        entry = FailedRecord(
            record_id=record.get("id", "unknown"),
            record_data=record,
            error_message=error,
            failed_stage=stage,
            failed_at=datetime.utcnow(),
            exception_trace=exception_trace,
            retry_count=0,
        )
        self.failed_records.append(entry)
        self._persist(entry)

    def _persist(self, entry: FailedRecord):
        path = f"{self.storage_path}/dlq/{entry.failed_at.strftime('%Y/%m/%d')}"
        os.makedirs(path, exist_ok=True)
        filename = f"{entry.failed_at.timestamp()}_{entry.record_id}.json"
        with open(f"{path}/{filename}", "w") as f:
            json.dump(asdict(entry), f, default=str)

    def replay(self, date: str = None):
        path = f"{self.storage_path}/dlq"
        if date:
            path = f"{path}/{date}"
        for root, _, files in os.walk(path):
            for file in sorted(files):
                with open(f"{root}/{file}") as f:
                    entry = json.load(f)
                yield entry
```

## Alerting

```python
class PipelineAlertManager:
    def __init__(self, alert_channels: list[AlertChannel]):
        self.channels = alert_channels

    def evaluate_and_alert(self, metrics: PipelineMetrics):
        if metrics.error_rate > 0.05:
            self.send_alert(
                severity="critical",
                message=f"Error rate {metrics.error_rate:.1%} exceeds 5% threshold",
                metrics=metrics
            )
        elif metrics.error_rate > 0.01:
            self.send_alert(
                severity="warning",
                message=f"Error rate {metrics.error_rate:.1%} exceeds 1% threshold",
                metrics=metrics
            )

        if metrics.backlog_size > 10000:
            self.send_alert(
                severity="warning",
                message=f"Backlog {metrics.backlog_size} exceeds 10K records",
                metrics=metrics
            )
```

## Key Points

- Classify errors by severity: retryable, recoverable, fatal, skippable
- Exponential backoff with jitter for retryable failures
- Dead Letter Queue stores failed records with full context
- DLQ replay enables reprocessing after fixes
- Alert on error rate thresholds and backlog growth
- Separate retryable from fatal errors to avoid infinite loops
- Log full exception context including stack traces
- Track retry counts to detect poisoned records
