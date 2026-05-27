---
name: pm
description: >
  Use this skill when the user says 'project management', 'sprint planning',
  'estimate', 'story points', 't-shirt sizing', 'risk register', 'stakeholder',
  'status report', 'blocker', 'retrospective', 'velocity', 'burndown', 'capacity
  planning', or needs project management guidance. Covers: agile ceremonies,
  estimation techniques, risk management, stakeholder communication, and status
  reporting. Do NOT use for: writing technical specs, coding, testing, or
  requirements analysis (use ba).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, pm, process]
---

# Project Management

## Purpose
Provide structured project management workflows covering agile ceremonies, estimation, risk management, stakeholder communication, and status reporting.

## Agent Protocol

### Trigger
Exact user phrases: "project management", "sprint planning", "estimate", "story points", "t-shirt sizing", "risk register", "stakeholder", "status report", "blocker", "retrospective", "velocity", "burndown", "capacity planning", "sprint retrospective", "daily standup", "backlog grooming", "sprint review".

### Input Context
Before activating, verify:
- The project context is known (team size, sprint length, methodology).
- The current sprint/iteration state is available (backlog, in-progress, done).
- The specific need is clear: planning, estimation, risk, or reporting.

### Output Artifact
No file output. This skill produces text guidance, templates, or structured plans.

### Response Format
Answer in the format matching the request:
- **Sprint Plan**: Sprint goal + committed stories + capacity.
- **Estimation**: Story points or t-shirt size with justification.
- **Risk Register**: Risk + likelihood + impact + mitigation.
- **Status Report**: What was done + what's blocked + what's next.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of agile methodology.

### Completion Criteria
This skill is complete when:
- [ ] The user's request is addressed with a concrete output (plan, estimate, register, report).
- [ ] Risk items include both impact and mitigation.
- [ ] Estimations include confidence level or range.

### Max Response Length
Sprint plan: 20 lines. Risk register: 15 lines. Status report: 10 lines.

## Workflow

### Step 1: Sprint Planning
Given sprint length (default 2 weeks) and team capacity:

1. Calculate capacity:
   - Team members × sprint days × hours/day × focus factor (0.6-0.8)
   - Subtract ceremonies, PTO, support rotation
2. Select backlog items by priority:
   - Top stories that fit within capacity
   - Include buffer for unknowns (15-20%)
3. Break down stories into tasks with hourly estimates
4. Define sprint goal (one sentence)
5. Identify risks specific to this sprint

```
Sprint Goal: {one sentence}
Capacity: {n} story points / {n} hours
Committed: STORY-1, STORY-2, STORY-3
Buffer: {n} points for unknowns
Risks: {list}
```

### Step 2: Estimation

| Technique | When | Output |
|-----------|------|--------|
| **Planning Poker** | Story-level, team consensus | Fibonacci (1,2,3,5,8,13,21) |
| **T-shirt Sizing** | Epic-level, quick triage | XS, S, M, L, XL, XXL |
| **Three-Point** | Task-level, high accuracy | Optimistic + Most Likely + Pessimistic |
| **Affinity Mapping** | Large backlog, batch | Relative sizing by comparison |

```
Story: STORY-42 (User login with MFA)
Estimate: 5 points
Confidence: Medium (MFA integration is new)
Breakdown:
  - Backend: JWT + TOTP validation (2d)
  - Frontend: MFA setup flow (1d)
  - Tests: Unit + integration + E2E (1d)
  - Buffer (1d)
```

### Step 3: Risk Management

```
| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| Third-party API rate limit | High | High | Implement caching + fallback | Dev lead |
| Team member PTO mid-sprint | Medium | Medium | Cross-train on critical paths | PM |
| Performance regression | Low | High | Benchmark gate in CI | QA lead |
```

### Step 4: Status Report
```
## Sprint {n} Status
Period: YYYY-MM-DD to YYYY-MM-DD
Velocity: {n} / {n} points (on track / at risk / behind)

### Done
- STORY-42: User login with MFA
- STORY-43: Password reset flow

### In Progress
- STORY-44: Dashboard widgets (50%, blocked)

### Blocked
- STORY-44: Waiting on design review
  - Unblock plan: Escalate to design lead by EOD

### Next
- STORY-45: Export to PDF
- STORY-46: Audit log viewer
```

### Step 5: Retrospective
1. What went well? (keep doing)
2. What went wrong? (stop doing)
3. What to improve? (start doing)
4. Action items with owners and deadlines

```
## Sprint {n} Retro

### Keep Doing
- Daily standups are focused and under 15min
- PR reviews completed within 4h

### Stop Doing
- Committing stories without proper acceptance criteria
- Last-minute scope changes mid-sprint

### Start Doing
- Write acceptance criteria before development
- Add QA review column to board

### Action Items
- [ ] Define acceptance criteria template (BA lead, by Wed)
- [ ] Configure board with QA review column (PM, by Fri)
```

## Agile at Scale Frameworks

### Framework Selection

```yaml
agile_at_scale:
  team_of_teams:
    description: "Multiple Scrum teams working independently with coordination"
    structure: "2-5 teams, each with own Scrum process, weekly sync between leads"
    coordination:
      - "Weekly Scrum of Scrums — team leads sync on dependencies"
      - "Cross-team backlog refinement for shared work items"
      - "Joint sprint review for stakeholder demo"
    best_for: "15-50 engineers, single product, moderate cross-team dependencies"
    
  scaled_agile_framework:
    description: "SAFe — structured framework with program increment (PI) planning"
    structure: "Agile Release Train (ART) — 5-12 teams, 8-12 week PI cadence"
    ceremonies:
      - "PI Planning every 8-12 weeks — 2-day event with all teams"
      - "System demo at end of each iteration"
      - "Inspect and Adapt workshop at end of PI"
    artifacts: ["Program backlog", "PI objectives", "ART board", "WSJF prioritization"]
    best_for: "50-200 engineers, multiple products, enterprise compliance requirements"
    trade_offs: "Heavy process overhead, less autonomy, requires dedicated RTE"
    
  lean_agile:
    description: "Lean principles applied to agile — Kanban at scale"
    structure: "Value stream teams with end-to-end ownership"
    practices: ["Kanban with work-in-progress limits", "Service level agreements (SLAs)", "Flow metrics (cycle time, throughput)"]
    best_for: "Maintenance-heavy work, operations teams, continuous delivery"
    
  shape_up:
    description: "Basecamp's 6-week cycle / 2-week cooldown approach"
    structure: "Shaped pitches → 6-week building cycles → 2-week cooldown"
    practices: ["Pitch document (problem, solution, appetite, rabbit holes)", "No daily standups, no sprint backlogs", "Vertical slicing — build thin, then iterate"]
    best_for: "Small teams (3-8), product-focused, high autonomy"
```

### Estimation Framework Decision Tree

```yaml
estimation_framework:
  question_1_precision_needed:
    "Do you need high precision (budgeting, contractual)?":
      yes: "Three-point estimation (PERT) — optimistic + most likely + pessimistic"
      no:
        question_2_artifact_level:
          "What level are you estimating?":
            epic: "T-shirt sizing (XS-XXL) or story points with affinity mapping"
            story: "Planning Poker with Fibonacci sequence"
            task: "Hours or half-days — engineering judgment"
            
  question_3_team_familiarity:
    "Is the team familiar with the work domain?":
      yes: "Relative estimation (story points) — compare to known baseline stories"
      no: "T-shirt sizing with wide ranges — accept uncertainty, re-estimate after first iteration"
      
  question_4_audience:
    "Who needs the estimate?":
      leadership: "T-shirt sizing + quarter-level ranges — don't give false precision"
      product: "Story points — relative sizing for prioritization"
      engineering: "Hours — task-level breakdown for sprint capacity"
```

### Delivery Risk Management

```yaml
delivery_risk:
  risk_categories:
    technical:
      - "Integration complexity with existing systems"
      - "Performance/scaling unknowns"
      - "Data migration complexity"
      - "Third-party API limitations"
    process:
      - "Unclear requirements or acceptance criteria"
      - "Dependency on external teams"
      - "Stakeholder availability for feedback"
      - "Approval gate timing"
    resource:
      - "Team member availability (PTO, turnover, sickness)"
      - "Skill gaps in critical areas"
      - "Tooling or environment availability"
    external:
      - "Regulatory changes mid-project"
      - "Vendor or partner delays"
      - "Market timing pressure"
      
  risk_response_strategies:
    mitigate: "Reduce likelihood or impact — spike to validate architecture, add buffer"
    avoid: "Change approach to eliminate risk — use proven technology instead of bleeding edge"
    transfer: "Shift risk to third party — fixed-price contract, insurance, SaaS over custom build"
    accept: "Acknowledge and monitor — low impact risks with contingency plan if triggered"
    
  tracking:
    format: "Risk register — one row per risk with likelihood, impact, response, owner"
    review: "Reassess at each sprint planning — likelihood and impact may change"
    escalation: "Critical risks (high likelihood + high impact) escalate to project sponsor"
```

## Rules
- Estimates are ranges, not promises — never treat estimates as deadlines
- Velocity is a planning tool, not a performance metric
- Every risk must have both a likelihood AND an impact rating
- Status reports must include blockers with unblock plans
- Retrospectives produce action items with owners — no complaints without solutions
- Sprint goal must be achievable within the sprint — not aspirational
- Choose agile-at-scale framework based on team count and dependency complexity, not popularity
- Estimation precision should match the audience — don't give hour-level estimates to leadership
- Risk register must be reviewed at least every sprint planning — risks change over time

## References
  - references/ceremony-guide.md — Agile Ceremony Guide
  - references/estimation-guide.md — Estimation Guide
  - references/estimation-techniques.md — Estimation Techniques
  - references/pm-advanced.md — Pm Advanced Topics
  - references/pm-fundamentals.md — Pm Fundamentals
  - references/risk-register-template.md — Risk Register Template
## Handoff
After completing this skill:
- Next skill: **ba** — to elaborate requirements for planned stories
- Pass context: sprint plan, estimated stories, risk register, team capacity
