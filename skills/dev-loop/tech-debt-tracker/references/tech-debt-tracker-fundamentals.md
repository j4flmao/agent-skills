# Tech Debt Tracker Fundamentals

## Overview
Technical debt is the implied cost of future rework caused by choosing quick-and-easy implementation over a better approach. Tracking tech debt helps prioritize refactoring and prevent accumulation.

## Core Concepts

### Concept 1: Types of Tech Debt
Prudent-deliberate: known tradeoff (ship now, fix later). Prudent-inadvertent: best effort given constraints. Reckless-deliberate: "we'll fix it later" (never does). Reckless-inadvertent: no standards (bad code). Identify each item's type to prioritize action.

### Concept 2: Tracking System
Tech debt items live alongside feature work, not in a separate system. Use issue labels (tech-debt, refactor), a tech-debt board column, or a dedicated tech-debt.md in the repo. Each item has: description, location, estimated effort, impact, and proposed improvement.

### Concept 3: Debt Quantification
Quadrant approach: high impact + high effort (avoid), high impact + low effort (do now), low impact + high effort (avoid), low impact + low effort (do when convenient). Impact = frequency of touching the code × pain per touch. Prioritize high-impact items.

### Concept 4: Payment Strategy
Allocate 20% time per sprint (or one sprint per quarter): Boy Scout Rule (leave code cleaner than you found it), touch-it rule (refactor code you're already changing), targeted refactoring sprints (dedicated time), and never introduce new debt knowingly.

### Concept 5: The Broken Windows Theory
Visible tech debt (messy code, dead code, warnings, test failures) encourages more shortcuts. Fix visible debt first: remove dead code, fix compilation warnings, enable strict modes, clean up linter warnings, and fix flaky tests.

## Best Practices

- Label tech debt in issue tracker
- Quantify by impact × effort
- Fix during unrelated changes (touch-it rule)
- Dedicate 20% time for debt reduction
- Never knowingly introduce debt without a tracking issue
- Track interest (how often the debt hurts)
- Fix visible signs (warnings, dead code)
- Include debt in sprint planning
- Share debt map with the team
- Celebrate debt reduction (not just features)

## Anti-Patterns

- No tracking (invisible debt ignored)
- Tech debt backlog separate from feature work (never prioritized)
- Perfectionism (treating all choices as debt)
- Ignoring debt until crisis point
- Refactoring without justification (no impact analysis)
- Not linking debt to business outcomes
- Blaming for past decisions (not useful)
- Debt tracker becomes an unread list (100+ items)
- Using tech debt label for actual bugs (different issues)
