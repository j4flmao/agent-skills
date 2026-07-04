---
name: devops-network-infrastructure
description: >
  Comprehensive network infrastructure management skill covering BGP routing,
  eBPF tracing, CDN compute, load balancing, and advanced packet filtering.
version: 2.0.0
author: j4flmao
license: MIT
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - network
  - devops
  - infrastructure
  - bgp
  - ebpf
---

# DevOps Network Infrastructure Skill

## Purpose - comprehensive description
This skill provides advanced capabilities for managing and diagnosing network infrastructure. It enables deep observability, routing management, and edge computing orchestration.

## Core Principles
1. Visibility over obscurity
2. Declarative state management
3. Minimal overhead tracing
4. Edge-first processing
5. Resilience through redundancy

## Agent Protocol
Triggers: Network failure, high latency, routing anomalies.
Input Context Required: Topology map, traffic logs, AS numbers.
Output Artifact: Network diagnostic report, routing tables.
Response Formats:
```json
{
  "status": "success",
  "bgp_routes": 1500,
  "ebpf_hooks_active": 4
}
```

## Decision Matrix
```
[Start] -> [Latency Issue?] -> (Yes) -> [Check eBPF] -> [Analyze Drop]
          -> (No) -> [BGP Route Flap?] -> [Restart Session]
```

## Detailed Architectural Overview
```
+-------+     +-------+     +------+
|  BGP  | --> |  CDN  | --> | eBPF |
+-------+     +-------+     +------+
```

## Workflow Steps
1. Phase 1: Ingestion
   1. Collect packets
   2. Parse headers
   3. Store flows
2. Phase 2: Analysis
   1. Match signatures
   2. Correlate events
   3. Identify drops
3. Phase 3: Mitigation
   1. Update routes
   2. Deploy filters
   3. Flush caches
4. Phase 4: Verification
   1. Ping endpoints
   2. Check latency
   3. Verify BGP
5. Phase 5: Reporting
   1. Generate stats
   2. Alert Slack
   3. Log to ELK
6. Phase 6: Maintenance
   1. Rotate logs
   2. Update GeoIP
   3. Refresh certificates

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Packet loss | Congestion | Traffic shaping |
| BGP flap | Link failure | Hold-down timer adjustment |
| CDN miss | Cache eviction| Pre-warm cache |
| High CPU | eBPF overhead | Optimize map lookups |
| SYN flood| DDoS attack | SYN cookies |
| Slow SSL | Cipher mismatch| Update TLS config |

## Complete Execution Scenario
```
Init -> BGP Sync -> eBPF Attach -> CDN Purge -> Done
```

## Rules and Guidelines
1. Do not attach unsafe eBPF programs.
2. Always verify BGP AS paths.
3. Keep CDN cache hit ratios above 90%.
4. Monitor link utilization constantly.
5. Use IPv6 whenever possible.

## Reference Guides
1. [BGP Basics](references/bgp_basics.md)
2. [BGP Advanced](references/bgp_advanced.md)
3. [eBPF Tracing](references/ebpf_tracing.md)
4. [eBPF Maps](references/ebpf_maps.md)
5. [CDN Edge Computing](references/cdn_edge.md)
6. [CDN Caching](references/cdn_caching.md)
7. [Network Troubleshooting](references/network_troubleshooting.md)
8. [Infrastructure Code](references/infra_code.md)

## Handoff
Pass to cloud-infrastructure skill for VM provisioning.

<!-- Compression footer: XYZ123 -->






















































































































































