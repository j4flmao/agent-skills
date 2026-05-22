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
Release toggle: short-lived (days to weeks), enables/disables a feature under development. Experiment toggle: medium-lived (weeks to months), routes users to variants for A/B testing. Ops toggle: long-lived (months to years), kill switches and operational controls. Permission toggle: permanent, controls access per user/role. Each type has different risk profile and cleanup urgency.

### Step 2: Flag Evaluation
Client-side SDK for user-facing flag evaluation — reduces server latency. Server-side evaluation for backend logic — synchronous, low-latency. Cache flags with TTL: 30 seconds for release toggles, 5 seconds for ops toggles (kill switches need fast propagation). Bulk evaluation: fetch all flags for a user in a single call for batch processing. Flag evaluation should never throw — default to off (safe fallback).

### Step 3: Targeting Rules
User ID targeting: specific users enabled for testing. Group/segment targeting: enable for beta users, internal staff, or paying customers. Percentage rollout: gradual increase from 1% to 100%, consistent via hash (same user always sees same variant). Custom attributes: region, plan tier, device type, client version. Prerequisite flags: flag B only evaluated if flag A is on.

### Step 4: Flag Lifecycle
Create: define flag with name, description, type, owner, expected removal date. Evaluate: application reads flag value and branches behavior. Stabilize: feature is fully released, flag becomes permanent (ops toggle) or is removed. Cleanup: remove flag from code and flag management system after removal deadline. Stale flag detection: report flags >90 days past removal date or >180 days without changes.

### Step 5: Risk Controls
Kill switch: master flag that disables a feature globally regardless of other targeting. Auto-rollback: monitor error rate during rollout — if error rate increases >5%, automatically rollback to 0%. Audit log: every flag change logged with old value, new value, changed by, timestamp, reason. Approval workflow for production flag changes.

## Rules
- Every flag has an owner and a removal date
- Never use flags for permanent configuration
- Flag evaluation is cached — minimize SDK calls
- Kill switch flags exist for every critical feature
- Stale flags >90 days auto-reported
- Flag changes are logged with old/new value, actor, timestamp
- Default value is off (safe fallback)

## References
- `references/flag-management.md` — Flag types, targeting rules, evaluation patterns, cleanup
- `references/canary-release.md` — Gradual rollout, auto-rollback, metrics comparison, flag lifecycle

## Handoff
`backend-testing` for flag toggle testing and integration test patterns
