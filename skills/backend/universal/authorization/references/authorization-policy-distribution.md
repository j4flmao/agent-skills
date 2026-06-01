# Authorization Policy Distribution

## Overview
How policies get from definition (code/UI) to enforcement (policy engine) across distributed systems.

## Distribution Models

| Model | Latency | Consistency | Complexity | Best For |
|-------|---------|-------------|------------|----------|
| Embedded (Casbin) | 0ms (in-process) | Eventual (file sync) | Low | Single service, monolith |
| Bundle Pull (OPA) | ~1-5s | Eventual (poll interval) | Medium | K8s, sidecar pattern |
| gRPC Stream (OPA) | ~100ms | Near-real-time | High | High-frequency updates |
| Central DB (SpiceDB) | Real-time | Strong (single store) | Medium | ReBAC at scale |
| Webhook Push (Cerbos) | ~500ms | Eventual | Medium | SaaS policy management |

## Bundle Distribution (OPA)

### Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  CI/CD      │────>│ Bundle Server │────>│ OPA Sidecar │
│  (build)    │     │ (S3/GCS)     │     │ (enforce)   │
└─────────────┘     └──────────────┘     └─────────────┘
                          │                    │
                          │                    │
                          └────────────────────┘
                         Health check / Discovery
```

### Bundle Configuration
```yaml
# OPA sidecar config
services:
  bundle-server:
    url: https://policies.internal.example.com
    credentials:
      bearer:
        token: ${BUNDLE_TOKEN}

bundles:
  authz:
    service: bundle-server
    resource: bundles/authz.tar.gz
    polling:
      min_delay_seconds: 30
      max_delay_seconds: 120
    signing:
      keyid: bundle-key-1
      scope: write

decision_logs:
  console: true
```

### Versioning Strategy
```
bundles/
├── v1.0.0/
│   └── authz.tar.gz
├── v1.1.0/
│   └── authz.tar.gz
└── latest/
    └── authz.tar.gz   (alias, updated on each release)
```

Each bundle contains:
- `.manifest` — bundle metadata, roots, OPA version requirement
- Policy files (`.rego`)
- Data files (JSON) — role definitions, permission mappings

## gRPC Streaming (OPA)

For near-real-time policy updates without polling:
```protobuf
service PolicySync {
  rpc WatchBundles(WatchRequest) returns (stream BundleEvent);
  rpc WatchData(WatchRequest) returns (stream DataEvent);
}

message BundleEvent {
  string bundle_name = 1;
  string version = 2;
  bytes bundle = 3;  // signed tarball
}
```

## Change Propagation (Casbin)

Casbin uses a watcher interface for distributed policy sync:
```go
// Redis watcher for Casbin
w, _ := rediswatcher.NewWatcher("redis://localhost:6379", rediswatcher.WatcherOptions{
    Options: rediswatcher.Options{
        Channel: "/casbin/policy-updates",
    },
})
e, _ := casbin.NewEnforcer("model.conf", "policy.csv")
e.SetWatcher(w)

// On any instance policy change, all instances auto-update
e.AddPolicy("alice", "invoice:123", "approve")
// Watcher broadcasts → all instances reload policy
```

## Policy Change Rollout

### Canary Deployment
```
1. Deploy policy v2 to 5% of instances
2. Monitor: deny rate increase? error rate?
3. If stable → roll out to 25%, then 100%
4. If issues → rollback to v1
```

### Blue/Green
```
Old policies (blue) remain active until new policies (green) pass:
- Audit log comparison (what would green deny that blue allows?)
- Dry-run mode: evaluate new policies but don't enforce
- Switch traffic when dry-run results match expectations
```

## Consistency Guarantees

| Strategy | Consistency | Failure Mode |
|----------|-------------|-------------|
| Poll every N seconds | Eventual (up to N delay) | Stale policy allows/denies incorrectly |
| gRPC watch | Near real-time | Connection drop → fallback to poll |
| Central DB query | Strong | DB down → all requests denied |
| Embedded load | On restart | Stale until restart |

### Handling Inconsistency
- **Allow stale**: If policy can't be loaded, default deny. Service becomes read-only.
- **Warn on stale**: Log warning but serve from cache. Notify operations.
- **Crash on stale**: Fail the instance. Forces redeploy with current policies.

## Security

### Bundle Verification
```bash
# OPA verifies bundle signature before loading
opa run \
  --verification-key bundle-key.pub \
  --bundle authz.tar.gz

# On signature mismatch: bundle rejected, existing policies unchanged
```

### Transport Security
- mTLS between bundle server and OPA sidecars
- Bundle server behind internal load balancer, not internet-facing
- Signed URLs for S3/GCS bundle storage (time-limited access)

### Access Control for Policy Management
```
Who can change policies?
├── Security team: all policies
├── Engineering: non-security policies only (e.g., feature flags)
├── Product managers: view-only via dashboard
└── Automated systems: CI/CD with signed commits only
```

## Monitoring

### Key Metrics
| Metric | What It Measures | Alert Threshold |
|--------|-----------------|-----------------|
| `policy_bundle_age_seconds` | Time since last policy update | > 300s |
| `policy_evaluation_count` | Decisions per second | Drop > 50% |
| `policy_evaluation_latency` | P99 evaluation time | > 50ms |
| `policy_bundle_load_failures` | Failed bundle loads | > 0 in 5 min |
| `policy_cache_hit_ratio` | Cache effectiveness | < 80% |

### Dashboards
```
Policy Health Dashboard
├── Current bundle version (all instances)
├── Instances with stale bundles
├── Evaluation latency by service
├── Deny rate by policy (sudden spikes = potential issue)
└── Policy change log (who changed what, when)
```
