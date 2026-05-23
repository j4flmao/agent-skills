# Flag Management

## Flag Type Comparison

| Type | Lifespan | Risk | Cleanup Urgency | Evaluation Cache TTL | Example |
|------|----------|------|-----------------|----------------------|---------|
| Release | Days-Weeks | Low | Immediate after release | 30s | `new-checkout-flow` |
| Experiment | Weeks-Months | Medium | After experiment ends | 60s | `recommendation-v2` |
| Ops | Months-Years | High | When operational need ends | 5s | `payment-failover` |
| Permission | Permanent | Low | Never (replaced by RBAC) | 120s | `early-access` |

## Flag Definition Schema

```yaml
name: new-checkout-flow
type: release
owner: team-checkout
created: 2025-01-15
removalDate: 2025-02-15
description: "New one-page checkout flow with Apple Pay"
tags: [checkout, UX]
maintainers: ["alice@co", "bob@co"]
targeting:
  rules:
    - users: ["user_123", "user_456"]
      serve: on
    - segments: ["beta-testers"]
      serve: on
    - percentage: 10
      serve: on
  default: off
variations:
  - on: true
  - off: false
prerequisites:
  - checkout-v2-enabled
```

## Evaluation Patterns

```typescript
// LaunchDarkly — server-side evaluation
import { init } from '@launchdarkly/node-server-sdk';

const client = init(process.env.LAUNCHDARKLY_SDK_KEY);

async function evaluateFlag(userId: string): Promise<boolean> {
  const user = { key: userId, anonymous: false, custom: { region: 'us-east' } };
  const flagValue = await client.boolVariation('new-checkout-flow', user, false);
  return flagValue;
}

// Bulk evaluation — fetch all flags for a user
const allFlags = await client.allFlagsState(user);
const isCheckoutV2 = allFlags.getFlagValue('new-checkout-flow') ?? false;
const useRecommendation = allFlags.getFlagValue('recommendation-v2') ?? false;
```

```csharp
// Unleash — server-side evaluation
var config = new UnleashSettings
{
    AppName = "checkout-service",
    UnleashApi = new Uri("http://unleash:4242/api"),
    CustomHttpHeaders = new Dictionary<string, string> { { "Authorization", "unleash-token" } }
};
var unleash = new DefaultUnleash(config);
var context = new UnleashContext { UserId = userId };
bool isEnabled = unleash.IsEnabled("new-checkout-flow", context);
```

```go
// Flagsmith — server-side evaluation
import "github.com/Flagsmith/flagsmith-go-client/v3"

client := flagsmith.NewClient(flagsmith.WithApiKey(apiKey))
flags, _ := client.GetIdentityFlags(identityKey)
isEnabled := flags.IsFeatureEnabled("new-checkout-flow")
```

## Targeting Rules Engine

```yaml
rules:
  - description: "Internal dogfooding"
    users: ["alice@co", "bob@co", "charlie@co"]
    serve: on
  - description: "Beta segment"
    segments: ["beta-testers", "early-adopters"]
    serve: on
  - description: "Percentage rollout by region"
    condition: "custom.region == 'us-east'"
    percentage: 25
    serve: on
  - description: "Prerequisite gate"
    prerequisite: "payment-v2-enabled"
    serve: on
```

Rules evaluated top-to-bottom. First match wins. If no rule matches, default is served. Percentage rollouts use consistent hashing: `hash(userKey + flagKey) % 100 < percentage`. This ensures the same user always gets the same variant regardless of request order or timing.

## A/B Testing Configuration

```yaml
experiment:
  name: "button-color-test"
  type: experiment
  owner: team-product
  variants:
    - name: control
      weight: 50
      payload: { color: "blue" }
    - name: treatment
      weight: 50
      payload: { color: "green" }
  metrics:
    - name: click_rate
      type: binomial
      event: "button.click"
    - name: conversion_rate
      type: binomial
      event: "purchase.completed"
  analysis:
    method: frequentist
    significance_level: 0.05
    minimum_sample_size: 10000
```

## Stale Flag Detection

| Signal | Threshold | Action |
|--------|-----------|--------|
| Past removal date | >90 days | Generate cleanup ticket |
| No config changes | >180 days | Flag owner notified |
| Zero evaluations | >30 days | Flag marked inactive |
| Owner left company | Immediate | Reassign ownership |
| Always returns default | >14 days | Candidate for removal |

Automated cleanup pipeline: CI job scans codebase for flag keys, compares against flag management system API. If flag exists in code but not in management system, flag is removed from code. If flag exists in management system but all references removed from code, flag is archived. Report generated weekly in team Slack channel.

## Flag Cleanup Checklist

- [ ] Remove flag references from all code paths
- [ ] Delete unused code branches (the "off" path or "on" path)
- [ ] Update tests to remove flag-related test cases
- [ ] Remove flag evaluation from SDK calls
- [ ] Delete flag from management system
- [ ] Archive flag in audit trail
- [ ] Update documentation referencing the flag
- [ ] Confirm removal in team sync

## Common Pitfalls

- **Flag doubling**: Nesting flag evaluations can cause inconsistent user experience. Never evaluate flag B inside the code path of flag A without explicit prerequisite modeling.
- **Cache stampede**: Cold start with empty cache causes all instances to evaluate flags simultaneously. Pre-warm cache on startup with a background fetch.
- **Evaluation in hot path**: Calling flag SDK on every request without caching can add 50-200ms latency. Always cache evaluations with appropriate TTL.
- **Permanent flags misused as config**: Flags are not environment variables. If a value never changes per-user, use application configuration instead.
- **Missing kill switch**: Every critical feature must have a kill switch flag that bypasses all other targeting. Without it, a bad deployment requires code rollback instead of instant disable.
