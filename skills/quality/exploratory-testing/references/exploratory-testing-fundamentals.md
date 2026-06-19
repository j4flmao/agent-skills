# Exploratory Testing Fundamentals

## Overview
Exploratory testing is simultaneous learning, test design, and execution. Testers actively explore the application, designing tests on the fly based on what they discover. Unlike scripted testing, exploratory testing adapts to findings and leverages tester creativity and intuition.

## Core Concepts

### Concept 1: Session-Based Testing (SBTM)
Structured exploratory testing in timed sessions. Each session has a charter (mission), time box (typically 60-90 minutes), and requires a debrief report. SBTM balances freedom with accountability — testers explore freely within defined boundaries and document findings.

### Concept 2: Test Charter
A charter defines the mission for an exploratory session. Format: "Explore [target] with [resources] to discover [information]." Example: "Explore the checkout flow using coupon codes to discover discount calculation errors." Charters are specific enough to focus but broad enough to allow discovery.

### Concept 3: Heuristics
Mental shortcuts and rules of thumb that guide exploration. Common heuristics: FEW HICCUPS (Familiarity, Explainability, Workarounds, History, Interoperability, Configuration, Compatibility, Usability, Performance, Security), SFDPOT (Structure, Function, Data, Platform, Operations, Time), and test heuristics like "CRUD for data," "boundary values for inputs."

### Concept 4: Oracles
Principles or mechanisms that help recognize problems. Oracles include: consistency with documentation, consistency with comparable features, consistency with user expectations, consistency within the product itself (no contradictions), and consistency with history (things that used to work).

### Concept 5: Bug Advocacy
The tester's role includes persuading stakeholders about the importance of discovered issues. Bug reports from exploratory testing should include: clear description, steps to reproduce, expected vs actual behavior, severity assessment, and business impact. A well-advocated bug is more likely to get fixed.

## Session-Based Testing Structure

### Session Template
```yaml
session:
  tester: "Jane S."
  date: "2026-06-15"
  duration: 90
  charter: "Explore checkout with discount codes to discover calculation errors"
  areas:
    - "Discount calculation engine"
    - "Coupon code validation"
    - "Price display updates"
  data:
    - "active coupons: SAVE10, FREESHIP, WELCOME20"
    - "expired coupon: EXPIRED50"
    - "test products: 5 SKUs with varying prices"
    - "boundary order values: $49.99, $50.00, $100.00"
  heuristics_used:
    - "CRUD: create, read, update, delete coupons"
    - "Boundary values: price thresholds for discounts"
    - "Interruption: apply coupon then remove it"
  findings:
    bugs:
      - "BUG-451: FREESHIP applies to already-discounted items"
      - "BUG-452: Cart total shows negative with stacked coupons"
    observations:
      - "Discount apply button is not keyboard-accessible"
      - "No confirmation before applying irreversible coupon"
  coverage:
    scripted_tests_complemented: 3
    new_scenarios_discovered: 2
```

## Charter Design Patterns

### Feature Charters
"Explore [feature] to discover [potential failure modes]"
- "Explore the password reset flow to discover email delivery failures"
- "Explore multi-currency pricing to discover rounding errors"

### Risk Charters
"Explore [feature] under [stress condition] to discover [failure mode]"
- "Explore checkout with network interruption to discover order state inconsistencies"
- "Explore file upload with large files to discover timeout failures"

### Integration Charters
"Explore [feature A] interacting with [feature B] to discover [integration failures]"
- "Explore search interacting with filters to discover result inconsistencies"
- "Explore cart interacting with inventory to discover overselling"

## Heuristic Cheat Sheet

### FEW HICCUPS Mnemonic
- **F**amiliarity — Is this consistent with similar products?
- **E**xplainability — Can the behavior be explained?
- **W**orkarounds — Can users work around problems?
- **H**istory — Has this been a problem before?
- **I**nteroperability — Does it work with other systems?
- **C**onfiguration — Does it work under different configurations?
- **C**ompatibility — Does it work across browsers/devices?
- **U**sability — Is it easy to use?
- **P**erformance — Is it fast enough?
- **S**ecurity — Are there security concerns?

### Test Heuristics
- **Complexity**: The more complex, the more likely to fail
- **Change**: Things that changed recently are more likely to have bugs
- **Boundaries**: Edge cases at boundaries fail more often
- **Interruptions**: Cancel operations, switch tasks, click quickly
- **Data**: Empty, null, extreme values, special characters, long strings
- **History**: Bugs cluster where bugs have been before
- **Concurrency**: Multiple users, multiple tabs, simultaneous actions

## Implementation Guide

### Step 1: Plan Sessions
Define charters aligned with sprint goals. Allocate 20-30% of testing time to exploratory testing. Prioritize new features, complex changes, and high-risk areas. Schedule sessions before UAT to inform acceptance criteria.

### Step 2: Execute Sessions
Work through charters systematically. Document findings as you go — don't rely on memory. Use screen recording for complex bugs. Note areas for deeper exploration. Respect time boxes but follow interesting lead.

### Step 3: Debrief
At session end, debrief findings: what worked, what didn't, what surprised you. Categorize bugs by severity. Document test ideas for future sessions. Update test coverage matrix with new scenarios discovered.

### Step 4: Complement Scripted Tests
Convert exploratory findings into automated regression tests. Add missing edge cases discovered during exploration to the automated test suite. Update test documentation with new scenarios.

## Best Practices
- Define clear charters before each session — don't explore aimlessly
- Time-box sessions (60-90 minutes max) to maintain focus
- Document findings immediately — don't rely on memory
- Vary test data across sessions (different accounts, browsers, locales)
- Pair experienced and junior testers for knowledge transfer
- Use heuristics to guide exploration, not limit it
- Screen record complex bugs for reproducible evidence
- Debrief every session — capture what you learned
- Convert exploratory findings to automated regression tests
- Track coverage: which features have had exploratory sessions

## Common Pitfalls
- Testing without a charter (aimless clicking, low-value findings)
- Sessions too long (> 2 hours causes fatigue, diminishing returns)
- Not documenting findings during the session (memory is unreliable)
- Bias toward familiar paths (testers subconsciously repeat comfortable flows)
- Confirmation bias (looking for evidence the feature works, not for bugs)
- No debrief (sessions end without capturing lessons learned)
- Treating exploratory testing as unstructured testing (it's structured but not scripted)

## Key Points
- Exploratory testing combines learning, design, and execution in real-time
- Session-based testing provides structure without sacrificing flexibility
- Charters define mission and scope for each session
- Heuristics guide exploration and prevent tunnel vision
- Oracles help identify problems by comparing actual to expected behavior
- Debrief captures findings and feeds back into the testing process
- Exploratory testing complements, not replaces, scripted testing
