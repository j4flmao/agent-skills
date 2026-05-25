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

## Rules
- Estimates are ranges, not promises — never treat estimates as deadlines
- Velocity is a planning tool, not a performance metric
- Every risk must have both a likelihood AND an impact rating
- Status reports must include blockers with unblock plans
- Retrospectives produce action items with owners — no complaints without solutions
- Sprint goal must be achievable within the sprint — not aspirational

## References
- `references/ceremony-guide.md` — agile ceremony timing and facilitation
- `references/estimation-guide.md` — estimation techniques with examples
- `references/risk-register-template.md` — Risk register template with scoring and response planning
- `references/estimation-techniques.md` — Additional estimation techniques with worked examples

## Handoff
After completing this skill:
- Next skill: **ba** — to elaborate requirements for planned stories
- Pass context: sprint plan, estimated stories, risk register, team capacity
