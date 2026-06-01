---
name: dev-loop-tech-debt-tracker
description: >
  Use when the user asks about technical debt tracking, tech debt management, code quality metrics, debt prioritization, or establishing a tech debt reduction process. Do NOT use for: refactoring implementation (dev-loop-refactor-guide), or code review (dev-loop-code-review).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, tech-debt, code-quality]
---

# Technical Debt Tracker

## Purpose
Systematically identify, track, prioritize, and reduce technical debt — establishing a quantifiable, transparent process that balances feature velocity with codebase health.

## Agent Protocol

### Trigger
Exact user phrases: "technical debt", "tech debt", "code debt", "debt tracking", "code quality debt", "debt backlog", "reduce tech debt", "tech debt sprint", "debt prioritization", "code health".

### Input Context
- Codebase size and age (lines of code, years in production)
- Current pain points (slow development, frequent bugs, long onboarding)
- Existing debt indicators (test coverage %, cyclomatic complexity, duplication)
- Team size and velocity (story points per sprint, team capacity)
- Business constraints (release deadlines, regulatory requirements, SLAs)
- Tooling available (SonarQube, CodeClimate, Codacy, custom)

### Output Artifact
Tech debt inventory with prioritized items, remediation estimates, and tracking system.

### Completion Criteria
- [ ] Debt discovery methods established (automated scans + developer input)
- [ ] Debt items cataloged with type, location, impact, and effort
- [ ] Prioritization rubric defined (impact × frequency × effort)
- [ ] Debt items entered into tracking system (backlog with labels/tags)
- [ ] Interest rate estimated (cost of NOT fixing per sprint)
- [ ] Budget established (% of sprint capacity for debt reduction)
- [ ] Reporting/metrics configured (debt ratio, trend over time)

### Max Response Length
200 lines.

## Framework/Methodology

### Tech Debt Decision Tree
```
What type of technical debt?
├── Code debt (messy, untestable, duplicated)
│   → Refactoring, extract method, improve naming
│   → Cost: Slow feature development, bugs
├── Architecture debt (tight coupling, wrong abstraction)
│   → Significant restructuring, extract service
│   → Cost: Hard to change, can't add features
├── Test debt (low coverage, flaky tests)
│   → Write tests, stabilize flaky tests
│   → Cost: Fear of change, regressions
├── Documentation debt (missing, outdated)
│   → Update docs, add README, API docs
│   → Cost: Long onboarding, miscommunication
├── Dependency debt (outdated, incompatible, vulnerable)
│   → Update deps, migrate to supported versions
│   → Cost: CVEs, compatibility issues, blocked upgrades
└── Infrastructure debt (manual deploy, no CI, outdated config)
    → Automate, migrate, upgrade
    → Cost: Slow deploys, environment drift, incidents
```

### Ward Cunningham's Debt Metaphor
```
Borrowing (taking on debt):
  Ship feature quickly with imperfect code
  → Saves time NOW (principal)
  → Costs time LATER (interest payments)

Interest payments:
  Every change to debt-ridden code takes longer
  More bugs, more testing time, more merge conflicts
  Slower onboarding, blocked dependencies

Bankruptcy:
  When interest payments exceed capacity
  → Complete rewrite required
  → System becomes unchangeable
```

## Workflow

### Step 1: Discover and Catalog Debt

```yaml
# Automated discovery tools
automated_discovery:
  sonarqube:
    metrics:
      - "Code coverage < 60%"
      - "Duplication > 5%"
      - "Cognitive complexity > 15 per function"
      - "Technical Debt Ratio > 5%"
      - "Bugs: 0 (zero tolerance)"
      - "Code Smells: trending up"

  eslint / tslint:
    rules:
      - "no-unused-vars: warn"
      - "no-nested-ternary: warn"
      - "max-lines-per-function: [warn, 50]"
      - "max-depth: [warn, 4]"
      - "complexity: [warn, 10]"

# Manual discovery
manual_discovery:
  developer_cues:
    - "\"I'm afraid to touch that code\""
    - "\"This always breaks when we change X\""
    - "\"I don't know what this function does\""
    - "\"We can't upgrade library X because of incompatibility\""
    - "\"It takes 2 hours to run the full test suite\""
  team_retrospective:
    - "\"What slowed us down this sprint?\""
    - "\"What would make development faster?\""
    - "\"Which parts of the codebase are hardest to change?\""
```

### Step 2: Prioritize Debt Items

```yaml
prioritization_matrix:
  factors:
    impact:
      - "Development speed: How much does this slow new features?"
      - "Bug frequency: How often does this cause bugs?"
      - "Risk: What's the cost if this fails in production?"
      - "Blockers: Is this blocking other improvements?"

    effort:
      - "Small (< 1 day): Can fit in current sprint"
      - "Medium (1-3 days): Dedicated tech debt task"
      - "Large (3-10 days): Requires epic/planning"
      - "X-Large (> 10 days): Major initiative"

  scoring:
    formula: "Priority = Impact (1-5) × Frequency (1-5) / Effort (1-5)"
    example:
      - "Duplicated validation logic: Impact 4, Frequency 5, Effort 2 = 10.0"
      - "Outdated auth library: Impact 5, Frequency 3, Effort 3 = 5.0"
      - "Missing README: Impact 1, Frequency 1, Effort 1 = 1.0"
```

### Step 3: Tech Debt Inventory

```markdown
# Tech Debt Backlog

| ID | Item | Type | Impact | Effort | Priority | Status |
|----|------|------|--------|--------|----------|--------|
| T-001 | Extract validation logic from OrderService | Code | 4 | 2 | 10.0 | TODO |
| T-002 | Update deprecated auth library | Dependency | 5 | 3 | 5.0 | TODO |
| T-003 | Add test coverage for payment module | Test | 3 | 5 | 1.5 | TODO |
| T-004 | Standardize error handling across API | Architecture | 4 | 3 | 4.0 | IN PROGRESS |
| T-005 | Remove dead code in user module | Code | 2 | 1 | 6.0 | TODO |
| T-006 | Reduce flaky E2E tests | Test | 5 | 8 | 1.5 | PRIORITIZED |
| T-007 | Update Docker base image | Infrastructure | 3 | 1 | 9.0 | DONE |
```

### Step 4: Track Interest Rate

```yaml
# Interest rate estimation per sprint
interest_calculation:
  metric: "Extra minutes per task × tasks per sprint"
  example:
    debt_item: "Poorly abstracted OrderService (T-001)"
    extra_time_per_task: "15 minutes (navigate, understand, avoid breakage)"
    tasks_per_sprint: "8 (tasks touching order processing)"
    interest_per_sprint: "120 minutes (2 hours)"
    monthly_cost: "8 hours (one full day per month)"

  reporting:
    - "Track: time spent working around debt vs fixing it"
    - "Measure: velocity trend (are we slowing down?)"
    - "Compare: sprint velocity with/without debt reduction"

interest_types:
  - "Navigation time: Finding where to make changes"
  - "Understanding time: Figuring out the code"
  - "Accident time: Recovering from unintended breaks"
  - "Testing time: Running entire suite for one change"
  - "Coordination time: Aligning teams around unclear interfaces"
```

### Step 5: Establish Debt Reduction Process

```yaml
# Process for managing tech debt
debt_management_process:

  budget:
    rule: "15-20% of sprint capacity for tech debt"
    rationale: "Based on industry research — less = debt grows, more = features stall"
    tracking: "Labeled as 'tech-debt' in sprint backlog"

  sprint_cycle:
    start:
      - "Review debt backlog (10 min sprint planning)"
      - "Select highest priority items within budget"
    during:
      - "One PR = fix + test for debt items"
      - "Flag new debt discovered during feature work"
    end:
      - "Review resolved debt items"
      - "Measure interest savings"
      - "Update debt metrics dashboard"

  gates:
    new_feature:
      - "If feature touches debt-ridden code: refactor first"
      - "Before/after complexity comparison required"
    code_review:
      - "Don't add new debt (code must be cleaner than when found)"
      - "Flag opportunities but don't block on unrelated cleanup"

  metrics:
    - "Tech debt ratio (SonarQube or similar)"
    - "Test coverage %"
    - "Cyclomatic complexity average"
    - "Duplication %"
    - "Time to implement standard feature"
```

### Step 6: Add Debt Tracking to Backlog

```yaml
# GitLab issue template: tech-debt.md
title: "[Debt] Short description"
labels: ["tech-debt", "needs-triage"]
---
## Description
<!-- What is the debt and where is it located? -->

## Impact
- [ ] Slows feature development
- [ ] Causes bugs / regressions
- [ ] Blocks dependency upgrade
- [ ] Security risk
- [ ] Increases onboarding time

## Symptoms
<!-- What specific pain points does this cause? -->

## Location
- File(s):
- Module:
- Last modified:

## Suggested Fix
<!-- How would we fix this? -->

## Effort Estimate
- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-10 days)
- [ ] X-Large (> 10 days, needs planning)

## Interest Rate
<!-- How much time does this cost per sprint? -->

## Acceptance Criteria
- [ ] Fix implemented
- [ ] Tests added/updated
- [ ] Documentation updated (if API changed)
- [ ] Duplicate/similar patterns found and noted
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Not quantifying debt | "We have technical debt" without specifics | Measure impact in time/cost per sprint |
| Only tracking, never fixing | Backlog of debt items nobody addresses | Dedicate sprint budget to reductions |
| Zero-debt goal | Trying to eliminate all debt is impossible | Manage debt, don't eliminate it |
| No prioritization | Every debt item seems equally important | Use impact × frequency / effort formula |
| Blaming developers | Debt seen as laziness, not trade-off | Debt is rational at the time — manage forward |
| No interest calculation | No visibility into the cost of debt | Track and communicate interest to stakeholders |
| Big bang rewrite | "Let's just rewrite everything" | Incremental repayment, one area at a time |
| Ignoring tests as debt | Low coverage isn't tracked | Include test debt in the tracker |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Track debt alongside features | Same backlog, same prioritization process |
| Dedicate 15-20% sprint capacity | Prevents debt from growing unsustainably |
| Quantify interest rate | Stakeholders understand the cost of delay |
| Fix debt near new code | Scout Rule: leave code cleaner than you found it |
| Use automated tools | SonarQube, CodeClimate, or custom metric dashboards |
| Label debt items consistently | Track trends over time |
| Review debt quarterly | Reassess priorities, close completed items |
| Celebrate debt reduction | Recognize cleanup work as valuable |
| Distinguish intentional from accidental | Not all debt is bad — some is strategic |

## References
  - references/tech-debt-tracker-advanced.md — Tech Debt Tracker Advanced Topics
  - references/tech-debt-tracker-fundamentals.md — Tech Debt Tracker Fundamentals
  - references/tech-debt-tracker-metrics.md — Tech Debt Metrics Reference
  - references/tech-debt-tracker-prioritization.md — Tech Debt Prioritization Reference
## Handoff
Hand off to `dev-loop-refactor-guide` for refactoring implementation of debt items. Hand off to `dev-loop-security-auditor` for security-related debt.
