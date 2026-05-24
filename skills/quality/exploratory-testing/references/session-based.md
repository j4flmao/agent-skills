# Session-Based Test Management (SBTM)

## Overview

Session-Based Test Management (SBTM), formalized by Jonathan Bach, structures exploratory testing into time-boxed sessions with defined charters, enabling measurement and management of exploratory testing efforts.

## Core Components

### The Charter
A charter is a mission statement for a single session:
```
[Explore | Analyze | Test] <target> [with | using] <resources> [to discover | to find] <information>
```

**Examples:**
- "Explore the checkout flow using coupon codes on mobile viewport to discover discount calculation errors"
- "Test the invoice PDF generator with international address formats to find formatting or encoding issues"
- "Explore the search feature using special characters and long queries to find input handling defects"

### The Session
A contiguous, uninterrupted time-box (typically 60-90 minutes) where a tester performs:
- **Test design**: Deciding what to test and how
- **Test execution**: Running the application and observing results
- **Note-taking**: Recording what was tested, findings, and ideas
- **Learning**: Understanding the application behavior in real-time

### The Debrief
A structured review between tester and manager (or peer) answering five questions:
1. What was tested during this session? (areas covered)
2. What important bugs did you find? (defects discovered)
3. What test ideas were generated for future sessions? (future charters)
4. Is there anything you need that you didn't have? (resource gaps)
5. Were there any issues that need immediate attention? (blockers)

## Session Metrics

| Metric | Formula | Purpose |
|--------|---------|---------|
| Session Time | Actual clock time | Ensures time-box discipline |
| Test Time vs. Bug Time | Minutes testing vs. minutes reporting | Efficiency tracking |
| Bugs per Session | Defects found / session count | Find rate trending |
| Charter Coverage | Areas covered / total risk areas | Coverage completeness |
| Session Effectiveness | Test time / session duration | Focus measurement |
| Opportunity Cost | Untested charters × estimated value | Backlog prioritization |

## Session Data Recording

Standard session sheet fields:

```
CHARTER:    [Charter statement]
DATE:       [Date]
TESTER:     [Name]
TIME BOX:   [e.g., 75 minutes]
DURATION:   [Actual time spent]

TESTING NOTES:
- [Observation, test variation, or finding]
- [Observation, test variation, or finding]
  ...

BUG REPORTS:
- [Bug ID or description]
  ...

ISSUES/BLOCKERS:
- [Anything that impacted the session]
  ...

TEST IDEAS FOR FUTURE:
- [New charters or variations]
  ...

COVERAGE:
  Tested:  [List areas]
  Not Tested: [List areas excluded due to time]
```

## Charter Quality Heuristics

| Quality Dimension | Good Charter | Poor Charter |
|-------------------|-------------|--------------|
| Focus | "Explore the password reset flow for email delivery failures" | "Test the user account section" |
| Scope | "using expired tokens and invalid emails" | — (no scope definition) |
| Resources | "with access to the mailhog test server" | — (no resource mention) |
| Timebox | 75 minutes (explicit) | "until I'm done" (ambiguous) |
| Testable | Specific to a feature and risk | Too vague to know when done |

## Exploratory vs Scripted Testing

| Dimension | Exploratory | Scripted |
|-----------|-------------|----------|
| Test design | Simultaneous with execution | Pre-defined |
| Documentation | Real-time notes and charters | Detailed test cases |
| Coverage | Heuristic-driven, adaptive | Requirements-driven, pre-planned |
| Reproducibility | Moderate (depends on note quality) | High (exact steps recorded) |
| Learning | High — tester learns during execution | Lower — tester follows script |
| Best for | New features, complex scenarios, risk areas | Regression, compliance, high-volume |
| Metrics | Session-based, qualitative | Pass/fail counts, quantitative |

## Combining Scripted and Exploratory

1. **Scripted first**: Run automated regression → exploratory on risky areas
2. **Layered**: Scripted for standard flows, exploratory for edge cases
3. **Alternating**: Sprint 1 scripted, Sprint 2 exploratory, compare results
4. **Charter-protected time**: Allocate 20-30% of test time to exploratory sessions

## Common SBTM Pitfalls

- **Charter scope creep**: Mission expands during session — stop and charter separately
- **Over-documenting**: Spending too much time on notes, not enough on testing
- **Under-documenting**: Writing nothing, losing findings after session ends
- **Skipping debrief**: Sessions without debrief lose value — always debrief
- **Rigid time-box abuse**: Stopping mid-investigation vs. noting and continuing next session
- **One-size charters**: All charters the same breadth — vary focus by risk

## Session Metrics in Practice

Track sessions in a lightweight tool or spreadsheet:

```csv
SessionID,Date,Tester,Charter,Timebox,ActualTime,TestTime,BugTime,BugsFound,AreasCovered
SBTM-042,2026-05-20,Alice,Explore coupon checkout,75,82,61,21,3,Checkout,Discount,Coupon
SBTM-043,2026-05-20,Bob,Test invoice export with Unicode,60,55,48,7,5,Invoices,Export,Unicode
SBTM-044,2026-05-21,Alice,Explore mobile nav menu,90,85,70,15,2,Navigation,Mobile,Responsive
```

Use this data to:
- Track bug find rate per tester per area
- Identify areas needing deeper charters
- Balance test time vs bug reporting time
- Spot session effectiveness trends
