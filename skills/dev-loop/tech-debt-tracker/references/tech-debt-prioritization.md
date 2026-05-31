# Tech Debt Prioritization

## Overview

Technical debt prioritization transforms subjective feelings about code quality into data-driven decisions. This reference covers quantitative prioritization models, the debt quadrant framework, ROI calculation methodologies, sprint planning integration, stakeholder communication, and debt reduction strategies.

## Prioritization Models

### ROI-Based Prioritization

The primary model for tech debt prioritization is Return on Investment (ROI): the ratio of weekly interest saved to the principal cost of fixing the debt.

```yaml
roi_formula:
  weekly_interest_hours: "Devs_Affected x Encounters_Per_Week x Hours_Wasted_Per_Encounter"
  principal_hours: "Code_Changes + Test_Updates + Dependent_Refactors + Review + Deploy"
  roi: "Weekly_Interest / Principal"

  thresholds:
    immediate_fix:
      roi: "> 1.0"
      meaning: "Fix pays for itself in under 1 week"
      action: "Schedule in current sprint"

    high_priority:
      roi: "0.5 - 1.0"
      meaning: "Fix pays for itself in 1-2 weeks"
      action: "Schedule in next sprint"

    medium_priority:
      roi: "0.1 - 0.5"
      meaning: "Fix pays for itself in 2-10 weeks"
      action: "Backlog, evaluate quarterly"

    accept_debt:
      roi: "< 0.1"
      meaning: "Fix costs more than carrying the debt"
      action: "Document and accept — do not fix"
```

### Interest Rate Estimation Guide

```yaml
developers_affected:
  single_developer: 1
  small_team: 3
  full_team: 8
  organization: 20

encounters_per_week:
  multiple_times_daily: 10
  daily: 5
  few_times_weekly: 3
  weekly: 1
  monthly: 0.25

hours_wasted_per_encounter:
  minor_annoyance: 0.083  # 5 minutes
  moderate_interruption: 0.25  # 15 minutes
  significant_blocker: 0.5  # 30 minutes
  major_blocker: 1.0  # 60 minutes

examples:
  slow_test_suite:
    devs: 8 (full team)
    encounters: 10 (each CI run)
    hours: 0.083 (5 min waiting for tests)
    weekly_interest: 6.64 hours
    principal: 40 hours (fix flaky tests + optimize)
    roi: 0.17
    priority: "Medium — schedule within 2 sprints"

  confusing_api:
    devs: 3 (frontend team)
    encounters: 5 (daily)
    hours: 0.25 (15 min confusion per use)
    weekly_interest: 3.75 hours
    principal: 16 hours (redesign + migrate)
    roi: 0.23
    priority: "Medium — schedule within 1 sprint"

  missing_input_validation:
    devs: 8 (full team)
    encounters: 2 (weekly bugs)
    hours: 1 (production incident investigation)
    weekly_interest: 16 hours
    principal: 8 hours (add validation middleware)
    roi: 2.0
    priority: "Critical — fix immediately"
```

## Debt Quadrant Framework

### Quadrant Classification

```yaml
reckless_inadvertent:
  description: "Team didn't know better at the time"
  indicators:
    - "No comments explaining the approach"
    - "Code that violates documented standards"
    - "Obsolete patterns from earlier in team's learning curve"
  triage_priority: 1 (highest)
  response: "Fix next sprint — team is unknowingly paying interest"
  examples:
    - "Using var instead of proper types in TypeScript"
    - "Blocking I/O calls on the main thread"
    - "No error handling around network calls"

reckless_intentional:
  description: "Team knowingly chose a bad approach"
  indicators:
    - "Comments like 'HACK', 'QUICK FIX', 'WORKAROUND'"
    - "Skipped tests or disabled lint rules"
    - "Copy-pasted code with known duplication"
  triage_priority: 2
  response: "Schedule within 2 sprints — team knows it hurts"
  examples:
    - "Disabling type checking with 'as any'"
    - "Skipping unit tests due to deadline pressure"
    - "Copy-pasting a complex function instead of extracting it"

prudent_inadvertent:
  description: "Code was correct when written, but context changed"
  indicators:
    - "Legacy code that predates current best practices"
    - "Design decisions based on outdated requirements"
    - "Dependencies on deprecated libraries"
  triage_priority: 3
  response: "Backlog — evaluate quarterly for changing context"
  examples:
    - "Redux store that should be React Query hooks"
    - "View logic that should be extracted to ViewModel"
    - "REST endpoints that should be GraphQL"

prudent_intentional:
  description: "Deliberate tradeoff with known cost"
  indicators:
    - "Comments referencing tickets: 'TODO(#1234): refactor after X'"
    - "Architecture Decision Records documenting the tradeoff"
    - "Feature flags covering the workaround"
  triage_priority: 4 (lowest)
  response: "Documented debt — fix when adjacent work requires it"
  examples:
    - "Monolith that will be split after migration"
    - "Hardcoded config that will be externalized"
    - "Synchronous process that will be async"
```

## Sprint Planning Integration

### Capacity Allocation

```yaml
capacity_model:
  baseline:
    description: "Reserve 20% of sprint capacity for tech debt"
    per_developer: "1 day per week or 1 day per sprint"
    rationale: "Prevents debt accumulation without blocking feature work"

  adjustment_factors:
    high_debt_codebase:
      description: "Codebase with critical debt items"
      allocation: "30-40%"
      trigger: "ROI > 0.5 items filling more than 2 sprints"

    stable_codebase:
      description: "Low debt, well-maintained codebase"
      allocation: "10-15%"
      trigger: "No items with ROI > 0.3"

    pre_release:
      description: "Before major release"
      allocation: "Reduced to 10%"
      reason: "Feature completion priority"

  unspent_capacity:
    rollover: "Unused debt capacity rolls to next sprint"
    max_accumulation: "2 sprints of capacity"
    expiration: "Lost after 2 sprints (use it or lose it)"
```

### Debt Story Format

```yaml
story_template:
  title: "Refactor {module} to fix {issue}"
  type: "Tech Debt (Spike or Chore)"
  story_points: "Based on principal estimate"
  
  description: |
    ## Problem
    {description of the debt, including interest cost}
    
    ## Current Impact
    - Affected developers: {count}
    - Weekly interest: {hours} hours
    - Encounter frequency: {frequency}
    
    ## Proposed Solution
    {technical approach for the fix}
    
    ## Acceptance Criteria
    - {behavioral change, if any}
    - {performance improvement, if any}
    - {test coverage requirement}
    - {no regression in existing functionality}
    
    ## Risks
    - {known risks of the refactor}
    - {rollback plan if things go wrong}

  labels:
    - "tech-debt"
    - "roi-{value}"  # e.g., roi-0.47
    - "quadrant-{category}"  # e.g., quadrant-reckless-inadvertent
```

### Sprint Backlog Prioritization

```yaml
sprint_planning_workflow:
  step_1:
    action: "Run debt scan to get current ROI-ranked items"
    frequency: "Before every sprint planning"
    output: "Prioritized item list sorted by ROI"

  step_2:
    action: "Select top items up to 20% sprint capacity"
    criteria: "ROI > 0.1, no items excluded solely by preference"
    exception: "Team can defer max 1 item per sprint with documented reason"

  step_3:
    action: "Assign to developers with relevant context"
    consideration: "Debt fix may be unrelated to developer's feature work"
    pairing: "Pair new team member with experienced person for knowledge transfer"

  step_4:
    action: "Track debt work alongside feature work in daily standup"
    metric: "Did we allocate the planned 20%?"
    adjustment: "If under-allocated, move next debt item from backlog"

  step_5:
    action: "Review debt reduction progress in sprint retro"
    metrics:
      - "Debt items completed vs planned"
      - "Total interest reduction this sprint"
      - "New debt items discovered this sprint"
```

## Stakeholder Communication

### Reporting to Non-Technical Stakeholders

```yaml
executive_report_template:
  dashboard:
    total_debt_items: 42
    total_weekly_interest: "3.5 developer-days (28 hours)"
    total_principal: "180 developer-days"
    debt_ratio: "0.19 (ROI)"
    trend: "Declining 15% quarter-over-quarter"

  key_metrics:
    - "Interest rate: 3.5 dev-days/week (equivalent to 0.7 full-time developers)"
    - "Principal: 180 dev-days (equivalent to 9 dev-months)"
    - "If we invest 20% capacity (1 day/week/dev), debt is paid off in ~9 months"
    - "If we ignore debt, interest grows at ~5% per quarter"

  analogy: |
    Technical debt is like credit card debt:
    - The principal is what it would cost to fix the code (one-time)
    - The interest is the ongoing productivity loss (weekly)
    - Minimum payments (20% capacity) keep debt from growing
    - Paying more reduces total interest paid over time

  recommendation:
    - "Continue 20% capacity allocation for debt reduction"
    - "Current trajectory: debt-free in 9 months"
    - "Risk: new features may add debt faster than we pay it down"
    - "Request: 1 extra developer for 3 months to accelerate payoff"
```

### Team Communication

```yaml
team_dashboard:
  visible_in: "Sprint board (column or swimlane for debt)"
  metrics:
    - "Items in debt backlog (by ROI)"
    - "Items completed this sprint (actual vs planned)"
    - "Interest rate trend (rising/falling)"
    - "Quadrant distribution (where is debt coming from?)"

  team_norms:
    - "No blame for creating debt — celebrate discovery"
    - "Debt interest is a team metric, not individual"
    - "Everyone has capacity for debt reduction"
    - "Debt work is not 'less important' than feature work"
    - "Pair on complex debt items for knowledge sharing"
```

## Debt Reduction Strategies

### Strategic Approaches

```yaml
strategy_high_roi_first:
  description: "Fix items with highest ROI first (recommended)"
  approach: "Sort by ROI descending, allocate capacity to top items"
  pros:
    - "Maximum productivity improvement per hour invested"
    - "Quick wins build momentum and team confidence"
    - "Data-driven — defendable to stakeholders"
  cons:
    - "May leave low-ROI high-impact items untouched"
    - "Requires accurate interest estimation"

strategy_boy_scout_rule:
  description: "Leave code better than you found it"
  approach: "Fix adjacent debt when working on feature in same module"
  pros:
    - "Zero dedicated debt capacity needed"
    - "Context is fresh — faster fixes"
    - "Gradual improvement without dedicated sprints"
  cons:
    - "Inconsistent — hot modules get cleaned, cold modules don't"
    - "Difficult to track progress"
    - "May not address highest-ROI items"

strategy_debt_sprint:
  description: "Dedicated debt reduction sprint (1 per quarter)"
  approach: "Full sprint focused entirely on debt reduction"
  pros:
    - "Significant progress in short time"
    - "Visible impact — team and stakeholders see the difference"
    - "Good for codebases with accumulated critical debt"
  cons:
    - "No feature delivery for one sprint"
    - "Sprint planning disruption"
    - "Post-sprint habits may revert"

strategy_bug_fix_integration:
  description: "Fix debt when fixing related bugs"
  approach: "When investigating a bug, fix root cause debt"
  pros:
    - "Debt reduction is a side effect of bug fixing"
    - "Root cause fixes prevent bug recurrence"
    - "Naturally prioritizes high-impact debt"
  cons:
    - "Only addresses debt that causes bugs"
    - "May expand bug fix scope (schedule impact)"
```

### Debt Prevention

```yaml
prevention_strategies:
  feature_debt_allowance:
    description: "Allocate 10% of feature story points for debt cleanup"
    implementation: "Add 'incidental cleanup' task to every feature story"
    enforcement: "PM approves scope reduction if cleanup exceeds 10%"
    benefit: "Prevents new features from adding net-new debt"

  code_review_gate:
    description: "Flag new debt markers during code review"
    rules:
      - "New TODO must reference a tracking issue"
      - "New FIXME requires team lead approval"
      - "HACK is not allowed in merged code (use WORKAROUND with issue ref)"
    tool: "Lint rule: TODO without issue reference = warning"

  definition_of_done:
    description: "Include debt management in feature completion criteria"
    checklist:
      - "No new TODO/FIXME/HACK without tracking issue"
      - "At least one existing debt item in the module resolved"
      - "No new lint warnings or type errors"
      - "Test coverage meets minimum threshold"

  tech_debt_budget:
    description: "Set a maximum debt interest rate for the codebase"
    implementation: "If total interest exceeds threshold, features require debt offset"
    threshold: "Total interest rate < 5% of team capacity"
    enforcement: "CI fails if debt scan shows interest rate above threshold"
```

## Automated Debt Tracking

### CI Integration

```yaml
ci_debt_check:
  trigger: "On every PR to main/master"
  actions:
    - "Run debt scan on changed files only"
    - "Flag new TODO/FIXME/HACK markers"
    - "Calculate interest delta for changed modules"
    - "Post comment to PR with debt impact"

  pr_comment_template: |
    ## Tech Debt Impact
    
    This PR adds:
    - {count} new debt markers
    - {interest_delta} hours/week interest
    - {principal} hours principal
    
    > Recommendation: {action}

  failure_conditions:
    - "New HACK markers without tracking issue: fail"
    - "New TODO without issue reference: warn"
    - "Interest increase > 2 hours/week: required approval"
```

### Quarterly Debt Review

```yaml
quarterly_review_agenda:
  duration: "60 minutes"
  participants: "Full engineering team"
  
  agenda:
    - "10 min: Debt scan results (current state, trends)"
    - "15 min: Review top 10 debt items by ROI"
    - "15 min: Evaluate debt prevention effectiveness"
    - "10 min: Adjust debt capacity allocation"
    - "10 min: Update debt reduction roadmap"

  metrics_reviewed:
    - "Total interest rate: 28 hours/week (changed from 32 last quarter)"
    - "Total principal: 180 hours (changed from 200 last quarter)"
    - "New debt added this quarter: 12 items"
    - "Debt resolved this quarter: 18 items"
    - "Net debt change: -6 items (resolved more than added)"
    - "Quadrant distribution: 60% prudent, 40% reckless"
```

## References

- tech-debt-communication.md — Communicating debt to stakeholders
- Debt Prioritization — Debt prioritization reference
- Repayment Strategies — Debt repayment approaches
- Tech Debt Management — Technical debt management overview
