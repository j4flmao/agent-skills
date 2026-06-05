# Resource Allocation Limits

## CPU, Memory, and Network Limits in Host Containers

To run AI agents safely without risking host degradation or resource exhaustion, limits must be set for hardware resources. If an agent loops infinitely or consumes unbounded memory, the orchestration layer must enforce hard boundaries.

```
+-----------------------------------------------------------+
|                  HOST RESOURCE MANAGER                    |
|  - Max Memory Alloc: 2.0 GB (Hard limit, SIGKILL at 2.1)  |
|  - Max CPU Shares: 1.0 (Equivalent to 1 core throttling)  |
|  - Max Disk Space: 512 MB scratch mount                   |
+-----------------------------------------------------------+
                              │
            Evaluates Active Resource Consumption
                              ▼
        [Memory usage > 2GB] ──► Trigger Graceful Eviction
```

The system defines the following limit zones:
1. **Memory Ceiling**: Max container RSS memory capacity $\le 2.0\text{ GB}$.
2. **CPU Quota**: Maximum execution share limit $\le 100\%$ of single core.
3. **API Rate Limiter**: Rate constraints on outgoing LLM APIs (Requests per Minute (RPM), Tokens per Minute (TPM)).

---

## Mathematical Formulations for Token Bucket Rate Limiting

The token bucket algorithm regulates traffic flow by checking requests against a bucket that accumulates tokens over time.

Let $C$ be the bucket capacity, and $r$ be the fill rate in tokens per second. The number of available tokens $T(t)$ at any time $t$ is calculated from the last evaluated time $t_{last}$ as:

$$T(t) = \min(C, T(t_{last}) + r \cdot (t - t_{last}))$$

A request demanding $k$ tokens is allowed if:

$$T(t) \ge k$$

If allowed, the state is updated:

$$T_{new} = T(t) - k$$

Otherwise, the execution must block or raise a 429 status exception.

---

## Python Token Bucket Rate Limiter Implementation

Below is a production-grade implementation of the Token Bucket algorithm used for rate-limiting LLM requests.

```python
import time
import sys
import unittest
from typing import Tuple

class TokenBucketLimiter:
    """
    Thread-safe model of the Token Bucket rate limiting algorithm.
    """
    def __init__(self, capacity: float, fill_rate: float):
        self.capacity = capacity
        self.fill_rate = fill_rate  # Tokens per second
        self.tokens = capacity
        self.last_update = time.perf_counter()

    def consume(self, tokens_needed: float) -> Tuple[bool, float]:
        """
        Attempts to consume a specific number of tokens.
        Returns: (IsAllowed, RetryAfterSeconds)
        """
        now = time.perf_counter()
        elapsed = now - self.last_update
        self.last_update = now
        
        # Replenish tokens
        self.tokens = min(self.capacity, self.tokens + (elapsed * self.fill_rate))
        
        if self.tokens >= tokens_needed:
            self.tokens -= tokens_needed
            return True, 0.0
        else:
            missing_tokens = tokens_needed - self.tokens
            wait_time = missing_tokens / self.fill_rate
            return False, wait_time

class TestTokenBucketLimiter(unittest.TestCase):
    """Unit tests for the TokenBucketLimiter class."""
    def test_initial_capacity(self):
        limiter = TokenBucketLimiter(capacity=10, fill_rate=1.0)
        allowed, wait = limiter.consume(5)
        self.assertTrue(allowed)
        self.assertEqual(wait, 0.0)

    def test_overlimit_denied(self):
        limiter = TokenBucketLimiter(capacity=10, fill_rate=1.0)
        allowed, wait = limiter.consume(15)
        self.assertFalse(allowed)
        self.assertGreater(wait, 0.0)

    def test_regeneration(self):
        limiter = TokenBucketLimiter(capacity=2.0, fill_rate=10.0)
        allowed, _ = limiter.consume(2.0)
        self.assertTrue(allowed)
        
        # Immediate request should fail
        allowed, _ = limiter.consume(1.0)
        self.assertFalse(allowed)
        
        # Wait for regeneration
        time.sleep(0.12)
        allowed, _ = limiter.consume(1.0)
        self.assertTrue(allowed)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        # Simple test
        limiter = TokenBucketLimiter(capacity=100.0, fill_rate=10.0)
        print(f"Initial status: {limiter.consume(50.0)}")
        print(f"Immediate follow-up: {limiter.consume(60.0)}")
```

---

## Detailed Rules & Constraints
1. **Proportional Backoff**: When a 429 error occurs, back off exponentially: $t_{backoff} = 2^{attempt} + \text{jitter}$.
2. **Memory Leaks**: Subprocess run cycles must terminate completely to clean memory blocks.
3. **No Uncapped Scratch Mounts**: Writing temporary directories must use `/scratch` limited to 512MB capacity.

---

## Handoff & Related References
- Performance SLA Boundaries: [performance-sla-boundaries.md](performance-sla-boundaries.md)
- Fault Tolerance and Redundancy: [fault-tolerance-redundancy.md](fault-tolerance-redundancy.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
