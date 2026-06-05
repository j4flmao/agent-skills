# Idempotency Patterns

## Fundamentals of Idempotent Tool Calls

Idempotency guarantees that executing the same tool call multiple times produces the same result and side effects as executing it once. In agent-tool systems, network failures, timeouts, and agent retries make idempotency critical for data integrity. Without it, a retried `file_write` might append content twice, or a retried `deploy_service` might create duplicate deployments.

```
Without Idempotency:                    With Idempotency:
                                        
Agent ──► Tool (timeout)                Agent ──► Tool (timeout)
Agent ──► Tool (retry)   → DUPLICATE!   Agent ──► Tool (retry)   → SAME RESULT
Agent ──► Tool (retry)   → TRIPLICATE!  Agent ──► Tool (retry)   → SAME RESULT
                                        
Result: 3 operations executed            Result: 1 operation executed, 2 cache hits
```

---

## Idempotency Key Design

### Key Generation Strategies

The idempotency key must be deterministic: the same logical operation must always produce the same key, regardless of how many times it's attempted.

```
Key = hash(agent_id + task_id + step_index + canonical_params)
                │          │         │              │
                │          │         │              └── Sorted, normalized parameters
                │          │         └── Position in pipeline (0, 1, 2...)
                │          └── Unique task identifier
                └── Agent instance identifier
```

### Python Idempotency Key Generator

```python
import hashlib
import json
from typing import Any, Optional
from dataclasses import dataclass


@dataclass
class IdempotencyContext:
    """Context for generating deterministic idempotency keys."""
    agent_id: str
    task_id: str
    step_index: int
    tool_name: str
    parameters: dict[str, Any]

    def generate_key(self) -> str:
        """
        Generate a deterministic idempotency key.
        
        The key is a SHA-256 hash of the canonical representation of
        the operation context. This ensures:
        - Same operation → same key (deterministic)
        - Different operations → different keys (collision-resistant)
        - Key length is fixed (64 hex chars)
        """
        # Canonicalize parameters by sorting keys recursively
        canonical_params = self._canonicalize(self.parameters)
        
        key_input = json.dumps({
            "agent_id": self.agent_id,
            "task_id": self.task_id,
            "step_index": self.step_index,
            "tool_name": self.tool_name,
            "params": canonical_params,
        }, sort_keys=True, separators=(",", ":"))
        
        hash_value = hashlib.sha256(key_input.encode("utf-8")).hexdigest()
        return f"idem_{hash_value[:32]}"

    def _canonicalize(self, obj: Any) -> Any:
        """Recursively sort dict keys for canonical representation."""
        if isinstance(obj, dict):
            return {k: self._canonicalize(v) for k, v in sorted(obj.items())}
        if isinstance(obj, list):
            return [self._canonicalize(item) for item in obj]
        return obj


# Usage
ctx = IdempotencyContext(
    agent_id="agent_42",
    task_id="task_99",
    step_index=3,
    tool_name="file_write",
    parameters={"path": "/app/config.yaml", "content": "key: value"}
)
key = ctx.generate_key()
print(f"Idempotency key: {key}")
# Same context always produces the same key
assert ctx.generate_key() == key
```

### TypeScript Key Generator

```typescript
import { createHash } from "crypto";

interface IdempotencyContext {
  agentId: string;
  taskId: string;
  stepIndex: number;
  toolName: string;
  parameters: Record<string, unknown>;
}

function generateIdempotencyKey(ctx: IdempotencyContext): string {
  const canonical = JSON.stringify(
    {
      agent_id: ctx.agentId,
      task_id: ctx.taskId,
      step_index: ctx.stepIndex,
      tool_name: ctx.toolName,
      params: sortKeysRecursively(ctx.parameters),
    },
    null,
    0
  );

  const hash = createHash("sha256").update(canonical).digest("hex");
  return `idem_${hash.substring(0, 32)}`;
}

function sortKeysRecursively(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(sortKeysRecursively);
  if (typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysRecursively((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}
```

---

## Deduplication Store

The deduplication store records which idempotency keys have been processed, their results, and their TTL. It must support atomic read-write operations.

### In-Memory Store (Development)

```python
import time
import threading
from typing import Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class IdempotencyStatus(Enum):
    PENDING = "pending"       # Key reserved, execution in progress
    COMPLETED = "completed"   # Execution finished successfully
    FAILED = "failed"         # Execution failed permanently


@dataclass
class IdempotencyRecord:
    """A single idempotency record in the dedup store."""
    key: str
    status: IdempotencyStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None
    ttl_seconds: int = 86400  # 24-hour default TTL

    @property
    def is_expired(self) -> bool:
        return time.time() > (self.created_at + self.ttl_seconds)


class InMemoryIdempotencyStore:
    """
    Thread-safe in-memory idempotency store for development and testing.
    
    Production systems should use Redis or a database-backed store.
    """

    def __init__(self, default_ttl: int = 86400):
        self._store: dict[str, IdempotencyRecord] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl

    def try_acquire(self, key: str) -> tuple[bool, Optional[IdempotencyRecord]]:
        """
        Attempt to acquire an idempotency key.
        
        Returns:
            (True, None) if key acquired (proceed with execution)
            (False, record) if key already exists (return cached result)
        """
        with self._lock:
            # Check if key exists and is not expired
            if key in self._store:
                record = self._store[key]
                if record.is_expired:
                    # Expired key, remove and allow re-acquisition
                    del self._store[key]
                else:
                    # Key exists, return existing record
                    return False, record

            # Acquire the key with PENDING status
            record = IdempotencyRecord(
                key=key,
                status=IdempotencyStatus.PENDING,
                ttl_seconds=self._default_ttl,
            )
            self._store[key] = record
            return True, None

    def complete(self, key: str, result: Any) -> None:
        """Mark an idempotency key as successfully completed."""
        with self._lock:
            if key not in self._store:
                raise KeyError(f"Idempotency key '{key}' not found in store")
            record = self._store[key]
            record.status = IdempotencyStatus.COMPLETED
            record.result = result
            record.completed_at = time.time()

    def fail(self, key: str, error: str) -> None:
        """Mark an idempotency key as failed (allows retry)."""
        with self._lock:
            if key in self._store:
                # Remove failed keys to allow retry
                del self._store[key]

    def get(self, key: str) -> Optional[IdempotencyRecord]:
        """Look up an idempotency record."""
        with self._lock:
            record = self._store.get(key)
            if record and record.is_expired:
                del self._store[key]
                return None
            return record

    def cleanup_expired(self) -> int:
        """Remove all expired records. Returns count of removed records."""
        with self._lock:
            expired_keys = [
                k for k, v in self._store.items() if v.is_expired
            ]
            for key in expired_keys:
                del self._store[key]
            return len(expired_keys)
```

### Redis-Backed Store (Production)

```python
import json
import time
from typing import Any, Optional

try:
    import redis
except ImportError:
    redis = None  # type: ignore


class RedisIdempotencyStore:
    """
    Production-grade idempotency store backed by Redis.
    
    Uses Redis SET with NX (set-if-not-exists) for atomic key acquisition
    and TTL for automatic expiration.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379/0",
        key_prefix: str = "idem:",
        default_ttl: int = 86400,
    ):
        if redis is None:
            raise ImportError("redis package required: pip install redis")
        
        self._client = redis.from_url(redis_url, decode_responses=True)
        self._prefix = key_prefix
        self._default_ttl = default_ttl

    def _full_key(self, key: str) -> str:
        return f"{self._prefix}{key}"

    def try_acquire(self, key: str) -> tuple[bool, Optional[dict]]:
        """
        Atomically attempt to acquire an idempotency key.
        
        Uses SET NX (set-if-not-exists) for race-condition-free acquisition.
        """
        full_key = self._full_key(key)
        
        # Try to set the key with NX (only if it doesn't exist)
        record = json.dumps({
            "status": "pending",
            "created_at": time.time(),
        })
        
        acquired = self._client.set(
            full_key, record, nx=True, ex=self._default_ttl
        )
        
        if acquired:
            return True, None
        
        # Key exists, retrieve it
        existing = self._client.get(full_key)
        if existing:
            return False, json.loads(existing)
        
        # Race condition: key expired between SET and GET
        # Retry acquisition
        return self.try_acquire(key)

    def complete(self, key: str, result: Any) -> None:
        """Mark key as completed with result."""
        full_key = self._full_key(key)
        record = json.dumps({
            "status": "completed",
            "result": result,
            "completed_at": time.time(),
        })
        # Update with remaining TTL preserved
        ttl = self._client.ttl(full_key)
        if ttl > 0:
            self._client.set(full_key, record, ex=ttl)
        else:
            self._client.set(full_key, record, ex=self._default_ttl)

    def fail(self, key: str, error: str) -> None:
        """Remove failed key to allow retry."""
        self._client.delete(self._full_key(key))
```

---

## Idempotent Tool Executor

The executor wraps tool calls with idempotency logic, handling the acquire-execute-store lifecycle.

```python
import time
import json
from typing import Any, Callable, Optional
from dataclasses import dataclass


@dataclass
class IdempotentCallResult:
    """Result of an idempotent tool call."""
    key: str
    was_cached: bool
    result: Any
    error: Optional[str] = None
    duration_ms: float = 0.0


class IdempotentToolExecutor:
    """
    Wraps tool execution with idempotency guarantees.
    
    Lifecycle:
    1. Generate idempotency key from context
    2. Try to acquire key in dedup store
    3. If key exists → return cached result
    4. If key acquired → execute tool → store result
    5. If execution fails → release key (allow retry)
    """

    def __init__(self, store: "InMemoryIdempotencyStore"):
        self.store = store

    def execute(
        self,
        context: IdempotencyContext,
        tool_fn: Callable[[dict[str, Any]], Any],
    ) -> IdempotentCallResult:
        """
        Execute a tool call with idempotency guarantees.
        
        Args:
            context: The idempotency context for key generation
            tool_fn: The actual tool function to call with parameters
            
        Returns:
            IdempotentCallResult with cached or fresh result
        """
        key = context.generate_key()
        start_time = time.monotonic()

        # Step 1: Try to acquire the idempotency key
        acquired, existing_record = self.store.try_acquire(key)

        if not acquired and existing_record is not None:
            # Key exists - return cached result
            duration = (time.monotonic() - start_time) * 1000
            
            if existing_record.status == IdempotencyStatus.COMPLETED:
                print(f"[Idempotency] Cache HIT for key={key[:20]}... "
                      f"Returning cached result.")
                return IdempotentCallResult(
                    key=key,
                    was_cached=True,
                    result=existing_record.result,
                    duration_ms=duration,
                )
            
            if existing_record.status == IdempotencyStatus.PENDING:
                # Another execution is in progress
                # In production, you'd wait or return a conflict error
                print(f"[Idempotency] Key {key[:20]}... is PENDING "
                      f"(another execution in progress)")
                return IdempotentCallResult(
                    key=key,
                    was_cached=False,
                    result=None,
                    error="Concurrent execution in progress",
                    duration_ms=duration,
                )

        # Step 2: Key acquired - execute the tool
        print(f"[Idempotency] Cache MISS for key={key[:20]}... Executing tool.")
        try:
            result = tool_fn(context.parameters)
            duration = (time.monotonic() - start_time) * 1000

            # Step 3: Store the result
            self.store.complete(key, result)
            
            return IdempotentCallResult(
                key=key,
                was_cached=False,
                result=result,
                duration_ms=duration,
            )

        except Exception as e:
            duration = (time.monotonic() - start_time) * 1000
            
            # Step 4: Release the key on failure (allow retry)
            self.store.fail(key, str(e))
            
            return IdempotentCallResult(
                key=key,
                was_cached=False,
                result=None,
                error=str(e),
                duration_ms=duration,
            )


# Example usage
if __name__ == "__main__":
    store = InMemoryIdempotencyStore()
    executor = IdempotentToolExecutor(store)

    # Simulate a tool function
    call_count = 0
    def mock_file_write(params: dict) -> dict:
        nonlocal call_count
        call_count += 1
        return {"status": "written", "bytes": len(params.get("content", ""))}

    context = IdempotencyContext(
        agent_id="agent_1",
        task_id="task_1",
        step_index=0,
        tool_name="file_write",
        parameters={"path": "/tmp/test.txt", "content": "hello world"}
    )

    # First call - executes the tool
    result1 = executor.execute(context, mock_file_write)
    print(f"Call 1: cached={result1.was_cached}, result={result1.result}")
    
    # Second call - returns cached result (tool not executed)
    result2 = executor.execute(context, mock_file_write)
    print(f"Call 2: cached={result2.was_cached}, result={result2.result}")
    
    # Third call - same result, still cached
    result3 = executor.execute(context, mock_file_write)
    print(f"Call 3: cached={result3.was_cached}, result={result3.result}")

    print(f"Tool was called {call_count} time(s)")  # Should print 1
    assert call_count == 1, "Tool should only be called once!"
```

---

## Write-Ahead Logging

For critical operations, the idempotency key should be recorded in a write-ahead log (WAL) before execution begins. This prevents the scenario where the tool executes successfully but the result fails to store.

```python
import os
import json
import time
import tempfile
from typing import Any, Optional
from pathlib import Path


class WriteAheadLog:
    """
    File-based write-ahead log for idempotency records.
    
    Records operations before they execute, ensuring that even if the
    process crashes mid-execution, we can detect incomplete operations
    on restart.
    """

    def __init__(self, wal_directory: str):
        self.wal_dir = Path(wal_directory)
        self.wal_dir.mkdir(parents=True, exist_ok=True)

    def _wal_path(self, key: str) -> Path:
        """Get the WAL file path for a given key."""
        # Use a safe filename derived from the key
        safe_name = key.replace("/", "_").replace("\\", "_")
        return self.wal_dir / f"{safe_name}.wal"

    def begin(self, key: str, tool_name: str, parameters: dict) -> None:
        """
        Record the start of an operation in the WAL.
        
        This must be called BEFORE the tool execution begins.
        """
        wal_entry = {
            "key": key,
            "tool_name": tool_name,
            "parameters": parameters,
            "status": "started",
            "started_at": time.time(),
        }
        
        wal_path = self._wal_path(key)
        
        # Atomic write using temp file + rename
        temp_fd, temp_path = tempfile.mkstemp(
            dir=str(self.wal_dir), suffix=".tmp"
        )
        try:
            with os.fdopen(temp_fd, "w") as f:
                json.dump(wal_entry, f, indent=2)
            os.replace(temp_path, str(wal_path))
        except Exception:
            os.unlink(temp_path)
            raise

    def commit(self, key: str, result: Any) -> None:
        """Mark the operation as successfully completed."""
        wal_path = self._wal_path(key)
        if not wal_path.exists():
            return
        
        with open(wal_path, "r") as f:
            entry = json.load(f)
        
        entry["status"] = "committed"
        entry["result"] = result
        entry["committed_at"] = time.time()
        
        temp_fd, temp_path = tempfile.mkstemp(
            dir=str(self.wal_dir), suffix=".tmp"
        )
        try:
            with os.fdopen(temp_fd, "w") as f:
                json.dump(entry, f, indent=2)
            os.replace(temp_path, str(wal_path))
        except Exception:
            os.unlink(temp_path)
            raise

    def rollback(self, key: str) -> None:
        """Remove the WAL entry for a failed operation."""
        wal_path = self._wal_path(key)
        if wal_path.exists():
            os.unlink(wal_path)

    def get_incomplete_operations(self) -> list[dict]:
        """
        Find operations that started but never committed.
        
        Called on restart to detect operations that may need
        recovery or re-execution.
        """
        incomplete = []
        for wal_file in self.wal_dir.glob("*.wal"):
            try:
                with open(wal_file, "r") as f:
                    entry = json.load(f)
                if entry.get("status") == "started":
                    incomplete.append(entry)
            except (json.JSONDecodeError, IOError):
                continue
        return incomplete
```

---

## Idempotency for Common Tool Types

### File Write (Idempotent by Content Hash)

```python
import hashlib
import os
from pathlib import Path


def idempotent_file_write(path: str, content: str) -> dict:
    """
    Write a file idempotently based on content hash.
    
    If the file already exists with the same content, this is a no-op.
    This provides natural idempotency without needing an external store.
    """
    target = Path(path)
    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    
    # Check if file exists with same content
    if target.exists():
        existing_hash = hashlib.sha256(
            target.read_bytes()
        ).hexdigest()
        
        if existing_hash == content_hash:
            return {
                "status": "unchanged",
                "path": path,
                "content_hash": content_hash,
                "bytes_written": 0,
            }
    
    # Write atomically using temp file + rename
    target.parent.mkdir(parents=True, exist_ok=True)
    temp_path = target.with_suffix(".tmp")
    temp_path.write_text(content, encoding="utf-8")
    os.replace(str(temp_path), str(target))
    
    return {
        "status": "written",
        "path": path,
        "content_hash": content_hash,
        "bytes_written": len(content.encode("utf-8")),
    }
```

### API Call (Idempotent via Server-Side Key)

```python
import requests
from typing import Optional


def idempotent_api_call(
    url: str,
    method: str,
    body: dict,
    idempotency_key: str,
    timeout: int = 30,
) -> dict:
    """
    Make an API call with an idempotency key in the header.
    
    Many APIs (Stripe, AWS) support the Idempotency-Key header,
    which tells the server to return the cached result if the
    same key is sent again.
    """
    headers = {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotency_key,
    }
    
    response = requests.request(
        method=method,
        url=url,
        json=body,
        headers=headers,
        timeout=timeout,
    )
    
    return {
        "status_code": response.status_code,
        "body": response.json(),
        "idempotency_key": idempotency_key,
        "was_replay": response.headers.get("Idempotent-Replayed") == "true",
    }
```

---

## Testing Idempotency

```python
import unittest


class TestIdempotency(unittest.TestCase):
    """Test suite for idempotency guarantees."""

    def setUp(self):
        self.store = InMemoryIdempotencyStore(default_ttl=60)
        self.executor = IdempotentToolExecutor(self.store)
        self.execution_count = 0

    def _mock_tool(self, params: dict) -> dict:
        self.execution_count += 1
        return {"result": "success", "call_number": self.execution_count}

    def test_same_key_returns_cached_result(self):
        """The tool should only be called once for the same idempotency context."""
        ctx = IdempotencyContext("a1", "t1", 0, "tool", {"key": "value"})

        r1 = self.executor.execute(ctx, self._mock_tool)
        r2 = self.executor.execute(ctx, self._mock_tool)
        r3 = self.executor.execute(ctx, self._mock_tool)

        self.assertEqual(self.execution_count, 1)
        self.assertFalse(r1.was_cached)
        self.assertTrue(r2.was_cached)
        self.assertTrue(r3.was_cached)
        self.assertEqual(r1.result, r2.result)

    def test_different_params_produce_different_keys(self):
        """Different parameters should produce different idempotency keys."""
        ctx1 = IdempotencyContext("a1", "t1", 0, "tool", {"key": "value1"})
        ctx2 = IdempotencyContext("a1", "t1", 0, "tool", {"key": "value2"})

        r1 = self.executor.execute(ctx1, self._mock_tool)
        r2 = self.executor.execute(ctx2, self._mock_tool)

        self.assertEqual(self.execution_count, 2)
        self.assertFalse(r1.was_cached)
        self.assertFalse(r2.was_cached)

    def test_failed_execution_allows_retry(self):
        """A failed execution should release the key for retry."""
        def failing_tool(params):
            raise RuntimeError("Temporary failure")

        ctx = IdempotencyContext("a1", "t1", 0, "tool", {"key": "value"})
        
        r1 = self.executor.execute(ctx, failing_tool)
        self.assertIsNotNone(r1.error)

        # After failure, retry should execute the tool again
        r2 = self.executor.execute(ctx, self._mock_tool)
        self.assertFalse(r2.was_cached)
        self.assertIsNone(r2.error)


if __name__ == "__main__":
    unittest.main()
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Correct Approach |
| :--- | :--- | :--- |
| Using timestamps in idempotency keys | Different time = different key = no dedup | Use deterministic inputs (agent_id, task_id, params) |
| Storing key after execution | Crash between execute and store loses dedup | Write-ahead log: store PENDING before execution |
| Never expiring keys | Store grows unbounded | Set TTL (24h default) with periodic cleanup |
| Caching error results | Transient errors become permanent | Only cache successes; delete keys on failure |
| Using random UUIDs as keys | Every retry gets a new key, defeating dedup | Derive keys deterministically from operation context |

---

## Handoff & Related References
- Tool Error Handling: [tool-error-handling.md](tool-error-handling.md)
- Tool Schema Definitions: [tool-schema-definitions.md](tool-schema-definitions.md)
- MCP Protocol Patterns: [mcp-protocol-patterns.md](mcp-protocol-patterns.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive idempotency implementations & test suites preserved)
Strict compliance with at-most-once execution guarantees and write-ahead logging patterns.
-->
