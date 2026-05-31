---
name: quality-exploratory-testing
description: >
  Use when the user asks about exploratory testing, session-based test management, test heuristics, charter design, or ad-hoc testing. Do NOT use for: scripted testing, formal test case writing, or automated regression testing (use quality-regression-testing).
version: "2.0.0"
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

## Architecture

### Exploratory Testing Flow
```
Charter Creation ──> Session Execution (60-90min) ──> Debrief ──> Backlog Update
                         │
                    ┌────┴────┐
                    │         │
              Test Design  Note-taking
              (heuristic)  (data recording)
                    │         │
              Test Execution Bug Discovery
```

### Decision Tree: Heuristic Selection
```
What aspect of the app are you exploring?
├── Input handling and data entry
│   → Use FEW HICCUPS heuristic
│   → Focus: format, extreme values, wrong types, empty/null
├── Navigation and workflow
│   → Use SFDPOT heuristic
│   → Focus: flow sequence, data persistence across steps, back button
├── Error handling and recovery
│   → Use error guessing heuristic
│   → Focus: network failures, server errors, permission denied
├── State and data persistence
│   → Use CRUD heuristic
│   → Focus: create, read, update, delete — data consistency across operations
├── Concurrency and race conditions
│   → Use timing heuristic
│   → Focus: rapid clicks, double submits, parallel operations
└── Cross-cutting concerns
    → Use quality attributes heuristic
    → Focus: performance, security, accessibility, internationalization
```

### Decision Tree: Session Scope
```
What is the exploration goal?
├── Find bugs in new feature
│   → Narrow charter, feature-specific heuristics
│   → Test within feature boundaries first, then integration points
├── Assess quality of existing area
│   → Broader charter, variety of heuristics
│   → Sample across different parts of the feature area
├── Investigate specific risk
│   → Focused charter, risk-specific heuristics
│   → Deep dive into the risk area, adjacent paths
└── Learn unfamiliar codebase
    → Learning charter, no explicit bug-finding goal
    → Document observations, create charter ideas for deeper exploration
```

## Workflow

### Session-Based Test Management (SBTM)
1. **Charter creation**: Define mission, scope, resources, timebox
2. **Session execution** (60-90 min time-box):
   - Test design and execution (simultaneous)
   - Note-taking and data recording
   - Bug discovery and reporting
3. **Debrief**: Review results, adjust charter backlog, capture learnings
4. **Metrics**: Charter coverage, bug find rate, area coverage, session effectiveness

### Charter Design Process
Define the charter with five elements: mission (one-sentence goal of the session), scope (what is in bounds and out of bounds), timebox (typically 60 or 90 minutes), resources (test accounts, test data, tools needed), and heuristics (which heuristics to apply). A good charter is specific enough to guide exploration but broad enough to allow discovery. "Explore checkout with coupon codes" is better than "Test checkout" (too broad) and "Verify that coupon code X gives 20% off order Y" (too narrow, that is a scripted test).

### Heuristic Application Flow
```
Problem -> Select Heuristic -> Apply & Observe -> Record Finding -> (Optional) Select Next Heuristic
```

### Session Note-Taking
During a session, record three categories of notes: test data (what was tested, with what inputs, on what configuration), observations (what happened — both expected and unexpected behavior, screenshots of interesting states), and ideas (new charters, additional heuristics to try, areas to explore in future sessions). Use a structured format: `[session_id] [timestamp] [area] [action] [result]`. Example: `S042 14:32 Checkout Applied coupon SAVE20 -> "Invalid coupon" error even though coupon is valid`.

### Debrief Structure
Five-minute debrief after each session covering: what was tested (the actual areas covered, which may differ from the charter), what was found (bugs, observations, questions), coverage assessment (what was adequately tested, what needs more attention), new charters (ideas generated during the session for future exploration), and session quality (was the charter well-scoped, were heuristics appropriate, was the timebox respected). Record the debrief in a structured format for trend analysis.

### Charter Backlog Management
Maintain a prioritized backlog of charters. Sources of new charters: debrief sessions (uncovered areas need dedicated charters), production issues (bugs reported in production suggest insufficient exploration), feature roadmap (upcoming features need exploratory charters before release), risk assessment (high-risk areas identified during planning need deep exploration). Prioritize by: risk level of the area, bug density (more bugs found = more charters needed), recency of changes, and stakeholder requests. Review the backlog weekly.

### Bug Reporting from Exploratory Sessions
When a bug is found during exploration, report it immediately with: title (descriptive, searchable), steps to reproduce (numbered, starting from a known state), expected result (what should happen), actual result (what happened, including error messages and screenshots), environment (device, OS, browser, app version), severity (critical, major, minor), and session reference (the charter and session ID for traceability). File the bug in the project's issue tracker during the session, not after — context is fresh and reproduction is easier.

### Coverage Mapping
After a series of sessions, map coverage against the feature area. Use a simple grid: features as columns, quality attributes as rows (functionality, reliability, usability, performance, security, compatibility). Mark each cell as covered, partially covered, or not covered. Use the coverage map to identify gaps and prioritize future charters. A coverage map with 80%+ coverage across key quality attributes is the target before a major release.

### Charter Execution
```
+-------------------------------------------------+
| Charter: "Explore checkout with coupon           |
|           codes on mobile viewport"              |
+-------------------------------------------------+
| Mission: Find issues in coupon                   |
|          application at checkout                 |
| Scope:   Logged-in user, all coupon              |
|          types, mobile breakpoints              |
| Timebox: 75 minutes                             |
| Resources: Test account, coupon codes,           |
|            DevTools mobile emulation             |
+-------------------------------------------------+
```

## Rules
1. Always set a clear charter before starting — no unbounded exploration
2. Respect the time-box strictly — unfinished charters roll to next session
3. Record everything: both passing observations AND failures
4. Apply at least one heuristic per session
5. Debrief every session — no orphaned findings
6. Do NOT convert exploratory findings into scripted tests immediately; maintain a separate charter backlog
7. One charter per session — context switching reduces exploration depth
8. Report bugs immediately during the session — never wait for the debrief to file bug reports
9. Use a structured notes format — free-form notes are hard to analyze across sessions
10. Sessions should cover both happy path and edge cases — don't focus only on bug hunting at the expense of understanding the feature
11. Each session should vary the heuristics applied — repeating the same heuristic across sessions creates blind spots
12. Explore on real devices for at least 30% of sessions — simulators and emulators miss real-world issues (sensor, connectivity, performance)
13. Rotate charters among team members — different testers find different bugs with different heuristics
14. Map coverage after every 5 sessions — identify gaps before they become production issues
15. A session without bug findings is not a wasted session — documented correct behavior and coverage confirmation are valuable outputs

## Common Pitfalls

- **Charter too broad**: "Explore the app" is not a charter. A charter must have a specific mission, scope, and timebox. Broad charters lead to shallow exploration across many areas without depth in any.
- **No note-taking during sessions**: Relying on memory after the session loses detail. Take notes continuously during exploration — even expected behavior should be noted for coverage documentation.
- **Ignoring the timebox**: Sessions that run overtime lose focus and produce diminishing returns. Strictly respect the timebox — unfinished charters roll to the next session.
- **Confirmation bias**: Testing only what you expect to work. Actively try to break the feature — enter invalid data, skip steps, interrupt flows, use edge case inputs.
- **Skipping the debrief**: The debrief is where raw observations become actionable insights. Skipping it leaves orphaned findings that never make it to the backlog.
- **Testing on one device only**: Different devices, OS versions, screen sizes, and network conditions reveal different bugs. Rotate devices across sessions.
- **Over-documenting during the session**: Excessive note-taking reduces testing time. Find a balance: enough detail for reproduction, but not full formal test case documentation.
- **Not filing bugs immediately**: Bugs discovered but filed after the session lose context, steps to reproduce are less precise, and screenshots may not have been captured.
- **Using the same heuristics every session**: Each heuristic illuminates different defect types. Varying heuristics across sessions increases the breadth of defect discovery.

## Compared With

| Approach | Discovery Rate | Documentation Overhead | Skill Dependency | Best For |
|----------|---------------|----------------------|------------------|----------|
| Exploratory (SBTM) | High | Low (session notes) | High (tester skill) | New features, complex areas, risk investigation |
| Scripted manual testing | Low-Medium | High (test cases) | Low | Regression, compliance, regulated environments |
| Automated testing | Low (pre-written) | High (automation code) | Medium (automation skill) | Regression, performance, CI/CD |
| Crowd testing | Medium-High | Medium | Low | Diverse devices, real-world conditions |
| Bug bashes | Very High (short-term) | Low | High (team collaboration) | Pre-release crunch, specific risk areas |
| Session-based + automated | High | Medium | High (both skills) | Comprehensive quality strategy |

## Performance

- Session effectiveness: experienced testers find 5-15 bugs per 90-minute session in a complex feature area
- Bug find rate: exploratory testing finds 2-5x more bugs per hour than scripted manual testing for the same feature
- Coverage breadth: a single 90-minute session can cover 30-50% of a feature's functional surface
- Cost per bug: $50-150 for exploratory vs $200-500 for scripted testing (industry estimates)
- Optimal session length: 60-90 minutes — sessions shorter than 45 minutes lack depth, sessions longer than 120 minutes suffer from tester fatigue
- Session frequency: 2-3 sessions per week per tester maintains momentum without burnout
- Team rotation: rotating charters among 3-4 testers increases total bug discovery by 40-60% compared to the same testers always testing the same features
- Debrief overhead: 5 minutes per 60-minute session (8% overhead) — high return on investment for the structured reflection

## Tooling

| Tool | Category | Use Case |
|------|----------|----------|
| Session Tester (Chrome) | Session management | Timer, notes, charter tracking |
| TestRail | Test management | Charter backlog, session reports |
| Trello / Notion | Charter board | Visual charter backlog management |
| Xray / Zephyr | Jira integration | Exploratory session tracking in Jira |
| qTest | Test management | Enterprise exploratory testing |
| Rapid Reporter | Note-taking | Lightweight session note capture |
| Bug Magnet | Test data | Common bug-triggering input values |
| Charles Proxy / mitmproxy | Network testing | Inject network errors, modify responses |
| BrowserStack / Sauce Labs | Device access | Real device testing across platforms |
| DevTools / Safari Web Inspector | Debugging | Inspect state, console errors, network |
| Screen recording (QuickTime, OBS) | Session recording | Record sessions for later review |
| TestHeuristic Cheat Sheet | Reference | Quick heuristic lookup during sessions |

## References
  - references/charter-design.md — Charter Design
  - references/exploratory-session.md — Session-Based Testing
  - references/exploratory-testing-advanced.md — Exploratory Testing Advanced Topics
  - references/exploratory-testing-fundamentals.md — Exploratory Testing Fundamentals
  - references/session-based.md — Session-Based Test Management (SBTM)
  - references/test-heuristics.md — Test Heuristics
  - references/exploratory-testing-session-based.md — Exploratory Testing Session-Based Management
  - references/exploratory-testing-tools-templates.md — Exploratory Testing Tools and Templates
## Handoff
After session completion, hand off to:
- `quality-regression-testing` — if new bugs need regression coverage
- `quality-acceptance-testing` — if exploratory uncovered missing acceptance criteria
- `quality-e2e-testing` — if end-to-end flows need automated coverage
