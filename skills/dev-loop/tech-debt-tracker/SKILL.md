---
name: dev-loop-tech-debt-tracker
description: >
  Use this skill when the user says 'tech debt', 'technical debt', 'debt tracker', 'code debt', 'debt backlog', 'TODO debt', 'FIXME debt', 'HACK debt', 'debt triage', 'debt estimation'. Scans codebase for debt markers, categorizes, estimates impact, and prioritizes. Do NOT use for: code review or refactoring.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, tech-debt, quality, phase-7]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Dev Loop Tech Debt Tracker

## Purpose
Discover, categorize, and prioritize technical debt across the codebase. Converts scattered TODO/FIXME/HACK markers into actionable backlog items quantified by developer impact and fix effort for sprint planning.

Technical debt is inevitable in any codebase that ships features. The key is managing it intentionally rather than letting it accumulate silently until it blocks delivery. This skill implements Ward Cunningham's debt quadrant model with a quantitative interest rate calculation so debt decisions are driven by data, not emotion. Every TODO in the codebase becomes a conscious decision: either accept the weekly interest cost and keep working, or pay down the principal by fixing it. The output is a prioritized backlog sorted by ROI, ready for sprint planning with clear effort estimates.

Treating tech debt like financial debt changes how teams talk about it. Instead of abstract guilt about code quality, teams discuss quantifiable interest rates, principal costs, and return on investment. An item with ROI > 1 pays for itself in under a week and should be scheduled immediately. An item with ROI < 0.1 costs more to fix than to carry — document the decision to accept it and move on.

## Agent Protocol

### Trigger
"tech debt", "technical debt", "debt tracker", "code debt", "debt backlog", "TODO debt", "FIXME debt", "HACK debt", "debt triage", "debt estimation"

### Input Context
- Source code directory path (default: current project root — scanned recursively)
- Debt marker keywords to scan (default: TODO, FIXME, HACK, XXX, WORKAROUND, TEMPORARY, BUG, OPTIMIZE, REVIEW, KLUDGE)
- Directory and file patterns to exclude (default: node_modules/, vendor/, dist/, build/, .git/, __pycache__/, *.min.js, *.bundle.*)
- Optional: previous debt report file path for computing delta and trend analysis (are we accumulating debt faster than we pay it down?)
- Optional: team size (number of active developers) for more accurate impact estimation across the team

### Output Artifact
Structured debt report — per-file listing of debt markers with severity classification, quadrant categorization, quantitative interest and principal estimates, and a prioritized action list ready for story creation

### Response Format
- Summary statistics: total debt item count, breakdown by severity (critical / major / minor), breakdown by quadrant category
- Per-file detailed listing with: absolute file path, line number, marker keyword, full line content plus 3 lines of surrounding context, severity classification, and a brief impact note
- Prioritized action items table sorted by ROI descending: ID, file path, description of the debt, interest in hours/week, principal in hours, ROI ratio, recommended priority label
- Recommended sprint allocation for top items with effort grouped into a sprint-sized chunk
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Debt report generated with all scanned items categorized and quantified. Interest and principal estimated with rationale for every item. A prioritized action list with at least 3 items ready for the sprint backlog.

### Max Response Length
2500 tokens

## Architecture

### Debt Management Pipeline
```
Codebase Scan ──> Marker Extraction ──> Classification ──> Quantification ──> Prioritization ──> Backlog
                                                                                                    
ripgrep for       Parse context       Quadrant          Interest rate     ROI = interest    Sprint-sized
TODO/FIXME/HACK   lines around        mapping +         calculation       / principal       chunks sorted
                  each marker         severity           (hours/week)      (ratio)           by ROI desc
```

### Decision Tree: Debt Classification
```
What is the nature of the debt?
├── Known shortcut taken deliberately
│   ├── Comment says "TODO: fix after launch", "hack for now", "quick fix"
│   └── → Quadrant: Reckless & Intentional (Priority 2)
├── Code written without awareness of better approach
│   ├── Comment says "why does this work?", "not sure but it passes tests"
│   └── → Quadrant: Reckless & Inadvertent (Priority 1 — most dangerous)
├── Correct for original requirements, now outdated
│   ├── Comment says "legacy: needs update for new schema"
│   └── → Quadrant: Prudent & Inadvertent (Priority 3)
└── Deliberate deferral with known tradeoff
    ├── Comment says "optimize later if this becomes a bottleneck"
    └── → Quadrant: Prudent & Intentional (Priority 4 — lowest)
```

### Decision Tree: Severity Assessment
```
What is the impact of this debt?
├── Blocks development, risks production data, or is a security vulnerability
│   → Critical severity — fix within current sprint
│   Examples: hardcoded credentials, missing input validation, data loss bug
├── Significantly slows development, causes frequent context switches
│   → Major severity — schedule within next sprint
│   Examples: slow test suite, confusing API, duplicated logic
└── Cosmetic, style inconsistency, dead code, outdated comments
    → Minor severity — backlog, fix opportunistically during related work
    Examples: naming inconsistency, whitespace, unused imports, stale docstrings
```

## Workflow

1. **Scan for debt markers** — Search the codebase recursively for all configured debt marker keywords: TODO, FIXME, HACK, XXX, WORKAROUND, TEMPORARY, BUG, OPTIMIZE, REVIEW, KLUDGE. Use ripgrep for performance (it respects .gitignore by default, reducing noise). Group results by file in alphabetical order with line numbers. For each match, read 3 lines of surrounding context to understand the scope and severity. Classify each item: critical (actively blocks development, risks data integrity, introduces security vulnerabilities, or causes incorrect behavior in production), major (significantly slows development, causes frequent context switches, adds cognitive load for multiple developers), minor (cosmetic issue, style inconsistency, dead code, outdated comments — annoying but not harmful).

2. **Categorize by quadrant** — Map each debt item onto the four-quadrant matrix. Reckless & Intentional: the team knowingly chose a bad approach (the comment says "hack" or "quick fix" with awareness of the cost). Reckless & Inadvertent: the code was written without understanding better alternatives (no awareness of the debt at the time). Prudent & Intentional: a deliberate tradeoff was made to defer cleanup (the comment says "TODO: refactor after launch" or "will fix when we add X"). Prudent & Inadvertent: the code was correct when written, but the team's understanding has evolved and a better approach now exists. The triage order prioritizes the reckless-prone side of the quadrant first, then moves to prudent items.

3. **Estimate impact** — For each debt item, answer three questions: how many developers does this affect? (1, 2-3, 4-8, or the whole team), how often does each developer encounter this? (multiple times per day, daily, a few times per week, weekly, monthly), and how much time does each encounter waste in fractional hours? (0.1 for a minor annoyance, 0.5 for a moderate interruption, 1+ for a significant blocker). Calculate the weekly interest rate: weekly hours wasted = number of affected developers x encounters per week x hours wasted per encounter. This is the quantifiable cost of not fixing the debt.

4. **Prioritize by ROI** — Interest rate is the weekly hours wasted (the cost of carrying the debt). Principal is the estimated total fix effort in hours including: code changes, test updates or additions, refactoring of any dependent code, code review time, and deployment and validation effort. ROI = interest rate / principal. An ROI of 1.0 means the fix pays for itself in one week. Sort the debt backlog by ROI descending. Items with ROI > 1.0 should be fixed immediately (they cost more to carry than to fix). Items with ROI between 0.1 and 1.0 should be evaluated for backlog inclusion. Items with ROI < 0.1 are likely not worth fixing — accept the debt.

5. **Track in backlog** — Convert each debt item into a structured story or spike with: a descriptive title derived from the marker context (e.g., "Refactor cache eviction logic in UserService"), a description with file locations and the quadrant classification, the ROI score as a label for easy prioritization, the estimated effort in story points or hours, and the linked source lines. Allocate 20% of each sprint's capacity for debt reduction work (approximately one day per sprint per developer). Review the debt ROI dashboard during the weekly team sync. Re-run the full scan quarterly to catch new debt items and re-evaluate existing ones as the codebase evolves.

6. **Trend analysis and reporting** — Maintain a debt history: track the total interest rate across the codebase over time. A rising trend means debt is accumulating faster than it is being paid down. A falling trend means the 20% capacity reserve is working. Report at each quarterly review: total debt items, total weekly interest (hours), total principal (hours), debt ratio (total interest / total principal), items by quadrant, and trend direction. Use the trend report to advocate for increased or decreased debt capacity based on data.

7. **Debt prevention for new features** — Every feature story should allocate ~10% of its points for incidental cleanup discovered during implementation. This prevents new features from adding net-new debt. During code review, flag new TODO/FIXME/HACK markers as potential debt items. Require a reason comment for every TODO: `TODO(#1234): refactor after auth migration`. Without an issue reference, the TODO is just deferred work with no accountability. Review debt markers in the codebase as part of the definition of done for each release.

## Models

### Debt Quadrant with Priority
| | Intentional | Inadvertent |
|---|---|---|
| **Reckless** | Priority 2: "We had no time" | Priority 1: "We didn't know" |
| **Prudent** | Priority 4: "We'll fix later" | Priority 3: "Now we know better" |

Triage order: Reckless/Inadvertent (most dangerous, team is unaware) -> Reckless/Intentional (high cost, team knows but chose shortcuts) -> Prudent/Inadvertent (moderate, emergent) -> Prudent/Intentional (lowest, deliberate deferrals).

### Interest Rate Calculation
```
Weekly Interest (hours) = Devs_Affected x Encounters_Per_Week x Hours_Wasted_Per_Encounter
Principal (hours) = Code_Changes + Test_Updates + Dependent_Refactors + Review + Deploy
ROI = Weekly_Interest / Principal
```
Example: 5 developers x 3 encounters/week x 0.25 hours = 3.75 hours/week interest. Principal of 8 hours. ROI = 3.75 / 8 = 0.47. The fix pays for itself in about 2 weeks. This is a solid candidate for the next sprint.

### Debt Classification Matrix
| Quadrant | Marker Keywords | Typical ROI | Action |
|----------|----------------|-------------|--------|
| Reckless & Inadvertent | (no comment, poor code) | 0.5-2.0 | Fix next sprint |
| Reckless & Intentional | HACK, QUICK FIX, WORKAROUND | 0.3-1.5 | Schedule within 2 sprints |
| Prudent & Inadvertent | OPTIMIZE, REVIEW, BUG | 0.1-0.5 | Backlog, evaluate quarterly |
| Prudent & Intentional | TODO (with issue ref), TEMPORARY | 0.01-0.3 | Accept or schedule at roadmap |

## Rules

- **Every item needs a severity** — Critical = blocks development or risks production. Major = measurably slows the team. Minor = cosmetic, naming, or dead code with no active harm.
- **Interest must be quantified in hours** — "This is really bad" is not a metric. If you cannot estimate the hours wasted per week, mark the item as unquantified and flag it for manual team triage.
- **Principal estimate includes the full fix cycle** — The estimate covers: code modifications, writing or updating tests, refactoring dependent code, code review time, deployment, and post-deploy verification.
- **20% capacity reserve** — Reserve one day per developer per sprint for debt. Unused reserve rolls to the next sprint. If the debt backlog is empty, pair on something else, but keep the capacity.
- **Re-scan quarterly** — Debt evolves as the codebase grows. An item that was low priority last quarter may become critical this quarter after new features layered on top of it.
- **No developer shaming** — Debt is a rational, predictable outcome of shipping software under real-world constraints. The goal is awareness and intentional management, not assigning blame.
- **Accept debt below the ROI threshold** — Items with ROI < 0.1 cost more to fix than to carry. Document the acceptance decision and move on. Not all debt needs to be paid.
- **New features get a debt allowance** — Every feature story should allocate ~10% of its points for incidental cleanup discovered during implementation. This prevents debt accumulation from new work.
- **Every TODO must reference a tracking issue** — Bare TODOs with no issue reference are deferred work without accountability. Enforce `TODO(#1234): description` format with lint rules.
- **Debt interest is additive across the team** — An item that wastes 2 hours/week for 10 developers costs 20 hours/week total — equivalent to half a developer's productive time.
- **Trend direction is more important than absolute count** — A codebase with 200 debt items but declining interest rate is healthier than one with 50 items but rising interest rate.
- **Debt reporting must be automated** — Manual debt tracking is abandoned within 2 sprints. Integrate the scan into CI for automatic PR comments on new debt markers.

## Common Pitfalls

- **Interest rate inflation**: Overestimating the number of affected developers or encounters per week inflates ROI. Use conservative estimates and document assumptions.
- **Principal underestimation**: Fixing debt always takes longer than expected. Add a 50% buffer to principal estimates for unexpected dependencies and edge cases.
- **Ignoring compound interest**: Debt in a hot path affects every developer on every change to that module. A 5-minute annoyance per encounter multiplied by 10 developers and 5 encounters per day = 4 hours/week.
- **Bias toward recent debt**: New markers get more attention than old ones, but old debt in critical paths may have higher ROI. Sort by ROI, not by discovery date.
- **Missing implicit debt**: Not all debt has a TODO marker. Copy-pasted code, overgrown functions, missing tests, and outdated dependencies are invisible to keyword scanning.
- **Treating all TODOs equally**: A TODO in a rarely-used edge case is not the same as a TODO in the authentication middleware. Weight by code path criticality.
- **Debt fatigue**: If every sprint produces more debt items than it resolves, the team becomes desensitized to the report. Address systemic causes before adding more tracking.

## Compared With

| Approach | Quantitative | Covers Implicit Debt | Automated | Team Adoption |
|----------|-------------|---------------------|-----------|---------------|
| This skill (keyword scan + ROI) | Yes | No (markers only) | Yes | High (low effort) |
| CodeClimate / SonarQube | Partial (maintainability) | Yes (complexity, duplication) | Yes | Medium (tool setup) |
| Manual debt board | No | Yes (team knowledge) | No | Low (abandoned quickly) |
| Architecture Decision Records | No | Partial (documents tradeoffs) | No | Medium (doc overhead) |
| Static analysis (linters) | No | Yes (code quality rules) | Yes | High (in CI) |
| Developer surveys | Subjective | Yes | No | Low (infrequent) |

## Performance

- Scan speed: ripgrep scans 100K files in ~2-5 seconds for keyword markers — negligible time in CI
- Context extraction: reading 3 lines around each match adds ~50ms per 1000 matches
- Classification: automated quadrant mapping processes ~200 items/second with heuristic rules
- Interest estimation: ~100ms per item for the arithmetic calculations
- Full report generation: for a 500K-line codebase, expect <15 seconds total from scan to formatted report
- Storage: debt history tracks ~1KB per scan (JSON summary statistics plus hashed item IDs for delta detection)
- CI impact: debt scan can run as a parallel CI step in <30 seconds, not blocking the main build pipeline
- Memory: scanning a 500K-line codebase uses <200MB of heap

## Tooling

| Tool | Category | Use Case |
|------|----------|----------|
| ripgrep (rg) | Code search | Fastest keyword scanning across codebase |
| SonarQube | Static analysis | Complexity, duplication, code smells |
| CodeClimate | Quality platform | Maintainability ratings, debt trend |
| Jira / Linear | Issue tracking | Sprint backlog for debt items |
| GitHub Issues | Issue tracking | Lightweight debt tracking per repo |
| Dependabot / Renovate | Dependency updates | Automated dependency debt management |
| ESLint / Pylint / RuboCop | Linting | Enforce TODO-with-issue pattern |
| husky / lefthook | Git hooks | Block commits with unlinked TODOs |
| Codecov | Coverage tracking | Test debt visibility |
| SecretScanner / truffleHog | Secret detection | Security debt (hardcoded secrets) |

## Related Skills

- **sprint-retro** — Review debt trends during sprint retro with the full team
- **create-story** — Convert prioritized debt items into backlog stories ready for sprint planning
- **create-roadmap** — Allocate roadmap capacity and track debt reduction across quarters
- **performance-profiler** — Profile performance-related debt paths for quantified impact data
- **security-auditor** — Identify security-related debt items and tag by vulnerability severity
- **refactor-guide** — Plan and execute structured refactoring for high-ROI debt items
- **code-review** — Review debt fix PRs for correctness, test coverage, and regression risks
- **debugging-strategy** — Investigate debt items that manifest as recurring bugs in production

## References
  - references/debt-prioritization.md — Tech Debt Prioritization
  - references/debt-tracking.md — Debt Tracking Reference
  - references/repayment-strategies.md — Tech Debt Repayment Strategies
  - references/tech-debt-management.md — Technical Debt Management
  - references/tech-debt-tracker-advanced.md — Tech Debt Tracker Advanced Topics
  - references/tech-debt-tracker-fundamentals.md — Tech Debt Tracker Fundamentals
  - references/tech-debt-prioritization.md — Tech Debt Prioritization Reference
  - references/tech-debt-communication.md — Tech Debt Communication Guide
## Handoff
sprint-retro, create-story
