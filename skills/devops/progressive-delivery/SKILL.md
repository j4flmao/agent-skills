---
name: devops-progressive-delivery
description: >
  Use when the user asks about progressive delivery, canary deployments, blue-green deployments, feature flags in production, traffic shifting, A/B testing in production, Flagger, Argo Rollouts, deployment strategies, or gradual rollouts. Do NOT use for: basic CI/CD (cicd-pipeline), general Kubernetes (kubernetes-patterns), or feature flag development (backend-feature-flags).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, progressive-delivery, phase-3]
---

# Progressive Delivery

## Purpose
Implement progressive delivery strategies: canary releases, blue-green deployments, feature flags in production, traffic mirroring, and automated rollback based on metrics.

## Workflow

### Deployment Strategies Comparison
| Strategy | Risk | Speed | Complexity | Metrics Check |
|----------|------|-------|-----------|---------------|
| Recreate | High | Fast | Low | No |
| Rolling Update | Medium | Medium | Low | No |
| Blue-Green | Low | Instant | Medium | Manual |
| Canary | Low | Gradual | High | Automated |
| A/B Testing | Low | Gradual | High | Automated |
| Feature Flag | Minimal | Instant | Medium | Per-flag |

### Canary Architecture (Argo Rollouts + Istio)
```
Primary (100% traffic) → Canary (0% → 100% gradually)
                              ↓
                    Metrics Analysis (Prometheus)
                              ↓
                    Pass → Promote (100% to new)
                    Fail → Rollback (reset to 0%)
```

### Flagger Configuration
| Setting | Canary | Blue-Green |
|---------|--------|------------|
| Step weight | 10% increments | N/A |
| Interval | 60s | 60s |
| Max weight | 100% | N/A |
| Service mesh | Istio, Linkerd, App Mesh | Istio, App Mesh |
| Analysis | HTTP success rate, latency, custom metrics | HTTP success rate |

### Feature Flags in Production
| Flag Type | Lifecycle | Tooling |
|-----------|-----------|---------|
| Release toggle | Days to weeks | LaunchDarkly, Flagsmith |
| Experiment toggle | Weeks to months | A/B testing platform |
| Ops toggle | Minutes to hours | Kill switch, emergency |
| Permission toggle | Permanent | User segmentation |

## References
- `references/deployment-strategies.md` — Detailed deployment strategy comparison: recreate, rolling, blue-green, canary, A/B, shadow — with YAML configs for each
- `references/argo-rollouts.md` — Argo Rollouts: Rollout CRD, template spec, strategy definition, traffic routing with Istio/NGINX/ALB, analysis templates
- `references/flagger-config.md` — Flagger: canary CRD, service mesh integration (Istio, Linkerd, App Mesh), metric analysis, alerting, webhooks
- `references/canary-analysis.md` — Canary analysis: metrics (success rate, latency, error rate), analysis templates, threshold config, manual judgment, rollback
- `references/traffic-mirroring.md` — Traffic mirroring/shadowing: Istio mirror, Envoy shadow, service mesh traffic split, dark launches, request duplication

## Handoff
Related skills: devops-gitops-advanced, devops-argo-cd, backend-feature-flags, devops-sre-practices.
