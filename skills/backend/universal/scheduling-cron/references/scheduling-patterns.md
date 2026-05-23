# Scheduling Patterns

## Cron Expressions

Standard format: `minute hour day-of-month month day-of-week`

```
# ┌───── minute (0-59)
# │ ┌───── hour (0-23)
# │ │ ┌───── day of month (1-31)
# │ │ │ ┌───── month (1-12)
# │ │ │ │ ┌───── day of week (0-6)
# * * * * *
```

| Expression | Meaning |
|------------|---------|
| `0 0 * * *` | Daily at midnight |
| `*/15 * * * *` | Every 15 minutes |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `0 0 1 * *` | First of every month |

## Scheduling in Code

```python
from croniter import croniter
from datetime import datetime

base = datetime.now()
iter = croniter("0 9 * * 1-5", base)
next_run = iter.get_next(datetime)
```

## Job Persistence

Store scheduled jobs in a database table:

```sql
CREATE TABLE scheduled_jobs (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    cron_expr TEXT NOT NULL,
    handler TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ
);
```

## Retry and Error Handling

- Configure max retries per job.
- Exponential backoff between retries.
- Dead-letter after exhausting retries.
- Alert on repeated failures.

## Observability

- Record execution duration per job.
- Expose metrics (`job_duration_seconds`, `job_failures_total`).
- Log start and completion with job ID.

## Timezone Handling

See `distributed-cron.md` for timezone considerations.
