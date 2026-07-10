---
name: kubernetes-patterns
description: >
  Advanced Kubernetes patterns, including eBPF tracing,
  Prometheus monitoring, and sidecar implementations.
  Audited and enhanced.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [kubernetes, ebpf, prometheus, sidecar, devops, tracing, alerting]
---
# Kubernetes Patterns

## Purpose - comprehensive description
This skill covers the most advanced edge cases of Kubernetes operational patterns.
It implements deep eBPF tracing scenarios, complex high-cardinality PromQL alerts,
and sophisticated Sidecar container implementations for service meshes and telemetry.

## Core Principles
1. Decouple observability from application logic using highly constrained Sidecars.
2. Leverage eBPF for zero-instrumentation, kernel-level networking and tracing.
3. Implement deterministic PromQL alerts with pre-calculated recording rules.
4. Enforce strict resource limits (requests=limits) on all sidecar containers.
5. Prioritize fail-closed for security mechanisms and fail-open for telemetry.

## Agent Protocol
Triggers: Performance degradation, manifest generation requests, network tracing tasks.
Input Context Required: Cluster RBAC, Node kernel versions, Prometheus scrape configs.
Output Artifact: Validated YAML manifests, BPF C code, PromQL rules.
Response Formats:
```json
{
  "pattern_applied": "sidecar-injection",
  "status": "success",
  "metrics_exposed": true
}
```

## Decision Matrix
```text
[Telemetry Need]
   |
   +--> Network Level? --> [eBPF DaemonSet] --> Generate bpf() loader
   |
   +--> App Level? --> [Sidecar Container] --> Generate MutatingWebhook
           |
           +--> High Cardinality? --> [Prometheus Recording Rules]
```

## Detailed Architectural Overview
```text
+-------------------+       +-----------------------+
|   Kube-APIServer  | <---> | MutatingWebhook (Go)  |
+-------------------+       +-----------------------+
          |                             |
          v                             v
+-------------------+       +-----------------------+
|   Worker Node     |       |  Injected Pod Spec    |
|  +-------------+  |       |  - App Container      |
|  | eBPF Probe  |  |       |  - Envoy/FluentBit    |
|  +-------------+  |       +-----------------------+
+-------------------+
```

## Workflow Steps
1. Phase 1: Assessment
   1. Check kernel version for eBPF support.
   2. Evaluate sidecar resource overhead.
   3. Review PromQL metric cardinality limits.
2. Phase 2: eBPF Compilation
   1. Write kernel C code for kprobes.
   2. Compile using BCC or Cilium ebpf.
   3. Deploy via privileged DaemonSet.
3. Phase 3: Sidecar Injection
   1. Define sidecar container spec.
   2. Configure volume mounts for shared memory.
   3. Deploy MutatingAdmissionWebhook.
4. Phase 4: Prometheus Configuration
   1. Define ServiceMonitors.
   2. Create high-cardinality PromQL recording rules.
   3. Set up Alertmanager routes.
5. Phase 5: Validation
   1. Simulate network traffic.
   2. Verify eBPF tracepoints trigger.
   3. Assert PromQL alert fires on threshold.
6. Phase 6: Lifecycle Management
   1. Rotate sidecar TLS certificates.
   2. Update eBPF maps.
   3. Tune resource limits based on usage.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| eBPF load failure | Kernel version mismatch | Update node kernel or compile for specific target |
| Sidecar OOMKilled | Memory limits too low | Increase limits or optimize sidecar config |
| PromQL timeout | Query evaluating too many series | Implement recording rules to pre-aggregate |
| Webhook failure | Cert manager issue | Renew webhook TLS certificates |
| Missing traces | eBPF map full | Increase eBPF map size |
| High CPU usage | Sidecar polling too frequently | Change sidecar to event-driven model |

## Complete Execution Scenario
```text
[Start Request] -> [Check Compatibility] -> [Deploy Webhook] -> [Inject Sidecar] -> [Load eBPF] -> [Scrape Prom] -> [Finish]
```

## Rules and Guidelines
1. Never deploy eBPF probes without verifying memory map bounds.
2. Sidecars must drop all capabilities and run as non-root.
3. PromQL alerts must have a 'for' duration of at least 1m.
4. Always use immutable tags for sidecar images.
5. Document all eBPF kprobes used in the cluster registry.

## Reference Guides
- [eBPF Core Reference](references/ebpf-core.md)
- [PromQL Advanced](references/promql-adv.md)
- [Sidecar Patterns](references/sidecar-patterns.md)
- [K8s Webhooks](references/k8s-webhooks.md)
- [Tracing Scenarios](references/tracing-scenarios.md)
- [Alert Configs](references/alert-configs.md)
- [Telemetry Mesh](references/telemetry-mesh.md)
- [Security Guidelines](references/security-guidelines.md)

## Handoff
Refer to the `monitoring-stack` and `security-policies` skills for related contexts.
<!-- COMPRESSION_FOOTER HTML comment -->
