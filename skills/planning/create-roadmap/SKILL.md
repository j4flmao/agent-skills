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
version: "1.2.0"
author: "j4flmao"
license: "MIT"
---

# Create Roadmap

## Purpose
Build strategic product roadmaps that align stakeholder priorities with team capacity. Combines theme-based quarterly planning with RICE prioritization, timeline visualization, and iterative monthly updates.

A good roadmap communicates direction without falsely promising specific dates. It answers two questions the whole organization cares about: what is the team working on and why does it matter? This skill produces a living document organized by strategic themes, prioritized by data (RICE scores), and sized with a 20% buffer for the inevitable unplanned work. The output is audience-ready for stakeholder presentations and simultaneously actionable for engineering sprint planning. The roadmap is reviewed quarterly and updated monthly — daily changes destroy trust.

The tension at the heart of roadmapping is between certainty and flexibility. Stakeholders want firm dates; engineering knows that estimates are ranges, not points. This skill navigates that tension by using "Now/Next/Later" framing for uncertain environments and "Q1-Q4 with monthly milestones" for mature products. Both formats communicate priority and direction without over-committing to dates that will inevitably shift.

## Architecture/Decision Trees

### Roadmap Format Decision Tree
```
Product maturity?
  |-- Early stage / high uncertainty --> Now/Next/Later format
  |     Benefits: Flexible, sets direction, manages expectations
  |     Drawbacks: Vague on timelines, stakeholders may push for dates
  |-- Mature product / predictable delivery --> Q1-Q4 with milestones
  |     Benefits: Concrete, stakeholder-friendly, tracks progress
  |     Drawbacks: Creates false precision, harder to change
  |-- Enterprise / contractual commitments --> Q1-Q4 with fixed scope
        Benefits: Legal/contractual clarity
        Drawbacks: Least flexible, highest maintenance overhead

Stakeholder preference?
  |-- Outcome-focused --> Theme-based roadmap (what we will achieve)
  |-- Date-focused --> Feature-based roadmap (what we will ship by when)
  |-- Mixed --> Hybrid: themes for outer quarters, features for next quarter
```

### Prioritization Method Decision Tree
```
Data availability?
  |-- Quantitative data available (usage metrics, revenue data) --> RICE or WSJF
  |     RICE: Best for feature-level prioritization, simpler to calculate
  |     WSJF: Best for SAFe/agile at scale, requires cost of delay data
  |-- Qualitative data only (stakeholder input, research) --> MoSCoW or Opportunity Scoring
  |     MoSCoW: Simple, fast, widely understood by non-technical stakeholders
  |     Opportunity Scoring: Better for customer-needs-driven prioritization
  |-- No data / early stage --> Kano Model or Effort-Impact Matrix
  |     Kano: Understanding what delights vs what is expected vs basic needs
  |     Effort-Impact: Quick visual prioritization for early-stage tradeoffs
  |-- Regulatory/compliance driven --> Priority overrides all scoring (must-do)
```

### Capacity Planning Decision Tree
```
Team allocation?
  |-- Dedicated team --> Full-time on roadmap items
  |     Budget: 60% feature, 20% tech debt, 20% buffer
  |-- Shared team --> Splits time across multiple initiatives
  |     Budget: Allocate by percentage per initiative
  |-- Multiple teams --> Each team gets its own roadmap swimlane
        Coordinate dependencies across swimlanes with explicit sync points

Has team velocity been measured?
  |-- YES (3+ sprints of data) --> Use average velocity for capacity
  |-- NO / new team --> Use estimated capacity: (team size * 0.6 * sprint days)
```

## Agent Protocol

### Trigger
"create roadmap", "roadmap", "product roadmap", "feature roadmap", "quarterly roadmap", "release plan", "timeline", "roadmap planning"

### Input Context
- Product vision and strategy documents (1-2 pages maximum)
- Market analysis, competitive intelligence, and customer research findings
- Stakeholder priority list with each item's rationale and expected business impact
- Team capacity data: sprint velocity for the last 3-6 sprints, team headcount, known leaves
- Technical dependencies and architectural constraints
- Existing sprint commitments and in-flight work
- Business OKRs and strategic goals

### Output Artifact
Roadmap document with strategic themes, timeline view (Now/Next/Later or Q1-Q4), prioritized features with RICE scores, and explicit capacity allocation.

### Response Format
- Theme overview section: 3-5 themes per quarter, each with name, outcome statement, and success metric
- Timeline section: Now/Next/Later table or Q1-Q4 table with monthly milestones per theme swimlane
- Feature list with RICE scores: feature name, Reach, Impact, Confidence, Effort, RICE value, MoSCoW category
- Capacity allocation: feature work %, tech debt %, unplanned buffer % — summing to 100%
- No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
Roadmap covers 2-4 consecutive quarters. At least 3 strategic themes defined per quarter. Features listed with RICE scores and assigned to a theme and timeframe. Capacity allocation sums to 100%. Format suitable for stakeholder presentation.

### Max Response Length
3000 tokens

## Workflow

### Step 1: Gather Inputs
Collect all inputs before placing anything on the timeline:
- **Product vision**: Where is the product going in the next 12 months? What is the North Star metric?
- **Market analysis**: What do customers need that competitors do not provide?
- **Stakeholder wishlist**: Every prioritized request with context — what business problem does each solve and what metric would it move?
- **Team capacity**: Average sprint velocity over last 3-6 sprints, current headcount, known leaves, historical throughput
- **Technical constraints**: Infrastructure work, migrations, or upgrades that block feature delivery
- **Existing commitments**: What is already in flight and must continue?
- **OKRs**: What strategic goals do the features roll up to?

### Step 2: Define Themes
Create 3-5 strategic themes per quarter. A theme is a bounded initiative with a clear outcome statement: a sentence describing what will be true when this theme is complete.

**Theme quality criteria**:
- Names the outcome, not the work: "Customers can pay online with credit cards" not "Stripe Integration"
- Maps to a business OKR or strategic goal
- Mutually exclusive from other themes (no overlap)
- Collectively exhaustive for the planning period
- Has a single success metric that defines done

**Theme template**:
```markdown
### Theme: {Outcome Statement}
**Success metric:** {metric that defines completion}
**OKR alignment:** {OKR this theme supports}
**Key features:**
- {Feature 1}: {brief description}
- {Feature 2}: {brief description}
```

### Step 3: Build Timeline
Two format options depending on planning horizon certainty.

**Now/Next/Later** — best for early-stage or fast-moving products:
- **Now** (this sprint or next): Fully specified with tasks, owners, and estimated delivery
- **Next** (this quarter): Specified as features with themes but not individual tasks
- **Later** (next quarter): Specified as themes only, no feature breakdown

**Q1-Q4 with monthly milestones** — best for mature products with predictable delivery:
- Each theme becomes a swimlane on the timeline
- Place features under the appropriate theme and time bucket
- Mark monthly milestones per swimlane
- Reserve exactly 20% of capacity as an unplanned buffer

**Timeline construction rules**:
- First quarter: detailed, specific, actionable
- Second quarter: directional, feature-level
- Third and fourth quarters: theme-level only (rolling wave)
- No more than one commit per theme per quarter

### Step 4: Prioritize
Score every feature using RICE before placing it on the timeline.

**RICE formula**: `RICE = (Reach * Impact * Confidence) / Effort`

| Component | Description | Scale |
|-----------|-------------|-------|
| Reach | How many users affected per quarter | Absolute number |
| Impact | Effect magnitude | 1 (low) / 2 (medium) / 3 (high) |
| Confidence | Certainty in Reach and Impact | Percentage (20-100%) |
| Effort | Engineering person-days | Absolute number |

**Example**: (50,000 users * 2 impact * 80% confidence) / 20 days = 4,000 RICE.

**After scoring, apply MoSCoW categories**:
- **Must have**: Non-negotiable, RICE-independent (regulatory, P0 commitments)
- **Should have**: High RICE, important for the quarter
- **Could have**: Medium RICE, nice to include if capacity allows
- **Won't have**: Lowest RICE, explicitly out of scope this quarter

### Step 5: Communicate
Prepare the visual roadmap in two views:
- **Timeline view**: Features plotted on a calendar with quarters and months, color-coded by theme
- **Theme view**: Themes as swimlanes with milestones rather than specific dates — better for stakeholder communication

**Communication cadence**:
- Leadership presentation: Quarterly (review themes + priorities)
- Engineering sync: Monthly (update progress + unblock)
- Stakeholder newsletter: Monthly (what shipped, what is next, what changed)

### Step 6: Track and Report
Update roadmap status monthly. For each feature, report:
- Not Started / In Progress / At Risk / Completed / Blocked

**Monthly status report format**:
```markdown
## Roadmap Status: {Month} {Year}

### Shipped This Month
- {Feature}: {brief outcome}

### In Progress
- {Feature}: {progress %, ETA}

### At Risk
- {Feature}: {risk description, mitigation}

### Changes
- {Previous plan} -> {New plan}: {reason}

### Won't Have (This Quarter)
- {Feature}: {reason for deferral}
```

## Process Patterns

### Pattern 1: The Theme-Based Roadmap
**When**: Product-led org, outcome-focused culture
**Process**: Define themes by customer outcomes, not features. Each theme has a hypothesis: "If we deliver {outcome}, we expect {metric} to change by {amount}." Features within a theme can change as long as the outcome stays the same.
**Best for**: Mature products with empowered product teams.

### Pattern 2: The Time-Boxed Roadmap
**When**: Fixed deadline (conference, regulation, contract)
**Process**: Work backward from the fixed date. Scope is variable, time is fixed. Use MoSCoW aggressively — Must Have is the absolute minimum. Track feature count against remaining time weekly.
**Best for**: Event-driven launches, compliance deadlines, contractual commitments.

### Pattern 3: The Opportunity-Sized Roadmap
**When**: Multiple small teams working independently
**Process**: Use Now/Next/Later format with all teams. Each team has its own swimlane. Dependencies between teams are explicitly marked and assigned a dependency owner. Monthly cross-team sync to resolve dependency conflicts.
**Best for**: Organizations with 3+ product teams.

### Pattern 4: The Rolling Wave Roadmap
**When**: High uncertainty, fast-changing market
**Process**: Plan only the next quarter in detail. Quarter 2 is directional. Quarters 3-4 are placeholders. Every month, review the next quarter plan and adjust. Archive old versions to track how priorities changed.
**Best for**: Startups, emerging markets, new product lines.

## Anti-Patterns

### Anti-Pattern 1: Roadmap as a Gantt Chart
Exact dates on features create false certainty and erode trust when they slip. Use quarters, months, or "Now/Next/Later" buckets. A roadmap is NOT a project schedule.

### Anti-Pattern 2: No "Won't Have" Section
Failing to explicitly state what is not being worked on creates the expectation that everything is possible. The "Won't Have" list is essential expectation management.

### Anti-Pattern 3: Ignoring Capacity Planning
Without capacity data (velocity, headcount, leaves), the roadmap is a wish list, not a plan. A roadmap without capacity allocation has zero credibility with engineering teams.

### Anti-Pattern 4: Zero Buffer for Unplanned Work
Every team has bugs, incidents, escalations, and support requests. Budgeting zero for unplanned work ensures the roadmap will slip. Minimum 20% buffer is non-negotiable.

### Anti-Pattern 5: Daily Changes
A roadmap that changes daily is useless. It signals the team has no strategy, only reactions. Establish a monthly update cadence.

### Anti-Pattern 6: All Themes Are Operational
If every theme is "improve performance" or "fix bugs," the product is not evolving. At least one theme per quarter should be growth-oriented or customer-facing.

### Anti-Pattern 7: Stakeholder Override
The CEO or VP overrides the RICE score and inserts their pet project without context. If stakeholders override prioritization, the data-driven process loses credibility. Document overrides and their rationale.

### Anti-Pattern 8: Perpetual "Next Quarter"
Features keep getting pushed to the next quarter without explanation. Track deferred features — if something has been deferred 3+ quarters, it should be explicitly dropped or promoted. Endless deferral is a failure to decide.

## Templates

### Theme Card Template
```markdown
## Theme: {Outcome Statement}
**Success metric:** {Single metric that defines completion}
**OKR:** {Linked OKR}
**Dependencies:** {Other themes or external dependencies}
**Risk level:** {High / Medium / Low}
**Features:**
- {Feature}: RICE {score} — Must/Should/Could
- {Feature}: RICE {score} — Must/Should/Could
```

### Quarterly Roadmap Summary Template
```markdown
# Roadmap: {Quarter} {Year}

## Focus
{1-2 sentence strategic focus for the quarter}

## Themes
1. {Theme 1}: {outcome} [{effort estimate}]
2. {Theme 2}: {outcome} [{effort estimate}]
3. {Theme 3}: {outcome} [{effort estimate}]

## Capacity
- Feature work: {n}%
- Tech debt: {n}%
- Buffer: {n}%

## Won't Have
- {Feature}: {reason}
- {Feature}: {reason}
```

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Theme completion rate | > 80% of planned themes | Quarterly review |
| RICE score correlation | High-RICE features deliver > expected impact | Post-launch measurement |
| Deferred feature rate | < 20% of features pushed more than 1 quarter | Track across quarters |
| Stakeholder satisfaction | > 80% feel roadmap reflects their priorities | Quarterly survey |
| Monthly update compliance | 100% of months have status report | Calendar audit |
| Buffer utilization | Actual buffer usage 15-25% | Capacity tracking |

## Models

### RICE Scoring System
```
RICE = (Reach * Impact * Confidence) / Effort
Reach       = Number of users affected per quarter (e.g., 50,000)
Impact      = 1 (low) / 2 (medium) / 3 (high) — estimated effect magnitude
Confidence  = Percentage (0-100%) — how confident in Reach and Impact estimates
Effort      = Engineering person-days — total cost to deliver
```

### Capacity Allocation Standard
```
Feature work:    60% — New capabilities, improvements, user-facing changes
Tech debt:       20% — Refactoring, upgrades, performance, security, reliability
Unplanned:       20% — Bugs, escalations, incidents, urgent support requests
```

### WSJF (Weighted Shortest Job First) — Alternative to RICE
```
WSJF = Cost of Delay / Job Duration
Cost of Delay = User Value + Time Criticality + Risk Reduction / Opportunity Enablement
Job Duration = Estimated effort (same as RICE Effort)
```

### MoSCoW Categories
| Category | Meaning | RICE Range | Capacity |
|----------|---------|------------|----------|
| Must have | Non-negotiable | Any | 40% |
| Should have | High value | Top 30% of remaining | 30% |
| Could have | Nice to include | Middle 30% | 20% |
| Won't have | Explicitly deferred | Bottom 40% | 10% |

## Performance Considerations

### Roadmap Tool Performance
For roadmaps with 50+ features across 4 quarters, spreadsheet performance degrades. Use dedicated roadmap tools (Aha!, Productboard, Notion) for large roadmaps.

### Update Frequency Impact
- Small team (< 10 people): 2-4 hours/month
- Medium team (10-50): 4-8 hours/month
- Large org (50+): 8-16 hours/month

Set update cadence proportional to team size. Oversized teams updating weekly waste 50+ hours/month.

### Stakeholder Communication Efficiency
- C-level: 1-page summary, quarterly
- Product team: Full roadmap with RICE, monthly
- Engineering: Timeline view with swimlanes, sprint-by-sprint
- Sales/Customer success: Theme view, quarterly

## Ecosystem & Tooling

### Roadmap Software
- **Aha!**: Enterprise product roadmap. $59/user/month
- **Productboard**: Product management platform. $20/user/month
- **Notion**: Flexible, template-based. Free for small teams.
- **Craft.io**: Product management with stakeholder views.
- **Airfocus**: Prioritization-first. Custom scoring models.
- **Roadmunk**: Visual roadmaps for stakeholders.

### Presentation Tools
- **Google Slides / PowerPoint**: For stakeholder presentations
- **Miro / Mural**: Collaborative roadmap workshops
- **GitHub Projects**: Developer-friendly roadmap in-platform

### Adjacent Frameworks
- **OKRs**: Align roadmap themes with quarterly objectives
- **DORA Metrics**: Track delivery performance against roadmap commitments
- **North Star Metric**: Single metric all roadmap themes should influence

## Rules
- A roadmap communicates direction, not delivery dates — it answers "what and why" not "exactly when."
- Reserve 20% buffer for unplanned work — bugs, incidents, urgent escalations always consume capacity.
- One strategic theme per swimlane — never mix two themes in the same swimlane.
- Score every feature with RICE before timeline placement — data defeats recency bias.
- Update monthly, never daily — daily changes destroy stakeholder trust.
- The Won't Have list is as important as the Must Have list — explicit exclusions manage expectations.
- Plan a maximum of 4 quarters ahead — beyond 12 months is a vision document, not a roadmap.
- Use rolling wave planning — next quarter in detail, future quarters at theme level.
- Every theme must map to an OKR — if a theme does not roll up to an objective, it should not be on the roadmap.
- The roadmap is a living document — review quarterly, update monthly, archive old versions.

## Common Pitfalls

### 1. Roadmap as a Gantt Chart
A roadmap is NOT a project schedule. Do not put exact dates on features. Use quarters, months, or "Now/Next/Later" buckets. Exact dates create false certainty and erode trust when they slip.

### 2. No "Won't Have" Section
Failing to explicitly state what is not being worked on creates the expectation that everything is possible. The "Won't Have" list is essential expectation management.

### 3. Ignoring Capacity Planning
Without capacity data (velocity, headcount, leaves), the roadmap is a wish list, not a plan. A roadmap without capacity allocation has zero credibility with engineering teams.

### 4. Zero Buffer for Unplanned Work
Every team has bugs, incidents, escalations, and support requests. Budgeting zero for unplanned work ensures the roadmap will slip. Minimum 20% buffer is non-negotiable.

### 5. Daily Changes
A roadmap that changes every day is useless. It signals that the team has no strategy, only reactions. Establish a monthly update cadence.

### 6. All Themes Are Operational
If every theme is "improve performance" or "fix bugs," the product is not evolving. At least one theme per quarter should be growth-oriented.

## Compared With

| Framework | Time Horizon | Granularity | Best For |
|-----------|-------------|-------------|----------|
| Now/Next/Later | 3-9 months | Themes -> Features -> Tasks | Early-stage, uncertain |
| Q1-Q4 with milestones | 12 months | Themes with monthly checkpoints | Mature products |
| OKR-driven | 3-12 months | Objectives -> Key Results -> Initiatives | Outcome-focused |
| SAFe Roadmap | 6-12 months | Program Increments (PI) | Large enterprises |
| Feature-based | 3-6 months | Individual features | Simple products |
| Theme-based | 6-12 months | Strategic themes | Product-led orgs |

## Related Skills
- **create-story**: Decompose roadmap features into individual user stories for sprint planning
- **create-tech-spec**: Write technical specifications for complex or high-risk roadmap features
- **market-analysis**: Inform roadmap themes with market data and competitive intelligence
- **create-prd**: Write detailed product requirement documents for major roadmap initiatives
- **analytics**: Define success metrics for each roadmap theme and track outcomes

## References
- `references/create-roadmap-fundamentals.md` — Roadmap Fundamentals
- `references/create-roadmap-advanced.md` — Roadmap Advanced Topics
- `references/roadmap-examples.md` — Roadmap Examples
- `references/roadmap-strategies.md` — Roadmap Strategies
- `references/roadmap-template.md` — Roadmap Template
- `references/roadmap-tools.md` — Roadmap Tools
- `references/roadmap-prioritization-methods.md` — Roadmap Prioritization Methods
- `references/roadmap-communication-stakeholder.md` — Roadmap Communication & Stakeholder Management

## Handoff
create-story, create-tech-spec
