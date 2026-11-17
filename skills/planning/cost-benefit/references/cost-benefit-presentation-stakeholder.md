# Stakeholder Presentation for Cost-Benefit Analysis

## Purpose
Provide comprehensive guidance on presenting cost-benefit analysis results to different stakeholder audiences. Covers executive summaries, detailed reports, slide deck structure, data visualization, objection handling, and decision facilitation.

## Table of Contents
1. [Audience Analysis](#audience-analysis)
2. [Executive Summary Structure](#executive-summary-structure)
3. [Detailed Report Structure](#detailed-report-structure)
4. [Slide Deck Design](#slide-deck-design)
5. [Data Visualization](#data-visualization)
6. [Tailoring by Audience](#tailoring-by-audience)
7. [Handling Objections](#handling-objections)
8. [Decision Facilitation](#decision-facilitation)
9. [Follow-Up Communication](#follow-up-communication)
10. [Templates](#templates)

---

## Audience Analysis

### Stakeholder Types

```
CFO / Finance Team:
  Primary concern: financial accuracy, assumptions, risk.
  Wants: NPV, IRR, payback period, sensitivity analysis.
  Language: discounted cash flows, hurdle rates, capital allocation.

CTO / Engineering Leadership:
  Primary concern: technical feasibility, architecture, team impact.
  Wants: TCO comparison, migration complexity, maintenance burden.
  Language: technical debt, scalability, operational overhead.

CEO / Business Leadership:
  Primary concern: strategic alignment, competitive advantage, growth.
  Wants: summary numbers, strategic rationale, risk overview.
  Language: market position, speed to market, customer impact.

Product Management:
  Primary concern: feature impact, timeline, user value.
  Wants: benefit breakdown, timeline, dependencies.
  Language: user stories, adoption rates, time-to-market.

Engineering Team:
  Primary concern: work impact, learning opportunity, complexity.
  Wants: implementation plan, skill requirements, timeline.
  Language: technology stack, architecture changes, documentation.

Procurement / Legal:
  Primary concern: contract terms, vendor risk, compliance.
  Wants: vendor comparison, SLA commitments, exit terms.
  Language: licensing, indemnification, data sovereignty.
```

### Information Needs Per Audience

| Audience | Detail Level | Key Metrics | Format |
|---|---|---|---|
| CFO/Finance | High | NPV, IRR, Payback | Spreadsheet + Summary |
| CTO | Medium-High | TCO, migration effort | Technical report |
| CEO | Low | ROI, strategic fit | One-page summary |
| Product | Medium | Timeline, features | Slide deck |
| Engineering | High | Tech details | Document + Walkthrough |
| Procurement | Medium | Vendor terms | Comparison table |
| Board | Low | Strategic impact | Executive summary |

---

## Executive Summary Structure

### One-Page Executive Summary Format

```
Section 1: Recommendation (2-3 sentences)
  "We recommend investing $XXX in [initiative] because it delivers
  $YYY in net benefits over 3 years with a [N]% ROI and strategic
  alignment to [goal]."

Section 2: Key Numbers (table)
  Total Investment: $XXX
  Total Benefit (3yr): $YYY
  Net Benefit: $ZZZ
  ROI: N%
  Payback: N months
  NPV (12% discount): $NNN

Section 3: Strategic Alignment
  - Aligns to which company OKRs
  - Enables which strategic initiatives
  - Addresses which risks

Section 4: Risk Summary
  - Key risks and mitigation
  - Confidence level: High/Medium/Low
  - Sensitivity: NPV remains positive under pessimistic scenario

Section 5: Next Steps
  - Decision needed by: date
  - Resource commitment needed
  - Approval path
```

### Elevator Pitch

```
30-second version for hallway conversations:

"We are proposing [initiative] which costs $X over 3 years but
delivers $Y in savings and Z in revenue growth, for a net ROI of
N%. It pays back in [N] months and directly supports our [strategic
priority]. The main risk is [risk], which we are addressing with
[mitigation]. We need a decision by [date] to proceed."
```

---

## Detailed Report Structure

### Full Business Case Document

```
1. Executive Summary (1 page)
   - Recommendation, key metrics, strategic fit.

2. Background and Context (1-2 pages)
   - Current state assessment.
   - Problem statement or opportunity.
   - Alternatives considered (including do-nothing).

3. Proposed Solution (1-2 pages)
   - Description of investment.
   - Scope and boundaries.
   - Timeline and milestones.

4. Cost Analysis (2-3 pages)
   - Cost breakdown by category.
   - One-time vs recurring.
   - Assumptions and sources.

5. Benefit Analysis (2-3 pages)
   - Benefit breakdown by type.
   - Quantification methodology.
   - Attribution logic.

6. Financial Analysis (2-3 pages)
   - Cash flow projection (year by year).
   - ROI, NPV, IRR, payback period.
   - TCO comparison (if applicable).

7. Risk and Sensitivity Analysis (1-2 pages)
   - Scenario analysis (optimistic, expected, pessimistic).
   - Sensitivity tornado chart.
   - Risk mitigation strategies.

8. Strategic Assessment (1 page)
   - Alignment with company strategy.
   - Non-financial benefits.
   - Intangible value.

9. Implementation Plan (1-2 pages)
   - Phases and milestones.
   - Resource requirements.
   - Dependencies and critical path.

10. Recommendation and Next Steps (1 page)
    - Clear recommendation.
    - Decision required.
    - Approval path and timeline.
```

---

## Slide Deck Design

### Deck Structure (15 slides)

```
Slide 1: Title slide
  Project name, presenter, date.

Slide 2: Executive summary
  Recommendation, key numbers, confidence level.

Slide 3: Current state and problem
  What is broken or missing, opportunity size.

Slide 4: Proposed solution
  What we want to do, high-level approach.

Slide 5: Alternatives considered
  Do-nothing, other options, why not chosen.

Slide 6: Cost overview
  Total investment, breakdown by category.

Slide 7: Benefit overview
  Total benefit, breakdown by type.

Slide 8: Financial summary
  ROI, NPV, payback period, key metrics.

Slide 9: Cash flow projection
  Year-by-year chart or table.

Slide 10: TCO comparison (if applicable)
  Build vs buy vs SaaS comparison.

Slide 11: Sensitivity analysis
  3 scenarios (optimistic, expected, pessimistic).

Slide 12: Risk assessment
  Top risks and mitigation strategies.

Slide 13: Strategic alignment
  How this connects to company goals.

Slide 14: Implementation timeline
  Phases, milestones, resource needs.

Slide 15: Recommendation and next steps
  Decision needed, approval path.
```

### Slide Design Principles

```
1. One message per slide: Each slide should make a single point.
2. Number-first: Put the key number in large font.
3. Minimal text: Bullet points, not paragraphs.
4. Consistent formatting: Same fonts, colors, layout throughout.
5. Data over opinion: Charts and tables, not qualitative statements.
6. Call to action: Every deck ends with a clear ask.
7. Appendix: Supporting details in backup slides, not main deck.
8. Anticipate questions: Include slides for likely objections.
9. Practice with audience: Run through with a colleague first.
10. Time limit: 15 slides = 15-20 minutes max presentation.
```

---

## Data Visualization

### Chart Selection

| Data Type | Best Chart | Why |
|---|---|---|
| Cost breakdown | Stacked bar | Shows total and composition |
| Benefit breakdown | Stacked bar | Shows total and composition |
| Cash flow over time | Bar chart | Year-by-year comparison |
| NPV sensitivity | Tornado chart | Shows variable impact order |
| Scenario comparison | Grouped bar | Compare 3 scenarios side-by-side |
| Payback visualization | Waterfall chart | Cumulative cash flow crossing zero |
| TCO comparison | Horizontal bar | Compare alternatives |
| Risk matrix | Scatter plot (impact x probability) | Visual risk prioritization |
| Investment allocation | Pie or donut (limit to 5 slices) | Simple proportion |

### Key Visualization Rules

```
1. Start axes at zero (unless there is a compelling reason not to).
2. Label data points directly (not relying on legends).
3. Use consistent color coding (green = positive, red = negative).
4. Avoid 3D charts (distorts perception).
5. Sort data logically (largest to smallest, or chronological).
6. Include source annotations for key data points.
7. Keep chart count to 1-2 per slide maximum.
8. Use tables for precise numbers, charts for trends.
9. Highlight key insight with annotation or color emphasis.
10. Test chart comprehension with someone unfamiliar.
```

### Financial Visualization Examples

```
ROI Timeline Chart:
  X-axis: Years
  Y-axis: Cumulative cash flow
  Two lines: Costs (red), benefits (green)
  Third line: Net (blue, crossing zero at payback point)

TCO Comparison:
  Horizontal bar chart.
  Each alternative as a bar.
  Stacked: acquisition (dark), operation (medium), decommission (light).
  Sort by total TCO ascending.

Sensitivity Tornado:
  Horizontal bar chart.
  Each variable as a row.
  Bars show impact range (low to high).
  Sort by impact size (largest at top).
  Reference line at base NPV.
```

---

## Tailoring by Audience

### For Finance / CFO

```
Format: Spreadsheet with formulas + 2-page summary.
Focus on:
  - Discounted cash flow methodology.
  - Hurdle rate justification.
  - Sensitivity analysis with probabilities.
  - Comparison to alternative capital uses.
  - IRR vs cost of capital.
  - Tax implications (depreciation, credits).
  - Accounting treatment (capex vs opex).

Avoid:
  - Technical jargon.
  - Overly optimistic assumptions.
  - Vague benefit descriptions.

Key question they will ask:
  "What happens if we delay this by 6 months?"
  "How does this compare to our cost of capital?"
  "What is the confidence interval on these numbers?"
```

### For Technology / CTO

```
Format: Technical report with architecture overview + financial summary.
Focus on:
  - TCO comparison across alternatives.
  - Technical complexity and migration risk.
  - Team skill requirements.
  - Operational impact (monitoring, maintenance).
  - Architectural fit and technical debt impact.
  - Scalability and future-proofing.
  - Security and compliance implications.

Avoid:
  - Over-simplification of technical challenges.
  - Ignoring integration complexity.
  - Promising timelines without buffer.

Key question they will ask:
  "How does this fit our technology roadmap?"
  "What are the hidden technical risks?"
  "Can we do this with current team skill set?"
```

### For Executive / CEO

```
Format: 1-page summary + 5-slide deck.
Focus on:
  - Strategic alignment with company vision.
  - Top-line revenue or customer impact.
  - Competitive positioning.
  - Risk overview (not detailed analysis).
  - Key decision and timeline.
  - Resources required (people, budget, time).
  - Confidence level in recommendation.

Avoid:
  - Technical details.
  - Financial methodology.
  - Multiple scenarios (give best estimate).
  - Lengthy risk discussions (summarize).

Key question they will ask:
  "Why now?"
  "What happens if we don't do this?"
  "Who will lead this?"
  "What is the biggest risk?"
```

### For Engineering Team

```
Format: Walkthrough session + implementation document.
Focus on:
  - What needs to be built or changed.
  - Technology choices and rationale.
  - Timeline and milestones.
  - Learning and growth opportunities.
  - Impact on current work and roadmap.
  - Support and resources available.

Avoid:
  - Presenting as a done deal (involve them in planning).
  - Over-committing to specific dates.
  - Dismissing technical concerns.

Key question they will ask:
  "How does this affect our current sprint?"
  "Who is making the technical decisions?"
  "What's the maintenance burden long-term?"
```

---

## Handling Objections

### Common Objections and Responses

```
Objection 1: "The costs seem too high."
  Response: Show TCO comparison with alternatives.
  Break down costs by category and explain each.
  Highlight long-term savings vs upfront investment.
  Discuss phased approach to spread costs.

Objection 2: "The benefits seem optimistic."
  Response: Show conservative methodology.
  Reference industry benchmarks.
  Discuss sensitivity analysis showing positive NPV even in pessimistic case.
  Offer to track benefits post-implementation with measurable KPIs.

Objection 3: "Why now? Can't we wait?"
  Response: Quantify cost of delay.
  Show competitive timeline pressure.
  Discuss dependency on other initiatives.
  Explain market window or regulatory deadline.

Objection 4: "We tried something similar before and it failed."
  Response: Acknowledge the past experience.
  Explain what has changed since then.
  Show how this approach addresses previous failure points.
  Offer a pilot or phased approach to reduce risk.

Objection 5: "This conflicts with other priorities."
  Response: Show how it enables or accelerates other priorities.
  Discuss resource adjustment, not zero-sum tradeoff.
  Escalate to prioritization conversation if needed.
  Present as part of portfolio, not independent project.

Objection 6: "ROI is not high enough."
  Response: Show strategic value beyond ROI.
  Discuss risk reduction or compliance benefit.
  Compare against other projects in portfolio.
  Discuss if investment is "table stakes" (required to compete).

Objection 7: "The payback period is too long."
  Response: Show phased approach with early wins.
  Identify quick wins within first 6 months.
  Discuss long-term asset vs short-term expense.
  Compare payback to expected useful life of investment.
```

### Objection Response Framework

```
1. Listen fully: Do not interrupt. Let them finish their objection.
2. Acknowledge: "That is a valid concern. Let me address it."
3. Clarify: "Just to make sure I understand, your concern is about...?"
4. Respond with evidence: Data, benchmarks, or methodology explanation.
5. Validate: "Does that address your concern?" or "Is there more to it?"
6. If unresolved: "Can we schedule a follow-up to dive deeper on this point?"
7. Document: Note the objection and response for the decision record.
```

---

## Decision Facilitation

### Pre-Meeting Preparation

```
Before the decision meeting:

1. Distribute materials 48 hours in advance.
2. Identify decision-makers and their concerns.
3. Prepare answers to anticipated questions.
4. Line up supporting stakeholders (finance, engineering).
5. Book private pre-meetings with key decision-makers.
6. Confirm meeting logistics (room, time, attendees).
7. Prepare decision document with clear options.
8. Define decision criteria for the group.
```

### Meeting Agenda

```
Total time: 30-45 minutes.

1. Context (2 min): Why this decision matters.
2. Recommendation (3 min): What we propose, key numbers.
3. Analysis overview (5 min): Costs, benefits, risk.
4. Alternatives (3 min): What else we considered.
5. Discussion (15-20 min): Q and A.
6. Decision (5 min): Vote or consensus.
7. Next steps (2 min): Action items.
```

### Decision Types

```
Vote-based:
  - Each decision-maker votes yes/no/abstain.
  - Majority or supermajority threshold.
  - Use for: board-level, significant investment.

Consensus-based:
  - Discuss until all concerns addressed.
  - Not unanimous but everyone can support.
  - Use for: team-level, collaborative decisions.

Decision-maker:
  - One person makes final call after hearing input.
  - Use for: executive decisions, time-sensitive.

Fist-to-five:
  - 5 = strong support, 1 = strong oppose.
  - Discussion focuses on 1-2 votes.
  - Use for: quick pulse check, team decisions.
```

### Decision Document

```
Decision: {Approve / Reject / Defer / Conditional Approve}
Investment amount: $XXX
Condition(s): {if conditional approve}

Rationale: {summary of key factors}

Risk acceptance: {what risks were accepted}

Next steps:
  - Owner: assign.
  - First milestone: date.
  - Review cadence: quarterly.
```

---

## Follow-Up Communication

### After Decision: Approve

```
To: Stakeholders
Subject: Decision to proceed with [initiative]

We are pleased to announce that [initiative] has been approved.
The investment of $XXX is expected to deliver $YYY in benefits
with an ROI of N%.

Next steps:
  - [Owner] - Finalize implementation plan by [date].
  - [Owner] - Resource allocation and team formation.
  - [Owner] - First milestone review on [date].

Thank you for your input and support.
```

### After Decision: Reject/Defer

```
To: Stakeholders
Subject: Decision on [initiative]

After careful consideration, [initiative] has been [rejected/deferred].
The key factors in this decision were:
  - [reason 1]
  - [reason 2]

We will revisit this when:
  - [condition 1] is met.
  - [condition 2] changes.

Thank you for the thorough analysis. The analysis has been archived
for future reference.
```

### Post-Implementation Review

```
Schedule: 6-12 months after implementation.

Review content:
  1. Actual costs vs projected.
  2. Actual benefits vs projected.
  3. Timeline variance.
  4. Lessons learned.
  5. Updated ROI based on actuals.

Report structure:
  - Updated financial summary.
  - Variance analysis with explanations.
  - Key learnings for future analysis.
  - Recommendations for optimization.

Purpose:
  - Validate analysis methodology.
  - Improve future projections.
  - Demonstrate accountability.
```

---

## Templates

### Executive Summary Template

```
# [Project Name] - Executive Summary

## Recommendation
We recommend [investing/not investing] in [initiative] because
[2-3 sentence rationale].

## Key Metrics
| Metric | Value |
|---|---|
| Total Investment | $XX,XXX |
| Total Benefit (3yr) | $XX,XXX |
| Net Benefit | $X,XXX |
| ROI | XX% |
| Payback Period | XX months |
| NPV (12%) | $X,XXX |

## Strategic Alignment
- [OKR 1]: [how initiative supports]
- [OKR 2]: [how initiative supports]
- [Risk]: [how initiative mitigates]

## Risk Summary
- [Risk 1]: [mitigation]
- [Risk 2]: [mitigation]
Confidence level: [High/Medium/Low]

## Decision Required
Approve $XX,XXX investment in [initiative] by [date].
```

### Financial Summary Table

```
| Year | Costs | Benefits | Net Cash Flow | Cumulative |
|---|---|---|---|---|
| 0 | $XX,XXX | $0 | -$XX,XXX | -$XX,XXX |
| 1 | $XX,XXX | $XX,XXX | $X,XXX | -$XX,XXX |
| 2 | $XX,XXX | $XX,XXX | $X,XXX | -$X,XXX |
| 3 | $XX,XXX | $XX,XXX | $X,XXX | $X,XXX |
| Total | $XX,XXX | $XX,XXX | $X,XXX | |
```

### Sensitivity Analysis Table

```
| Scenario | Benefit | Cost | ROI | NPV | Payback |
|---|---|---|---|---|---|
| Optimistic | $400K | $180K | 122% | $200K | 10 months |
| Expected | $300K | $200K | 50% | $75K | 18 months |
| Pessimistic | $200K | $220K | -9% | -$20K | 30+ months |
```

### Decision Record Template

```
# Decision Record: [Initiative Name]

## Decision
[Approve / Reject / Defer / Conditional]

## Investment
$XX,XXX over [N] years

## Rationale
[Key factors that drove the decision]

## Conditions (if applicable)
1. [Condition 1, deadline]
2. [Condition 2, deadline]

## Risk Acceptance
- [Risk accepted and why]

## Action Items
| Owner | Action | Due Date |
|---|---|---|
| [Name] | [Action] | [Date] |

## Review Date
[Date for post-implementation review]

## Signatures
- Decision-maker: [Name/Title]
- Presenter: [Name/Title]
- Finance: [Name/Title]
```

## Handoff
`cost-benefit-analysis-methods.md` for detailed calculation methods.
`../SKILL.md` for the parent cost-benefit skill.
