---
name: backend-feature-flags
description: >
  Use this skill when implementing feature flags, canary releases, A/B testing, or kill switches. This skill enforces: flag ownership with removal date, cached evaluation, kill switches for critical features, safe defaults (off). Applies to LaunchDarkly, Unleash, Flagsmith, or custom flag systems. Do NOT use for: permanent configuration, environment variables, or build-time feature toggles.
version: "2.0.0"
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

## Decision Tree

### What Type of Flag?

```
How long does this flag live?
  ├── Days to weeks (feature under development)
  │   └── Release toggle — remove immediately after full rollout
  ├── Weeks to months (A/B test, experiment)
  │   └── Experiment toggle — remove after analysis complete
  ├── Months to years (kill switch, operational control)
  │   └── Ops toggle — highest risk, requires kill switch
  └── Permanent (access control, early access)
      └── Permission toggle — effectively access control, use RBAC instead
```

### How to Evaluate?

```
Where is the flag evaluated?
  ├── Client-side UI (show/hide elements, A/B test variants)
  │   └── Client SDK — streaming evaluation, user-facing latency critical
  ├── Server-side request path (enable new feature logic)
  │   └── Server SDK — cached evaluation, bulk evaluation for batch
  ├── Backend service (behavior change)
  │   └── Server SDK — sub-millisecond evaluation, deterministic
  └── Infrastructure (deployment, routing, scaling)
      └── Ops toggle — short cache TTL (5s), near-instant propagation
```

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

### Step 8: Custom Flag Evaluation (No SDK)

```typescript
// Lightweight in-app flag evaluation with Redis
class FlagEvaluator {
  constructor(private redis: Redis) {
    this.loadFlags();
  }

  async loadFlags(): Promise<void> {
    // Load flags from Redis, refresh every 30s
    setInterval(async () => {
      this.flags = await this.redis.hgetall('feature-flags');
    }, 30000);
  }

  isEnabled(flagKey: string, userId: string): boolean {
    const flag = this.flags[flagKey];
    if (!flag) return false;  // default off
    if (flag.users?.includes(userId)) return true;
    if (flag.percentage && this.hash(userId, flagKey) < flag.percentage) return true;
    return false;
  }

  private hash(userId: string, flagKey: string): number {
    // Simple hash for consistent percentage assignment
    let hash = 0;
    const str = `${userId}:${flagKey}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;  // Convert to 32-bit int
    }
    return ((hash % 100) + 100) % 100;
  }
}
```

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
- Remove flags immediately after full release — do not let them accumulate

## References
  - references/experimentation.md — A/B Testing and Experimentation Reference
  - references/flag-evaluation.md — Flag Evaluation Strategies Reference
  - references/flag-governance.md — Flag Governance
  - references/flag-management.md — Flag Management
  - references/flag-sdk-integration.md — Flag SDK Integration
  - references/flag-strategies.md — Flag Strategies
## Handoff
`backend-testing` for flag toggle testing and integration test patterns

## Implementation Patterns

### Feature Flag Client

```typescript
// Type-safe feature flag evaluator
interface FlagConfig {
  key: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  defaultValue: boolean | string | number | Record<string, unknown>;
  rules?: FlagRule[];
}

interface FlagRule {
  condition: (context: FlagContext) => boolean;
  value: boolean | string | number | Record<string, unknown>;
}

interface FlagContext {
  userId?: string;
  tenantId?: string;
  region?: string;
  plan?: string;
  percentage?: number;
  [key: string]: unknown;
}

class FeatureFlagClient {
  private flags: Map<string, FlagConfig> = new Map();
  private cache: Map<string, CachedEvaluation> = new Map();
  private cacheTTL = 30_000; // 30 seconds

  constructor(private sdkEndpoint?: string) {}

  loadFlags(configs: FlagConfig[]): void {
    for (const config of configs) {
      this.flags.set(config.key, config);
    }
  }

  isEnabled(key: string, context?: FlagContext): boolean {
    const value = this.evaluate(key, context);
    return Boolean(value);
  }

  getValue<T>(key: string, context?: FlagContext): T {
    return this.evaluate(key, context) as T;
  }

  private evaluate(key: string, context?: FlagContext): unknown {
    const cacheKey = this.cacheKey(key, context);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    }

    const config = this.flags.get(key);
    if (!config) {
      return undefined;
    }

    // Check rules in order — first match wins
    if (config.rules && context) {
      for (const rule of config.rules) {
        try {
          if (rule.condition(context)) {
            this.setCache(cacheKey, rule.value);
            return rule.value;
          }
        } catch {
          continue;
        }
      }
    }

    // Percentage rollout
    if (context?.userId && config.type === 'boolean') {
      const hash = this.hashUserId(key, context.userId);
      const defaultVal = config.defaultValue as boolean;
      if (context.percentage !== undefined) {
        const pct = typeof context.percentage === 'number' ? context.percentage : 0;
        const inPercentage = (hash % 100) < pct;
        if (inPercentage) return !defaultVal;
      }
    }

    this.setCache(cacheKey, config.defaultValue);
    return config.defaultValue;
  }

  private hashUserId(flagKey: string, userId: string): number {
    let hash = 0;
    const str = `${flagKey}:${userId}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private cacheKey(key: string, context?: FlagContext): string {
    if (!context?.userId) return key;
    return `${key}:${context.userId}`;
  }

  private setCache(key: string, value: unknown): void {
    this.cache.set(key, { value, timestamp: Date.now() });
    // Evict stale entries
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now - v.timestamp > this.cacheTTL * 2) {
          this.cache.delete(k);
        }
      }
    }
  }

  invalidateCache(): void {
    this.cache.clear();
  }
}

// Usage
const flags = new FeatureFlagClient();
flags.loadFlags([
  {
    key: 'new-checkout-flow',
    type: 'boolean',
    defaultValue: false,
    rules: [
      {
        condition: (ctx) => ctx.plan === 'enterprise',
        value: true,
      },
      {
        condition: (ctx) => ctx.userId === 'internal-test-user',
        value: true,
      },
    ],
  },
  {
    key: 'max-upload-size',
    type: 'number',
    defaultValue: 10,
    rules: [
      {
        condition: (ctx) => ctx.plan === 'enterprise',
        value: 100,
      },
      {
        condition: (ctx) => ctx.plan === 'pro',
        value: 50,
      },
    ],
  },
]);
```

## Architecture Decision Trees

### Flag Management Strategy

```
What's the flag's lifecycle stage?
├── Development (building new feature)
│   └── Local/dev flag: hardcoded true in dev env
│
├── Testing (QA, staging validation)
│   └── Environment-specific flag: enabled in staging
│
├── Canary/Beta (limited production rollout)
│   └── Percentage flag: 1% → 5% → 25% → 50%
│       ├── Monitor error rates after each increase
│       └── Roll back immediately on issues
│
├── Full release (GA)
│   └── Fully rolled out: 100% of users
│       └── Schedule cleanup: remove flag code within 2 sprints
│
└── Decommissioned
    └── Code cleanup + flag deleted from system
        └── Verify no code references remain
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Flags as permanent config | Flag system used as featureless config | Remove flags after full rollout |
| No owner or removal date | Flags accumulate indefinitely | Every flag has owner + expiry date |
| Deeply nested flag checks | Code becomes unreadable | One flag per concern, flat evaluation |
| No kill switch per critical feature | Bad deployment requires rollback | Every critical feature has kill switch |
| Flag in hot path without caching | Adds 50-200ms per request | Cache evaluations with 30-60s TTL |
| No logging of flag changes | Can't audit who changed what | Audit log: old value, new value, actor, timestamp |

## Performance Optimization

- **Local evaluation SDK**: Use client-side flag evaluation SDK with streaming updates. Avoids HTTP round-trip for each flag check. Sub-millisecond evaluation for local SDKs.
- **Batch evaluation**: Evaluate all flags for a context in one call. Avoids per-flag SDK calls. Reduces overhead for pages with 10+ flag checks.
- **Flag evaluation tree pruning**: For boolean flags with percentage rollouts, skip evaluation for users outside the percentage. Uses hashing for deterministic bucketing.
