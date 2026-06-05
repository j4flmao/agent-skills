# Fault Tolerance & Redundancy

## Circuit Breakers, Retry Jitter, and Failover Rules

In distributed cloud networks, tool executions or API calls to downstream systems will occasionally fail due to network drops, configuration errors, or transient load spikes. To keep the agentic runner resilient, the harness must support fault-tolerant strategies: retry intervals, jitter allocations, and circuit breaker loops.

```
       [Request Sent]
             │
      Did it fail?
             ├──► NO: Return result.
             └──► YES: Is it a transient error?
                          ├──► NO: Raise exception immediately.
                          └──► YES: Increment attempts.
                                       │
                                       ▼
                       Verify Circuit State (Closed/Open)
                                       │
                                       ▼
                         Apply Backoff + Jitter Delay
```

The system defines the following error categories:
1. **Transient Errors**: Rate limit (429), server timeout (503, 504), network drops. These can be retried.
2. **Permanent Errors**: Authorization failures (401, 403), parameter invalidation (400). Do not retry.
3. **Circuit State Thresholds**: If target failure rate $\ge 50\%$ over a sliding window, open the circuit and fail fast without calling the downstream API.

---

## Exponential Backoff with Jitter Formulation

Simple, constant retries can trigger synchronization issues (thundering herd problem). To prevent overloading target backends, the system calculates backoff delays exponentially and injects uniform random jitter.

Let $a$ be the current retry attempt count, $B_{base}$ be the base backoff factor (e.g., 2.0 seconds), and $B_{max}$ be the maximum delay boundary (e.g., 30.0 seconds). The raw delay is:

$$t_{raw} = \min(B_{max}, B_{base} \cdot 2^a)$$

Applying full random jitter, the actual wait time $t_{wait}$ is drawn uniformly:

$$t_{wait} \sim U(0, t_{raw})$$

---

## Python Circuit Breaker & Retry Manager

Below is a Python module implementing an exponential backoff retry decorator and a basic Circuit Breaker tracking class.

```python
import time
import random
import sys
import unittest
from typing import Callable, Any, Tuple

class CircuitBreakerOpenException(Exception):
    pass

class CircuitBreaker:
    """
    Monitors failures and prevents execution loops when downstream services are offline.
    """
    def __init__(self, failure_threshold: int = 3, recovery_timeout: float = 2.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF-OPEN
        self.last_state_change = time.perf_counter()

    def before_call(self):
        """Verifies if the request can proceed based on the circuit state."""
        now = time.perf_counter()
        if self.state == "OPEN":
            if now - self.last_state_change > self.recovery_timeout:
                print("[CIRCUIT BREAKER] Recovery timeout elapsed. Switching to HALF-OPEN.", file=sys.stderr)
                self.state = "HALF-OPEN"
                self.last_state_change = now
            else:
                raise CircuitBreakerOpenException("Circuit breaker is OPEN. Failing fast.")

    def record_success(self):
        """Resets failure counter on success."""
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self):
        """Increments failure count and opens circuit if threshold is reached."""
        self.failure_count += 1
        now = time.perf_counter()
        if self.failure_count >= self.failure_threshold:
            print(f"[CIRCUIT BREAKER] Failure threshold reached ({self.failure_count}). Opening circuit.", file=sys.stderr)
            self.state = "OPEN"
            self.last_state_change = now

class ResilientRunner:
    """
    Wraps execution calls with backoff, jitter, and circuit breaker gates.
    """
    def __init__(self, breaker: CircuitBreaker, max_retries: int = 3, base_delay: float = 0.1):
        self.breaker = breaker
        self.max_retries = max_retries
        self.base_delay = base_delay

    def run(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Runs the function with circuit breaker check and retries."""
        self.breaker.before_call()
        
        attempt = 0
        while True:
            try:
                result = func(*args, **kwargs)
                self.breaker.record_success()
                return result
            except Exception as e:
                attempt += 1
                self.breaker.record_failure()
                
                if attempt > self.max_retries:
                    raise e
                
                # Exponential backoff with jitter calculation
                raw_delay = min(5.0, self.base_delay * (2 ** attempt))
                wait_time = random.uniform(0, raw_delay)
                print(f"[RETRY] Attempt {attempt} failed: {e}. Retrying in {wait_time:.4f}s...", file=sys.stderr)
                time.sleep(wait_time)
                
                # Check circuit status again
                self.breaker.before_call()

# Mock error prone function
def flakey_function(success_after: int, current_state: dict) -> str:
    current_state["calls"] += 1
    if current_state["calls"] < success_after:
        raise ConnectionError("Service unavailable.")
    return "Call Succeeded"

class TestFaultTolerance(unittest.TestCase):
    """Unit tests for the resilient runner and circuit breaker systems."""
    def test_retry_success(self):
        breaker = CircuitBreaker(failure_threshold=5)
        runner = ResilientRunner(breaker=breaker, max_retries=3, base_delay=0.01)
        state = {"calls": 0}
        
        result = runner.run(flakey_function, 3, state)
        self.assertEqual(result, "Call Succeeded")
        self.assertEqual(state["calls"], 3)

    def test_circuit_breaker_tripping(self):
        breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
        runner = ResilientRunner(breaker=breaker, max_retries=1, base_delay=0.01)
        state = {"calls": 0}
        
        # This will trigger 2 failures
        with self.assertRaises(ConnectionError):
            runner.run(flakey_function, 5, state)
            
        # Third call should immediately fail due to open circuit
        with self.assertRaises(CircuitBreakerOpenException):
            runner.run(flakey_function, 5, state)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        # Quick CLI check
        breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=0.5)
        runner = ResilientRunner(breaker, max_retries=3, base_delay=0.1)
        calls_state = {"calls": 0}
        try:
            res = runner.run(flakey_function, 2, calls_state)
            print(f"Outcome: {res}")
        except Exception as err:
            print(f"Runner failed with: {err}")
```

---

## Detailed Rules & Constraints
1. **Never Sleep synchronously inside main thread queues**: In dynamic GUI environments, route retry sleep commands to async timers.
2. **Circuit Trip Logging**: Trigger system metrics logs when a circuit breaker state switches from CLOSED to OPEN.
3. **Graceful Failures**: Provide fallback objects when exceptions remain after exhausting retries.

---

## Handoff & Related References
- Performance SLA Boundaries: [performance-sla-boundaries.md](performance-sla-boundaries.md)
- Resource Allocation Limits: [resource-allocation-limits.md](resource-allocation-limits.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
