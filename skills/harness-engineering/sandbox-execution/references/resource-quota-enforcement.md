# Resource Quota Enforcement for Sandboxes

Bounding CPU, memory, processes, disk, I/O, wall-clock time and cost for sandboxed agent workloads, so a runaway or malicious task cannot starve the host or other tenants. Covers cgroup v2 controls, container and Kubernetes settings, microVM sizing, and harness-level budgets.

## What to Limit

| Resource | Failure without a limit | Control |
|----------|-------------------------|---------|
| Memory | Host OOM, neighbours killed | cgroup `memory.max`, no swap |
| CPU | Noisy neighbour, latency spikes | cgroup `cpu.max`, `cpu.weight` |
| Processes/threads | Fork bomb | cgroup `pids.max` |
| Disk space | Host disk full | Size-limited volumes/tmpfs, project quotas, VM disk size |
| Inodes | Filesystem exhausted by tiny files | Filesystem/project quotas, file-count checks |
| Disk I/O | Starved storage for others | cgroup `io.max` / `io.weight` |
| Network bandwidth | Exfiltration, abuse | Proxy limits, tc/Firecracker rate limiters |
| Wall-clock time | Hung tasks hold capacity | Harness timeouts + kill |
| Open files | Descriptor exhaustion | `RLIMIT_NOFILE` |
| Spend (LLM tokens, API calls) | Cost blow-up | Harness budget counters |

## cgroup v2 Interface

```bash
CG=/sys/fs/cgroup/sandboxes/task-123
mkdir -p "$CG"
echo "+cpu +memory +pids +io" > /sys/fs/cgroup/sandboxes/cgroup.subtree_control   # on the parent

echo 2G        > "$CG/memory.max"        # hard limit; OOM kill inside the group when exceeded
echo 1536M     > "$CG/memory.high"       # throttle/reclaim before hitting max
echo 0         > "$CG/memory.swap.max"   # no swap for sandboxes
echo "200000 100000" > "$CG/cpu.max"     # 2 CPUs: 200 ms quota per 100 ms period
echo 256       > "$CG/pids.max"
echo "8:0 rbps=104857600 wbps=52428800" > "$CG/io.max"   # per-device bytes/s (major:minor)

echo "$PID" > "$CG/cgroup.procs"
```

Monitor `memory.events` (`oom_kill` counter), `pids.events` (`max`), and `cpu.stat` (`nr_throttled`, `throttled_usec`) to report why a task failed.

Set `memory.oom.group=1` so an OOM kills the whole task group instead of leaving a partially dead process tree.

## Containers

```bash
docker run --rm \
  --memory 2g --memory-swap 2g \
  --cpus 2 \
  --pids-limit 256 \
  --ulimit nofile=4096:4096 \
  --storage-opt size=10G \
  --tmpfs /tmp:rw,size=256m \
  sandbox-runtime:2026.10 ./run-task
```

- `--memory-swap` equal to `--memory` disables swap for the container.
- `--storage-opt size=` requires a storage driver that supports quotas (e.g. overlay2 on XFS with `pquota`); otherwise limit writes with size-limited volumes.
- tmpfs counts against the container's memory limit.

## Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sandbox-task-123
  namespace: agent-sandboxes
  labels: { role: sandbox }
spec:
  runtimeClassName: gvisor            # or kata, per isolation tier
  automountServiceAccountToken: false
  activeDeadlineSeconds: 1800         # wall-clock limit for the pod
  restartPolicy: Never
  containers:
    - name: task
      image: registry.example.com/sandbox-runtime:2026.10
      resources:
        requests: { cpu: "1", memory: 1Gi, ephemeral-storage: 2Gi }
        limits:   { cpu: "2", memory: 2Gi, ephemeral-storage: 10Gi }
      securityContext:
        runAsNonRoot: true
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities: { drop: ["ALL"] }
      volumeMounts:
        - { name: workspace, mountPath: /workspace }
  volumes:
    - name: workspace
      emptyDir: { sizeLimit: 5Gi }
```

Namespace guards:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata: { name: sandbox-quota, namespace: agent-sandboxes }
spec:
  hard:
    pods: "200"
    requests.cpu: "200"
    requests.memory: 400Gi
    limits.memory: 800Gi
    requests.ephemeral-storage: 1Ti
---
apiVersion: v1
kind: LimitRange
metadata: { name: sandbox-defaults, namespace: agent-sandboxes }
spec:
  limits:
    - type: Container
      default: { cpu: "1", memory: 1Gi, ephemeral-storage: 4Gi }
      defaultRequest: { cpu: 250m, memory: 512Mi, ephemeral-storage: 1Gi }
      max: { cpu: "4", memory: 8Gi }
```

- Exceeding `ephemeral-storage` or `emptyDir.sizeLimit` evicts the pod.
- Set the process limit per pod at the kubelet (`podPidsLimit`) for fork-bomb protection.
- Memory limit = request avoids overcommit surprises for sandboxes; CPU limits cause throttling, which is acceptable for batch sandboxes.

## MicroVMs

- Size vCPUs and memory at boot (`machine-config` in Firecracker: `vcpu_count`, `mem_size_mib`); the guest cannot exceed them.
- Put the VMM process itself in a cgroup (Firecracker's jailer supports cgroup settings) to cap VMM overhead and I/O.
- Block device size bounds disk; Firecracker drive and network rate limiters bound I/O and bandwidth.

## Harness-Level Budgets

Kernel limits stop resource exhaustion; the harness enforces task-level budgets:

```python
from __future__ import annotations

import time
from dataclasses import dataclass, field


class BudgetExceeded(Exception):
    pass


@dataclass(slots=True)
class TaskBudget:
    max_seconds: float
    max_tool_calls: int
    max_llm_tokens: int
    started: float = field(default_factory=time.monotonic)
    tool_calls: int = 0
    llm_tokens: int = 0

    def charge_tool_call(self) -> None:
        self.tool_calls += 1
        self._check()

    def charge_tokens(self, n: int) -> None:
        self.llm_tokens += n
        self._check()

    def _check(self) -> None:
        elapsed = time.monotonic() - self.started
        if elapsed > self.max_seconds:
            raise BudgetExceeded(f"wall clock {elapsed:.0f}s > {self.max_seconds:.0f}s")
        if self.tool_calls > self.max_tool_calls:
            raise BudgetExceeded(f"tool calls {self.tool_calls} > {self.max_tool_calls}")
        if self.llm_tokens > self.max_llm_tokens:
            raise BudgetExceeded(f"tokens {self.llm_tokens} > {self.max_llm_tokens}")
```

Pair with per-command timeouts (`subprocess.run(..., timeout=...)`, killing the whole process group) so a single tool call cannot hang the task.

## Kill Semantics

1. Soft signal (SIGTERM) to the process group, grace period.
2. SIGKILL; for cgroups v2 write `1` to `cgroup.kill` to kill every process in the group atomically.
3. Destroy sandbox (container/VM), release volumes.
4. Record the reason (OOM, pids, timeout, budget) in task results.

## Fairness Across Tenants

- Per-tenant quotas (concurrent sandboxes, CPU-hours per day).
- Weighted CPU (`cpu.weight`) for priority classes instead of only hard caps.
- Admission control: queue tasks when capacity is exhausted rather than overcommitting.

## Checklist

- [ ] Memory (no swap), CPU, pids, disk, I/O limits on every sandbox
- [ ] Wall-clock deadline at runtime and harness levels
- [ ] Token/tool-call/cost budgets enforced by the harness
- [ ] Whole-group kill on violation; reason recorded
- [ ] Namespace quotas and defaults for Kubernetes sandboxes
- [ ] Limit events (OOM, throttling, evictions) monitored and alerted
