# Feature Prioritization Advanced Topics

## Introduction
Advanced feature prioritization covers cost of delay and WSJF, portfolio prioritization across multiple products, strategic alignment through OKR-weighting, multi-criteria decision analysis, and prioritization operations at scale. These techniques handle complex prioritization scenarios where multiple frameworks must be combined or where decisions involve significant strategic trade-offs.

## Cost of Delay and WSJF

### Cost of Delay Components
Cost of Delay quantifies the economic value of delivering a feature sooner vs later. Three components:

**User-business value:** Revenue impact, customer acquisition/retention effect, market share change. Measured in monetary terms when possible. For features without direct revenue, use proxy: customer satisfaction improvement, support ticket reduction, time saved.

**Time criticality:** Does value decay over time? Is there a fixed deadline? First-mover advantage window? Seasonal opportunity? Features with high time criticality lose value rapidly if delayed.

**Risk reduction / opportunity enablement:** Does this feature enable future work? Reduce technical risk? Unlock other opportunities? Enables more accurate estimation of future features? These features may score lower on direct value but enable higher-value future work.

### WSJF Calculation
Weighted Shortest Job First = Cost of Delay / Job Duration. Score each component 1-13 (modified Fibonacci: 1, 2, 3, 5, 8, 13). Sum for total Cost of Delay. Divide by duration estimate (weeks or ideal days). Sort by WSJF descending. Highest WSJF = highest priority.

WSJF optimizes for economic return per unit of time. It naturally prioritizes high-value, low-effort items (quick wins) and deprioritizes low-value, high-effort items (never-gonna-happen features).

### When to Use WSJF
Best for: mature products with clear value quantification, when queueing theory principles apply (work arrives continuously, limited capacity), when delay costs are significant and measurable. Avoid when: value is entirely qualitative and cannot be reasonably estimated, when durations are highly uncertain, when most items have similar value/effort ratios.

## Portfolio Prioritization

### Multi-Product Balancing
When prioritizing across multiple products or platforms, use a portfolio approach. Classify each product area: Stars (high growth, invest), Cash Cows (stable revenue, maintain), Question Marks (uncertain, experiment), Dogs (declining, divest). Allocate investment proportionally: Stars get 50% of capacity, Cash Cows 25%, Question Marks 15%, Dogs 10%. Rebalance quarterly based on performance.

### Strategic vs Tactical Allocation
Split capacity into strategic (long-term, high-uncertainty, foundational) and tactical (short-term, predictable, incremental). Typical split: 60% tactical, 20% strategic, 20% maintenance/tech debt. Strategic work is often deprioritized by short-term frameworks like RICE because impact is uncertain and distant — protect strategic capacity explicitly rather than letting it compete on the same backlog.

### Dependency Management
Features often depend on each other. Map the dependency graph: which features block other features, which are enabled by other features, which share components. Score feature sets, not isolated features — a low-scoring feature that unlocks multiple high-scoring features should be prioritized. Use dependency matrices to identify sequencing: what must be built before what.

## Strategic Alignment

### OKR-Weighted Scoring
Weight feature scores by alignment with quarterly OKRs. Define OKR weight per feature: 3 (directly enables a Key Result), 2 (supports a Key Result), 1 (indirectly related), 0 (unrelated). Multiply framework score by OKR weight for adjusted score. This ensures prioritization reflects strategic direction, not just generic impact.

### Strategy-Impact Matrix
Plot features on 2x2 matrix: Strategic Alignment (x-axis: low to high) vs Business Impact (y-axis: low to high). Quadrants: High-High = prioritize immediately, High-Low = strategic bets (protect capacity), Low-High = tactical wins (execute quickly), Low-Low = deprioritize. Use matrix to communicate prioritization rationale visually to stakeholders.

### Opportunity Cost Analysis
Explicitly calculate the opportunity cost of choosing one feature over another. "If we build Feature A, we cannot build Feature B this quarter. Feature B would generate $X in revenue and improve Y metric." Document opportunity cost for every P0 decision. This prevents the illusion that prioritization decisions are free — choosing one thing means not choosing another.

## Multi-Criteria Decision Analysis

### Weighted Decision Matrix
For complex decisions with multiple criteria that can't be reduced to a single framework score. Define criteria (up to 8), assign weights based on strategic priorities, score each option against each criterion (1-5), calculate weighted total, rank by total. Include confidence weights if criteria scores have varying confidence levels.

### Criteria Definition Guidelines
Criteria must be: mutually exclusive (no double counting), collectively exhaustive (covers all important dimensions), measurable (can be scored consistently), relevant (matters to this specific decision). Common criteria: revenue impact, strategic alignment, user value, effort, risk, time sensitivity, learning value, technical debt impact.

### Sensitivity Analysis
After scoring, test sensitivity: what if criteria weights change? What if scores were 10% higher or lower? What if a key assumption is wrong? Identify features that remain high priority under most scenarios (robust) vs features that are high priority only under specific assumptions (brittle). Prioritize robust features over brittle ones when uncertainty is high.

## Operations at Scale

### Prioritization Cadence
| Cadence | Scope | Participants | Output |
|---------|-------|-------------|--------|
| Quarterly | All backlog items | PM + leadership | Strategic priorities, OKR alignment |
| Monthly | Next sprint items | PM + engineering | Sprint candidate list |
| Weekly | Current sprint adjustments | PM + team | Minor re-prioritization, issue triage |
| Continuous | Incoming requests | PM | Initial triage, assign to backlog |

### Backlog Health Metrics
Track and maintain backlog health: size (total items), age (time since last update), score coverage (% scored), re-prioritization frequency, P0 delivery rate, P3 count (should be non-zero — zero means nothing is being deprioritized). Review backlog health monthly. Archive items untouched for 6+ months.

### Escalation Path
When stakeholders cannot agree on priority: first, return to data and strategy — update scoring with better data. Second, escalate to next level of leadership with documented disagreement and trade-offs. Third, if leadership cannot decide, run an experiment to test assumptions. Escalation should be rare — structured scoring should resolve most disagreements.

## Key Points
- Cost of Delay quantifies the economic impact of delaying a feature
- WSJF optimizes for economic return per unit of time (value/size)
- Portfolio prioritization balances across multiple products or platforms
- Protect strategic capacity — don't let short-term frameworks starve long-term bets
- Map dependencies to avoid prioritizing blocked features
- OKR-weighted scoring ensures alignment with strategy
- Opportunity cost analysis reveals the true cost of prioritization decisions
- Multi-criteria decision analysis handles complex trade-offs
- Sensitivity analysis identifies robust vs brittle prioritization decisions
- Backlog health metrics prevent backlog decay
- Escalation should be rare — structured frameworks resolve most disagreements
- Strategic bets (High Strategic, Low Impact) need explicit capacity protection
- Features that unlock other features may be valuable even with low direct impact
- Re-prioritization cadence should match planning cadence
- Document what is NOT being built as carefully as what is being built
- Stakeholder alignment is a benefit of structured prioritization, not a side effect
