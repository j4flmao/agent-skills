---
name: sandbox-execution
description: >
  Use this skill when the user says 'sandbox agent code', 'run untrusted code',
  'gVisor', 'Firecracker', 'microVM', 'durable execution', 'sandbox snapshot'.
  Designs, implements, and operates durable execution
  environments with microVM isolation, snapshotting, forking, and secure agent
  runtime sandboxes. Covers the sandbox-as-a-tool pattern, Temporal/durable
  execution frameworks, gVisor/Kata Containers/Firecracker isolation, workspace
  management, state persistence across sessions, filesystem sandboxing, network
  isolation, and resource quota enforcement for production agent systems.
  Do NOT use for: general container image hardening (security/container-security)
  or Kubernetes admission policy (devops/policy-as-code).
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
   Restate) persist workflow progress and replay it after a crash; side-effecting steps
   (activities) are retried at-least-once, so they must be idempotent.

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
  "allowed_egress": ["pypi.org:443", "files.pythonhosted.org:443"],
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
│     ├─ YES → Use gVisor (runsc); systrap platform by default, KVM on bare metal
│     │        └─ Apply read-only rootfs + dropped capabilities
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
│  │  │ Provision│→ │ Execute  │→ │ Snapshot │→ │ Teardown │  │   │
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
│  │ (cpu.max)   │  │ (memory.max) │  │ (io.max, cgroup v2)   │  │
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
│    Set cpu.max="200000 100000" (2 cores)                    │
│    Set memory.max=2147483648 (2GB)                           │
│    Mount /workspace as rw overlay                            │
│    Route egress via allow-list proxy: *.amazonaws.com:443    │
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

Command denylists (`"rm -rf" in command`) are trivially bypassed and are not a security
control; isolation comes from the runtime boundary. The manager below drives a real
container runtime (Docker with gVisor's `runsc` runtime registered) and enforces limits
through runtime flags plus an external wall-clock timeout.

```python
from __future__ import annotations

import asyncio
import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

log = logging.getLogger("sandbox")


@dataclass(frozen=True, slots=True)
class SandboxConfig:
    image: str = "python:3.12-slim"
    runtime: str = "runsc"            # gVisor; use "runc" only for trusted code
    cpus: float = 1.0
    memory_mb: int = 512
    pids_limit: int = 256
    max_wallclock_s: int = 300
    network: str = "none"             # deny-all; attach an egress-proxy network explicitly
    read_only_rootfs: bool = True


@dataclass(slots=True)
class SandboxInstance:
    id: str
    config: SandboxConfig
    expires_at: datetime
    status: str = "running"


class SandboxError(RuntimeError):
    pass


async def _run(*argv: str, timeout_s: float) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        *argv, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout_s)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise SandboxError(f"command timed out after {timeout_s}s: {argv[:4]}")
    return proc.returncode or 0, out.decode(errors="replace"), err.decode(errors="replace")


class SandboxManager:
    def __init__(self, max_concurrent: int = 10) -> None:
        self.max_concurrent = max_concurrent
        self.sandboxes: dict[str, SandboxInstance] = {}

    async def create(self, config: SandboxConfig | None = None) -> SandboxInstance:
        cfg = config or SandboxConfig()
        if len(self.sandboxes) >= self.max_concurrent:
            raise SandboxError(f"max concurrent sandboxes ({self.max_concurrent}) reached")
        sid = f"sbx-{secrets.token_hex(4)}"
        argv = [
            "docker", "run", "-d", "--name", sid, f"--runtime={cfg.runtime}",
            f"--cpus={cfg.cpus}", f"--memory={cfg.memory_mb}m", f"--pids-limit={cfg.pids_limit}",
            f"--network={cfg.network}", "--cap-drop=ALL", "--security-opt=no-new-privileges",
            "--tmpfs", "/workspace:rw,size=256m", "-w", "/workspace",
        ]
        if cfg.read_only_rootfs:
            argv.append("--read-only")
        argv += [cfg.image, "sleep", str(cfg.max_wallclock_s)]
        code, _, err = await _run(*argv, timeout_s=60)
        if code != 0:
            raise SandboxError(f"failed to start sandbox {sid}: {err.strip()}")
        expires = datetime.now(timezone.utc) + timedelta(seconds=cfg.max_wallclock_s)
        inst = SandboxInstance(sid, cfg, expires)
        self.sandboxes[sid] = inst
        log.info("sandbox created id=%s runtime=%s", sid, cfg.runtime)
        return inst

    async def execute(self, sandbox_id: str, argv: list[str], timeout_s: float = 60) -> dict[str, object]:
        inst = self.sandboxes.get(sandbox_id)
        if inst is None or inst.status != "running":
            raise SandboxError(f"sandbox {sandbox_id} not found or not running")
        remaining = (inst.expires_at - datetime.now(timezone.utc)).total_seconds()
        if remaining <= 0:
            await self.destroy(sandbox_id)
            raise SandboxError(f"sandbox {sandbox_id} exceeded wall-clock limit")
        started = datetime.now(timezone.utc)
        code, out, err = await _run("docker", "exec", sandbox_id, *argv, timeout_s=min(timeout_s, remaining))
        elapsed_ms = (datetime.now(timezone.utc) - started).total_seconds() * 1000
        # Truncate output so a chatty process cannot flood the agent context.
        return {"exit_code": code, "stdout": out[-20_000:], "stderr": err[-20_000:], "duration_ms": elapsed_ms}

    async def destroy(self, sandbox_id: str) -> None:
        inst = self.sandboxes.pop(sandbox_id, None)
        if inst is None:
            return
        code, _, err = await _run("docker", "rm", "-f", sandbox_id, timeout_s=30)
        if code != 0:
            log.error("failed to remove sandbox id=%s err=%s", sandbox_id, err.strip())
            raise SandboxError(f"failed to remove sandbox {sandbox_id}")

    async def reap_expired(self) -> list[str]:
        """Call from an external scheduler/watchdog, never from inside the sandbox."""
        now = datetime.now(timezone.utc)
        expired = [sid for sid, s in self.sandboxes.items() if now >= s.expires_at]
        for sid in expired:
            await self.destroy(sid)
        return expired
```

Snapshots are runtime-specific (Firecracker snapshot API, `runsc checkpoint`/`restore`,
CRIU-based `docker checkpoint` on an experimental daemon, or ZFS/btrfs snapshots of the
workspace volume). Keep them behind their own interface rather than pretending one call
works for every runtime.

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
│   └── gVisor (user-space kernel) or microVM (Firecracker, Kata)
│       ├── gVisor: syscalls served by the Sentry, small host-kernel surface
│       ├── MicroVM: hardware virtualization boundary with its own guest kernel
│       ├── Snapshot/restore for fast startup (Firecracker)
│       └── Escapes remain possible: patch hosts, keep defense in depth
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
