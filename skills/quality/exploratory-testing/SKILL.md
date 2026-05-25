---
name: quality-exploratory-testing
description: >
  Use when the user asks about exploratory testing, session-based test management, test heuristics, charter design, or ad-hoc testing. Do NOT use for: scripted testing, formal test case writing, or automated regression testing (use quality-regression-testing).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, exploratory-testing, phase-6]
---

# Exploratory Testing

## Purpose
Discover defects through simultaneous learning, test design, and test execution using structured heuristics, session-based management, and charter-driven exploration.

## Agent Protocol

### Trigger
User mentions exploratory testing, session-based test management (SBTM), test heuristics, charter design, or asks to "explore" an area of the application without existing test cases.

### Input Context
- Feature under test (FUT) — area, module, or critical path
- Known risks, recent changes, or complexity hotspots
- Any existing test coverage data
- Session duration constraints (typically 60-90 minutes)

### Output Artifact
- Session report: charter, duration, areas covered, bugs found, coverage notes, test ideas generated
- Updated charter backlog if applicable
- Bug reports filed from findings

### Response Format
Structured session report with:
1. Charter and mission statement
2. Time-box results and areas explored
3. Heuristics applied
4. Defects found (severity, reproduction steps)
5. Coverage gaps identified
6. New test ideas for future sessions

### Completion Criteria
- Session time-box expired AND
- Charter mission addressed OR explicit scope adjustment documented
- All findings recorded with reproduce steps
- Debrief notes ready for stakeholder handoff

## Workflow

### Session-Based Test Management (SBTM)
1. **Charter creation**: Define mission, scope, resources, timebox
2. **Session execution** (60-90 min time-box):
   - Test design and execution (simultaneous)
   - Note-taking and data recording
   - Bug discovery and reporting
3. **Debrief**: Review results, adjust charter backlog, capture learnings
4. **Metrics**: Charter coverage, bug find rate, area coverage, session effectiveness

### Heuristic Application Flow
```
Problem → Select Heuristic → Apply & Observe → Record Finding → (Optional) Select Next Heuristic
```

### Charter Execution
```
┌─────────────────────────────────────────┐
│ Charter: "Explore checkout with coupon  │
│           codes on mobile viewport"     │
├─────────────────────────────────────────┤
│ Mission: Find issues in coupon          │
│          application at checkout        │
│ Scope:   Logged-in user, all coupon     │
│          types, mobile breakpoints     │
│ Timebox: 75 minutes                    │
│ Resources: Test account, coupon codes,  │
│            DevTools mobile emulation    │
└─────────────────────────────────────────┘
```

## Rules
1. Always set a clear charter before starting — no unbounded exploration
2. Respect the time-box strictly — unfinished charters roll to next session
3. Record everything: both passing observations AND failures
4. Apply at least one heuristic per session
5. Debrief every session — no orphaned findings
6. Do NOT convert exploratory findings into scripted tests immediately; maintain a separate charter backlog
7. One charter per session — context switching reduces exploration depth

## References
- `references/session-based.md` — Session-Based Test Management (SBTM)
- `references/test-heuristics.md` — Test heuristics and mnemonic guides
- `references/charter-design.md` — Charter design and types
- `references/exploratory-session.md` — Session-based testing, charter templates, debriefing, notes

## Handoff
After session completion, hand off to:
- `quality-regression-testing` — if new bugs need regression coverage
- `quality-acceptance-testing` — if exploratory uncovered missing acceptance criteria
- `quality-e2e-testing` — if end-to-end flows need automated coverage
