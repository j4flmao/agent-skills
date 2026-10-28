---
name: enterprise-rd-poc-management
description: >
  Use this skill when the user says 'proof of concept', 'poc', 'spike', 'prototype to production', 'r&d project', 'poc success criteria', 'build vs buy', 'poc handoff', 'innovation sandbox'. It runs time-boxed, hypothesis-driven PoCs with explicit exit criteria and a production-readiness path (throwaway vs evolutionary, sandbox isolation, contract mocking, security retrofit, PoC-to-MVP handoff). Do NOT use for: writing a single ADR or tech spec (use planning/create-tech-spec), product MVP scoping and PRDs (use create-prd), vendor contract negotiation (use enterprise/vendor-management).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [enterprise, r&d, poc, prototyping, innovation, build-vs-buy]
---

# R&D and Proof of Concept Management

## Purpose
A PoC is an experiment that answers one technical or business question under a fixed time-box — not the first draft of a product. This skill frames the hypothesis, sets measurable exit criteria up front, isolates the experiment, and defines what must change before anything built in the PoC reaches production.

## Agent Protocol

### Trigger
"poc", "proof of concept", "spike", "prototype", "r&d", "innovation project", "build vs buy", "poc success criteria", "promote poc to production", "poc handoff".

### Input Context
- The question the PoC must answer and who decides.
- Constraints: time-box, budget, approved tech stack, data sensitivity.
- Intended fate: throwaway or evolutionary.

### Output Artifact
PoC charter (one page) and, at the end, a decision record: proceed / pivot / stop.

### Response Format
```
Hypothesis: We believe {approach} will achieve {measurable outcome} under {conditions}.
Exit criteria: {metric} {threshold} measured by {method}
Time-box: {N weeks}  Decision owner: {role}
Type: {throwaway|evolutionary}
Isolation: {sandbox account/project, synthetic data}
Kill criteria: {when to stop early}
```

## Lifecycle

| Stage | Output | Gate |
|-------|--------|------|
| Frame | Hypothesis, exit + kill criteria, build-vs-buy check | Sponsor signs charter |
| Build | Minimal code that tests the riskiest assumption first | Mid-point checkpoint |
| Evaluate | Measured results vs criteria, cost estimate for production | Decision meeting |
| Decide | ADR: proceed / pivot / stop | Recorded |
| Transition | Production readiness review (PRR) if proceeding | Platform/ops acceptance |

## Writing Good Exit Criteria
- Weak: "Evaluate Redis for caching."
- Strong: "Redis cache-aside reduces P95 product-page latency from 800 ms to <200 ms at 2,000 RPS with hit ratio >90% on production-shaped synthetic traffic."
Criteria are numeric, measured on realistic data shape/volume, and include cost and operability (who runs it, how it is monitored).

## Build vs Buy vs Adopt

| Option | Choose when |
|--------|-------------|
| Buy (SaaS/commercial) | Commodity capability, not a differentiator, vendor meets compliance |
| Adopt (open source) | Mature project, active maintainers, license compatible, team can operate it |
| Build | Core differentiator or no option meets hard requirements |
Include 3-year total cost of ownership (licenses + run + people), exit cost and lock-in in the comparison.

## Throwaway vs Evolutionary

| | Throwaway | Evolutionary |
|-|-----------|--------------|
| Goal | Learn fast | Become the product |
| Code quality | Minimal, no tests required | Tests, CI, reviews from day 1 |
| Stack | Anything | Approved stack only |
| After decision | Deleted; rewrite properly | Hardened via PRR |
Declare the type on day 1 and write it in the charter. The classic failure is a throwaway prototype demoed to stakeholders and then forced into production.

## Isolation
- Separate cloud account/project/subscription with budget alerts and auto-expiry.
- Synthetic or masked data only; no production credentials or PII.
- Mock unavailable dependencies from an agreed API contract (OpenAPI + mock server such as Prism or WireMock) so the PoC does not wait on other teams.

## Promoting to Production (PRR minimum)
- [ ] Owner team accepts on-call and maintenance
- [ ] Security retrofit: secrets in a vault, TLS everywhere, authn/authz, dependency and SAST scans clean
- [ ] Observability: logs, metrics, traces, dashboards, alerts with runbooks
- [ ] Data: migrations versioned, backups and restore tested
- [ ] Tests + CI/CD pipeline; infrastructure as code
- [ ] ADRs explaining deviations from the standard stack

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| No time-box ("a few more weeks") | Hard end date; extension needs a new decision |
| Success defined after results | Criteria signed before building |
| Testing the easy part first | Attack the riskiest assumption first |
| PoC connected to shared prod/staging data | Sandbox + synthetic data |
| "It worked" with no numbers | Measured results table vs criteria |
| Over-the-wall handoff | Joint PRR and pairing period with the receiving team |

## Checklist
- [ ] Hypothesis + numeric exit and kill criteria
- [ ] Type declared (throwaway/evolutionary)
- [ ] Sandbox with budget alert
- [ ] Decision recorded as ADR
- [ ] PRR completed before any production use

## References
- `references/architecture-decision-records.md` — writing and managing ADRs
- `references/build-vs-buy.md` — technology selection matrix
- `references/poc-success-criteria.md` — hypotheses, NFRs, exit criteria
- `references/throwaway-vs-evolutionary.md` — prototype strategies
- `references/sandbox-environments.md` — cloud isolation
- `references/api-contract-mocking.md` — unblocking on missing dependencies
- `references/poc-to-mvp-handoff.md` — production readiness review
- `references/retrofitting-security.md` — paying security debt before launch
