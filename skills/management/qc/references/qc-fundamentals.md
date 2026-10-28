# Quality Control Fundamentals: Defect Taxonomy, Severity and Root Cause Analysis

Core quality-control concepts for software teams: how QC differs from QA, how to classify defects consistently, how to set severity and priority, the defect lifecycle, and root cause analysis that leads to prevention. Process, gates, checklists and dashboards are covered in sibling references.

## QC vs QA

| | Quality Assurance | Quality Control |
|---|---|---|
| Focus | Process: preventing defects | Product: detecting defects |
| Activities | Standards, training, process design, audits | Reviews, static analysis, testing, inspections |
| Timing | Throughout the lifecycle | At checkpoints / gates |
| Output | Improved process | Defect reports, pass/fail decisions |

QC findings feed QA: recurring defect types indicate process changes.

## Defect Taxonomy

Classify every defect on a few independent dimensions; keep the lists short so classification is consistent.

| Dimension | Values (example) |
|---|---|
| Type | Functional, data/validation, UI, performance, security, reliability, compatibility, usability, documentation |
| Origin (phase introduced) | Requirements, design, code, configuration, build/deploy, third-party |
| Detection phase | Review, static analysis, unit test, integration test, system test, UAT, production |
| Trigger | What exposed it: new feature, regression, environment change, data edge case |
| Component | Service/module owning the fix |

Orthogonal Defect Classification (ODC, IBM) is a well-known formal scheme with defect type and trigger attributes; adopt a subset rather than inventing categories per team.

## Severity vs Priority

Severity = impact on the system/user. Priority = order of fixing (business decision).

| Severity | Definition |
|---|---|
| S1 Critical | Data loss/corruption, security breach, core function unavailable, no workaround |
| S2 Major | Core function impaired, workaround exists but is costly |
| S3 Minor | Non-core function impaired, easy workaround |
| S4 Trivial | Cosmetic, no functional impact |

| Priority | Meaning |
|---|---|
| P1 | Fix immediately / hotfix |
| P2 | Fix in current iteration |
| P3 | Schedule in backlog |
| P4 | Fix if time permits |

They usually correlate but not always: a typo in the company name on the login page is S4 but P1; a crash in a rarely used admin export may be S2 but P3.

## Defect Report Essentials

```markdown
Title: Checkout total ignores discount when cart has > 50 items
Environment: staging, build 2026.10.24-3, Chrome 130 / API v2
Steps: 1) add 51 items 2) apply code SAVE10 3) open summary
Expected: total reduced by 10%
Actual: discount line shown, total unchanged
Severity: S2   Priority: P2   Type: Functional   Component: pricing-service
Evidence: screenshot, request ID 7f3c..., log excerpt
Regression: yes (worked in 2026.10.10)
```

Good reports are reproducible, minimal, and include expected vs actual, environment and evidence.

## Defect Lifecycle

```
New → Triaged → In Progress → Fixed → Verified → Closed
          ↘ Rejected (not a bug / duplicate / won't fix, with reason)
Verified fails → Reopened → In Progress
```

Triage within a fixed SLA (e.g. one business day): confirm, deduplicate, set severity/priority/owner. Track reopen rate as a fix-quality signal.

## Root Cause Analysis

Apply to S1/S2 defects, production escapes and recurring defect clusters.

5 Whys example:

```
Defect: discount ignored for large carts
Why? Pricing used paginated cart query, only first 50 items loaded
Why? Repository method defaults to page size 50
Why? Default added in refactor; callers not reviewed
Why? No test covered carts larger than one page
Why? Test data templates only generate small carts
Root causes: unsafe default in shared API; missing boundary test data
Actions: remove implicit pagination default; add boundary cases to test data generator; review other callers
```

Other tools: fishbone (Ishikawa) diagram across categories (people, process, tools, code, environment, requirements), fault tree analysis for complex failures, and Pareto analysis to find the few defect types causing most impact.

Rules:
- Stop at causes you can act on (process, tooling, design), not at "developer made a mistake".
- Every RCA produces preventive actions with owners and due dates, plus a detection improvement (test, lint rule, alert).

## Detection Effectiveness

| Metric | Definition | Use |
|---|---|---|
| Defect detection percentage (DDP) | defects found before release / (before + after release) | Effectiveness of pre-release QC |
| Escape rate | production defects / total defects | Inverse view of DDP |
| Phase containment | defects found in the phase they were introduced / defects introduced in that phase | Where to strengthen reviews/tests |
| Defect density | defects / size (KLOC, function points, or per change) | Compare components over time, not teams |
| Reopen rate | reopened / fixed | Fix and verification quality |

Use metrics to find process weaknesses, never as individual performance targets (incentivizes hiding defects).

## Checklist
- [ ] Shared defect taxonomy with short value lists
- [ ] Severity and priority defined separately with examples
- [ ] Defect report template enforced in the tracker
- [ ] Triage SLA and lifecycle states configured
- [ ] RCA for S1/S2 and escapes with preventive and detection actions
- [ ] Detection-effectiveness metrics reviewed per release
