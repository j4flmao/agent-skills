---
name: backend-feature-flags
description: >
  Use this skill when implementing feature flags, canary releases, A/B testing, or kill switches. This skill enforces: flag ownership with removal date, cached evaluation, kill switches for critical features, safe defaults (off). Applies to LaunchDarkly, Unleash, Flagsmith, or custom flag systems. Do NOT use for: permanent configuration, environment variables, or build-time feature toggles.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, features, phase-6, universal]
---

# Backend Feature Flags

## Purpose
Design feature flag systems with lifecycle management, targeting, and risk controls.

## Agent Protocol

### Trigger
Exact user phrases: "feature flag", "feature toggle", "canary release", "gradual rollout", "A/B test", "kill switch", "flag management", "LaunchDarkly", "Unleash", "flag evaluation", "targeting rule", "percentage rollout", "feature gate".

### Input Context
Before activating, verify:
- Number of flags expected (10s, 100s, 1000s)
- Targeting requirements (user ID, group, percentage, custom attributes)
- Flag lifespan (short-lived release toggles vs long-lived ops toggles)
- Evaluation performance needs (latency budget, cache TTL tolerance)
- Flag management platform (LaunchDarkly, Unleash, Flagsmith, custom)

### Output Artifact
Feature flag strategy as formatted text.

### Response Format
```yaml
# Flag definitions with targeting rules
# Evaluation configuration
```
```typescript
// Flag evaluation code
// SDK setup
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Flag types classified (release/experiment/ops/permission)
- [ ] Evaluation strategy with caching and bulk evaluation
- [ ] Targeting rules defined (user, group, percentage, prerequisites)
- [ ] Flag lifecycle with creation, evaluation, stabilization, cleanup
- [ ] Risk controls (kill switch, auto-rollback, audit log)
- [ ] Stale flag detection and removal deadline configured

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Flag Type Classification
| Type | Lifespan | Risk | Cleanup | Evaluation Cache TTL | Example |
|------|----------|------|---------|----------------------|---------|
| Release | Days-Weeks | Low | Immediate after release | 30s | `new-checkout-flow` |
| Experiment | Weeks-Months | Medium | After experiment ends | 60s | `recommendation-v2` |
| Ops | Months-Years | High | When operational need ends | 5s | `payment-failover` |
| Permission | Permanent | Low | Never (replaced by RBAC) | 120s | `early-access` |

Release toggle: short-lived (days to weeks), enables/disables a feature under development. Team removes flag once feature is verified and stable. Experiment toggle: medium-lived (weeks to months), routes users to variants for A/B testing. Requires statistical analysis before cleanup. Ops toggle: long-lived (months to years), kill switches and operational controls. Highest risk — a misconfigured ops toggle can take down production. Permission toggle: permanent, controls access per user/role — these are effectively access control lists expressed as flags.

### Step 2: Platform Selection
| Feature | LaunchDarkly | Unleash | Flagsmith | Custom |
|---------|-------------|---------|-----------|--------|
| SDK languages | 15+ | 15+ | 13+ | N/A |
| Self-hosted | No | Yes | Yes | Yes |
| Targeting rules | Advanced | Moderate | Moderate | Custom |
| A/B testing | Built-in | Via SDK | Via SDK | Custom |
| Audit log | Yes | Yes | Yes | Custom |
| SSO/SAML | Enterprise | Enterprise | Enterprise | Custom |
| SLA | 99.95% | Self-managed | 99.9% | Self-managed |
| Flag import/export | API + UI | API | API | Custom |

Use LaunchDarkly for enterprise with complex targeting, experiment management, and minimal ops overhead. Use Unleash or Flagsmith for self-hosted with good feature parity and no per-seat costs. Build custom only when regulatory constraints (air-gapped, no external dependencies) prevent using any SaaS or self-hosted solution.

### Step 3: Flag Evaluation Architecture
Client-side SDK for user-facing flag evaluation — reduces server latency by evaluating at the edge. Use streaming or polling: LaunchDarkly uses streaming (SSE) for sub-100ms updates. Server-side evaluation for backend logic — synchronous, low-latency, deterministic. Cache flags with TTL: 30 seconds for release toggles (fast propagation acceptable), 5 seconds for ops toggles (kill switches need near-instant propagation). Bulk evaluation: fetch all flags for a user in a single SDK call for batch processing. Flag evaluation should never throw — default to off (safe fallback).

```typescript
// LaunchDarkly server-side evaluation with streaming
import { init } from '@launchdarkly/node-server-sdk';

const client = init(process.env.LAUNCHDARKLY_SDK_KEY);
await client.waitForInitialization();

async function evaluateFlag(userId: string, flagKey: string): Promise<boolean> {
  return client.boolVariation(flagKey, { key: userId, anonymous: false }, false);
}

// Bulk evaluation
async function evaluateAllFlags(userId: string): Promise<Record<string, boolean>> {
  const state = await client.allFlagsState({ key: userId });
  return {
    checkoutV2: state.getFlagValue('new-checkout-flow') ?? false,
    recommendations: state.getFlagValue('recommendation-v2') ?? false,
    paymentV2: state.getFlagValue('payment-failover') ?? true,
  };
}
```

```csharp
// Unleash server-side with toggle strategy
var unleash = new DefaultUnleash(new UnleashSettings
{
    AppName = "checkout-service",
    UnleashApi = new Uri("http://unleash:4242/api"),
    CustomHttpHeaders = new Dictionary<string, string> { { "Authorization", "*:*.unleash-internal-api-token" } }
});

public bool IsCheckoutV2Enabled(string userId, string tenantId)
{
    var context = new UnleashContext
    {
        UserId = userId,
        Properties = new Dictionary<string, string> { { "tenant", tenantId }, { "region", "us-east" } }
    };
    return unleash.IsEnabled("new-checkout-flow", context);
}
```

```go
// Go evaluation with in-memory cache
type FlagCache struct {
  mu    sync.RWMutex
  store map[string]cacheEntry
  ttl   time.Duration
  ld    *ld.LDClient
}
type cacheEntry struct { value bool; expiresAt time.Time }

func (c *FlagCache) Evaluate(user *ld.User, key string) bool {
  c.mu.RLock()
  entry, ok := c.store[key]
  c.mu.RUnlock()
  if ok && time.Now().Before(entry.expiresAt) { return entry.value }
  val, err := c.ld.BoolVariation(key, user, false)
  if err != nil { return false }
  c.mu.Lock()
  c.store[key] = cacheEntry{value: val, expiresAt: time.Now().Add(c.ttl)}
  c.mu.Unlock()
  return val
}
```

### Step 4: Targeting Rules Engine
User ID targeting: specific users enabled for testing or dogfooding. Group/segment targeting: enable for beta users, internal staff, or paying customers. Percentage rollout: gradual increase from 1% to 100%, consistent via hash (same user always sees same variant). Custom attributes: region, plan tier, device type, client version. Prerequisite flags: flag B only evaluated if flag X is on (useful for hierarchical rollouts). Evaluation order: user target → group target → percentage → default. Rules evaluated top-to-bottom, first match wins.

```yaml
targeting:
  rules:
    - description: "Internal dogfooding"
      users: ["alice@co", "bob@co"]
      serve: on
    - description: "Beta customers"
      segments: ["beta-testers", "early-adopters"]
      serve: on
    - description: "US-East regional rollout"
      condition: "custom.region == 'us-east'"
      percentage: 25
      serve: on
    - description: "Prerequisite gate"
      prerequisite: "payment-v2-enabled"
      percentage: 50
      serve: on
  default: off
```

Percentage rollouts use consistent hashing: `hash(userKey + flagKey) % 100 < percentage`. This ensures the same user always gets the same variant. Common algorithm: murmur3_32(userId + ":" + flagKey) applied modulo 100.

### Step 5: A/B Testing
Define experiment variants: control (baseline) and treatment(s). Assign users to variants via consistent hash. Track exposure event when flag is evaluated. Collect metric events (conversion, revenue, engagement). Analyze with frequentist or Bayesian statistics at predefined sample size.

| Parameter | Default | Notes |
|-----------|---------|-------|
| Significance level | 95% (α=0.05) | Industry standard |
| Statistical power | 80% (β=0.2) | Adequate for most tests |
| Minimum detectable effect | 5% relative | Adjust based on business impact |
| Minimum sample per variant | Calculated | Varies by baseline conversion |
| Maximum duration | 2 weeks | Avoid time-of-day/week effects |
| Minimum duration | 1 week | Capture full weekly cycle |
| Guardrail metrics | Error rate, latency | Monitor alongside primary metric |

```python
def min_sample_size(p1: float, p2: float, alpha: float = 0.05, beta: float = 0.2) -> int:
    z_a = 1.96  # alpha/2 = 0.025
    z_b = 0.84  # beta = 0.2
    p_bar = (p1 + p2) / 2
    num = (z_a * (2 * p_bar * (1 - p_bar))**0.5 + z_b * (p1*(1-p1) + p2*(1-p2))**0.5)**2
    denom = (p2 - p1)**2
    return math.ceil(num / denom)
```

### Step 6: Flag Lifecycle
Create: define flag with name, description, type, owner, expected removal date, and initial targeting rules. Evaluate: application reads flag value via SDK and branches behavior. Stabilize: feature is fully released and verified, flag becomes permanent (ops toggle) or is removed entirely. Cleanup: remove flag references from all code paths, delete flag from management system, remove stale code branches, update tests, confirm removal in team sync. Stale flag detection: report flags >90 days past removal date or >180 days without configuration changes. Automated cleanup: CI pipeline flags stale flags in PR review.

```yaml
flag_governance:
  - name: new-checkout-flow
    owner: team-checkout
    type: release
    created: 2025-01-15
    removalDate: 2025-02-15
    lastModified: 2025-01-20
    status: active
    tags: [checkout, UX]
```

### Step 7: Risk Controls
Kill switch: master flag that disables a feature globally regardless of other targeting. Every critical feature has a corresponding kill switch flag with 5s cache TTL. Auto-rollback: monitor error rate during rollout — if error rate increases >5% compared to baseline, automatically rollback to 0%. Circuit breaker: if downstream service fails >50% of requests, ops toggle forces traffic to fallback path. Audit log: every flag change logged with old value, new value, changed by, timestamp, and reason. Approval workflow: production flag changes require at least one peer review.

| Control | Mechanism | Response Time | Testing Requirement |
|---------|-----------|---------------|-------------------|
| Kill switch | Global flag override | <5s propagation | Quarterly chaos test |
| Auto-rollback | Error rate monitoring | <1min detection | Per-release test |
| Circuit breaker | Failure rate threshold | <30s activation | Integration test |
| Approval workflow | PR + code review | Minutes-hours | Documented process |

## Configuration Reference

```json
{
  "flagDefaults": {
    "off": true,
    "ttlSeconds": 30,
    "clientSide": false
  },
  "evaluation": {
    "bulkEnabled": true,
    "cacheType": "inMemory",
    "maxCacheSize": 5000,
    "circuitBreakerTimeoutMs": 1000
  },
  "audit": {
    "enabled": true,
    "retentionDays": 90,
    "webhookUrl": "https://hooks.slack.com/..."
  },
  "staleDetection": {
    "daysSinceRemovalDate": 90,
    "daysSinceLastModified": 180,
    "notifyChannel": "#feature-flags"
  },
  "autoRollback": {
    "enabled": true,
    "errorRateThreshold": 5.0,
    "latencyThreshold": 20.0,
    "evaluationWindowMs": 60000
  }
}
```

## Common Pitfalls
- **Flag doubling**: Never nest flag evaluations without explicit prerequisite modeling. Flag B inside flag A's code path causes inconsistent user experiences.
- **Evaluation in hot path**: Calling flag SDK on every HTTP request without caching adds 50-200ms latency. Always cache evaluations with appropriate TTL. For sub-millisecond evaluation, use embedded SDK with streaming updates.
- **No kill switch**: Every critical feature must have a kill switch flag that bypasses all targeting. Without it, a bad deployment forces an emergency code rollback (10-30 min) instead of instant disable (5s).
- **Permanent flags misused as config**: Flags are not environment variables. If a value never changes per-user, use application configuration instead of flag system.
- **Missing cleanup**: Flags left in code after feature stabilization accumulate technical debt. Stale flags increase code complexity and evaluation cost. Schedule cleanup as part of the feature completion definition of done.

## Rules
- Every flag has an owner and a removal date
- Never use flags for permanent configuration
- Flag evaluation is cached — minimize SDK calls
- Kill switch flags exist for every critical feature
- Stale flags >90 days auto-reported
- Flag changes are logged with old/new value, actor, timestamp
- Default value is off (safe fallback)
- A/B experiment flags include tracking exposure event
- Never nest flag evaluation inside another flag evaluation
- Flag name matches codebase convention: `kebab-case` with domain prefix

## References
- `references/experimentation.md` — A/B testing, traffic splitting, statistical significance, multivariate testing, holdout groups
- `references/flag-evaluation.md` — Server-side vs client-side evaluation, caching, SDK bootstrapping, streaming updates
- `references/flag-management.md` — Flag types, targeting rules, evaluation patterns, cleanup
- `references/flag-strategies.md` — Canary release, gradual rollout, auto-rollback, kill switch strategies

## Handoff
`backend-testing` for flag toggle testing and integration test patterns
