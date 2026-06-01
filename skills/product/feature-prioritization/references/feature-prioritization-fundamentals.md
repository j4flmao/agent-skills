# Feature Prioritization Fundamentals

## Overview
Feature prioritization is the systematic process of evaluating and ranking product features to allocate limited development resources to the highest-impact work. Effective prioritization replaces HiPPO (Highest Paid Person's Opinion) with structured decision-making, aligns engineering effort with business strategy, and ensures teams build what matters most to users and the business.

## Core Concepts

### Concept 1: Prioritization is About Trade-offs
Every team has more ideas than capacity. Prioritization is the practice of explicitly choosing what NOT to build. Documenting what won't be done is as important as documenting what will. Without explicit deprioritization, teams suffer from scope creep, context switching, and unfinished work.

### Concept 2: Framework Selection
No single framework works for all decisions. RICE works when quantitative data is available. MoSCoW works when stakeholder alignment is the challenge. Kano works when customer satisfaction is the goal. Opportunity scoring works when solving pain points is the priority. Match the framework to the decision context — don't force one framework on every decision.

### Concept 3: Confidence Matters
Scoring without confidence levels gives false precision. A feature with a high RICE score based on guesses is riskier than a medium-scoring feature backed by data. Always report confidence alongside scores. Low-confidence, high-scoring items need further validation before commitment.

### Concept 4: Stakeholder Alignment
Prioritization is as much about people as about data. Stakeholders with different incentives will have different priorities. Structured frameworks create a shared language for discussing trade-offs. When stakeholders disagree, return to data and strategy — not authority or seniority.

### Concept 5: Dynamic Re-Prioritization
Priorities change as markets, user needs, and business strategy evolve. Set a regular re-prioritization cadence (quarterly minimum). Re-score when strategy changes, major competitive moves occur, or new user research contradicts assumptions. Static backlogs are stale backlogs.

## RICE Scoring

### The Four Dimensions
**Reach:** How many users are affected per time period (typically per quarter). Use analytics data when available. Estimate range (best/worst/most likely). Document data source.

**Impact:** Degree of influence on key outcome. Scale 1-5: 5=transformative, 1=minimal. Impact is about magnitude, not direction — assume positive impact if the feature is well-designed.

**Confidence:** How confident are you in the estimates? 1.0=high (experiments, analytics), 0.8=medium (strong proxy data), 0.5=low (educated guess), 0.2=very low (pure speculation). Confidence prevents acting on guesses as if they were facts.

**Effort:** Total person-weeks (or team-weeks) for complete delivery. Include design, development, QA, documentation, release. Get estimates from engineering, not product assumptions. Include uncertainty ranges.

### Calculation
RICE Score = (Reach × Impact × Confidence) / Effort. Sort descending. Higher score = higher priority. Normalize scores for comparison across different timeframes. RICE enables objective comparison of very different types of work — a small effort, medium-impact feature can outrank a large effort, high-impact feature.

## MoSCoW Method

### Categories
- **Must have:** Critical for current cycle goal. Without this, the goal is not achieved. Limit to 20% of capacity.
- **Should have:** Important but not critical. Can be delivered in next cycle if necessary. Include only after Must items fit.
- **Could have:** Nice to include if time permits. Often the first to drop when timelines tighten.
- **Won't have:** Explicitly out of scope. Documented so they aren't forgotten but won't creep into current cycle.

### Workshop Facilitation
1. Present all candidate features with context and data
2. Each stakeholder individually classifies features
3. Reveal and discuss differences — focus on Must have consensus
4. Verify capacity: Must + Should should not exceed 60% of available capacity
5. Reserve 20% buffer for unexpected work and bugs
6. Document Won't haves — they return to the backlog, not oblivion

## Kano Model

### Categories
**Basic needs:** Table stakes. Users expect them. Their absence causes dissatisfaction, but their presence doesn't create satisfaction. Examples: login works, page loads, data doesn't disappear. Invest to meet threshold, no more.

**Performance needs:** Linear relationship — more is better. Users explicitly request these. Better performance = higher satisfaction. Examples: faster search, more integrations, better reports. Invest proportionally to impact.

**Delightful needs:** Unexpected features that create excitement. Users don't expect them, so their absence doesn't cause dissatisfaction. Examples: animations, Easter eggs, surprise features. Invest selectively — they become performance needs over time.

### Prioritization Rule
Basic > Performance > Delightful. Never sacrifice basic needs for delightful features. A product that delights but doesn't work reliably will fail. A product that works reliably but doesn't delight can succeed.

## Opportunity Scoring

### Method
Score each feature by: importance of the problem (1-10) and satisfaction with current solution (1-10). Calculate: Opportunity = importance + max(importance - satisfaction, 0). Score range: 0-20. Focus: >12 = high opportunity, 8-12 = medium, <8 = low.

### When to Use
Best for problem-focused prioritization where the goal is solving user pain points rather than delivering features. Requires user research to understand problem importance. Works well with persona-driven development — score opportunities per persona.

## Priority Buckets

### P0-P3 Definitions
- **P0:** Must ship this cycle. Limited to top 10-20% of backlog. Requires documented rationale approved by product lead.
- **P1:** Next cycle priority. Queued and ready. Top 20-30% of remaining backlog.
- **P2:** Valuable but no immediate plan. Future consideration. Next 20-30%.
- **P3:** Explicit won't do. Documented rationale. Reviewed quarterly. Bottom 20-40%.

### Governance
P0 count must not exceed 50% of team capacity. P0+P1 must not exceed 80%. Track P0 delivery rate: if <80% of P0 items ship on time, reduce P0 count next cycle. Any stakeholder can request re-prioritization but must provide updated scoring data.

## Anti-Patterns

### HiPPO
Highest Paid Person's Opinion overrides data. Prevention: use structured scoring completed independently by all stakeholders. Anonymize scores before discussion.

### Everything is P0
All stakeholders demand top priority. Prevention: enforce capacity-based limits. "If everything is priority, nothing is."

### False Precision
Treating scores as exact when data is uncertain. Prevention: always include confidence level. Use score ranges. Round to meaningful precision.

### Analysis Paralysis
Over-scoring without making decisions. Prevention: set deadlines. 80% confidence is sufficient for most decisions. Perfect information is never available.

## Key Points
- Prioritization is about choosing what NOT to build
- Match the framework to the decision context
- Confidence prevents acting on guesses as facts
- MoSCoW requires stakeholder participation — it's a consensus tool
- Kano: basic needs first, then performance, then delightful
- Opportunity scoring is best for problem-focused prioritization
- Document P3 (won't do) as carefully as P0 (must do)
- Re-prioritize quarterly or when strategy changes
- Scores are decision aids, not objective truth
- Effort estimates must come from engineering
- Every metric needs a counter metric — prioritize outcomes, not output
- Get to 80% confidence and decide — perfect information is never available
