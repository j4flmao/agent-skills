# Distributed Cron

## The Problem

In a multi-instance deployment, every instance fires the cron job simultaneously — causing duplicate work.

## Distributed Locking

Use Redis, PostgreSQL advisory locks, or ZooKeeper to ensure only one instance executes.

### Redis (Redlock)

```python
import redis, uuid

r = redis.Redis()
lock_key = "cron:daily-report"

def acquire_lock(ttl=60):
    token = str(uuid.uuid4())
    if r.set(lock_key, token, nx=True, ex=ttl):
        return token
    return None

def release_lock(token):
    # Lua script for atomic release
    script = """
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    end
    return 0
    """
    r.eval(script, 1, lock_key, token)
```

### PostgreSQL Advisory Lock

```sql
BEGIN;
SELECT pg_try_advisory_xact_lock(12345);
-- if true, run job
COMMIT;
```

## Timezone Handling

- Store cron expressions in UTC.
- Convert to user/tenant timezone only at display time.
- Use `tzdata` (IANA) database for conversions.

```python
from zoneinfo import ZoneInfo
from datetime import datetime

utc_time = datetime.now(ZoneInfo("UTC"))
local = utc_time.astimezone(ZoneInfo("America/New_York"))
```

## Handling Daylight Saving

- Avoid scheduling during "spring forward" gap (2–3 AM).
- Use cron expressions that are DST-safe (e.g., "at 9 AM" not "at 2:30 AM").
- Consider using daily intervals instead of absolute hours.

## Job Persistence

Store job state in a database so restarted instances pick up where they left off. Use `SKIP LOCKED` in PostgreSQL to claim jobs:

```sql
UPDATE scheduled_jobs
SET locked_by = $1, locked_at = NOW()
WHERE id = (
    SELECT id FROM scheduled_jobs
    WHERE next_run_at <= NOW() AND locked_by IS NULL
    ORDER BY next_run_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
);
```
