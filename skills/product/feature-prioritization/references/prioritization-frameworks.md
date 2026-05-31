# Prioritization Frameworks

## Framework Reference

This reference provides detailed guidance on each prioritization framework, including step-by-step application instructions, scoring criteria, and when to use each approach.

## RICE Scoring

### Overview
RICE (Reach, Impact, Confidence, Effort) is a quantitative framework that produces a single score to rank features. Developed by Intercom, it's best suited for data-informed teams with access to usage metrics and engineering effort estimates.

### When to Use
- You have quantitative data (analytics, user counts)
- Engineering can provide effort estimates
- You need a transparent, defensible ranking
- The team is comfortable with numbers and formulas

### When NOT to Use
- No data available for reach or impact estimates
- Engineering effort is completely unknown
- The decision is primarily about stakeholder alignment (use MoSCoW)
- You need to understand customer satisfaction drivers (use Kano)

### Detailed Scoring

**Reach (1-5)**

How many users will this feature affect in a given time period (typically one quarter)?

| Score | Users/Quarter | Example |
|-------|--------------|---------|
| 5 | >100,000 | All user base |
| 4 | 25,000-100,000 | Large segment |
| 3 | 5,000-25,000 | Medium segment |
| 2 | 1,000-5,000 | Small segment |
| 1 | <1,000 | Niche segment |

Data sources for reach:
- Active user count from analytics
- Number of users who requested the feature
- Users in the affected workflow
- Segment size from user research

Document the calculation:
```
Total active users: 50,000
Users in affected workflow: 12,000 (24%)
Segment: enterprise customers (8,000 users, 16%)
Reach score: 4 (25K-100K)
```

**Impact (0.25, 0.5, 1, 2, 3)**

How much does this feature impact the user experience or business outcome?

| Score | Description | Example Metrics |
|-------|-------------|-----------------|
| 3 | Massive | Transformative for business, step-change in value |
| 2 | High | Significant improvement in key metric |
| 1 | Medium | Noticeable improvement |
| 0.5 | Low | Incremental improvement |
| 0.25 | Minimal | Barely detectable impact |

Impact scoring should reference specific metrics:
- Conversion rate change
- Retention improvement
- Revenue increase
- Time savings
- Satisfaction improvement

```
Expected impact: Increase activation rate from 35% to 50%
Estimated effect: +15pp activation rate
Impact score: 2 (High)
Rationale: 43% improvement in activation rate is significant
```

**Confidence (0.2, 0.5, 0.8, 1.0)**

How confident are you in your reach, impact, and effort estimates?

| Score | Confidence Level | Data Source |
|-------|-----------------|-------------|
| 1.0 | High | Data from experiments, A/B tests, or established analytics |
| 0.8 | Medium | Strong proxy data, user research, industry benchmarks |
| 0.5 | Low | Educated guess, team consensus, limited data |
| 0.2 | Very low | Pure speculation, no data available |

```
Data sources:
- Reach: Analytics data (1.0 confidence)
- Impact: Industry benchmark 0.6 confidence
- Effort: Engineering estimates with 20% buffer (0.8 confidence)
Overall confidence: 0.6 (weighted average, use lowest for conservative)
Chosen confidence score: 0.8 (medium-high)
```

**Effort (person-weeks)**

Total engineering effort required to design, build, test, and ship the feature.

Effort should include:
- Design time
- Frontend development
- Backend development  
- QA testing
- Documentation
- Release process
- Buffer for unexpected issues (20% minimum)

Use PERT estimation:
```
Best case: 2 weeks (if everything goes perfectly)
Most likely: 4 weeks (normal development)
Worst case: 8 weeks (significant unexpected issues)
PERT estimate: (2 + 4*4 + 8) / 6 = 4.33 person-weeks

Effort score: 5 person-weeks (rounded up with buffer)
```

**RICE Calculation**

```
RICE Score = (Reach × Impact × Confidence) / Effort

Example:
Reach = 4 (50,000 users/quarter)
Impact = 2 (High)
Confidence = 0.8 (Medium-High)
Effort = 5 (person-weeks)

RICE = (4 × 2 × 0.8) / 5 = 6.4 / 5 = 1.28
```

### Scoring Calibration

To ensure consistent scoring across the team:

| Practice | Description |
|----------|-------------|
| Anchor examples | Define what each score level means with concrete examples |
| Calibration session | Score 3-5 features as a team before independent scoring |
| Document rationale | Require written justification for each score dimension |
| Peer review | Review scores with another team member |
| Track accuracy | Compare estimated vs actual effort post-launch |

### RICE Limitations

| Limitation | Mitigation |
|------------|------------|
| False precision (scores feel exact but are estimates) | Always show confidence level alongside RICE score |
| Effort estimation bias (optimism) | Use historical data; require engineering sign-off |
| Reach over-weighting | Ensure impact and confidence are calibrated to matter |
| New features with no data | Use 0.5 confidence default for unproven features |
| Doesn't capture strategic value | Complement with strategic alignment score |

## ICE Scoring

### Overview
ICE (Impact, Confidence, Ease) is a lighter-weight version of RICE, popularized by growth teams for rapid prioritization of experiments.

### When to Use
- Growth experiments with many candidates
- Small teams without analytics infrastructure
- Quick prioritization decisions (hours, not days)
- Internal tooling or non-customer-facing features

### Scoring

| Dimension | Scale | Definition |
|-----------|-------|------------|
| Impact | 1-10 | How much impact will this have on the target metric? |
| Confidence | 1-10 | How confident are you in the impact estimate? |
| Ease | 1-10 | How easy is this to implement? (10 = very easy) |

ICE Score = (Impact + Confidence + Ease) / 3

### ICE vs RICE

| Aspect | ICE | RICE |
|--------|-----|------|
| Dimensions | 3 | 4 |
| Reach | Not explicitly measured | Key dimension |
| Effort direction | Ease (inverted) | Effort (denominator) |
| Score range | 1-10 | Unbounded |
| Best for | Growth experiments | Feature prioritization |
| Precision | Lower | Higher |

## MoSCoW Method

### Overview
MoSCoW (Must have, Should have, Could have, Won't have) is a stakeholder alignment framework developed for agile software development. It categorizes requirements by priority rather than scoring them numerically.

### When to Use
- Stakeholder alignment is the primary challenge
- Need to set clear scope expectations
- Timeboxed delivery with fixed deadline
- Multiple stakeholders with competing priorities

### Category Definitions

| Category | Definition | Capacity Allocation | If Not Delivered |
|----------|------------|---------------------|------------------|
| Must have | Critical for this delivery; without it, the release has no value | 40-50% | Release is delayed |
| Should have | Important but not critical; can be delivered via workaround | 20-30% | Minor inconvenience, no delay |
| Could have | Nice to include if time permits | 10-20% | No significant impact |
| Won't have | Explicitly out of scope this time | 0% | Documented for future |

### Workshop Facilitation

**Preparation:**
1. List all candidate features/requirements with context
2. Define the scope (what delivery are we prioritizing for?)
3. Agree on team capacity (how much can we deliver?)
4. Invite all relevant stakeholders

**Workshop format (2-3 hours):**

| Activity | Duration | Description |
|----------|----------|-------------|
| Context setting | 15 min | Review goals, constraints, capacity |
| Feature review | 30 min | Present each feature with context |
| Individual sorting | 20 min | Each stakeholder categorizes individually |
| Results reveal | 20 min | Show categorization, identify disagreements |
| Discussion | 30 min | Discuss differences, focus on "Must have" |
| Final categorization | 20 min | Team agrees on final categories |
| Next steps | 5 min | Document, communicate, assign owners |

### Rules

1. Must have should not exceed 60% of capacity
2. Stakeholders cannot have everything as Must have
3. Won't have items must be explicitly documented
4. Should + Could must fit within remaining capacity after Must have
5. If capacity changes, release Must have first, then Should have
6. All categories are relative to the current delivery, not absolute importance

### Common Mistakes

| Mistake | Fix |
|---------|-----|
| Everything classified as Must have | Enforce 40-50% capacity rule |
| Won't have items ignored | Document explicitly with rationale |
| Not enough stakeholder diversity | Include engineering, design, product, business |
| Technical details overwhelm the discussion | Focus on outcomes, not implementation |
| No follow-up on Should/Could items | Create backlog for next iteration |

## Kano Model

### Overview
The Kano Model, developed by Professor Noriaki Kano, categorizes features based on how they affect customer satisfaction. It helps teams understand which features are essential, which drive satisfaction, and which create delight.

### When to Use
- Understanding what drives customer satisfaction
- Differentiating between must-haves and differentiators
- Product strategy for competitive positioning
- When user research suggests conflicting priorities

### Feature Categories

| Category | Description | Impact if Present | Impact if Absent |
|----------|-------------|-------------------|------------------|
| Basic Need (Must-be) | Expected by users; table stakes | No increase in satisfaction | High dissatisfaction |
| Performance (One-dimensional) | Explicitly requested; more is better | Linear increase in satisfaction | Linear increase in dissatisfaction |
| Delight (Attractive) | Unexpected; surprises and delights | High increase in satisfaction | No dissatisfaction |
| Indifferent | Users don't care either way | No change | No change |
| Reverse | Some users actively dislike | Decreases satisfaction | Increases satisfaction |

### Survey Methodology

For each feature, administer a paired survey question:

**Functional question:**
"How would you feel if this feature is PRESENT?"
- 1: I like it
- 2: I expect it
- 3: I am neutral
- 4: I can tolerate it
- 5: I dislike it

**Dysfunctional question:**
"How would you feel if this feature is ABSENT?"
- Same 5-point scale

### Kano Evaluation Table

Cross-reference the functional and dysfunctional responses:

| Functional/Dysfunctional | 1: Like | 2: Expect | 3: Neutral | 4: Tolerate | 5: Dislike |
|------------------------|---------|-----------|------------|-------------|------------|
| 1: Like | Q (Questionable) | D (Delight) | D (Delight) | D (Delight) | P (Performance) |
| 2: Expect | R (Reverse) | I (Indifferent) | I (Indifferent) | I (Indifferent) | B (Basic) |
| 3: Neutral | R (Reverse) | I (Indifferent) | I (Indifferent) | I (Indifferent) | B (Basic) |
| 4: Tolerate | R (Reverse) | I (Indifferent) | I (Indifferent) | I (Indifferent) | B (Basic) |
| 5: Dislike | R (Reverse) | R (Reverse) | R (Reverse) | R (Reverse) | Q (Questionable) |

### Analysis

For each feature, calculate the percentage of respondents in each category:

```
Feature: One-click export
  Basic: 10%
  Performance: 35%
  Delight: 40%
  Indifferent: 10%
  Reverse: 5%
  Questionable: 0%

Classification: Delight (highest percentage among basic/performance/delight)
```

### Decision Rules

| Classification | Investment Strategy |
|---------------|-------------------|
| Basic | Meet threshold, no more. Diminishing returns beyond "good enough." |
| Performance | Invest proportionally to impact on metrics. Linear ROI. |
| Delight | Invest selectively. High impact but delight items become performance over time. |
| Indifferent | Do not invest unless zero cost. |
| Reverse | Avoid. Segment-specific: what delights one segment may reverse another. |

### Kano Over Time

Feature categories are not static. Over time, features migrate:

```
Delight → Performance → Basic
  (new)       (evolving)    (table stakes)
```

Example: Touch ID on phones was a Delight in 2013, Performance by 2016, Basic by 2019.

## Opportunity Scoring

### Overview
Opportunity scoring, popularized by Anthony Ulwick's Outcome-Driven Innovation (ODI), prioritizes features based on the gap between how important a problem is to users and how satisfied they are with current solutions.

### When to Use
- Problem-focused prioritization
- Validating that you're solving important problems
- Discovering unmet needs in your market
- Competitive positioning strategy

### Scoring Process

**Step 1: Identify user outcomes**
List the outcomes users want to achieve. Frame them as:
- "Minimize the time it takes to [task]"
- "Reduce the effort required to [goal]"
- "Increase the accuracy of [result]"

**Step 2: Survey importance**
Ask users: "How important is [outcome] to you?" (1-10 scale)
- Focus on outcomes that matter most

**Step 3: Survey satisfaction**
Ask users: "How satisfied are you with the current solution for [outcome]?" (1-10 scale)
- Same outcomes as importance

**Step 4: Calculate opportunity score**

```
Opportunity = Importance + max(Importance - Satisfaction, 0)

Example:
Importance: 9 (highly important)
Satisfaction: 4 (low satisfaction)
Opportunity = 9 + max(9 - 4, 0) = 9 + 5 = 14

Interpretation: High opportunity — users care deeply and current solutions don't satisfy them.
```

**Step 5: Prioritize**

| Opportunity Score | Priority | Action |
|-------------------|----------|--------|
| 15-20 | Very high | Must address — major competitive opportunity |
| 12-14 | High | Important opportunity — prioritize highly |
| 10-11 | Medium | Address if effort is low |
| 8-9 | Low | Consider if strategic alignment is strong |
| <8 | Very low | Only address if zero cost |

### When Importance = Satisfaction

If importance and satisfaction are both high, the opportunity score equals importance. This means:
- Users care about the outcome
- They're satisfied with current solutions
- Opportunity exists only if you can improve satisfaction further
- Consider if you can differentiate meaningfully

### When Importance < Satisfaction

If satisfaction exceeds importance:
- Users are overserved in this area
- No opportunity to differentiate
- Do not invest here

## Weighted Scoring

### Overview
Weighted scoring evaluates features against multiple criteria that can be assigned different importance weights. This is useful when different stakeholders value different outcomes.

### When to Use
- Multiple strategic objectives need to be balanced
- Different stakeholders have different priorities
- Need to formalize trade-off decisions

### Process

**Step 1: Define criteria**
List all criteria that matter for prioritization (e.g., user impact, revenue, strategic alignment, effort, risk).

**Step 2: Assign weights**
Distribute 100 points across criteria based on their importance.

| Criterion | Weight | Rationale |
|-----------|--------|-----------|
| User impact | 30 | Most important — we build for users |
| Revenue potential | 20 | Direct business value |
| Strategic alignment | 20 | Must support product strategy |
| Development effort | 15 | Lower effort items preferred (inverted) |
| Risk/Complexity | 10 | Lower risk preferred (inverted) |
| Time to market | 5 | Faster is better (inverted) |

**Step 3: Score each feature**
Score each feature on each criterion (1-10 scale).

**Step 4: Calculate weighted score**

```
Weighted Score = sum(Criterion Score × Criterion Weight) / sum(Weights)

Example:
Feature: Dark mode
User impact: 8 × 30 = 240
Revenue potential: 3 × 20 = 60
Strategic alignment: 5 × 20 = 100
Development effort: 6 × 15 = 90 (6 = relatively easy)
Risk: 7 × 10 = 70 (7 = low risk)
Time to market: 7 × 5 = 35 (7 = fast to market)
Total: 595 / 100 = 5.95
```

## Cost of Delay

### Overview
Cost of Delay (CoD) quantifies the economic impact of delaying a feature. Combined with Duration (estimated delivery time), it produces Weighted Shortest Job First (WSJF) scores.

### When to Use
- High-stakes prioritization decisions
- Products with significant revenue timing implications
- When urgency is a key factor

### Components

Cost of Delay has four components:

| Component | Description | Example |
|-----------|-------------|---------|
| User value | Lost user benefit per month of delay | $50K/month in user productivity gains |
| Business value | Lost revenue or cost savings | $100K/month in new revenue |
| Time value | How does value change over time? | $100K/month now > $100K/month in 6 months |
| Risk/Opportunity | Value of learning or risk reduction | Validating a risky assumption saves $500K |

### WSJF Calculation

```
WSJF = Cost of Delay / Duration

Example:
Feature A: CoD = $200K/month, Duration = 2 months → WSJF = 100
Feature B: CoD = $150K/month, Duration = 1 month → WSJF = 150
Feature C: CoD = $300K/month, Duration = 4 months → WSJF = 75

Priority: Feature B (150) > Feature A (100) > Feature C (75)
```

## Framework Selection Reference

### Quick Decision Guide

```
What matters most?
├── Quantitative ranking with data → RICE
├── Understanding customer satisfaction → Kano
├── Stakeholder alignment → MoSCoW
├── Solving pain points → Opportunity Scoring
├── Strategic balance → Weighted Scoring
├── Urgency and economic impact → Cost of Delay / WSJF
└── Quick growth experiment triage → ICE
```

### Framework Characteristics Summary

| Framework | Data Required | Team Effort | Objectivity | Stakeholder Alignment | Strategic Fit |
|-----------|--------------|-------------|-------------|----------------------|---------------|
| RICE | High | Medium | High | Low-Medium | Medium |
| ICE | Low | Low | Medium | Low | Low |
| MoSCoW | Low | Low | Low | High | Medium |
| Kano | Medium (survey) | Medium | High | Medium | High |
| Opportunity | Medium (survey) | High | High | Medium | High |
| Weighted | Medium | Medium | High | High | High |
| CoD/WSJF | High | High | High | Medium | High |

### Team Maturity Alignment

| Team Maturity | Recommended Framework | Why |
|---------------|----------------------|-----|
| Early-stage startup | ICE or MoSCoW | Fast, low data requirements |
| Growing startup | RICE | More data available, needs rigor |
| Established product | Kano + RICE | Understanding satisfaction and quantifying |
| Enterprise/cross-team | Weighted Scoring | Aligning multiple stakeholder groups |
| Growth team | ICE | Fast experiment prioritization |
| Mature organization | WSJF or multiple frameworks | Sophisticated, high-stakes decisions |
