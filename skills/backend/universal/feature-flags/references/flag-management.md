# Flag Management

## Flag Types

| Type | Lifespan | Risk | Cleanup Urgency | Example |
|------|----------|------|-----------------|---------|
| Release | Days-Weeks | Low | Immediate after release | `new-checkout-flow` |
| Experiment | Weeks-Months | Medium | After experiment ends | `recommendation-v2` |
| Ops | Months-Years | High | When operational need ends | `payment-failover` |
| Permission | Permanent | Low | Never (replaced by RBAC) | `early-access` |

## Flag Definition
```yaml
name: new-checkout-flow
type: release
owner: team-checkout
created: 2025-01-15
removalDate: 2025-02-15
description: "New one-page checkout flow with Apple Pay"
targeting:
  - users: ["user_123", "user_456"]
  - percentage: 10
  - prerequisites: ["checkout-v2-enabled"]
variations:
  - on: true
  - off: false
```

## Evaluation Patterns
```typescript
// Server-side
const isEnabled = await flagClient.evaluate('new-checkout-flow', {
  user: { key: userId },
  groups: ['beta'],
  custom: { region: 'us-east', plan: 'enterprise' }
});

// Client-side (user-facing)
const variant = ldClient.variation('experiment-button-color', { key: userId }, 'blue');
```

## Cleanup Checklist
- [ ] Remove flag references from all code paths
- [ ] Delete flag from management system
- [ ] Remove stale code behind the flag
- [ ] Update tests to remove flag-related cases
- [ ] Confirm removal in team sync
