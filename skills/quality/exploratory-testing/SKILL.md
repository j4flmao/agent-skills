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

## Exploratory Testing Session Templates

### Session Report Template
```yaml
session:
  id: "EX-S12-03"
  date: "2026-06-15"
  tester: "Priya K."
  charter: "Explore checkout flow with discount coupons"
  mission: "Find issues in coupon application at checkout"
  scope:
    in:
      - "Logged-in user checkout"
      - "All coupon types (percentage, fixed, free shipping)"
      - "Desktop and mobile viewports"
    out:
      - "Guest checkout"
      - "Payment gateway errors"
      - "International currencies"
  timebox: 75 minutes
  actual_duration: 72 minutes
  heuristics_applied:
    - "CRUD (create/apply/remove/reapply coupon)"
    - "Boundary (minimum order amount, max discount cap)"
    - "Timing (apply coupon before/after shipping selection)"
    - "FEW HICCUPS (format issues, edge cases)"
  areas_covered:
    - "Coupon validation at checkout"
    - "Multiple coupon application"
    - "Coupon removal and re-application"
    - "Coupon with minimum order amount"
    - "Expired coupon behavior"
  bugs_found:
    - id: "BUG-421"
      severity: "High"
      summary: "Coupon SAVE20 applies to already-discounted items"
      steps: "1. Add sale item to cart (30% off) 2. Apply coupon SAVE20 3. Both discounts applied to base price"
      expected: "Coupon should apply to sale price (post-discount), not base price"
    - id: "BUG-422"
      severity: "Low"
      summary: "Coupon code input accepts spaces"
      steps: "1. Enter ' SAVE10 ' (with spaces) 2. Submit coupon"
      expected: "Spaces should be trimmed or rejected"
  observations:
    - "Coupon application is fast (< 200ms response time)"
    - "Error messages are clear and user-friendly"
    - "Coupon removal restores original price correctly"
  test_ideas:
    - "Session: expired coupon edge cases"
    - "Session: coupon stacking limits"
    - "Session: coupon with cart modifications after application"
  coverage_assessment: "Good coverage of coupon lifecycle. Need deeper testing of edge cases and concurrent coupon operations."
```

### Charter Backlog Template
```yaml
charter_backlog:
  prioritized:
    - id: "CH-042"
      mission: "Explore checkout with international shipping addresses"
      priority: "High"
      risk: "New feature — address validation for non-US formats"
    - id: "CH-041"
      mission: "Explore checkout with multiple currency conversion"
      priority: "High"
      risk: "Currency rounding and display issues"
    - id: "CH-040"
      mission: "Explore checkout with payment method switching"
      priority: "Medium"
      risk: "State consistency across payment methods"
    - id: "CH-039"
      mission: "Explore checkout on slow network (throttled 3G)"
      priority: "Medium"
      risk: "Timeout handling, loading states"
    - id: "CH-038"
      mission: "Explore checkout with screen reader (accessibility)"
      priority: "Low"
      risk: "Compliance requirement, user-reported issues"
```

## Heuristic Deep Dives

### FEW HICCUPS Heuristics
```
F — Format: How does the system handle different input formats? (dates, phone numbers, currency)
E — Extreme: What happens at min/max boundaries? (empty, very long, very large)
W — Whether: Does the system handle edge cases? (null, undefined, empty string)
H — How: How does the system behave under different conditions? (loaded state, empty state, error state)
I — Interruption: What happens when an operation is interrupted? (cancel, refresh, back button)
C — Crowded: What happens with many items, users, or simultaneous operations?
C — Consistency: Is behavior consistent across different paths to the same destination?
U — Uniqueness: What happens with duplicate submissions, parallel requests?
P — Performance: Is the system responsive under different conditions?
S — Security: Are there any security concerns? (permission bypass, data leakage)
```

### SFDPOT Heuristic (Navigation)
```
S — Starting state: Where does the user start?
F — Flow: What is the expected flow from start to end?
D — Data: What data is carried through the flow?
P — Persistence: Is data preserved across steps?
O — Options: What alternate paths exist?
T — Termination: What happens at the end of the flow?
```

### CRUD Heuristic (Data Operations)
```
C — Create: Can the user create a new entity?
R — Read: Can the user view the entity?
U — Update: Can the user modify the entity?
D — Delete: Can the user remove the entity?
Additional:
  - List: Can the user see all entities?
  - Search: Can the user find specific entities?
  - Export: Can the user export entity data?
  - Import: Can the user batch-import entities?
```

## Exploratory Testing Anti-Patterns (Additional)

### Anti-Pattern: Confirmation Bias
Testing only what you expect to work — entering valid data, following happy paths, assuming the system behaves correctly. Actively try to break the feature: enter invalid data, skip required steps, interrupt in-progress operations, use maximum-length inputs, submit empty forms.

### Anti-Pattern: Over-Documentation
Taking excessive notes during the session at the expense of testing time. The goal is to find bugs, not to produce documentation. Take enough notes to reproduce findings and remember what was tested. Full test case documentation happens post-session.

### Anti-Pattern: Single-Device Focus
Testing on only one browser, one screen size, or one operating system. Different devices reveal different bugs: layout issues on different screen sizes, touch interaction issues on mobile, performance issues on slower devices. Rotate devices across sessions.

### Anti-Pattern: Same Heuristic Every Session
Using the same heuristic approach every session creates blind spots. Each heuristic highlights different defect types. FEW HICCUPS finds input validation bugs, SFDPOT finds navigation bugs, CRUD finds data consistency bugs. Vary heuristics across sessions.

### Anti-Pattern: Bug Filing After Session
Bugs found during exploration but filed after the session lose critical context: reproduction steps become less precise, screenshots may not have been captured, the environment state may have changed. File bugs immediately during the session.

## Exploratory Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | Ad-hoc exploration | No charters, no session management, no notes, findings rarely documented |
| 2: Defined | Basic SBTM | Charter-based sessions, timeboxing, session notes, bug tracking |
| 3: Managed | Structured exploration | Heuristic-driven charters, debrief process, charter backlog management, coverage mapping |
| 4: Measured | Data-driven exploration | Coverage metrics, bug find rate tracking, heuristic effectiveness analysis, cross-tester rotation |
| 5: Optimized | AI-assisted exploration | Automated charter generation from risk analysis, adaptive heuristic recommendation, session data mining for pattern discovery |

## Tooling (Extended)

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
| BugBug | Test automation | Convert exploratory findings to automated checks |
| TestPad | Session management | Lightweight charter-based session tracking |
| SessionBox | Session management | Multi-session management across applications |
| qTest Exploratory Testing | Enterprise session mgmt | Jira-integrated enterprise exploratory testing |

## Performance

- Session effectiveness: experienced testers find 5-15 bugs per 90-minute session in a complex feature area
- Bug find rate: exploratory testing finds 2-5x more bugs per hour than scripted manual testing for the same feature
- Coverage breadth: a single 90-minute session can cover 30-50% of a feature's functional surface
- Cost per bug: $50-150 for exploratory vs $200-500 for scripted testing (industry estimates)
- Optimal session length: 60-90 minutes — sessions shorter than 45 minutes lack depth, sessions longer than 120 minutes suffer from tester fatigue
- Session frequency: 2-3 sessions per week per tester maintains momentum without burnout
- Team rotation: rotating charters among 3-4 testers increases total bug discovery by 40-60% compared to the same testers always testing the same features
- Debrief overhead: 5 minutes per 60-minute session (8% overhead) — high return on investment for the structured reflection

## Exploratory Testing Metrics

```yaml
exploratory_metrics:
  session_effectiveness:
    avg_bugs_per_session: 8.2
    avg_bugs_per_hour: 6.5
    bug_find_rate_vs_scripted: "3.2x higher"
  coverage:
    functional_coverage_per_session: "35%"
    cumulative_coverage_after_5_sessions: "78%"
    cumulative_coverage_after_10_sessions: "92%"
  heuristic_effectiveness:
    FEW_HICCUPS: "32% of bugs found"
    SFDPOT: "18% of bugs found"
    CRUD: "15% of bugs found"
    Error_Guessing: "22% of bugs found"
    Timing: "8% of bugs found"
    Other: "5% of bugs found"
  team:
    testers_active: 4
    sessions_per_week: 8
    charters_in_backlog: 14
    avg_charter_age: "6.3 days"
  quality_impact:
    production_bugs_prevented_per_release: "3.5 (estimated)"
    regression_test_ideas_generated: "2.1 per session"
    acceptance_criteria_gaps_found: "0.8 per session"
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
16. Bug severity classification: P0 (blocks release), P1 (must fix), P2 (should fix), P3 (nice to have)
17. Maximum 2 sessions per day per tester to maintain focus quality
18. Share session findings in team debrief at end of testing cycle
19. Track heuristic effectiveness: which heuristics find the most bugs per session
20. Session notes must include environment details (device, OS, browser, network)

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
