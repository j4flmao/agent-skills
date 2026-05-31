---
name: product-feature-prioritization
description: >
  Use this skill when prioritizing product features: framework selection, RICE scoring, Kano model, MoSCoW, and opportunity scoring.
  This skill enforces: prioritization framework selection, quantitative scoring, stakeholder alignment, output documentation.
  Do NOT use for: sprint planning, task estimation, roadmap timeline creation, resource allocation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, prioritization, phase-8]
---

# Feature Prioritization Agent

## Purpose
Facilitates feature prioritization using RICE, Kano, MoSCoW, and Opportunity scoring frameworks to make data-informed product decisions. Enables teams to allocate limited development resources to the highest-impact features by systematically evaluating options against strategic criteria.

## Agent Protocol

### Trigger
Exact user phrases: prioritization, RICE, ICE, Kano model, MoSCoW, backlog prioritization, impact effort.

### Input Context
- What features or initiatives need prioritization?
- What data is available for scoring (user impact, effort estimates)?
- Who are the stakeholders and what are their perspectives?
- What is the current product strategy and OKRs?
- What constraints exist (time, resources, dependencies)?
- What is the team's delivery capacity per cycle?
- What is the acceptable level of confidence for decisions?

### Output Artifact
Prioritized feature list with scoring framework, rationale, and stakeholder alignment documentation.

### Response Format
```
## Feature Prioritization
### Framework: {RICE / Kano / MoSCoW / Opportunity}

### Scoring Results
| Feature | Score | Priority | Rationale |
|---------|-------|----------|-----------|
| {feature A} | {score} | P0 | {reason} |
| {feature B} | {score} | P1 | {reason} |

### Priority Buckets
P0 (Must Have): {features} — ship within current cycle
P1 (Should Have): {features} — next cycle
P2 (Nice to Have): {features} — future consideration
P3 (Won't Do): {features} — explicit no

### Stakeholder Alignment
{Agreed: list} | {Disagreements: list} | {Escalated: list}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Prioritization framework selected with justification
- [ ] All features scored using chosen framework
- [ ] Priority buckets assigned (P0-P3)
- [ ] Scoring rationale documented per feature
- [ ] Stakeholder alignment achieved or disagreements noted
- [ ] Quick wins identified (high impact, low effort)
- [ ] Long-term strategic items identified
- [ ] Output ready for roadmap integration
- [ ] Re-prioritization cadence defined
- [ ] Dependencies between features documented

### Max Response Length
7000 tokens

## Framework/Methodology

### Framework Selection Decision Tree

```
What is the primary decision context?
├── Quantitative data available (reach, effort, revenue)?
│   ├── Yes, with good confidence → RICE scoring
│   └── Partial data, early stage → Opportunity scoring
├── Customer satisfaction is the goal?
│   └── Yes → Kano model
├── Stakeholder alignment is the primary challenge?
│   └── Yes → MoSCoW with facilitated workshop
└── Need to align with strategic OKRs?
    └── Yes → Weighted scoring aligned to OKRs
```

### Framework Comparison Matrix

| Framework | Type | Best For | Data Required | Participants | Output |
|-----------|------|----------|---------------|--------------|--------|
| RICE | Quantitative | Data-rich environments | Reach, impact, confidence, effort | PM + engineering | Ranked list with scores |
| ICE | Lightweight quantitative | Fast decisions, startups | Impact, confidence, ease | Small team | Quick ranked list |
| Kano | Qualitative-categorical | Understanding satisfaction drivers | User research, survey | Users | Feature classification |
| MoSCoW | Qualitative | Stakeholder alignment workshops | Stakeholder input | Cross-functional team | Categorized priorities |
| Opportunity | Hybrid | Problem-focused prioritization | Pain frequency, satisfaction | PM + research | Opportunity score |
| Weighted scoring | Quantitative | Strategic alignment | Objective weights, feature scores | Leadership + PM | Strategy-aligned ranking |
| Cost of delay | Value-based | High-stakes decisions | Value per time, urgency | PM + business | Prioritized by value/time |

### Priority Bucket Definitions

| Bucket | Definition | Action | % of Backlog |
|--------|------------|--------|--------------|
| P0 | Must have for current goals | Ship this cycle | Top 10-20% |
| P1 | Important, next in line | Plan for next cycle | Next 20-30% |
| P2 | Valuable but not urgent | Future consideration | Next 20-30% |
| P3 | Will not do | Explicit deprioritization | Bottom 20-40% |

### Prioritization Anti-Patterns

| Anti-Pattern | Description | Fix |
|-------------|-------------|-----|
| HiPPO | Highest Paid Person's Opinion overrides data | Use structured scoring that all stakeholders complete |
| Recency bias | Prioritizing what was last discussed | Use quarterly prioritization cadence with consistent framework |
| Guesstimation | Confident but inaccurate effort estimates | Use T-shirt sizing with ranges, track estimation accuracy |
| Everything is P0 | All stakeholders demand top priority | Force rank: limited number of P0 items per cycle |
| Pet features | Features championed by leadership without evidence | Require user research or data before scoring |
| Scope creep | Features growing beyond original intent | Score at epic level, not task level |

## Workflow

### Step 1: Framework Selection
Choose framework based on context: RICE (best when reach and effort data available, quantitative), Kano (best for differentiating features by customer satisfaction impact), MoSCoW (best when stakeholder alignment needed, simple), Opportunity (best when solving pain points is primary goal). Align framework with team maturity and data availability.

Framework selection criteria:

| Factor | RICE | Kano | MoSCoW | Opportunity |
|--------|------|------|--------|-------------|
| Data availability | High | Medium | Low | Medium |
| Team maturity | High | Any | Any | Medium |
| Stakeholder dynamics | Data-driven | User-centered | Consensus-seeking | Problem-focused |
| Time available | 1-2 days | 2-3 days | Half-day workshop | 1-2 days |
| Strategic alignment | Strong | Moderate | Moderate | Strong |

### Step 2: RICE Scoring
Score each feature on four dimensions: Reach (how many users affected per time period, e.g., 1000 users/month), Impact (conversion, retention, revenue — scale 1-5), Confidence (how confident in estimates — scale 0.2-1.0), Effort (total engineering time in person-months). Calculate RICE = (Reach × Impact × Confidence) / Effort.

RICE dimension details:

**Reach**: Number of users affected per time period (typically per quarter)
- Use analytics data when available
- Estimate range (best case / worst case / most likely)
- Document data source

| Reach | Users/Quarter | Example |
|-------|--------------|---------|
| 5 | >100K | All users |
| 4 | 25K-100K | Large segment |
| 3 | 5K-25K | Medium segment |
| 2 | 1K-5K | Small segment |
| 1 | <1K | Niche segment |

**Impact**: Degree of influence on key outcome
- 5 = Massive (transformative for business)
- 4 = High (significant improvement)
- 3 = Medium (noticeable improvement)
- 2 = Low (incremental improvement)
- 1 = Minimal (barely detectable)

**Confidence**: How confident are you in the estimates?
- 1.0 = High (data from experiments, analytics)
- 0.8 = Medium (strong proxy data, user research)
- 0.5 = Low (educated guess, team consensus)
- 0.2 = Very low (pure speculation)

**Effort**: Total team-weeks (or person-weeks) required for complete delivery
- Include: design, development, QA, documentation, release
- Use ranges: best case / most likely / worst case (PERT estimate)
- Get estimates from engineering, not product assumptions

### Step 3: MoSCoW Classification
Classify features into Must have (critical for cycle goal), Should have (important but not critical), Could have (nice to include if time permits), Won't have (explicitly out of scope for this cycle).

MoSCoW Workshop Facilitation:

1. Present all candidate features with context
2. Each stakeholder individually classifies
3. Reveal and discuss differences
4. Focus debate on "Must haves" — requires consensus
5. "Won't haves" are documented, not ignored
6. Verify capacity: Must + Should should not exceed 60% of available capacity
7. Reserve 20% buffer for unexpected work

### Step 4: Kano Model Classification
Classify features into: Basic needs (table stakes, must have, dissatisfaction if absent), Performance needs (linear satisfaction, more is better, explicit requests), Delightful needs (unexpected, high satisfaction, not expected). Prioritize: Basic > Performance > Delightful. Avoid investing in basic beyond threshold.

Kano classification is determined through a user survey with paired questions:

For each feature, ask:
1. Functional: "How would you feel if this feature is present?" (5-point scale: Like / Expect / Neutral / Tolerate / Dislike)
2. Dysfunctional: "How would you feel if this feature is absent?" (same 5-point scale)

Cross-reference responses on the Kano evaluation table to classify the feature.

Investment guidelines by category:
- Basic needs: Invest to meet threshold, no more (diminishing returns)
- Performance needs: Invest proportionally to impact (linear returns)
- Delightful needs: Invest selectively (high impact but expectations change)
- Indifferent: Do not invest unless zero cost
- Reverse: Avoid (some users actively dislike)

### Step 5: Opportunity Scoring
Score each feature by importance of the problem (how many users affected, how painful) and satisfaction with current solution. Calculate opportunity = importance + max(importance - satisfaction, 0). Focus on high importance + low satisfaction = highest opportunity.

Opportunity scoring template:

```
Feature: {feature name}
Problem: {what user problem this solves}

Importance (1-10): {how important is solving this problem?}
  Evidence: {user research, data, support tickets}

Satisfaction (1-10): {how satisfied are users with current solution?}
  Evidence: {survey data, NPS comments, CSAT scores}

Opportunity Score: {importance + max(importance - satisfaction, 0)}
  └── Score range: 0-20
  └── Focus: >12 = high opportunity, 8-12 = medium, <8 = low
```

### Step 6: Prioritization Output
Sort features by score within chosen framework. Assign priority buckets: P0 = ship now (top 20%), P1 = next cycle (next 30%), P2 = future (next 30%), P3 = explicitly won't do (bottom 20%). Document rationale for each score dimension. Flag dependencies between items. Identify quick wins (high score, low effort).

Output document structure:

1. Executive summary: Top priorities and rationale
2. Methodology: Framework used, scoring details, participants
3. Full ranked list: Feature, score per dimension, total score, priority bucket
4. Quick win highlights: Top 3 high-impact low-effort items
5. Strategic items: Long-term investments that score lower in short-term frameworks
6. Dependencies: Features that block or enable others
7. Stakeholder alignment: Agreed items, disputed items, escalation path

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| False precision | Treating scores as exact when data is uncertain | Always include confidence level; use score ranges |
| Analysis paralysis | Over-scoring without making decisions | Set a deadline; prioritize 80% confidence over perfection |
| Recency bias | Prioritizing what was just discussed | Separate ideation from prioritization; timebox debates |
| Strategy misalignment | Scoring without strategic context | Weight framework dimensions by strategic objectives |
| Effort optimism | Underestimating effort systematically | Use historical data; include buffer; get engineering sign-off |
| Stakeholder horse-trading | Trading priorities without data basis | Use structured framework; force explicit trade-off rationale |
| One-size-fits-all framework | Using same framework for all decisions | Match framework to decision type and data availability |
| Ignoring dependencies | Prioritizing dependent features separately | Map dependency graph; score feature sets, not isolated items |
| No re-prioritization | Set-it-and-forget-it approach | Quarterly re-prioritization cadence tied to strategy review |
| Everything is P0 | Stakeholders refusing to deprioritize | Limit P0 items to capacity; document what is explicitly not shipping |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Involve engineering in effort estimation | Prevents overpromising; builds shared ownership of priorities |
| Document what won't be done | Explicit deprioritization prevents recurring debates |
| Score features, not people | Separate the idea from the person who suggested it |
| Use ranges for uncertain data | More honest than single-point estimates |
| Prioritize outcomes, not output | Score by impact on goals, not by feature shininess |
| Revisit priorities quarterly | Markets and strategies change; backlog should reflect current context |
| Communicate the "why" behind priority decisions | Helps stakeholders understand and accept trade-offs |
| Maintain a single prioritized backlog | Prevents conflicting priorities across teams |
| Include confidence in final score display | Prevents over-indexing on low-confidence high-scorers |
| Separate strategic bets from incremental improvements | Different evaluation criteria for different types of work |

## Templates & Tools

### RICE Scoring Template
```
Feature: {feature name}
Owner: {person completing scoring}
Date: {date}

Reach: {N} users/quarter | Source: {analytics/research/estimate}
Impact (1-5): {score} | Rationale: {why this impact level}
Confidence (0.2-1.0): {score} | Rationale: {data quality}
Effort (person-weeks): {N} | Source: {engineering lead}

RICE Score = ({reach} x {impact} x {confidence}) / {effort} = {total}

Confidence Assessment:
- Data sources used: {list}
- Key assumptions: {list}
- Mitigation for uncertainty: {plan}
```

### Prioritization Workshop Agenda

| Duration | Activity | Participants |
|----------|----------|--------------|
| 15 min | Context setting, strategy refresh | All stakeholders |
| 30 min | Feature review and Q&A | Feature owners present |
| 45 min | Individual scoring | All stakeholders independently |
| 30 min | Results reveal and discussion | Facilitated discussion |
| 30 min | Priority bucket assignment | Facilitated consensus |
| 15 min | Next steps and ownership | All stakeholders |

### Priority Visualization Matrix

```
                    High Impact
                        |
              P1 (Next)  |  P0 (Now)
              Should Have | Must Have
                        |
    Low Effort --------+-------- High Effort
                        |
              P2 (Later) |  P3 (Won't Do)
              Could Have  |  Not Now
                        |
                    Low Impact
```

## Case Studies

### Case Study 1: RICE Scoring Rescues a Struggling Roadmap
A SaaS startup had a backlog of 80+ feature requests with no clear priority. Using RICE scoring with input from product, engineering, and customer success, they ranked all 80 features. The top 10 RICE-scored features were analyzed and 5 were selected for the quarter. Three months later, these 5 features contributed to a 25% increase in activation rate and 15% increase in retention. Features that scored low (including 3 executive pet features) were explicitly moved to P3 with documented rationale.

Method: RICE scoring with cross-functional team
Key outcome: 5 features shipped in one quarter instead of the previous average of 2
Impact: 25% activation rate increase, 15% retention improvement

### Case Study 2: Kano Model Preventing Satisfaction Regression
A project management tool was considering adding AI-powered task suggestions (a request from power users). Kano survey of 150 users revealed this was a Delightful feature for most users. Meanwhile, board loading speed (not requested by users) was a Basic need that was not being met. The team prioritized performance optimization over the AI feature, preventing what would have been growing dissatisfaction.

Method: Kano survey with 150 users across 3 segments
Key insight: Unrequested improvements (performance) were Basic needs; requested features (AI) were Delights
Impact: Prevented satisfaction decline; performance improvement increased NPS from 32 to 48

### Case Study 3: Stakeholder Alignment via MoSCoW
A B2B company had three stakeholders (Sales, CS, Engineering) each demanding different priorities for the next release. A facilitated MoSCoW workshop revealed that all three agreed on the importance of 3 features but disagreed on everything else. The workshop surfaced that Sales and CS had the same priorities — they just used different language to describe them. The Must Have list was agreed in 2 hours, what previously took 3 months of email debates.

Method: MoSCoW workshop with cross-functional stakeholders
Key insight: Stakeholders agreed more than they realized once forced into structured trade-offs
Impact: Reduced prioritization cycle from 3 months to 2 hours for the Must Have list

## Rules
- Framework must be selected before scoring begins.
- RICE requires effort estimates from engineering.
- Kano classification requires user research validation.
- MoSCoW requires stakeholder participation in classification.
- All scores must include confidence level.
- Priority buckets must be mutually exclusive.
- "Won't do" items must be explicitly documented, not ignored.
- Re-prioritization must happen quarterly or when strategy changes.
- No feature can be P0 without documented rationale.
- Quick wins (high impact, low effort) must be explicitly flagged.
- Dependencies between features must be documented and scored together.
- Effort estimates must come from engineering, not product.
- Prioritization decisions must be communicated to all stakeholders within 1 week.
- P0 capacity must not exceed 60% of available team capacity.
- Simple features must have a 20% uncertainty buffer in effort estimates.

## References
  - references/feature-prioritization-advanced.md — Feature Prioritization Advanced Topics
  - references/feature-prioritization-fundamentals.md — Feature Prioritization Fundamentals
  - references/prioritization-frameworks.md — Prioritization Frameworks
  - references/prioritization-matrix.md — Prioritization Matrix
  - references/roadmap-planning.md — Roadmap Planning
  - references/scoring-models.md — Scoring Models
  - references/prioritization-frameworks.md — Prioritization Frameworks
  - references/prioritization-stakeholder-management.md — Prioritization Stakeholder Management
## Handoff
For analytics data to inform prioritization, hand off to `product-analytics`. For user research to validate priorities, hand off to `product-user-research`.
