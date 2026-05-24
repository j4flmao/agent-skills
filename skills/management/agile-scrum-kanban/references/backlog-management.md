# Backlog Management

## Backlog Refinement

### Purpose
Break down large backlog items, estimate effort, prioritize, and ensure the top of the backlog is ready for sprint planning. Refinement is an ongoing activity, not a once-per-sprint event.

### Cadence
- **Recommended**: 1-hour session per week for a 2-week sprint
- **Capacity**: The team should spend no more than 5-10% of sprint capacity on refinement
- **Ready backlog**: Maintain 1-2 sprints worth of refined items at the top

### Refinement Activities
1. **Split large items** — Epics and features must be broken into stories that fit in one sprint
2. **Add acceptance criteria** — Define what done looks like for each item
3. **Estimate** — Assign story points or relative size
4. **Prioritize** — Reorder based on value, urgency, and dependencies
5. **Identify dependencies** — Note external dependencies and cross-team coordination needs

### Definition of Ready (DoR)
```
An item is ready for sprint planning when:
- Title and description are clear to the whole team
- Acceptance criteria are defined (or a link to the spec exists)
- Dependencies are identified and resolved or accepted
- The item can be demonstrated at sprint review
- Estimated (even if T-shirt size)
- Wireframes, UX mocks, or technical design are attached (if applicable)
```

## Prioritization Methods

### MoSCoW
| Priority | Meaning | Allocation |
|----------|---------|------------|
| **M**ust Have | Non-negotiable — without this, the release fails | 60% of capacity |
| **S**hould Have | Important but not vital — painful to omit | 20% of capacity |
| **C**ould Have | Nice to have — small effort, adds value | 20% of capacity |
| **W**on't Have | Explicitly out of scope for this release | Not allocated |

- MoSCoW is about relative priority, not absolute importance
- Must Haves should fit within 60% of capacity — otherwise the scope is too large
- Won't Have items must be explicitly documented, not ignored

### WSJF (Weighted Shortest Job First)
```
WSJF = Cost of Delay / Job Size (Duration)

Cost of Delay = Business Value + Time Criticality + Risk Reduction/Opportunity
```

- **Business Value**: Revenue, customer satisfaction, competitive advantage (1-10)
- **Time Criticality**: Is there a deadline? Does delaying reduce value? (1-10)
- **Risk Reduction**: Does this reduce risk or enable future value? (1-10)
- **Job Size**: Relative effort estimate (story points or duration)

WSJF helps prioritize the highest-value work relative to its size. Sort by WSJF score descending.

### Value / Effort Matrix
```
           | High Value                  | Low Value
-----------|-----------------------------|-----------------------------
Low Effort | DO FIRST (quick wins)       | DO LAST (low-hanging fruit)
High Effort| DO SECOND (major projects)  | AVOID (time sinks)
```

- Quick wins (high value, low effort) are top priority
- Major projects (high value, high effort) need careful planning
- Time sinks (low value, high effort) should be challenged or dropped

## Slicing User Stories

### INVEST Principle
- **I**ndependent — Can be developed in any order
- **N**egotiable — Details can be adjusted
- **V**aluable — Delivers value to the user
- **E**stimable — Can be estimated with reasonable confidence
- **S**mall — Fits within a sprint
- **T**estable — Has clear acceptance criteria

### Slicing Strategies
| Strategy | Example |
|----------|---------|
| **By workflow step** | "User logs in" → "User enters email" then "User verifies 2FA" |
| **By platform** | "Search works on web" then "Search works on mobile" |
| **By data type** | "Display text results" then "Display image results" |
| **By user role** | "Admin views report" then "Manager views report" |
| **By configuration** | "Default settings" then "Custom settings" |
| **Happy path vs edge cases** | "Successful payment" then "Failed payment retry" |
| **CRUD split** | "Create record" separate from "Edit/Delete record" |

### When to Slice
- Story is larger than 8-13 points or 3 days of work
- Story has complex acceptance criteria that could be broken into stages
- Multiple developers would be needed in parallel
- The story touches multiple systems or layers

## Estimation Techniques

### Planning Poker
- Each team member selects a card (Fibonacci: 1, 2, 3, 5, 8, 13, 21)
- All reveal simultaneously (to avoid anchoring)
- Discuss large discrepancies (the estimator with the highest and lowest values explain)
- Re-vote until consensus or narrow range
- Keep sessions short — 5-10 minutes per item max

### T-Shirt Sizing
```
XS     S      M      L      XL     XXL
1 pt   2 pt   3 pt   5 pt   8 pt   13+ pt
```

- Quick, low-fidelity estimation
- Good for epics and large features in early refinement
- Convert to story points later when more detail is available

### Affinity Estimation
- Sort items into size groups simultaneously
- All team members place items on a spectrum from smallest to largest
- Natural clusters emerge — debate items on boundaries
- Fast for large backlogs (50+ items in 1 hour)

### Estimation Rules
- One team, one scale — story points are relative within a team, not absolute
- Do not compare velocity between teams — different scales mean different point values
- Re-estimate only when understanding changes significantly, not when velocity estimates differ
- 8+ points means the story must be split — no item should exceed 8 points
- Use historical data to calibrate — "five 5-point stories last sprint averaged 4 days each"

## Backlog Health Metrics

| Metric | Target | Red Flag |
|--------|--------|----------|
| Ready items (next 2 sprints) | 100% refined | < 50% refined |
| Items over 90 days old | 0 | Any items aging without attention |
| Average story size | 3-5 points | 8+ points average |
| Refinement rate | 5-10% of capacity | > 20% |
| Items without acceptance criteria | < 10% | > 30% |

## References
- Mountain Goat Software: User Stories Applied — Mike Cohn
- SAFe WSJF — https://scaledagileframework.com/wsjf/
- MoSCoW Prioritization — Agile Business Consortium
