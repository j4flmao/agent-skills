---
name: planning-create-roadmap
description: >
  Use this skill when the user says 'create roadmap', 'roadmap', 'product roadmap', 'feature roadmap', 'quarterly roadmap', 'release plan', 'timeline', 'roadmap planning'. Build a structured product roadmap with themes, timeline, prioritization, and communication plan. Do NOT use for: sprint planning or project scheduling.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, roadmap, phase-7]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Planning Create Roadmap

## Purpose
Build strategic product roadmaps that align stakeholder priorities with team capacity. Combines theme-based quarterly planning with RICE prioritization, timeline visualization, and iterative monthly updates.

A good roadmap communicates direction without falsely promising specific dates. It answers two questions the whole organization cares about: what is the team working on and why does it matter? This skill produces a living document organized by strategic themes, prioritized by data (RICE scores), and sized with a 20% buffer for the inevitable unplanned work. The output is audience-ready for stakeholder presentations and simultaneously actionable for engineering sprint planning. The roadmap is reviewed quarterly and updated monthly — daily changes destroy trust.

The tension at the heart of roadmapping is between certainty and flexibility. Stakeholders want firm dates; engineering knows that estimates are ranges, not points. This skill navigates that tension by using "Now/Next/Later" framing for uncertain environments and "Q1-Q4 with monthly milestones" for mature products. Both formats communicate priority and direction without over-committing to dates that will inevitably shift.

## Agent Protocol

### Trigger
"create roadmap", "roadmap", "product roadmap", "feature roadmap", "quarterly roadmap", "release plan", "timeline", "roadmap planning"

### Input Context
- Product vision and strategy documents (1-2 pages maximum — the team should be able to summarize it in one paragraph)
- Market analysis, competitive intelligence, and customer research findings
- Stakeholder priority list with each item's rationale and expected business impact
- Team capacity data: sprint velocity for the last 3-6 sprints (average and trend), team headcount, known leaves and holidays for the planning period
- Technical dependencies and architectural constraints: blocking work, prerequisite features, migration prerequisites, sunset dates
- Existing sprint commitments and in-flight work that must continue
- Business OKRs and strategic goals for the current and upcoming quarters

### Output Artifact
Roadmap document strategic themes with outcome statements, a timeline view (Now/Next/Later or Q1-Q4), prioritized features with RICE scores, and explicit capacity allocation

### Response Format
- Theme overview section: 3-5 themes per quarter, each with a name, a one-sentence outcome statement, and the key metric that defines success
- Timeline section: Now/Next/Later table (for high uncertainty) or Q1-Q4 table with monthly milestones per theme swimlane
- Feature list with RICE scores: feature name, Reach number, Impact score (1-3), Confidence percentage, Effort in person-days, computed RICE value, and MoSCoW category
- Capacity allocation: feature work percentage, tech debt percentage, unplanned buffer percentage — all summing to 100%
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Roadmap covers 2-4 consecutive quarters. At least 3 strategic themes are defined per quarter. Features are listed with RICE scores and assigned to a theme and timeframe. Capacity allocation is shown and sums to 100%. The format is suitable for stakeholder presentation.

### Max Response Length
3000 tokens

## Workflow

1. **Gather inputs** — Collect all inputs before placing anything on the timeline. Product vision: where is the product going in the next 12 months? What is the North Star metric? Market analysis: what do customers need that competitors do not provide? What are the biggest gaps in the market? Stakeholder wishlist: collect every prioritized request with context — what business problem does each solve and what metric would it move? Team capacity: average sprint velocity over the last 3-6 sprints, current headcount, known leaves, historical throughput. Technical constraints: what infrastructure work, migrations, or upgrades block feature delivery? Existing commitments: what is already in flight and must continue? OKRs: what strategic goals do the features roll up to?

2. **Define themes** — Create 3-5 strategic themes per quarter. A theme is a bounded initiative with a clear outcome statement: a sentence describing what will be true about the product or business when this theme is complete. Themes are not feature lists. A theme named "Stripe Integration" is wrong because it describes work. A theme named "Customers can pay online with credit cards and invoices" is correct because it describes the outcome. Each theme should map to a business OKR or strategic goal. Themes should be mutually exclusive and collectively exhaustive for the planning period.

3. **Build timeline** — Two format options depending on planning horizon certainty. Now/Next/Later is best for early-stage or fast-moving products where the near term is specific but the medium to long term is directional. Now (this sprint or next, fully specified with tasks), Next (this quarter, specified as features but not tasks), Later (next quarter, specified as themes only). The Q1-Q4 with monthly milestones format is better for more mature products with predictable delivery cadences. Each theme becomes a swimlane on the timeline. Place features under the appropriate theme and time bucket. Reserve exactly 20% of capacity as an unplanned buffer.

4. **Prioritize** — Score every feature using RICE before placing it on the timeline. Reach: how many users or customers will this feature affect within one quarter? Be quantitative. Impact: how much does this move the needle? 1 = low (nice to have, marginal improvement), 2 = medium (significant improvement, noticeable metric shift), 3 = high (transformational, unlocks new segment or capability). Confidence: what percentage confident are you in the Reach and Impact estimates? 100% = proven by data, 80% = strong signal, 50% = educated guess, 20% = wild guess. Effort: estimated engineering effort in person-days including design, implementation, testing, review, and deployment. RICE = (Reach × Impact × Confidence) / Effort. Sort features by RICE descending. Then apply MoSCoW categories: Must have (non-negotiable, RICE-independent), Should have (high RICE, important), Could have (medium RICE, nice to include), Won't have (lowest RICE, explicitly out of scope this quarter).

5. **Communicate and iterate** — Prepare the visual roadmap in two views. Timeline view: features plotted on a calendar with quarters and months, color-coded by theme. Theme view: themes as swimlanes with milestones rather than specific dates — better for stakeholder communication because it manages expectations about dates. Present to leadership and engineering for alignment. The roadmap is reviewed and adjusted quarterly. It is updated with progress monthly. Day-to-day changes erode trust and turn the roadmap into noise — resist the urge to tweak more than once per month.

## Models

### RICE Scoring System
```
RICE = (Reach × Impact × Confidence) / Effort
Reach       = Number of users affected per quarter (e.g., 50,000)
Impact      = 1 (low) / 2 (medium) / 3 (high) — estimated effect magnitude
Confidence  = Percentage (0-100%) — how confident in Reach and Impact estimates
Effort      = Engineering person-days — total cost to deliver
```
Example: (50,000 users × 2 impact × 80% confidence) / 20 days = 4,000 RICE.
Higher RICE means ship it sooner.

### Capacity Allocation Standard
```
Feature work:    60% — New capabilities, improvements, user-facing changes
Tech debt:       20% — Refactoring, upgrades, performance, security, reliability
Unplanned:       20% — Bugs, escalations, incidents, urgent support requests
```
This split is based on industry benchmarks from teams practicing sustainable pace. Neglecting the debt or buffer allocation turns the roadmap into fiction within two sprints.

## Rules

- **A roadmap communicates direction, not delivery dates** — It answers "what and why" not "exactly when." Never promise a specific ship date for a feature on a roadmap unless it is a committed contractual obligation.
- **Reserve 20% buffer for unplanned work** — Bugs, incidents, urgent escalations, and support requests always consume capacity. Budgeting zero for unplanned work is denial, not planning.
- **One strategic theme per swimlane** — Visual roadmaps organize content into swimlanes. Each swimlane represents exactly one theme. Never mix two themes in the same swimlane.
- **Score every feature with RICE before timeline placement** — Without a consistent scoring system, prioritization defaults to whoever shouts loudest or most recently. Data defeats recency bias.
- **Update monthly, never daily** — A roadmap that changes daily destroys stakeholder trust and makes sprint planning impossible. A monthly update cadence signals stability and reliability.
- **The Won't Have list is as important as the Must Have list** — Explicitly documenting what the team is not working on manages expectations and prevents scope creep. Leadership needs to know what is explicitly deprioritized.
- **Plan a maximum of 4 quarters ahead** — Anything beyond 12 months is a vision document, not a roadmap. The next two quarters should be the primary focus of detail. Quarters 3 and 4 are directional.
- **Use rolling wave planning** — The next quarter is planned in detail with monthly milestones and specific features. Future quarters are planned at the theme level only. Detail emerges as time passes.

## Related Skills

- **create-story** — Decompose roadmap features into individual user stories for sprint planning
- **create-tech-spec** — Write technical specifications for complex or high-risk roadmap features
- **market-analysis** — Inform roadmap themes with market data and competitive intelligence
- **okr-kpi** — Align roadmap themes with quarterly OKRs and business KPIs
- **create-prd** — Write detailed product requirement documents for major roadmap initiatives

## References
  - references/create-roadmap-advanced.md — Create Roadmap Advanced Topics
  - references/create-roadmap-fundamentals.md — Create Roadmap Fundamentals
  - references/roadmap-examples.md — Roadmap Examples
  - references/roadmap-strategies.md — Roadmap Strategies
  - references/roadmap-template.md — Roadmap Template
  - references/roadmap-tools.md — Roadmap Tools
## Handoff
create-story (decompose roadmap features into individual user stories), create-tech-spec (write technical specifications for complex or high-risk roadmap features).
