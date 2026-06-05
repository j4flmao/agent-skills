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

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with resilience patterns, retry protocols, and chaos engineering frameworks.
-->
