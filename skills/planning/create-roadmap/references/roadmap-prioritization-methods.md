# Roadmap Prioritization Methods

## Why Prioritization Matters

Without a structured prioritization method, roadmap decisions default to the highest-paid person's opinion (HiPPO), the loudest stakeholder, or the most recent request. Structured methods bring objectivity, transparency, and defensibility to prioritization decisions.

### Comparison of Methods

| Method | Data Required | Complexity | Best For |
|--------|--------------|------------|----------|
| RICE | Reach, Impact, Confidence, Effort | Medium | Feature-level prioritization |
| WSJF | Business Value, Time Criticality, Risk, Effort | High | SAFe / scaled agile |
| MoSCoW | Stakeholder agreement | Low | Quick triage, MVP scoping |
| Kano Model | User research, surveys | Medium | Understanding user satisfaction |
| Effort-Impact Matrix | Relative effort/impact scores | Low | Quick visual ranking |
| Opportunity Scoring | Importance, Satisfaction surveys | Medium | Customer-needs-driven |
| ICE | Impact, Confidence, Ease | Low | Growth experiments |
| Cost of Delay | Value over time, duration | High | Economic prioritization |

## RICE Scoring Deep Dive

### RICE Formula

```
RICE = (Reach x Impact x Confidence) / Effort
```

### Reach: How many users?

Quantify the number of users affected within a specific time period (usually one quarter). Be specific -- not "many users" but "15,000 monthly active users."

| Score | Example |
|-------|---------|
| 100 | Feature affects 100 users/quarter |
| 1,000 | Affects 1,000 users/quarter |
| 10,000 | Affects 10,000 users/quarter |
| 100,000 | Affects 100,000+ users/quarter |

Reach for internal tools: "15 customer support agents will use this daily."

### Impact: How much does it move the needle?

| Score | Definition | Example |
|-------|------------|---------|
| 0.25 | Minimal impact | Marginal improvement to an edge case |
| 0.5 | Low impact | Small UX improvement, nice-to-have |
| 1 | Medium impact | Noticeable improvement, significant metric shift |
| 2 | High impact | Major feature, unlocks new capability |
| 3 | Transformational | Opens new market, enables new revenue stream |

Impact scores are deliberately coarse. Do not use decimal scores like 1.5 -- the granularity is a false precision. Use 1, 2, or 3.

### Confidence: How sure are you?

| Percentage | Level | Meaning |
|-----------|-------|---------|
| 100% | Proven | We have data from an experiment, A/B test, or direct customer feedback |
| 80% | Strong signal | Surveys, user research, or analogous feature data suggests this |
| 50% | Educated guess | Based on team intuition, experience, or indirect indicators |
| 20% | Wild guess | No data, pure speculation |

Confidence has the most leverage on the RICE score. A feature with Impact=3 and Confidence=20% scores the same as Impact=0.6 with Confidence=100%. Use confidence to flag features that need further validation.

### Effort: How many person-days?

| Effort | Person-Days | Description |
|--------|-------------|-------------|
| Low | 1-5 | Simple change, few files, no dependencies |
| Medium | 5-20 | Multiple files, some dependencies, testing |
| High | 20-60 | Complex feature, many dependencies, significant testing |
| Very High | 60+ | Epic-level initiative, cross-team dependencies |

Effort includes: design, implementation, testing, code review, documentation, and deployment. Do not forget testing time -- it is typically 30-50% of implementation time.

### RICE Score Examples

| Feature | Reach | Impact | Confidence | Effort (days) | RICE |
|---------|-------|--------|------------|---------------|------|
| Dark mode | 50,000 | 1 | 80% | 15 | 2,667 |
| Search autocomplete | 30,000 | 2 | 80% | 20 | 2,400 |
| CSV export | 5,000 | 1 | 100% | 5 | 1,000 |
| Stripe integration | 50,000 | 3 | 80% | 60 | 2,000 |
| Onboarding wizard | 50,000 | 2 | 50% | 30 | 1,667 |

Sort RICE scores descending. The highest-scoring items should be prioritized first -- but RICE is a guide, not a dictator. Strategic importance, dependencies, and stakeholder commitments may override.

### RICE Limitations

1. **Quantitative bias**: Features with easy-to-measure Reach score higher than hard-to-measure but strategically important work
2. **Effort estimation uncertainty**: Effort estimates for novel features are unreliable
3. **No risk factor**: RICE does not account for implementation risk or technical debt
4. **No strategic weighting**: All features are scored equally regardless of strategic importance
5. **False precision**: Small RICE differences (e.g., 2,400 vs 2,667) should not drive decisions -- use tiers

## WSJF (Weighted Shortest Job First)

### WSJF Formula

```
WSJF = Cost of Delay / Job Duration

Cost of Delay = Business Value + Time Criticality + Risk Reduction/Opportunity Enablement
Job Duration = Effort (in person-days or story points)
```

### WSJF Scoring

Each dimension is scored 1-13 (modified Fibonacci: 1, 2, 3, 5, 8, 13).

**Business Value**:
- 1: No value
- 3: Minor improvement
- 5: Significant improvement to existing feature
- 8: Major new capability
- 13: Transformational

**Time Criticality**:
- 1: No time pressure
- 3: Want it eventually
- 5: Should ship this quarter
- 8: Must ship this quarter
- 13: Must ship this month (or lose opportunity)

**Risk Reduction/Opportunity Enablement**:
- 1: No risk reduction
- 3: Reduces some technical risk
- 5: Enables future features
- 8: Unlocks major capabilities
- 13: Foundation for the entire product strategy

### WSJF Example

| Feature | Business Value | Time Criticality | Risk/Opportunity | Total CoD | Duration (days) | WSJF |
|---------|---------------|-----------------|------------------|-----------|-----------------|------|
| Auth system | 13 | 13 | 13 | 39 | 30 | 1.3 |
| Notifications | 8 | 5 | 3 | 16 | 15 | 1.07 |
| Dashboard v2 | 5 | 3 | 5 | 13 | 20 | 0.65 |
| CSV export | 3 | 1 | 1 | 5 | 5 | 1.0 |

Sort by WSJF descending. Highest WSJF = highest priority.

## MoSCoW Prioritization

### Categories

| Category | Meaning | % of Effort | Rule |
|----------|---------|-------------|------|
| **M**ust have | Non-negotiable, minimum viable | ~60% | If M is not delivered, the project fails |
| **S**hould have | Important, not vital | ~20% | High business value, documented workaround if not done |
| **C**ould have | Nice to have | ~20% | Included if time/resources permit |
| **W**on't have | Explicitly out of scope | ~0% | Documented for expectation management |

### Decision Rules

```
MUST: "Without this, the feature is useless" or "Legal/compliance requirement"
SHOULD: "Significant value but we can launch without it"
COULD: "Minor value, easy to cut if needed"
WON'T: "Deliberately excluded from this release"
```

## Kano Model

### Classification

| Category | User Response | Example |
|----------|--------------|---------|
| Basic (Threshold) | Dissatisfied if absent, neutral if present | Login, search |
| Performance | More is better, satisfaction scales | Speed, battery life |
| Excitement (Delighters) | Not expected, delight if present | Animations, Easter eggs |
| Indifferent | No impact | Features users do not care about |
| Reverse | Satisfaction decreases with presence | Too many notifications |

### Survey Approach

Ask two questions for each feature:
1. How would you feel if this feature IS present? (1-5 scale)
2. How would you feel if this feature is NOT present? (1-5 scale)

Plot the average answers on a Kano grid to classify each feature.

### How to Use for Roadmaps

1. Must include: All Basic/Threshold features
2. Differentiate: Performance features (invest proportional to strategy)
3. Delight: 1-2 Excitement features per release for surprise and delight
4. Skip: Indifferent and Reverse features
5. Never cut: Basic features (exclusion causes immediate dissatisfaction)

## Effort-Impact Matrix

### The 2x2 Grid

```
                 High Impact
                     |
    Low Effort   |   High Effort
    High Impact  |   High Impact
    ("Quick      |   ("Major    
     Wins")       |    Projects")
     DO FIRST    |    PLAN
    _____________|_____________
                 |
    Low Effort   |   High Effort
    Low Impact   |   Low Impact
    ("Fill-ins") |   ("Avoid")
     DO LAST     |    DON'T DO
                 |
                 Low Impact
```

### Scoring

Rate each feature on two axes:
- **Effort**: 1 (very easy) to 5 (very hard)
- **Impact**: 1 (negligible) to 5 (transformational)

Plot scores on the matrix. Priority order: Quick Wins > Major Projects > Fill-ins > Avoid.

### Example

| Feature | Effort (1-5) | Impact (1-5) | Quadrant |
|---------|-------------|-------------|----------|
| Fix broken 404 page | 1 | 3 | Quick Win |
| Add dark mode | 3 | 2 | Fill-in |
| Stripe integration | 5 | 5 | Major Project |
| Rewrite CSS in Tailwind | 5 | 1 | Avoid |

## ICE Scoring (Growth Experiments)

### ICE Formula

```
ICE = Impact x Confidence x Ease
```

| Factor | Scale | Meaning |
|--------|-------|---------|
| Impact | 1-10 | How much impact will this have on the goal metric? |
| Confidence | 1-10 | How confident are we in the impact estimate? |
| Ease | 1-10 | How easy is this to implement? |

Sort by ICE score descending. ICE is best for growth experiments where speed of learning is more important than perfect prioritization.

## Opportunity Scoring

### Formula

```
Opportunity Score = Importance - Satisfaction

Where:
Importance  = "How important is this feature to you?" (1-5)
Satisfaction = "How satisfied are you with current solutions?" (1-5)
```

Higher positive scores = bigger opportunities. Negative scores = over-served areas.

### Survey Questions

For each feature area, ask:
- "How important is [feature area] to you?" (1 = not important, 5 = very important)
- "How satisfied are you with the current [feature area]?" (1 = very dissatisfied, 5 = very satisfied)

### Example

| Feature Area | Importance | Satisfaction | Opportunity Score |
|-------------|-----------|-------------|------------------|
| Search | 4.8 | 2.1 | 2.7 |
| Notifications | 4.2 | 3.5 | 0.7 |
| Export | 3.1 | 4.0 | -0.9 |
| Dashboard | 4.5 | 4.2 | 0.3 |

Search has the highest opportunity score -- invest there first.

## Cost of Delay

### Types of Cost of Delay

| Type | Description | Example |
|------|-------------|---------|
| User | Users cannot achieve their goal without this feature | Login required for main functionality |
| Revenue | Delaying means lost revenue | E-commerce checkout optimization |
| Learning | Delaying means lost learning opportunity | A/B test results |
| Opportunity | Competitors will capture the market | First-to-market advantage |
| Compliance | Regulatory deadline | GDPR compliance by May 25 |

### Cost of Delay Profile

```
Urgent + Important  -> HIGHEST priority (must do now)
Urgent + Not Important -> Do quickly (minimal investment)
Not Urgent + Important -> Schedule (plan for later)
Not Urgent + Not Important -> Eliminate (do not do)
```

## Selecting the Right Method

### Decision Matrix

| Context | Recommended Method | Why |
|---------|-------------------|-----|
| Early-stage startup | MoSCoW + Effort-Impact | Fast, low data requirements |
| Growth-stage | RICE | Quantitative, data-informed |
| Enterprise (SAFe) | WSJF | Aligns with scaled agile framework |
| Growth experiments | ICE | Speed of experimentation |
| Customer-needs-driven | Opportunity Scoring | Based on user research |
| Feature discovery | Kano Model | Understands user satisfaction drivers |
| Regulatory compliance | MoSCoW (M = mandatory) | Non-negotiable items |

### Hybrid Approach

The best practice is to combine methods:

1. **Kano Model** during discovery: Understand what users need and what delights them
2. **RICE** for quarterly prioritization: Quantify and rank candidate features
3. **MoSCoW** for release scoping: Determine what fits in each release
4. **Effort-Impact** for stakeholder communication: Visual quadrants for decision makers

## Prioritization Anti-Patterns

### 1. Stack Ranking Without Context
Saying "Feature A is #3 and Feature B is #4" implies a precision that does not exist. Use tiers (High/Medium/Low) or buckets (Must/Should/Could) instead.

### 2. Averaging Scores from Multiple Stakeholders
Averaging RICE scores from 10 stakeholders creates a meaningless average where no one's input is accurately represented. Instead, have one person (the PM) own the score and present it for challenge.

### 3. Ignoring Dependencies
Prioritizing Feature C before Feature A when C depends on A leads to blocked work. Map dependencies before scoring.

### 4. Prioritizing by "Loudest Voice"
Structured methods exist to prevent recency bias and HiPPO. If the CEO's request is important, it should score well on RICE -- if it does not, the data helps explain why it should be deprioritized.

### 5. Never Revisiting Scores
Reach, impact, confidence, and effort change over time. Re-score features quarterly. A feature that was a wild guess (20% confidence) last quarter may now have data (80% confidence).

## Prioritization Output Format

```
# Prioritized Feature List - Q1 2025

| Rank | Feature | RICE | R (Reach) | I (Impact) | C (Confidence) | E (Effort) | MoSCoW | Theme |
|------|---------|------|-----------|-------------|----------------|------------|--------|-------|
| 1    | Dark mode | 2,667 | 50,000 | 1 | 80% | 15 days | M | Platform |
| 2    | Search autocomplete | 2,400 | 30,000 | 2 | 80% | 20 days | S | Search |
| 3    | Stripe integration | 2,000 | 50,000 | 3 | 80% | 60 days | M | Payments |
| 4    | Onboarding wizard | 1,667 | 50,000 | 2 | 50% | 30 days | C | Growth |
| 5    | CSV export | 1,000 | 5,000 | 1 | 100% | 5 days | S | Data |

## Priority Tiers

### Tier 1: Must Do (RICE > 2,000)
Dark mode, Search autocomplete, Stripe integration

### Tier 2: Should Do (RICE 1,000 - 2,000)
Onboarding wizard, CSV export

### Tier 3: Could Do (RICE < 1,000)
Activity feed, Email notifications, API documentation

### Won't Do This Quarter
Real-time collaboration, Mobile app, Desktop build
```
