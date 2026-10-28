---
name: sre-chaos-engineering
description: >
  Use this skill when the user says 'fault injection internals', 'tc netem', 'how does chaos mesh inject faults', 'syscall error injection', 'bpf_override_return', 'blast radius containment', 'chaos abort conditions', 'stress-ng cpu chaos', 'network partition test'. Explains how faults are injected at the kernel and network layer (tc/netem, iptables, cgroups, eBPF error injection, process signals) and how to contain blast radius with namespaces, scoping, and automated abort conditions. Do NOT use for: chaos program rollout, GameDays and tool selection (devops-chaos-engineering), load testing (quality load-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [sre, chaos-engineering, fault-injection, netem, ebpf, blast-radius]
---

# Chaos Engineering: Fault-Injection Mechanics

## Purpose
Every chaos tool ultimately uses a small set of Linux mechanisms. Understanding them lets you predict what an experiment really does, scope it safely, guarantee rollback, and reproduce faults by hand when a tool is unavailable.

## Agent Protocol

### Trigger
"fault injection internals", "tc netem", "how chaos mesh injects", "syscall error injection", "bpf_override_return", "blast radius", "abort conditions", "stress-ng", "network partition".

### Input Context
- Target (pod, node, VM), environment (staging/prod), runtime (containerd, Kubernetes).
- Fault type and steady-state metrics (SLIs) with abort thresholds.

### Output Artifact
Experiment spec with mechanism, scope, abort and rollback steps. No file unless requested.

### Response Format
```
Hypothesis: {steady state holds when ...}
Mechanism: {netem delay|iptables drop|cgroup stress|signal|eBPF/fail-injection}
Scope: {namespace/pods/labels, % of targets, duration}
Abort: {SLI query + threshold}
Rollback: {exact command / automatic}
```

### Completion Criteria
- [ ] Mechanism and its exact effect stated (which interface, direction, which processes).
- [ ] Automatic rollback (duration-bound) and manual rollback command documented.
- [ ] Abort condition tied to an SLI.

## Mechanisms
| Fault | Linux mechanism | Notes |
|---|---|---|
| Latency, jitter, loss, corruption, duplication, reorder | `tc qdisc ... netem` on an interface (egress) | Ingress needs an IFB device redirect |
| Bandwidth limit | `tc` `tbf`/`htb` | |
| Partition / blackhole | `iptables`/`nftables` DROP or REJECT rules, or `ip route` blackhole | REJECT fails fast; DROP causes timeouts |
| DNS failure | Intercept/redirect DNS or drop UDP/TCP 53 | |
| CPU / memory pressure | `stress-ng` inside the target's cgroup (or a sidecar sharing it) | Memory stress can trigger the OOM killer for the real app |
| Disk I/O latency / errors | FUSE-based injection (Chaos Mesh IOChaos), device-mapper `dm-delay`/`dm-flakey` | |
| Process kill / pause | `SIGKILL`, `SIGSTOP`/`SIGCONT` | Pause simulates GC stalls/hangs |
| Syscall errors | eBPF `bpf_override_return` on kprobes, or kernel fault-injection framework (`fail_function`) | Only on functions marked `ALLOW_ERROR_INJECTION`; needs `CONFIG_BPF_KPROBE_OVERRIDE` |
| Clock skew | `time` namespace or LD_PRELOAD/vDSO tricks (Chaos Mesh TimeChaos) | |
| Node/instance failure | Cloud API stop/terminate, AZ isolation via security groups/NACLs (AWS FIS) | |

## Pod-Scoped Network Fault by Hand
Container tools enter the pod's network namespace so only that pod is affected:
```bash
# Find the pod's PID (containerd) and enter its network namespace
PID=$(crictl inspect --output go-template --template '{{.info.pid}}' "$(crictl ps --name checkout -q | head -1)")
nsenter -t "$PID" -n tc qdisc add dev eth0 root netem delay 200ms 50ms distribution normal loss 1%
# ... observe ...
nsenter -t "$PID" -n tc qdisc del dev eth0 root          # rollback
```
Scope to a destination only (don't break health checks/DNS):
```bash
nsenter -t "$PID" -n tc qdisc add dev eth0 root handle 1: prio
nsenter -t "$PID" -n tc qdisc add dev eth0 parent 1:3 handle 30: netem delay 300ms
nsenter -t "$PID" -n tc filter add dev eth0 protocol ip parent 1:0 prio 3 u32 match ip dst 10.20.0.0/16 flowid 1:3
```
Always wrap manual injections in a timer-based cleanup (`timeout`, `trap ... EXIT`) so a lost SSH session can't leave the fault in place.

## Same Fault Declaratively (Chaos Mesh)
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: checkout-to-payments-delay
  namespace: shop
spec:
  action: delay
  mode: fixed-percent
  value: "25"
  selector:
    namespaces: [shop]
    labelSelectors:
      app: checkout
  direction: to
  target:
    mode: all
    selector:
      namespaces: [shop]
      labelSelectors:
        app: payments
  delay:
    latency: "300ms"
    jitter: "50ms"
  duration: "5m"
```
Chaos Mesh's daemon enters the target pod's namespaces and applies the same `tc`/`iptables`/`ipset` rules; deleting the object or reaching `duration` removes them.

## Blast-Radius Containment
1. **Scope**: namespaces + label selectors; percentage modes (`one`, `fixed`, `fixed-percent`, `random-max-percent`); single AZ or single canary cell first.
2. **Time-box**: every experiment has a `duration`; tooling must clean up on controller crash (verify by killing the controller during a dry run in staging).
3. **Isolation primitives**: network namespaces confine tc/iptables to one pod; cgroups confine stress to one container; avoid node-level faults on shared nodes.
4. **Abort conditions**: evaluate SLIs continuously (e.g. error ratio > 2× baseline, p99 > SLO threshold) and stop automatically — AWS FIS stop conditions (CloudWatch alarms), Litmus probes, Chaos Mesh Workflow status checks, or a CI job that deletes the chaos object.
5. **Guardrails**: RBAC restricting who can create chaos CRs; namespace annotations/allow-lists for injection; no experiments during incidents or freezes.

## Anti-Patterns
- netem on the node's primary interface → affects every pod and the kubelet.
- Injecting on egress only and assuming request *and* response are delayed (netem delays only the shaped direction).
- `iptables -F` as cleanup → wipes kube-proxy/CNI rules.
- Memory stress without limits → evicts neighbours.
- No abort automation: "we'll watch the dashboard".

## Checklist
- [ ] Hypothesis + steady-state SLI recorded before injection.
- [ ] Mechanism scoped to target namespaces/pods/destinations.
- [ ] Duration bound + verified cleanup path.
- [ ] Automated abort on SLI breach.
- [ ] Findings turned into tickets; experiment re-run after fixes.

## References
- `../references/disaster_recovery.md`
- `../references/incident_management.md`
- Related skill: `skills/devops/chaos-engineering/SKILL.md`.
