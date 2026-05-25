# Session-Based Testing

## Session Structure

| Element | Description | Example |
|---------|-------------|---------|
| Charter | Mission statement | "Explore coupon application at checkout" |
| Timebox | Fixed duration | 75 minutes |
| Scope | Boundaries of exploration | Logged-in user, all coupon types |
| Resources | Tools and accounts | Test account, coupon codes, DevTools |
| Areas | Functional areas to cover | Cart, coupon entry, validation, totals |

## Charter Templates

### Functional Area Charter
```
Charter: "Explore {feature} with {variation} on {platform}"
Mission: Find issues in {feature} under {condition}
Scope: {target users}, {feature area}, {constraints}
Timebox: {N} minutes
Resources: {tools, test data, accounts}
```

### Risk-Based Charter
```
Charter: "Probe {area} for {risk type} vulnerabilities"
Mission: Identify {risk type} issues in {area}
Scope: {specific boundaries}
Timebox: {N} minutes
Heuristics: {list of heuristics to apply}
```

### Regression Charter
```
Charter: "Verify {fixed defect} across {environments}"
Mission: Confirm fix and check for side effects
Scope: {affected area} + {related areas}
Timebox: {N} minutes
Baseline: {expected behavior after fix}
```

## Note-Taking Patterns

```markdown
# Session: {date} - {charter}
Tester: {name} | Duration: {N} min

## Observations
### Bugs
- [BUG-001] {severity}: {summary}
  Steps: {reproduction steps}
  Expected: {behavior}
  Actual: {behavior}

### Coverage Notes
- {area}: {what was tested} → {result}
- {area}: {not tested due to reason}

### Questions
- {open question for stakeholders}

### Ideas for Future Sessions
- {charter idea} — {rationale}
```

## Debriefing Structure

| Stage | Activity | Output |
|-------|----------|--------|
| 1. Report | Tester presents findings | Session report |
| 2. Review | Stakeholders ask questions | Clarified findings |
| 3. Prioritize | Rank bugs and charters | Priority list |
| 4. Plan | Schedule follow-up sessions | Updated charter backlog |
| 5. Learn | Capture process improvements | Process notes |

## Session Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Bug find rate | Bugs per session hour | > 3 |
| Coverage | % of charter scope completed | > 80% |
| Time utilization | % of timebox used productively | > 90% |
| Debrief effectiveness | Actionable items from debrief | > 5 per session |

## Best Practices
- One charter per session — no context switching
- Record observations in real time (don't rely on memory)
- Include passing observations, not just failures
- Take screenshots/videos of interesting behavior
- Timebox strictly — unfinished charters roll to next session
- Debrief within 24 hours for maximum recall
- Convert only high-value findings to scripted tests

## Session Report Example

```markdown
# Session: 2025-03-15 - Explore coupon application at checkout
Tester: Alice | Duration: 75 min

## Bugs
- [BUG-001] Medium: Coupon CODE20 not applied when cart total exactly equals $20
  Steps: Add items to total $20.00, apply CODE20 for 20% off.
  Expected: $4.00 discount applied.
  Actual: No discount, message "Coupon requires $20 minimum"

## Coverage Notes
- Coupon validation: tested 12 coupon codes → validated (2 failed incorrectly)
- Edge cases: mixed coupon types → passed
- Mobile viewport: layout breaks on 320px width for coupon input

## Ideas for Future Sessions
- Explore coupon stacking behavior (multiple codes)
- Test coupon with gift cards as payment method
```

## Charter Backlog Management

| Priority | Charter | Risk | Estimated Effort |
|----------|---------|------|------------------|
| P0 | Explore payment failure recovery | Critical | 60 min |
| P1 | Explore new user registration flow | High | 90 min |
| P2 | Explore search with special characters | Medium | 45 min |
| P3 | Explore performance under slow network | Medium | 60 min |
| P4 | Explore dark mode rendering | Low | 30 min |
