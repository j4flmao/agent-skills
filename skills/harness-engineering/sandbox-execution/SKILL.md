---
name: sandbox-execution
description: >
  Comprehensive skill for designing, implementing, and operating durable execution
  environments with microVM isolation, snapshotting, forking, and secure agent
  runtime sandboxes. Covers the sandbox-as-a-tool pattern, Temporal/durable
  execution frameworks, gVisor/Kata Containers/Firecracker isolation, workspace
  management, state persistence across sessions, filesystem sandboxing, network
  isolation, and resource quota enforcement for production agent systems.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - harness-engineering
  - sandbox
  - isolation
  - durable-execution
  - microvm
  - snapshotting
  - security
  - containers
  - resource-management
---

# Sandbox Execution

## Purpose

This skill provides the complete architectural and operational knowledge required to
build production-grade sandboxed execution environments for AI agent systems. Agents
operating in unrestricted host environments pose catastrophic risks—arbitrary code
execution, filesystem corruption, network exfiltration, and runaway resource
consumption. This skill addresses every layer of the isolation stack: from lightweight
namespace-based sandboxing through hardware-virtualized microVMs, from ephemeral
stateless containers to durable execution frameworks that survive process crashes.

The skill covers the full lifecycle of a sandboxed agent runtime: provisioning an
isolated workspace, enforcing filesystem mount policies, applying network segmentation,
imposing CPU/memory/disk quotas, persisting and restoring agent state via snapshots,
and enabling fork-based speculative execution. It treats the sandbox itself as a
composable tool that agents can invoke, configure, and tear down programmatically.

## Core Principles

1. **Defense in Depth**: Never rely on a single isolation boundary. Layer namespace
   isolation, seccomp filters, capability dropping, and hypervisor-level separation
   to create multiple independent containment rings.

2. **Least Privilege by Default**: Every sandbox starts with zero capabilities, no
   network access, a read-only root filesystem, and no access to host devices. Access
   is granted explicitly and auditably through policy declarations.

3. **Durability over Ephemerality**: Agent work products must survive sandbox restarts,
   host reboots, and infrastructure failures. Durable execution frameworks (Temporal,
   Restate) provide exactly-once semantics and automatic workflow recovery.

4. **Snapshot-Fork-Merge Execution**: Complex reasoning tasks benefit from
   checkpoint-and-branch execution models. Snapshots capture full sandbox state;
   forks create parallel exploration branches; merges reconcile results.

5. **Observable Resource Boundaries**: Every resource limit must be measurable,
   alertable, and enforceable. Silent OOM kills and unbounded CPU usage destroy
   reproducibility and cost predictability.

## Agent Protocol

### Triggers
- Agent requests code execution in an untrusted environment
- Workflow requires durable execution guarantees (crash recovery, retries)
- Multi-agent system needs workspace isolation between agents
- Task requires speculative execution via snapshot-fork patterns
- Production deployment mandates resource quota enforcement

### Input Context Required
- Execution environment specification (language runtime, dependencies)
- Isolation level requirement (namespace, gVisor, microVM, bare-metal VM)
- Resource budget (CPU cores, memory MB, disk MB, max wall-clock seconds)
- Network policy (deny-all, allow-list, egress-only)
- State persistence requirements (ephemeral, checkpoint interval, full snapshot)

### Output Artifact
- Sandbox configuration manifest (JSON/YAML)
- Execution trace with resource utilization metrics
- Snapshot artifacts (filesystem diff, memory state, execution cursor)
- Cleanup confirmation with resource deallocation proof

### Response Formats

```json
{
  "sandbox_id": "sbx-a1b2c3d4",
  "isolation_level": "microvm",
  "status": "running",
  "resource_allocation": {
    "cpu_cores": 2,
    "memory_mb": 1024,
    "disk_mb": 4096,
    "max_wall_clock_s": 300
  },
  "network_policy": "egress-allow-list",
  "allowed_egress": ["api.openai.com:443", "pypi.org:443"],
  "filesystem_mounts": [
    {"host": "/data/workspace/agent-7", "guest": "/workspace", "mode": "rw"},
    {"host": "/data/shared/models", "guest": "/models", "mode": "ro"}
  ],
  "snapshot": {
    "enabled": true,
    "interval_s": 60,
    "last_snapshot_id": "snap-x9y8z7",
    "storage_backend": "s3://snapshots/sbx-a1b2c3d4/"
  },
  "execution_trace": {
    "start_time": "2026-06-04T09:00:00Z",
    "elapsed_s": 42.7,
    "cpu_seconds_used": 31.2,
    "peak_memory_mb": 612,
    "disk_written_mb": 87.3
  }
}
```

## Decision Matrix

```
START: Agent requests execution environment
│
├─ Is code trusted and from verified source?
│  ├─ YES → Use lightweight namespace sandbox (cgroup + seccomp)
│  │        ├─ Needs network? → Apply egress-only allow-list policy
│  │        └─ No network → Apply deny-all network policy
│  │
│  └─ NO → Is execution latency-critical (<100ms boot)?
│     ├─ YES → Use gVisor (runsc) with KVM platform
│     │        └─ Apply strict seccomp + read-only rootfs
│     │
│     └─ NO → Is maximum isolation required?
│        ├─ YES → Use Firecracker microVM
│        │        ├─ Needs GPU? → Use Kata Containers with GPU passthrough
│        │        └─ No GPU → Standard Firecracker with virtio-net
│        │
│        └─ NO → Use Kata Containers with default runtime
│
├─ Does workflow need crash recovery?
│  ├─ YES → Wrap in Temporal durable execution workflow
│  │        ├─ Long-running (>5min)? → Enable heartbeat + checkpoint
│  │        └─ Short (<5min) → Standard activity with retry policy
│  │
│  └─ NO → Run as ephemeral one-shot execution
│
└─ Does task benefit from speculative execution?
   ├─ YES → Enable snapshot-fork pattern
   │        ├─ Create checkpoint before branch point
   │        ├─ Fork N parallel sandboxes from snapshot
   │        └─ Evaluate results, select best, garbage-collect rest
   │
   └─ NO → Linear execution with optional periodic checkpoints
```

## Detailed Architectural Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     AGENT ORCHESTRATOR                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Task Queue   │  │ Sandbox Pool │  │ Snapshot Registry      │  │
│  │ (Priority)   │  │ Manager      │  │ (S3 / Local / NFS)     │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬───────────┘  │
│         │                │                        │              │
│         ▼                ▼                        ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SANDBOX LIFECYCLE CONTROLLER                 │   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │ Provison │→ │ Execute  │→ │ Snapshot │→ │ Teardown │  │   │
│  │  └─────────┘  └──────────┘  └──────────┘  └──────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                │                        │              │
└─────────┼────────────────┼────────────────────────┼──────────────┘
          │                │                        │
          ▼                ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ISOLATION LAYER                                │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Namespace     │  │  gVisor      │  │  Firecracker          │ │
│  │  Sandbox       │  │  (runsc)     │  │  microVM              │ │
│  │  ┌───────────┐ │  │  ┌────────┐  │  │  ┌─────────────────┐ │ │
│  │  │ cgroups v2│ │  │  │ Sentry │  │  │  │ Guest Kernel    │ │ │
│  │  │ seccomp   │ │  │  │ Gofer  │  │  │  │ virtio-blk/net  │ │ │
│  │  │ namespaces│ │  │  │ KVM    │  │  │  │ vsock/mmds      │ │ │
│  │  └───────────┘ │  │  └────────┘  │  │  └─────────────────┘ │ │
│  └───────────────┘  └──────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │                │                        │
          ▼                ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RESOURCE ENFORCEMENT                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ CPU Quota    │  │ Memory Limit │  │ Disk I/O Throttle     │  │
│  │ (CFS/BW)    │  │ (hard OOM)   │  │ (blkio cgroup)        │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Network BW   │  │ PID Limit    │  │ Wall-Clock Timeout    │  │
│  │ (tc/ebpf)    │  │ (pids.max)   │  │ (SIGKILL watchdog)    │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Sandbox Lifecycle Diagram

```
  IDLE ──► PROVISIONING ──► READY ──► EXECUTING ──► SNAPSHOTTING
   ▲                                      │              │
   │                                      ▼              ▼
   │                                   PAUSED ◄──── FORKING
   │                                      │              │
   │                                      ▼              ▼
   └──────────────── TERMINATED ◄──── CLEANUP ◄──── MERGING
```

## Workflow Steps

### Phase 1: Environment Specification
1. Parse the agent's execution request to extract language, dependencies, and I/O requirements.
2. Select the appropriate isolation level using the Decision Matrix above.
3. Generate the sandbox configuration manifest with resource limits and mount policies.
4. Validate the manifest against organizational security policies and quota budgets.

### Phase 2: Sandbox Provisioning
1. Allocate resources from the cluster-wide resource pool (CPU, memory, disk, network).
2. Initialize the isolation boundary (create namespaces, launch microVM, configure gVisor).
3. Mount filesystems according to the manifest (read-only rootfs, writable workspace, shared volumes).
4. Apply network policies (iptables rules, eBPF programs, virtio-net filtering).

### Phase 3: Execution & Monitoring
1. Inject the agent's code and input artifacts into the sandbox workspace.
2. Launch execution under the configured resource constraints with a wall-clock watchdog.
3. Stream stdout/stderr and resource telemetry to the observability pipeline.
4. Enforce progressive resource warnings (80% memory → soft warning, 95% → hard throttle).

### Phase 4: State Persistence
1. Trigger periodic snapshots at the configured interval (filesystem diff + execution state).
2. Compress and upload snapshots to the configured storage backend (S3, NFS, local).
3. Maintain a snapshot chain with parent references for incremental restore capability.
4. Validate snapshot integrity with checksums and test-restore on a canary sandbox.

### Phase 5: Fork & Speculative Execution
1. Identify branch points in the agent's reasoning where multiple strategies should be explored.
2. Create a snapshot at the branch point and fork N child sandboxes from that snapshot.
3. Execute each branch in parallel with independent resource quotas and monitoring.
4. Evaluate branch results using the agent's scoring function and select the optimal path.

### Phase 6: Cleanup & Teardown
1. Extract output artifacts and execution logs from the sandbox workspace.
2. Deallocate all resources and destroy the isolation boundary.
3. Garbage-collect unreferenced snapshots older than the retention policy threshold.
4. Emit a cleanup confirmation event with final resource utilization summary.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Sandbox boot time exceeds 5 seconds | Firecracker microVM with large rootfs image | Use minimal Alpine-based rootfs; enable snapshot-resume boot; pre-warm VM pool |
| OOM kill with no warning | Memory limit set without swap and no soft limit | Configure memory.high (soft) at 80% of memory.max; enable OOM score adjustment |
| Snapshot restore fails with checksum mismatch | Incomplete upload due to network interruption | Enable multipart upload with server-side checksums; implement retry with verification |
| Network policy blocks legitimate API calls | Overly restrictive egress allow-list | Audit agent's required endpoints; add to allow-list; use DNS-based policies for dynamic IPs |
| Filesystem mount permission denied | Incorrect UID/GID mapping in user namespace | Configure id-mapped mounts; ensure sandbox user maps to host UID owning the volume |
| Fork creates too many concurrent sandboxes | Unbounded fork factor in speculative execution | Set max_fork_factor=4; implement fork budget per workflow; queue excess forks |
| Disk I/O latency spikes during snapshot | Snapshot writes compete with agent workload I/O | Use copy-on-write snapshots (btrfs/ZFS); schedule snapshots during idle periods |
| Agent process hangs after restore from snapshot | Timer/socket file descriptors invalid post-restore | Implement post-restore hooks to re-initialize timers and reconnect sockets |

## Complete Execution Scenario

```
Agent Request: "Execute Python data analysis with network access to S3"
│
▼
┌─────────────────────────────────────────────────────────────┐
│ 1. PARSE REQUEST                                             │
│    Language: Python 3.11                                     │
│    Dependencies: pandas, numpy, boto3                        │
│    Network: Egress to *.amazonaws.com:443                    │
│    Resource budget: 2 CPU, 2GB RAM, 10GB disk, 600s          │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SELECT ISOLATION: gVisor (runsc) with KVM                 │
│    Rationale: Untrusted code, needs fast boot, no GPU        │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PROVISION SANDBOX                                         │
│    Create cgroup: /sys/fs/cgroup/sandbox-sbx-a1b2c3d4        │
│    Set cpu.max=200000/100000 (2 cores)                       │
│    Set memory.max=2147483648 (2GB)                           │
│    Mount /workspace as rw overlay                            │
│    Apply iptables egress rule for *.amazonaws.com:443        │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. EXECUTE with 60s snapshot interval                        │
│    t=0s   : Launch python analysis.py                        │
│    t=42s  : Snapshot snap-001 captured (fs: 1.2GB)           │
│    t=104s : Snapshot snap-002 captured (fs: 2.8GB)           │
│    t=187s : Execution complete, exit code 0                  │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. EXTRACT & CLEANUP                                         │
│    Output: /workspace/results.csv (4.2MB)                    │
│    Peak CPU: 1.8 cores | Peak Memory: 1.4GB                 │
│    Total disk written: 3.1GB                                 │
│    Snapshots retained: snap-002 (latest only, per policy)    │
│    Sandbox sbx-a1b2c3d4 destroyed                            │
└─────────────────────────────────────────────────────────────┘
```

## Rules and Guidelines

1. **Never run agent code on the host**: All agent-generated code must execute inside an
   isolation boundary. Even "trusted" internal agents use at minimum namespace sandboxing.

2. **Fail-closed on policy violations**: If an agent attempts an operation not explicitly
   permitted by its sandbox policy (network access, filesystem write, syscall), the
   operation must be denied and logged, never silently allowed.

3. **Snapshot before mutating**: Before any destructive or irreversible operation, the
   sandbox controller must capture a snapshot. This enables rollback and forensic analysis.

4. **Enforce wall-clock timeouts unconditionally**: Every sandbox has a maximum wall-clock
   lifetime enforced by an external watchdog. No sandbox may run indefinitely, even if
   the agent's task is incomplete.

5. **Audit all sandbox lifecycle events**: Provisioning, execution, snapshotting, forking,
   and teardown events must be emitted to the audit log with correlation IDs linking to
   the originating agent request.

## Reference Guides

- [Sandbox-as-a-Tool Pattern](references/sandbox-as-tool-pattern.md) — Architecture for exposing sandboxes as composable agent tools
- [Durable Execution Frameworks](references/durable-execution-frameworks.md) — Temporal, Restate, and durable execution patterns
- [MicroVM Isolation](references/microvm-isolation.md) — gVisor, Kata Containers, and Firecracker deep dive
- [Workspace Isolation](references/workspace-isolation.md) — Isolated workspace provisioning and management
- [State Persistence & Snapshots](references/state-persistence-snapshots.md) — Snapshotting, forking, and state restoration
- [Filesystem Sandboxing](references/filesystem-sandboxing.md) — Filesystem isolation, overlay mounts, and access policies
- [Network Isolation Policies](references/network-isolation-policies.md) — Network segmentation and egress control
- [Resource Quota Enforcement](references/resource-quota-enforcement.md) — CPU, memory, disk, and PID quota enforcement

## Handoff

- **agent-observability**: Sandbox telemetry feeds into the observability pipeline for tracing and monitoring
- **tool-orchestration**: Sandboxes are invoked as tools within the broader tool orchestration framework
- **safety-guardrails**: Sandbox policies enforce the safety constraints defined by the guardrails skill

<!-- COMPRESSION: sandbox-execution | durable-exec + microvm-isolation + snapshot-fork + resource-quota | v2.0.0 -->

## Implementation Patterns

### Sandbox Manager

```python
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
import asyncio
import uuid
import time

@dataclass
class SandboxConfig:
    max_cpu_cores: float = 1.0
    max_memory_mb: int = 512
    max_disk_mb: int = 1024
    max_wallclock_seconds: int = 300
    allowed_egress_domains: List[str] = field(default_factory=lambda: ["api.openai.com"])
    blocked_commands: List[str] = field(default_factory=lambda: ["rm -rf", "shutdown", "reboot"])
    snapshot_enabled: bool = True
    network_enabled: bool = True
    read_only_filesystem: bool = False

@dataclass
class SandboxInstance:
    id: str
    config: SandboxConfig
    status: str = "provisioning"
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    last_activity: datetime = field(default_factory=datetime.now)
    cpu_usage: float = 0.0
    memory_usage_mb: int = 0
    snapshot_id: Optional[str] = None

class SandboxManager:
    def __init__(self):
        self.sandboxes: Dict[str, SandboxInstance] = {}
        self.max_concurrent = 10
        self._watchdog_task = None

    async def create_sandbox(self, config: Optional[SandboxConfig] = None) -> SandboxInstance:
        if len(self.sandboxes) >= self.max_concurrent:
            raise RuntimeError(f"Max concurrent sandboxes ({self.max_concurrent}) reached")

        instance = SandboxInstance(
            id=str(uuid.uuid4())[:8],
            config=config or SandboxConfig(),
        )
        instance.expires_at = datetime.fromtimestamp(
            time.time() + instance.config.max_wallclock_seconds
        )
        instance.status = "running"
        self.sandboxes[instance.id] = instance
        return instance

    async def execute(self, sandbox_id: str, command: str) -> Dict:
        sandbox = self.sandboxes.get(sandbox_id)
        if not sandbox or sandbox.status != "running":
            return {"error": "Sandbox not found or not running"}

        # Check for blocked commands
        for blocked in sandbox.config.blocked_commands:
            if blocked in command:
                return {"error": f"Command blocked: {blocked}"}

        # Check expiration
        if datetime.now() > sandbox.expires_at:
            sandbox.status = "expired"
            return {"error": "Sandbox has expired"}

        sandbox.last_activity = datetime.now()
        # Simulate execution
        return {
            "stdout": f"[sandbox-{sandbox_id}] Executed: {command[:100]}",
            "stderr": "",
            "exit_code": 0,
            "duration_ms": 150,
        }

    async def create_snapshot(self, sandbox_id: str) -> Optional[str]:
        sandbox = self.sandboxes.get(sandbox_id)
        if not sandbox or not sandbox.config.snapshot_enabled:
            return None
        snapshot_id = f"snap-{uuid.uuid4()[:8]}"
        sandbox.snapshot_id = snapshot_id
        return snapshot_id

    async def restore_snapshot(self, snapshot_id: str) -> Optional[SandboxInstance]:
        for sandbox in self.sandboxes.values():
            if sandbox.snapshot_id == snapshot_id:
                new_config = SandboxConfig(
                    **{k: v for k, v in sandbox.config.__dict__.items() if not k.startswith("_")}
                )
                return await self.create_sandbox(new_config)
        return None

    async def destroy_sandbox(self, sandbox_id: str):
        sandbox = self.sandboxes.pop(sandbox_id, None)
        if sandbox:
            sandbox.status = "destroyed"

    async def get_metrics(self) -> Dict:
        total = len(self.sandboxes)
        running = sum(1 for s in self.sandboxes.values() if s.status == "running")
        avg_cpu = sum(s.cpu_usage for s in self.sandboxes.values()) / max(total, 1)
        avg_mem = sum(s.memory_usage_mb for s in self.sandboxes.values()) / max(total, 1)
        return {
            "total_sandboxes": total,
            "running": running,
            "available": self.max_concurrent - total,
            "avg_cpu_percent": round(avg_cpu * 100, 1),
            "avg_memory_mb": round(avg_mem, 1),
        }

    async def start_watchdog(self):
        async def watchdog_loop():
            while True:
                await asyncio.sleep(10)
                now = datetime.now()
                to_destroy = [
                    sid for sid, s in self.sandboxes.items()
                    if s.expires_at and now > s.expires_at
                ]
                for sid in to_destroy:
                    await self.destroy_sandbox(sid)
        self._watchdog_task = asyncio.create_task(watchdog_loop())
```

### Resource Quota Enforcer

```python
from typing import Dict, Optional
import time

class ResourceQuotaEnforcer:
    def __init__(self):
        self.usage: Dict[str, Dict] = {}
        self.limits = {
            "cpu_seconds": 3600,
            "memory_mb_seconds": 1024 * 3600,
            "network_egress_mb": 100,
            "disk_write_mb": 500,
            "api_calls": 10000,
        }

    def check_quota(self, sandbox_id: str, resource: str, amount: float = 1.0) -> bool:
        if resource not in self.limits:
            return True
        if sandbox_id not in self.usage:
            self.usage[sandbox_id] = {k: 0 for k in self.limits}
        current = self.usage[sandbox_id].get(resource, 0)
        return (current + amount) <= self.limits[resource]

    def consume(self, sandbox_id: str, resource: str, amount: float = 1.0):
        if sandbox_id not in self.usage:
            self.usage[sandbox_id] = {k: 0 for k in self.limits}
        self.usage[sandbox_id][resource] = self.usage[sandbox_id].get(resource, 0) + amount

    def get_usage(self, sandbox_id: str) -> Dict:
        return self.usage.get(sandbox_id, {})

    def reset(self, sandbox_id: str):
        self.usage.pop(sandbox_id, None)
```

## Architecture Decision Trees

### Sandbox Isolation Level

```
What's the trust level of the code being executed?
├── Trusted code (first-party, reviewed)
│   └── Process-level sandbox
│       ├── Resource limits via cgroups
│       ├── Timeout enforcement
│       └── Filesystem read-only
│
├── Semi-trusted code (third-party, OSS)
│   └── Container sandbox (Docker)
│       ├── Full container isolation
│       ├── Network policy (egress only to allowed domains)
│       ├── Read-only root filesystem
│       └── Memory/CPU limits via Docker
│
├── Untrusted code (user-submitted, AI-generated)
│   └── MicroVM sandbox (Firecracker, gVisor)
│       ├── Hardware-level isolation
│       ├── No escape from VM boundary
│       ├── Snapshot/fork for fast startup
│       └── Kernel-level security
│
└── Highly sensitive (PII processing, payments)
    └── Air-gapped sandbox
        ├── No network access
        ├── Ephemeral filesystem (wiped on exit)
        ├── Full audit logging of every operation
        └── Manual approval for executions
```

### Snapshot Strategy

```
When to create snapshots?
├── Before destructive operations
│   └── DROP TABLE, DELETE, rm -rf, format
├── After significant computation
│   └── Long-running ML training, data processing
├── Periodic checkpoints
│   └── Every N operations, every M minutes
└── On demand
    └── User request before experiment
```

## Production Considerations

- **Sandbox pooling**: Pre-provision a pool of warm sandboxes for low-latency startup. Replenish pool as sandboxes are consumed. Target <100ms sandbox acquisition time.
- **Aggressive timeout enforcement**: Use external watchdog process (not sandbox-internal). Watchdog runs as a separate process with SIGKILL capability. Prevent sandboxes from disabling the timeout.
- **Network policy as deny-by-default**: Block all egress by default. Allow only explicitly configured domains. DNS-level + IP-level filtering for defense in depth.
- **Sandbox telemetry**: Emit metrics for sandbox lifecycle events (create, destroy, timeout, error). Track sandbox age distribution, utilization rates, and failure modes.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Same isolation for all code | Over-isolated trusted code, under-isolated untrusted | Tiered isolation based on trust level |
| No resource limits per sandbox | One sandbox can starve others | Enforce CPU/memory/disk limits per sandbox |
| Sandbox can disable its own timeout | Timeout can be overridden | External watchdog process |
| No snapshot before destruction | Lose ability to debug failures | Snapshot before destroy, keep for N days |
| Allowing unrestricted egress | Data exfiltration via network | Deny-by-default egress policy |
| Long-lived sandboxes | Resource fragmentation | Max lifetime (wall-clock limit) for all sandboxes |

## Performance Optimization

- **Sandbox pooling with warm starts**: Pre-create sandboxes with common dependencies pre-loaded. Reduces startup time from seconds to milliseconds. Refresh pool asynchronously when below threshold.
- **Copy-on-write filesystem**: Use overlayfs or similar for sandbox filesystems. Multiple sandboxes share a base layer. Only modified files consume additional space.
- **Snapshot-based fast restore**: Use MicroVM snapshots for near-instant sandbox restoration. Snapshot the base OS + runtime, restore in <100ms.
