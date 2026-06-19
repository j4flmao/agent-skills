---
name: error-recovery
description: >
  Use this skill to classify agent failures, implement retry strategies with exponential backoff and jitter, design checkpoint-based state recovery, build fallback chains, manage dead letter queues, enforce error budgets, and apply chaos testing to LLM agent systems.
  This skill enforces: structured error taxonomies, idempotent retry logic, crash-resilient checkpoint persistence, graceful degradation cascades, and probabilistic failure injection frameworks.
  Do NOT use for: traditional application error handling, infrastructure monitoring/alerting, or network-level fault tolerance.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [harness-engineering, error-recovery, agent-frameworks, resilience, retry-logic, chaos-testing]
---

# Error Recovery Skill

## Purpose
Establishes a production-grade failure management and recovery framework for LLM agent systems operating under non-deterministic conditions. LLM agents face unique failure modes — stochastic output degradation, tool call failures, context window overflows, rate limiting, hallucination cascades, and partial state corruption — that traditional error handling cannot address. This framework provides structured error classification, intelligent retry orchestration, checkpoint-based state persistence, multi-tier fallback chains, dead letter processing for permanently failed tasks, error budget enforcement for reliability governance, and chaos testing methodologies to proactively discover failure modes before production deployment.

---

## Core Principles
1. **Classify Before Recovering**: Every error must be classified into the agent error taxonomy before any recovery action is taken. Retrying a non-retryable error wastes resources and compounds failures.
2. **Idempotency Is Mandatory**: Every retried operation must produce the same side effects regardless of how many times it is executed. Non-idempotent retries cause data corruption and duplicate actions.
3. **Checkpoint Everything**: Agent state must be checkpointed after every successful step. Recovery must resume from the last checkpoint, never restart from scratch.
4. **Degrade Gracefully, Never Silently**: When recovery fails, the system must degrade to a lower-capability mode with explicit user notification, never silently produce degraded outputs.
5. **Error Budgets Drive Decisions**: Reliability targets are expressed as error budgets. When the budget is exhausted, the system must freeze deployments and prioritize stability over features.

---

## Agent Protocol

### Triggers
Use this skill when processing:
- Agent tool call failures (API timeouts, rate limits, invalid responses).
- LLM output parsing failures (malformed JSON, schema violations, empty responses).
- State corruption during multi-step agent execution chains.
- Cascading failures across multi-agent orchestration topologies.
- Reliability engineering reviews for agent system architectures.
- Chaos testing design for pre-production agent validation.

### Input Context Required
- **Error Event Payload**: The raw error object including type, message, stack trace, and execution context.
- **Agent Execution State**: Current step index, completed steps, pending steps, and accumulated side effects.
- **Retry Policy Configuration**: Max retries, backoff parameters, jitter range, and circuit breaker thresholds.
- **Checkpoint Store Reference**: Connection to the checkpoint persistence layer (Redis, PostgreSQL, filesystem).
- **Error Budget Status**: Current error budget consumption percentage and remaining allocation.

### Output Artifact
- **Recovery Action**: The specific recovery strategy selected (retry, fallback, checkpoint-restore, dead-letter, abort).
- **Updated State Checkpoint**: Persisted state reflecting the recovery action taken.
- **Error Classification Report**: Structured taxonomy classification with severity, retryability, and root cause analysis.

### Response Formats
For programmatic integration, error recovery results must be delivered in this format:

```json
{
  "error_id": "err-2026-06-04-0042",
  "classification": {
    "category": "tool_failure",
    "subcategory": "api_rate_limit",
    "severity": "transient",
    "retryable": true,
    "estimated_recovery_ms": 5000
  },
  "recovery_action": {
    "strategy": "exponential_backoff_retry",
    "attempt": 3,
    "max_attempts": 5,
    "next_delay_ms": 4000,
    "jitter_ms": 800
  },
  "checkpoint": {
    "step_index": 7,
    "completed_steps": ["fetch_data", "parse_schema", "validate_input"],
    "state_hash": "sha256:a1b2c3d4e5f6..."
  },
  "error_budget": {
    "budget_total": 1000,
    "budget_consumed": 342,
    "budget_remaining_pct": 65.8
  }
}
```

---

## Decision Matrix for Error Recovery

```
Error Classification?
├── Transient Error (rate limit, timeout, 503)
│   ├── Retry budget remaining?
│   │   ├── Yes → Exponential Backoff + Jitter Retry
│   │   └── No  → Circuit Breaker Open → Fallback Chain
│   │
├── Deterministic Error (400, schema violation, auth failure)
│   ├── Input correctable?
│   │   ├── Yes → Auto-Correct Input → Retry Once
│   │   └── No  → Dead Letter Queue → Alert + Manual Review
│   │
├── Stochastic LLM Error (hallucination, empty output, format violation)
│   ├── Temperature reducible?
│   │   ├── Yes → Reduce Temperature → Retry with Stricter Prompt
│   │   └── No  → Fallback to Simpler Model → Degrade Gracefully
│   │
├── State Corruption (partial writes, inconsistent checkpoints)
│   ├── Valid checkpoint exists?
│   │   ├── Yes → Restore from Last Valid Checkpoint → Resume
│   │   └── No  → Full State Reset → Restart from Step 0
│   │
└── Cascading Failure (multi-agent propagation)
    ├── Blast radius containable?
    │   ├── Yes → Isolate Failed Agent → Continue with Remaining
    │   └── No  → Circuit Breaker All → Emergency Degradation Mode
```

---

## Detailed Architectural Overview

The error recovery framework operates as an interceptor layer between agent execution and external dependencies, providing classification, retry orchestration, state management, and escalation.

```
+----------------+     +-------------------+     +---------------------+     +------------------+
| Agent Executor | ──► | Error Interceptor | ──► | Taxonomy Classifier | ──► | Recovery Router  |
| (step runner)  |     | (catch + enrich)  |     | (categorize error)  |     | (select strategy)|
+----------------+     +-------------------+     +---------------------+     +------------------+
                                                                                       │
                              ┌──────────────┬──────────────┬──────────────┬────────────┤
                              ▼              ▼              ▼              ▼            ▼
                        +-----------+  +-----------+  +-----------+  +---------+  +-----------+
                        | Retry     |  | Fallback  |  | Checkpoint|  | Dead    |  | Circuit   |
                        | Engine    |  | Chain     |  | Restore   |  | Letter  |  | Breaker   |
                        +-----------+  +-----------+  +-----------+  +---------+  +-----------+
```

### Error Recovery Lifecycle

```
[Error Occurs in Agent Step]
       │
       ├──► (A) Error Capture ──► Enrich with execution context, timestamp, step index
       │
       ├──► (B) Taxonomy Classification ──► Map to {transient, deterministic, stochastic, corruption, cascade}
       │
       ├──► (C) Retryability Check ──► Evaluate retry budget, circuit breaker state, idempotency
       │
       ├──► (D) Strategy Selection ──► $S = \arg\min_{s \in \mathcal{S}} C(s) \text{ s.t. } P_{recovery}(s) \ge \tau$
       │
       └──► (E) Execution + Checkpoint ──► Execute recovery action, persist updated state, log outcome
```

---

## Workflow Steps

### Phase 1: Error Capture & Enrichment
1. **Intercept Error Events**: Wrap all agent step executions in structured error handlers that capture exceptions without swallowing them.
2. **Enrich Error Context**: Attach execution metadata (step index, elapsed time, input hash, dependency chain) to the raw error object.
3. **Generate Error Fingerprint**: Hash the error type, message template, and call site to create a deduplicated error fingerprint for tracking.
4. **Log to Error Stream**: Emit the enriched error event to the structured logging pipeline for observability.

### Phase 2: Taxonomy Classification
1. **Match Error Signatures**: Compare the error fingerprint against the known error taxonomy registry.
2. **Classify Severity Level**: Assign severity as transient, deterministic, stochastic, corruption, or cascade.
3. **Determine Retryability**: Evaluate whether the error class is safe to retry based on idempotency analysis.
4. **Estimate Recovery Time**: Calculate expected recovery duration based on historical resolution times for this error class.

### Phase 3: Retry Orchestration
1. **Check Retry Budget**: Verify that the current step has not exhausted its retry allocation.
2. **Calculate Backoff Delay**: Compute delay using $d_n = \min(d_{base} \cdot 2^n + \text{jitter}(0, d_{jitter}), d_{max})$.
3. **Verify Circuit Breaker State**: Ensure the circuit breaker for the target dependency is in CLOSED or HALF-OPEN state.
4. **Execute Retry with Timeout**: Re-execute the failed operation with a per-attempt timeout and capture the result.

### Phase 4: Fallback & Degradation
1. **Evaluate Fallback Chain**: Walk the ordered fallback chain to find the next available alternative.
2. **Degrade Capability Level**: If primary and secondary providers fail, activate reduced-capability mode with explicit notification.
3. **Update Feature Flags**: Dynamically disable features that depend on failed capabilities.
4. **Notify Downstream Consumers**: Alert dependent agents or services about the degraded state.

### Phase 5: Checkpoint & State Recovery
1. **Load Last Valid Checkpoint**: Query the checkpoint store for the most recent consistent state snapshot.
2. **Validate Checkpoint Integrity**: Verify the checkpoint hash matches the stored integrity digest.
3. **Restore Agent State**: Rebuild the agent's execution context from the checkpoint data.
4. **Resume Execution Pipeline**: Continue from the step immediately after the last checkpointed step.

### Phase 6: Dead Letter & Escalation
1. **Route to Dead Letter Queue**: Move permanently failed tasks to the dead letter queue with full error context.
2. **Update Error Budget Counters**: Increment the error budget consumption counter and check threshold alerts.
3. **Trigger Incident Workflow**: If error budget exceeds warning threshold, create an incident ticket automatically.
4. **Schedule Post-Mortem Analysis**: Queue failed tasks for human review with root cause analysis templates.

---

## Extended Troubleshooting Guide

When implementing error recovery frameworks for agent systems, you may encounter the following common failure modes:

| Symptom | Primary Cause | Mitigation Action |
| :--- | :--- | :--- |
| **Retry storm overwhelming API provider** | Missing circuit breaker or no jitter in backoff calculation. | Implement circuit breaker with OPEN threshold and add full-jitter to backoff delays. |
| **Agent stuck in infinite retry loop** | Deterministic error incorrectly classified as transient. | Add error fingerprint matching to taxonomy and mark 4xx errors as non-retryable. |
| **Checkpoint restore produces stale results** | Checkpoint captured before side effects completed. | Move checkpoint writes to AFTER side effect confirmation, using write-ahead logging. |
| **Dead letter queue grows unbounded** | No scheduled processing or alerting on DLQ depth. | Set DLQ depth alarms and schedule automated retry sweeps every 15 minutes. |
| **Error budget burns through in minutes** | Single upstream dependency failure triggers cascading budget consumption. | Implement per-dependency budget partitioning and circuit breaker isolation. |
| **Chaos test causes production outage** | Blast radius not properly scoped during failure injection. | Use feature flags to limit chaos injection to canary deployments only. |
| **Fallback chain returns inconsistent data** | Fallback provider has different data schema or staleness. | Implement schema normalization layer and staleness checks in fallback wrappers. |

---

## Complete Error Recovery Scenario

Below is a typical end-to-end error recovery execution for a multi-step agent:

```
[Agent Step 7: Call External API] ──► HTTP 429 Rate Limited
                                           │
[Classify] ──► Transient / Retryable ──► Check retry budget: 3/5 remaining
                                           │
[Retry 1] ──► Backoff 2000ms + jitter(400ms) ──► HTTP 429 again
                                           │
[Retry 2] ──► Backoff 4000ms + jitter(800ms) ──► HTTP 200 Success!
                                           │
[Checkpoint] ──► Save state at Step 7 complete ──► Continue to Step 8
                                           │
[Step 8: Parse Response] ──► JSON Parse Error (malformed output)
                                           │
[Classify] ──► Stochastic / Retryable ──► Reduce temperature 1.0 → 0.3
                                           │
[Retry 1] ──► Re-prompt with stricter schema ──► Valid JSON received
                                           │
[Checkpoint] ──► Save state at Step 8 complete ──► Pipeline continues
```

---

## Rules and Guidelines
- **Rule 1**: Every error handler must classify errors before attempting recovery. Blind retries on deterministic errors waste resources and delay resolution.
- **Rule 2**: All retry operations must be idempotent. If an operation has side effects, implement deduplication keys or idempotency tokens.
- **Rule 3**: Checkpoints must be written atomically using temp-file-swap or write-ahead-log patterns. Partial checkpoints are worse than no checkpoints.
- **Rule 4**: Circuit breakers must have configurable OPEN, HALF-OPEN, and CLOSED states with automatic recovery probes during HALF-OPEN.
- **Rule 5**: Error budgets must be enforced at the service level. When the budget is exhausted, new feature deployments must be frozen until reliability improves.

---

## Reference Guides
Below are links to the reference guides detailing the algorithms, data schemas, code implementations, and resilience patterns used in this error recovery framework:

- [error-taxonomy-classification.md](references/error-taxonomy-classification.md)
  Defines the complete agent error taxonomy, error fingerprinting algorithms, severity classification rules, and retryability determination logic.
- [retry-strategies.md](references/retry-strategies.md)
  Details exponential backoff formulations, jitter strategies (full, equal, decorrelated), retry budget management, and per-attempt timeout configurations.
- [checkpoint-recovery.md](references/checkpoint-recovery.md)
  Covers checkpoint persistence schemas, write-ahead logging, atomic checkpoint writes, integrity verification, and state restoration procedures.
- [graceful-degradation.md](references/graceful-degradation.md)
  Defines degradation cascades, capability level matrices, feature flag integration, user notification protocols, and degraded-mode behavioral contracts.
- [fallback-chain-patterns.md](references/fallback-chain-patterns.md)
  Provides ordered fallback chain architectures, provider health checking, schema normalization across fallbacks, and failover timing configurations.
- [dead-letter-processing.md](references/dead-letter-processing.md)
  Covers dead letter queue design, automated retry sweep scheduling, DLQ depth alerting, root cause categorization, and manual review workflows.
- [error-budget-management.md](references/error-budget-management.md)
  Outlines error budget calculation formulas, SLO/SLI definitions for agent systems, budget burn rate alerting, and deployment freeze policies.
- [chaos-testing-agents.md](references/chaos-testing-agents.md)
  Explains chaos engineering principles for agent systems, failure injection strategies, blast radius control, gameday runbooks, and steady-state hypothesis validation.

---

## Handoff
For projects requiring context management during recovery, hand off to `context-engineering`. For systems with architectural constraints on error propagation, hand off to `architectural-constraints`. For evaluating agent recovery effectiveness, hand off to `evaluation-testing`.

## Implementation Patterns

### Error Taxonomy Classifier

```python
from typing import Dict, Optional
import re
from enum import Enum

class ErrorCategory(Enum):
    TRANSIENT = "transient"
    DETERMINISTIC = "deterministic"
    STOCHASTIC = "stochastic"
    CORRUPTION = "corruption"
    CASCADE = "cascade"

class ErrorClassifier:
    def __init__(self):
        self.signatures = {
            ErrorCategory.TRANSIENT: [
                r"timeout", r"timed? ?out", r"rate.?limit", r"429",
                r"503", r"502", r"504", r"too many requests",
                r"service unavailable", r"temporarily",
                r"connection refused", r"connection reset",
                r"retry later", r"throttl",
            ],
            ErrorCategory.DETERMINISTIC: [
                r"400", r"401", r"403", r"404", r"405",
                r"invalid", r"not found", r"forbidden",
                r"unauthorized", r"bad request",
                r"schema violation", r"validation error",
                r"missing required", r"type mismatch",
            ],
            ErrorCategory.STOCHASTIC: [
                r"parse error", r"malformed", r"json decode",
                r"empty output", r"hallucination",
                r"format violation", r"schema mismatch",
                r"unexpected token", r"invalid response",
            ],
            ErrorCategory.CORRUPTION: [
                r"checksum", r"integrity", r"corrupt",
                r"partial write", r"inconsistent state",
                r"checkpoint", r"file system", r"i/o error",
            ],
            ErrorCategory.CASCADE: [
                r"cascade", r"propagat", r"downstream",
                r"dependency failed", r"chain failure",
                r"circuit breaker open", r"bulkhead",
            ],
        }

    def classify(self, error: Dict) -> Dict:
        error_msg = error.get("message", "")
        error_type = error.get("type", "")

        best_category = ErrorCategory.DETERMINISTIC
        best_score = 0

        for category, patterns in self.signatures.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, error_msg, re.IGNORECASE):
                    score += 1
                if re.search(pattern, error_type, re.IGNORECASE):
                    score += 1
            if score > best_score:
                best_score = score
                best_category = category

        return {
            "category": best_category.value,
            "retryable": best_category in (ErrorCategory.TRANSIENT, ErrorCategory.STOCHASTIC),
            "confidence": min(best_score / 3, 1.0),
            "severity": "low" if best_category == ErrorCategory.TRANSIENT else
                        "medium" if best_category == ErrorCategory.STOCHASTIC else
                        "high",
        }
```

### Retry Engine with Exponential Backoff

```python
import time
import random
from typing import Dict, Optional, Callable

class RetryEngine:
    def __init__(self, base_delay: float = 1.0, max_delay: float = 60.0,
                 max_retries: int = 5, jitter: bool = True):
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.max_retries = max_retries
        self.jitter = jitter

    async def execute(self, operation: Callable, context: Dict) -> Dict:
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                result = await operation()
                return {
                    "success": True,
                    "attempt": attempt,
                    "result": result,
                }
            except Exception as e:
                last_error = e
                if attempt < self.max_retries:
                    delay = self._calculate_delay(attempt)
                    time.sleep(delay)
        return {
            "success": False,
            "attempt": self.max_retries,
            "error": str(last_error),
        }

    def _calculate_delay(self, attempt: int) -> float:
        delay = self.base_delay * (2 ** (attempt - 1))
        delay = min(delay, self.max_delay)
        if self.jitter:
            delay = delay * (0.5 + random.random())
        return delay
```

### Checkpoint Manager

```python
import json
import hashlib
import os
from typing import Optional, Dict
from pathlib import Path
import time

class CheckpointManager:
    def __init__(self, store_dir: str = "./checkpoints"):
        self.store_dir = Path(store_dir)
        self.store_dir.mkdir(parents=True, exist_ok=True)

    def save_checkpoint(self, agent_id: str, state: Dict) -> str:
        state_str = json.dumps(state, sort_keys=True)
        integrity = hashlib.sha256(state_str.encode()).hexdigest()
        checkpoint = {
            "state": state,
            "timestamp": time.time(),
            "integrity": integrity,
        }
        filename = f"{agent_id}_{int(time.time())}.ckpt"
        with open(self.store_dir / filename, "w") as f:
            json.dump(checkpoint, f)
        return filename

    def load_latest_checkpoint(self, agent_id: str) -> Optional[Dict]:
        checkpoints = sorted(
            self.store_dir.glob(f"{agent_id}_*.ckpt"),
            key=lambda f: f.stat().st_mtime,
            reverse=True,
        )
        if not checkpoints:
            return None
        with open(checkpoints[0], "r") as f:
            checkpoint = json.load(f)
        return checkpoint

    def validate_checkpoint(self, checkpoint: Dict) -> bool:
        expected = hashlib.sha256(
            json.dumps(checkpoint.get("state", {}), sort_keys=True).encode()
        ).hexdigest()
        return checkpoint.get("integrity") == expected

    def restore_state(self, agent_id: str) -> Optional[Dict]:
        checkpoint = self.load_latest_checkpoint(agent_id)
        if checkpoint and self.validate_checkpoint(checkpoint):
            return checkpoint["state"]
        return None

class FallbackChain:
    def __init__(self):
        self.providers: list = []
        self.current_index: int = 0

    def add_provider(self, name: str, callable_fn: Callable, is_available_fn: Callable = None):
        self.providers.append({
            "name": name,
            "callable": callable_fn,
            "available": is_available_fn or (lambda: True),
        })

    async def execute(self, *args, **kwargs) -> Dict:
        errors = []
        for i, provider in enumerate(self.providers):
            if not provider["available"]():
                errors.append(f"{provider['name']}: unavailable")
                continue
            try:
                result = await provider["callable"](*args, **kwargs)
                return {
                    "success": True,
                    "provider": provider["name"],
                    "result": result,
                    "fallback_chain_length": i,
                }
            except Exception as e:
                errors.append(f"{provider['name']}: {str(e)}")
                self.current_index = i + 1
        return {
            "success": False,
            "errors": errors,
            "providers_exhausted": len(self.providers),
        }
```

### Dead Letter Queue

```python
import json
import time
from typing import List, Dict, Optional
from pathlib import Path

class DeadLetterQueue:
    def __init__(self, queue_dir: str = "./dead_letter"):
        self.queue_dir = Path(queue_dir)
        self.queue_dir.mkdir(parents=True, exist_ok=True)

    def enqueue(self, task: Dict, error: Dict):
        entry = {
            "task": task,
            "error": error,
            "timestamp": time.time(),
            "retry_count": 0,
            "id": hashlib.md5(json.dumps(task, sort_keys=True).encode()).hexdigest()[:12],
        }
        with open(self.queue_dir / f"dlq_{entry['id']}.json", "w") as f:
            json.dump(entry, f, indent=2)

    def process_sweep(self, max_retry: int = 3, ttl_hours: int = 48):
        for filepath in sorted(self.queue_dir.glob("dlq_*.json")):
            with open(filepath, "r") as f:
                entry = json.load(f)
            if entry["retry_count"] >= max_retry:
                continue
            if time.time() - entry["timestamp"] > ttl_hours * 3600:
                entry["status"] = "expired"
                self._write_entry(filepath, entry)
                continue
            entry["retry_count"] += 1
            self._write_entry(filepath, entry)

    def _write_entry(self, filepath: Path, entry: Dict):
        with open(filepath, "w") as f:
            json.dump(entry, f, indent=2)
```

### Error Budget Manager

```python
from typing import Dict
from datetime import datetime, timedelta

class ErrorBudgetWindow:
    def __init__(self, period_days: int = 30, total_budget: int = 1000):
        self.period_days = period_days
        self.total_budget = total_budget
        self.consumed = 0
        self.window_start = datetime.utcnow()

    def consume(self, units: int = 1) -> Dict:
        self._refresh_window()
        self.consumed += units
        remaining = self.total_budget - self.consumed
        return {
            "consumed": self.consumed,
            "total": self.total_budget,
            "remaining": max(0, remaining),
            "remaining_pct": round(max(0, remaining) / self.total_budget * 100, 1),
            "exhausted": remaining <= 0,
        }

    def _refresh_window(self):
        if datetime.utcnow() - self.window_start > timedelta(days=self.period_days):
            self.consumed = 0
            self.window_start = datetime.utcnow()
```

## Architecture Decision Trees

### Recovery Strategy Selection

```
Error occurred. Is it retryable?
├── Yes (transient)
│   ├── Retry budget available?
│   │   ├── Yes → Exponential backoff + jitter retry
│   │   └── No → Circuit breaker opens → Fallback chain
│   └── Time-sensitive operation?
│       └── Fast retry (100ms base) instead of standard (1s base)
│
├── Yes (stochastic LLM error)
│   ├── Temperature > 0.3? → Reduce temperature, stricter prompt
│   ├── Different model available? → Try different model family
│   └── All failed → Fallback to simpler deterministic process
│
├── No (deterministic)
│   ├── Input correctable? → Auto-correct + retry once
│   └── Not correctable → Dead letter queue + user notification
│
└── No (corruption/cascade)
    ├── Checkpoint available? → Restore from last valid checkpoint
    └── No checkpoint → Full state reset with user notification
```

### Checkpoint Strategy Selection

```
How critical is the operation?
├── Idempotent operation (read, query, search)
│   └── No checkpoint needed → Retry from scratch on failure
│
├── Non-idempotent with side effects
│   ├── Short operation (< 1s) → Checkpoint after completion
│   └── Long operation (> 1s) → Periodic checkpointing every N steps
│
├── Multi-step transaction
│   ├── Compensation available → Checkpoint + rollback on failure
│   └── No compensation → Write-ahead logging + atomic commit
│
└── External resource allocation (API calls, writes)
    └── Checkpoint BEFORE and AFTER each external interaction
```

## Production Considerations

- **Checkpoint cleanup**: Auto-expire checkpoints older than 7 days. Use TTL-based cleanup to prevent disk growth. For critical systems, archive last 30 days to cold storage.
- **Error budget burn rate alerting**: Alert when error budget is consumed at >10% per day (would exhaust 30-day budget in 10 days). Trigger incident response at 50% consumption.
- **Dead letter queue monitoring**: Monitor DLQ depth with alerts at threshold (100, 500, 1000). Automated sweep every 15 minutes with exponential backoff between sweeps.
- **Graceful degradation tiers**: Define 3 tiers: (1) reduced functionality with warning, (2) degraded read-only mode, (3) graceful shutdown with state preservation.

## Security Considerations

- **Error message leakage**: Error messages may contain sensitive information (file paths, stack traces, API keys). Strip sensitive data before logging or returning to users.
- **Retry amplification attacks**: Malicious actors could trigger rapid retry storms. Implement per-client retry quotas and use circuit breakers to prevent cascading retries.
- **Checkpoint tampering**: Signed checkpoints with HMAC to prevent rollback attacks where attackers restore old state. Verify integrity before every restore.
- **Dead letter queue access control**: DLQ contains failed operations that may include sensitive input data. Restrict DLQ access to authorized operators only.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Blind retry without classification | Deterministic errors wasted retries and delayed resolution | Classify before retry; deterministic errors skip retries |
| Uniform retry delay for all errors | Short operations wait too long, long operations not long enough | Per-error-category delay base: transient=1s, stochastic=0.5s, corruption=5s |
| No circuit breaker in retry loops | Retry storms overwhelm failing dependencies | Circuit breaker opens after N consecutive failures |
| Single checkpoint overwrite | Crashes during checkpoint write corrupt state | Write-ahead log: prepare → write → finalize |
| Infinite retry on rate limits | API provider bans your application | Respect Retry-After headers, honor per-endpoint limits |
| Deleting checkpoints on success | Lose ability to reconstruct execution path | Keep last N checkpoints, archive after pipeline completion |
| Without error budgets for new features | Rapid deployments degrade reliability | Freeze deployments when error budget depleted |
| No fallback for critical dependencies | Single point of failure takes down entire agent | Define fallback chain with degraded mode for each critical dependency |

## Performance Optimization

- **Async checkpoint writes**: Write checkpoints asynchronously after acknowledging step completion. Don't block execution on write completion unless within a critical section.
- **Batch error log writes**: Aggregate error logs for 100ms or 10 errors before writing to storage. Reduces I/O overhead by 90% in high-error scenarios.
- **Circuit breaker state caching**: Cache circuit breaker state in-memory with 1-second TTL. Avoid DB/Redis queries on every tool call to check breaker state.
- **Exponential backoff with capped delay**: Use decorrelated jitter ($delay \times random(0.5, 1.5)$) instead of full jitter to provide more consistent inter-request spacing at scale.
- **Checkpoint deduplication**: Before writing a checkpoint, compute hash of current state. Skip write if identical to last checkpoint. Reduces storage I/O by 40-60% for unchanged states.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with resilience patterns, retry protocols, and chaos engineering frameworks.
-->
