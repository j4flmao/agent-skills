---
name: architectural-constraints
description: >
  Defines, monitors, and enforces execution-level sandboxing, performance SLA boundaries, resource limits, security isolation, network egress filters, compliance tracking, and transactional state updates.
  This skill enforces: resource throttling, PII scrubbers, import restrictions, network proxy compliance, atomic file locks, and circuit breakers.
  Do NOT use for: basic UI prompt formatting, developer code style checks, or application routing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [harness-engineering, architectural-constraints, security, isolation, sandboxing]
---

# Architectural Constraints Skill

## Purpose
Establishes execution safety and sandboxing rules for LLM agents. Prevents malicious command injections, infinite code execution loops, unmitigated token spending, data leakage (PII/tokens), network exfiltration, and file corruption during crash scenarios. This skill governs how agent runtimes interact with system memory, processes, external networks, and files.

---

## Core Principles
1. **Zero-Trust Execution**: Run all user-generated or LLM-suggested scripts inside ephemeral, restricted namespace sandboxes (e.g. docker mounts or process namespaces).
2. **Defensive Resource Budgeting**: Throttle CPU, memory, and network rates. If an agent loops, immediately terminate the process using SIGKILL limits.
3. **Data Anonymization at Source**: Scrub PII (Credit Cards, SSNs, Emails) and API credentials from logging systems before writing to disk or sending over HTTP.
4. **Hermetic Outbound Networking**: Exclude direct internet connectivity. Restrict egress via verified gateway proxy endpoints.
5. **Transactional Checkpoint States**: Ensure writing checkpoints (e.g., `progress.txt`) is atomic, utilizing file locks and backup recovery patterns.

---

## Agent Protocol

### Triggers
Use this skill when processing:
- Arbitrary script executions or console commands requested by the agent loop.
- Sensitive environment variable injection or API credential handling.
- Checking container runtime boundaries (throttling CPU/Memory, network boundaries).
- Transactional file updates and writing tracking logs.
- Handling downstream service failures, rate limits, and client retries.

### Input Context Required
- **Active Code Script**: The candidate shell script, command, or program source to execute.
- **Resource Constraints**: CPU limit shares (e.g., 1 core), memory quota (e.g., 2GB).
- **Target Gateway Proxy**: HTTP proxy address (e.g., `http://proxy.internal:3128`).
- **Data Compliance Policies**: HIPAA, GDPR, or general PII scrubbing regex configurations.

### Output Artifact
- **Compliant Execution Outcome**: Sanitized stdout/stderr logs from isolated sandboxes.
- **Transaction Safe State Checkpoint**: Updated progress JSON/YAML files synced atomically to disk.
- **Auditing Trail Log**: Sanity reports containing PII verification results and execution times.

### Response Formats
For programmatic compilation, the execution report must be delivered in this format:

```json
{
  "execution_success": true,
  "status_code": 0,
  "execution_time_seconds": 1.42,
  "sla_violation": false,
  "pii_detected_and_masked": true,
  "audit_trail_id": "audit-6ad1752e-18d3",
  "payload": {
    "stdout": "[MASKED_EMAIL] verified user permissions successfully.",
    "stderr": ""
  }
}
```

---

## Decision Matrix for Architectural Controls

The agent must route decisions based on constraints:

```
Runtime Request Type?
├── Code Execution/Subprocess
│   ├── Safe core imports only → Execute inside Docker sandbox with resource limit (2GB, 1 CPU).
│   └── Violates import allowlist → Terminate and throw ImportRestrictionError.
│
├── Outgoing Web API Request
│   ├── Target in domain allowlist → Route via HTTPS Secure Forward Proxy (Port 3128).
│   └── Domain not authorized → Terminate and return Egress Blocked warning.
│
├── Save Execution Progress
│   ├── Lockfile available → Lock file, write to temp, os.fsync, atomically replace target.
│   └── Lockfile active (locked) → Wait for timeout, raise lock error.
│
└── Downstream Call Failure
    ├── Transient (503/429) → Apply Exponential Backoff with Jitter; check Circuit Breaker.
    └── Permanent (401/403) → Fail fast, raise exception immediately.
```

---

## Detailed Architectural Overview

Architectural constraints coordinate at the lower layers of the agent runner to intercept requests before they interface with the operating system or internet:

```
                  +--------------------------------+
                  |       Agent Orchestrator       |
                  +--------------------------------+
                                  │
                                  ▼
                  +--------------------------------+
                  |  Constraint Verification Loop  |
                  +--------------------------------+
                                  │
      ┌───────────────────────────┼───────────────────────────┐
      ▼                           ▼                           ▼
+-----------+               +-----------+               +-----------+
| Security  |               | Network   |               | Resource  |
| Sandbox   |               | Gateway   |               | Throttler |
+-----------+               +-----------+               +-----------+
      │                           │                           │
      └───────────────────────────┼───────────────────────────┘
                                  ▼
                  +--------------------------------+
                  |   Isolated Operating System    |
                  +--------------------------------+
```

---

## Workflow Steps

### Phase 1: Pre-Execution Parameter Validation
1. **Verify JSON Schema**: Check input parameters against structural types.
2. **Sanitize Shell Script**: Filter out pipe and semicolon injection operators (`;`, `&`, `|`, `` ` ``).
3. **Audit Import Statement**: Intercept module lookups; enforce standard library boundaries.

### Phase 2: Resource Allocation Allocation
1. **Bound Container Limits**: Instruct container environments to allocate CPU and memory constraints.
2. **Set Timeouts**: Inject max runtime bounds into executing processes to prevent infinite wait cycles.
3. **Verify Disk Write Limits**: Mount transient folders with disk quotas (e.g. 512MB).

### Phase 3: Outgoing Egress Inspection
1. **Parse Destination URL**: Check target domain strings against allowed services list.
2. **Configure Proxy Variables**: Bind proxy credentials to the isolated process environment.
3. **Reject Internal IPs**: Explicitly block traffic targeting private subnets.

### Phase 4: Execution Output Scrubbing
1. **Extract Console Logs**: Read stdout and stderr buffers after process termination.
2. **Apply PII Regex Scrubbers**: Replace matches matching Emails, SSNs, or credit cards with generic tags.
3. **Clean System Secrets**: Strip any environment keys leaked in stderr stack traces.

### Phase 5: Transaction State Commit
1. **Check State Lockfile**: Wait for and lock target database file indicators.
2. **Perform Temp Write**: Write JSON status properties to `.tmp` files.
3. **Synchronize OS Buffers**: Enforce `os.fsync` calls to write changes to physical disks.
4. **Swap and Replace**: Atomically replace old status data and release the lock.

### Phase 6: Fault Recovery & Redundancy Check
1. **Inspect Status Codes**: Classify execution errors into transient or permanent failures.
2. **Evaluate Circuit Breakers**: Read circuit states; block requests if failure counters are tripped.
3. **Apply Retries with Jitter**: Delay execution retry runs using exponential delays.

---

## Extended Troubleshooting Guide

When implementing architectural constraints, the system handles the following anomalies:

| Symptom | Primary Cause | Mitigation Action |
| :--- | :--- | :--- |
| **ImportRestrictionError** | Code script imported unauthorized standard or external library. | Verify importing rules; run only modules listed in dependency config. |
| **CircuitBreakerOpenException** | Downstream dependencies went offline, triggering failure counts. | Switch caller logic to local heuristics or await recovery period. |
| **LockTimeoutException** | Concurrent subagents failed to release `.lock` files. | Implement exponential jitter on lock acquisition loops. |
| **Memory Limit SIGKILL (Code 137)** | Sandboxed process consumed > 2.0GB memory, killed by OS. | Profile heap allocations; chunk large file reads instead of loading entire datasets. |
| **Egress Blocked Warning** | Outgoing request hit unauthorized API or IP endpoint. | Add domain patterns to proxy configurations if the endpoint is authorized. |

---

## Complete Execution Scenario

This sequence details how a sandboxed command is run and logged:

```
[Agent Shell Command] ──► Validate Imports ──► Resource Throttling setup
                                                      │
[Clean Logs] ◄── Mask PII (Emails/SSNs) ◄── Subprocess execution runs
      │
[Write Audit Log] ──► Request Lock ──► Atomic Swap write state ──► Release Lock
```

---

## Rules and Guidelines
- **Rule 1**: Subprocess execution must never use the host shell namespace. Always use isolated containers or restricted child processes.
- **Rule 2**: Domain rules must reject private networks (such as `10.0.0.0/8` or AWS metadata host `169.254.169.254`).
- **Rule 3**: Do not run background loop timers or sleep commands. Use the system scheduler tool for time-based triggers.
- **Rule 4**: Output formatting must enforce PII scrubbing prior to returning stdout payloads to the user agent window.
- **Rule 5**: Always use atomic swap write patterns when saving status to `progress.txt` or database structures.

---

## Reference Guides
Below are links to the reference guides detailing the algorithms, data schemas, mathematical formulations, and Python implementations used in this architectural constraints framework:

- [performance-sla-boundaries.md](references/performance-sla-boundaries.md)
  Specifies latency and throughput limits, adaptive timeout formulas, and a Python SLA monitor.
- [security-isolation-protocols.md](references/security-isolation-protocols.md)
  Details container isolation, code sandbox configurations, parameter JSON schemas, and command validators.
- [resource-allocation-limits.md](references/resource-allocation-limits.md)
  Defines CPU/memory allocations, token rate limit formulas, and a Python token bucket limiter.
- [compliance-governance-standards.md](references/compliance-governance-standards.md)
  Covers PII protection regex patterns, audit logging, and automated log cleaning modules.
- [dependency-isolation-strategies.md](references/dependency-isolation-strategies.md)
  Details packaging allowlists, HTTP egress forward proxy rules, and custom Python import sentinels.
- [state-consistency-guarantees.md](references/state-consistency-guarantees.md)
  Examines crash recovery models, file lock rules, transaction protocols, and atomic file savers.
- [network-topology-restrictions.md](references/network-topology-restrictions.md)
  Details subnet topology, network egress rules, private IP blocking, and proxy environment validators.
- [fault-tolerance-redundancy.md](references/fault-tolerance-redundancy.md)
  Explains circuit breakers, retry exponential backoff with jitter math, and resilient calling classes.

---

## Handoff
For database isolation configurations, hand off to `ai-vector-databases`. For runtime orchestrator loops, hand off to `core-master-orchestrator`. For logging aggregation rules, hand off to `ai-observability`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
