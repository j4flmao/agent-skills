# State Management in Python Backends

## Overview
Managing state effectively is critical for scalability, consistency, and performance. This covers Redis caching, SQLAlchemy session lifecycle, connection pooling, and distributed locking.

## 1. Stateless API Design
REST and GraphQL APIs should be fundamentally stateless. No client context should be stored in memory between requests.
- **Auth:** Use JWTs or session tokens mapped to a distributed cache (Redis).
- **Session:** Avoid sticky sessions.

## 2. Redis Caching Strategies
- **Cache-Aside:** Application checks cache; if miss, queries DB, updates cache, returns data.
- **Write-Through:** Application writes to cache, cache writes to DB synchronously.

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, db=0)

def get_user(user_id: int):
    # Cache-Aside
    cached = r.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
        
    user = db_fetch_user(user_id) # Hypothetical DB call
    r.setex(f"user:{user_id}", 3600, json.dumps(user)) # 1 hour TTL
    return user
```

## 3. SQLAlchemy Session Management
Manage sessions carefully to avoid connection leaks and stale data.

### Best Practices
- **Scope:** One session per request (Unit of Work).
- **FastAPI Dependency Injection:**

```python
from sqlalchemy.orm import Session
from database import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## 4. Connection Pooling (PgBouncer vs SQLAlchemy)
- **SQLAlchemy Pool:** Thread-local, connection pooling per application process (`QueuePool`).
- **PgBouncer:** External middleware that pools connections across multiple application instances, crucial for Postgres which forks a process per connection.
- **Rule:** Use PgBouncer in transaction pooling mode for high concurrency.

## 5. Distributed Locks
Prevent race conditions across multiple workers (e.g., Celery workers or API pods) using Redis.

### Redlock Algorithm Concept
1. Acquire lock with a unique ID and a TTL.
2. If acquired, execute critical section.
3. Release lock only if the unique ID matches.

```python
import redis
import time
import uuid

def acquire_lock(r: redis.Redis, lock_name: str, acquire_timeout: int = 10, lock_timeout: int = 10):
    identifier = str(uuid.uuid4())
    end = time.time() + acquire_timeout
    while time.time() < end:
        if r.set(lock_name, identifier, ex=lock_timeout, nx=True):
            return identifier
        time.sleep(0.01)
    return False

def release_lock(r: redis.Redis, lock_name: str, identifier: str):
    pipe = r.pipeline(True)
    while True:
        try:
            pipe.watch(lock_name)
            if pipe.get(lock_name).decode('utf-8') == identifier:
                pipe.multi()
                pipe.delete(lock_name)
                pipe.execute()
                return True
            pipe.unwatch()
            break
        except redis.exceptions.WatchError:
            pass
    return False
```

## 6. Celery State Tracking
Tracking asynchronous task state without overloading the broker.
- Use `rpc://` or a database backend for results.
- Ignore results for fire-and-forget tasks to save state I/O.
```python
@app.task(ignore_result=True)
def heavy_background_job():
    pass
```
