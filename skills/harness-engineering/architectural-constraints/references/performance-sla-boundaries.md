# Performance SLA Boundaries

## Latency and Throughput Constraints in Agent Harnesses

In production agentic loops, executing tool calls or calling LLM endpoints is constrained by strict Service Level Agreements (SLAs). Agents must make decisions within bounded time horizons to avoid blocking user interfaces or violating downstream HTTP gateway timeouts.

```
[Incoming Request] ──► Start Timer (T_0)
                            │
              Is Agent Loop Execution Time (T_elapsed) > SLA Limit (T_SLA)?
                            ├──► NO: Continue execution sequence.
                            └──► YES: Interrupt loop, invoke fallback model/heuristic.
```

The system defines boundaries for:
1. **Interactive Turns**: Time to First Token (TTFT) $\le 800\text{ ms}$, Total Response Time (TRT) $\le 5.0\text{ s}$.
2. **Background Operations**: Execution loop completion time $\le 120\text{ s}$.
3. **Tool Execution timeouts**: Individual tool processes must return within $\le 15\text{ s}$.

---

## Mathematical Formulations for Adaptive Timeout

To prevent hard-timeout failures during periods of network degradation, the system calculates adaptive timeouts based on historical latency metrics.

Let $L = \{l_1, l_2, \dots, l_k\}$ be the set of latencies for the last $k$ successful API calls. The moving average $\mu_k$ and standard deviation $\sigma_k$ are:

$$\mu_k = \frac{1}{k} \sum_{i=1}^{k} l_i$$

$$\sigma_k = \sqrt{\frac{1}{k} \sum_{i=1}^{k} (l_i - \mu_k)^2}$$

The adaptive timeout value $T_{timeout}$ for the next iteration is formulated as:

$$T_{timeout} = \min(T_{max}, \max(T_{min}, \mu_k + \beta \cdot \sigma_k))$$

where:
* $T_{min}$ is the absolute minimum safety threshold (e.g., 2.0s).
* $T_{max}$ is the hard SLA limit (e.g., 15.0s).
* $\beta$ is the safety coefficient (typically $2.0 \le \beta \le 3.0$).

---

## Python SLA Monitoring Implementation

Here is a complete, production-grade SLA monitor that wraps function execution and handles fallback routines.

```python
import time
import sys
import unittest
from typing import Callable, Any, Dict, List

class SLAMonitor:
    """
    Tracks execution latencies and enforces strict performance SLA limits.
    """
    def __init__(self, limit_seconds: float, fallback_func: Callable[..., Any]):
        self.limit_seconds = limit_seconds
        self.fallback_func = fallback_func
        self.history: List[float] = []

    def execute(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Tuple[Any, float, bool]:
        """
        Executes the function, measures elapsed time, and returns a fallback if SLA is violated.
        Returns: (Result, ElapsedTime, WasFallbackTriggered)
        """
        start_time = time.perf_counter()
        try:
            # Note: For strict OS-level thread interruption, a signal-based alarm
            # is typically used on Unix. Here we measure completion time.
            result = func(*args, **kwargs)
            end_time = time.perf_counter()
            elapsed = end_time - start_time
            self.history.append(elapsed)
            
            if elapsed > self.limit_seconds:
                print(f"[WARNING] SLA Violated! Limit: {self.limit_seconds}s, Actual: {elapsed:.4f}s", file=sys.stderr)
                fallback_val = self.fallback_func(*args, **kwargs)
                return fallback_val, elapsed, True
                
            return result, elapsed, False
        except Exception as e:
            end_time = time.perf_counter()
            elapsed = end_time - start_time
            print(f"[ERROR] Exception during execution: {e}", file=sys.stderr)
            fallback_val = self.fallback_func(*args, **kwargs)
            return fallback_val, elapsed, True

    def get_stats(self) -> Dict[str, float]:
        """Calculates statistical latencies."""
        if not self.history:
            return {"mean": 0.0, "max": 0.0}
        return {
            "mean": sum(self.history) / len(self.history),
            "max": max(self.history),
            "count": float(len(self.history))
        }

# Mock Functions for Demonstration
def target_operation(sleep_time: float) -> str:
    time.sleep(sleep_time)
    return "Operation Success"

def fallback_operation(*args, **kwargs) -> str:
    return "SLA Fallback Output"

class TestSLAMonitor(unittest.TestCase):
    """Unit tests for the SLAMonitor class."""
    def setUp(self):
        self.monitor = SLAMonitor(limit_seconds=0.1, fallback_func=fallback_operation)

    def test_sla_success(self):
        result, elapsed, triggered = self.monitor.execute(target_operation, 0.02)
        self.assertEqual(result, "Operation Success")
        self.assertFalse(triggered)
        self.assertLess(elapsed, 0.1)

    def test_sla_fallback_triggered(self):
        result, elapsed, triggered = self.monitor.execute(target_operation, 0.15)
        self.assertEqual(result, "SLA Fallback Output")
        self.assertTrue(triggered)
        self.assertGreaterEqual(elapsed, 0.1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        # Quick CLI execution
        monitor = SLAMonitor(limit_seconds=0.5, fallback_func=fallback_operation)
        res, t, trig = monitor.execute(target_operation, 0.2)
        print(f"Normal execution: {res} in {t:.4f}s (Triggered fallback={trig})")
        res, t, trig = monitor.execute(target_operation, 0.6)
        print(f"SLA execution: {res} in {t:.4f}s (Triggered fallback={trig})")
```

---

## Detailed Rules & Constraints
1. **Never Block indefinitely**: All outgoing requests to LLM APIs or databases must define explicitly configured timeouts.
2. **Circuit Breaking Integration**: If fallback rates exceed 20% over a 2-minute window, trip the circuit breaker.
3. **Stateless Metrics**: Keep latency histories local or sync using fast in-memory key-value databases to avoid locking.

---

## Handoff & Related References
- Fault Tolerance and Redundancy: [fault-tolerance-redundancy.md](fault-tolerance-redundancy.md)
- Network Topology Restrictions: [network-topology-restrictions.md](network-topology-restrictions.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
