# Prioritization Stakeholder Management

## Stakeholder Dynamics in Prioritization

Prioritization is as much about managing people as it is about analyzing data. Stakeholders bring different perspectives, incentives, and communication styles that must be navigated to achieve alignment.

### Stakeholder Landscape Map

| Stakeholder | Primary Concern | Contribution | Potential Conflict |
|-------------|-----------------|--------------|-------------------|
| Product Manager | Product strategy, OKRs, delivery | Framework selection, facilitation | Pulled in multiple directions |
| Engineering Lead | Technical quality, feasibility, team capacity | Effort estimates, technical risk assessment | Underestimates effort, wants tech debt work |
| Design Lead | User experience, design consistency | UX impact assessment, feasibility | Wants pixel perfection |
| Sales | Revenue, customer commitments | Customer pain points, competitive intel | Over-promises features |
| Customer Success | Retention, satisfaction | User feedback, churn drivers | Champions vocal minority |
| Executive/CEO | Revenue, growth, strategic position | Strategic direction, resource allocation | Pushes pet projects |
| Data/Analytics | Data quality, measurement | Impact quantification, metric definition | Needs more data before decisions |
| Marketing | Positioning, messaging | Market needs, campaign requirements | Wants vanity features for campaigns |
| Finance | Revenue, cost, ROI | Business case validation | Focused on cost reduction |

### Stakeholder Archetypes in Prioritization

| Archetype | Behavior | Approach |
|-----------|----------|----------|
| The Visionary | Has strong opinions based on vision, not data | Acknowledge vision, then ask "how will we measure success?" |
| The Firefighter | Only prioritizes urgent fires | Separate urgent from important; use scoring to deprioritize |
| The Customer Advocate | Champions specific customer requests | Validate with data: is one customer or a pattern? |
| The Engineer | Prioritizes technical elegance and debt reduction | Balance with user impact; allocate % capacity to tech debt |
| The Executive | Pushes pet projects | Show data on opportunity cost of pursuing pet vs other features |
| The Diplomat | Avoids conflict, agrees with everyone | Use structured framework to make trade-offs explicit |
| The Optimist | Everything is P0 | Force rank; limited capacity makes choices unavoidable |
| The Skeptic | Questions all data and methods | Involve early in framework selection; pre-commit to criteria |

## Stakeholder Alignment Frameworks

### DACI Model for Prioritization Decisions

| Role | Responsibility | Who |
|------|---------------|-----|
| Driver | Drives the process, facilitates | Product Manager |
| Approver | Makes the final decision | CPO, VP Product, or designated authority |
| Contributors | Provide input, scoring, estimates | Eng lead, Design lead, Data, CS, Sales |
| Informed | Need to know the outcome | Wider team, stakeholders |

DACI rules:
- Only one Approver per decision
- Contributors must provide input before decision
- Driver ensures all voices are heard
- Informed are told the rationale, not just the outcome

### RACI for Prioritization

| Activity | PM | Eng | Design | Sales | CS | Data | Exec |
|----------|----|-----|--------|-------|----|------|------|
| Define scoring criteria | A | C | C | C | C | C | I |
| Provide feature candidates | D | C | C | C | C | C | D |
| Score reach | D | - | - | C | C | A | - |
| Score impact | D | C | C | C | C | A | C |
| Estimate effort | C | A | C | - | - | - | - |
| Assign confidence | D | C | C | C | C | A | - |
| Calculate scores | A | - | - | - | - | C | - |
| Review results | D | C | C | C | C | C | I |
| Make final priority call | D | - | - | - | - | - | A |
| Communicate decisions | A | I | I | I | I | I | I |

## Stakeholder Alignment Process

### Step 1: Pre-Work (Before the Workshop)

1. **Identify all stakeholders** who have a stake in the outcome
2. **Interview key stakeholders** to understand their priorities and concerns
3. **Define decision scope and authority**: what exactly is being prioritized, and who has final say
4. **Select framework** that fits the decision context and stakeholder dynamics
5. **Prepare materials**: feature list, supporting data, framework templates
6. **Share pre-read** 2-3 days before workshop

Pre-read template:
```
Prioritization Pre-read
Date: {date}
Purpose: {what we're prioritizing and why}

Decision Authority: {Approver name}
Process: {framework, scoring method, timeline}

Features for Prioritization:
| Feature | Description | Supporting Data |
|---------|-------------|-----------------|
| Feature A | {1-2 sentence description} | {data link} |
| Feature B | {1-2 sentence description} | {data link} |

Timeline:
- {date}: Pre-read shared
- {date}: Individual scoring due
- {date}: Alignment workshop
- {date}: Final decision communicated
```

### Step 2: Individual Scoring

Before group discussion, have each stakeholder score independently. This:
- Prevents groupthink
- Captures honest individual perspectives
- Reveals areas of agreement and disagreement
- Provides data for constructive discussion

Independent scoring rules:
- Stakeholders score without consulting each other
- Submit scores anonymously (if possible)
- Document rationale for each score
- All scores considered, but weight may differ by stakeholder

### Step 3: Reveal and Analyze

When scores are submitted, analyze the results:

1. **Calculate agreement level**: For each feature, what's the score variance across stakeholders?
2. **Identify consensus items**: Features where scoring is within 20% variance
3. **Identify disputed items**: Features with high variance or bimodal distribution
4. **Find pattern clusters**: Which stakeholder groups align?
5. **Prepare for workshop**: Focus discussion on disputed items

### Step 4: Alignment Workshop

| Activity | Duration | Description |
|----------|----------|-------------|
| Review framework and rules | 10 min | Reiterate process, remind of DACI roles |
| Present scoring results | 15 min | Show overall ranking, consensus, and disputes |
| Discuss consensus items | 10 min | Confirm agreement, no need to debate |
| Discuss disputed items | 30 min | Focus on 3-5 disputed items, hear each perspective |
| Make trade-offs explicit | 15 min | "If we prioritize X, we deprioritize Y" |
| Assign priority buckets | 15 min | Final categorization with capacity check |
| Document and next steps | 5 min | Confirm decisions, ownership, communication plan |

### Step 5: Finalize and Communicate

1. **Document decisions** with rationale
2. **Communicate to all stakeholders** (including those not in workshop)
3. **Explain trade-offs**: "We prioritized X over Y because..."
4. **Address disappointed stakeholders** individually
5. **Schedule follow-up**: Next prioritization cadence date

## Managing Difficult Scenarios

### Scenario: Executive Pet Project without Data

**Challenge:** An executive wants a feature prioritized based on intuition, not data.

**Approach:**
1. Acknowledge the executive's vision and perspective
2. Ask "How would we measure the success of this feature?"
3. Propose scoring the feature through the established framework
4. If it scores well due to strategic importance, it will rise naturally
5. If it scores poorly, present the comparison: "By investing here, we deprioritize these 3 features with higher scores"
6. Escalate: the Approver makes the final decision

### Scenario: Sales Over-Promised Features

**Challenge:** Sales committed to features that weren't prioritized.

**Approach:**
1. Don't blame sales — they're responding to customer needs
2. Validate the customer pain point: is it one customer or a pattern?
3. Score the committed feature through the framework
4. If it scores well, it may already be prioritized
5. If it doesn't, present options: delay, negotiate with customer, or add to Won't Have
6. Document lessons for sales enablement

### Scenario: Engineering Underestimates Effort

**Challenge:** Engineering consistently underestimates effort, causing ranking inaccuracies.

**Approach:**
1. Use historical data to calculate estimation bias
2. Apply a calibration factor (e.g., multiply estimates by 1.3x)
3. Use PERT estimates (best case / most likely / worst case)
4. Require written assumptions backing each estimate
5. Track accuracy and review quarterly

### Scenario: Everything is P0

**Challenge:** Stakeholders refuse to deprioritize anything.

**Approach:**
1. Remind of capacity: "We can deliver X feature-weeks this cycle"
2. Total P0 ask: Show sum of effort vs available capacity
3. Force rank: "If you can only do 3 things, which 3?"
4. Explicit trade-off: "If we do A, we won't do B. Is that okay?"
5. Use the framework score as neutral arbiter
6. If still stuck, the Approver makes the call

### Scenario: Data Disagreements

**Challenge:** Stakeholders disagree on data accuracy or interpretation.

**Approach:**
1. Acknowledge the data limitations
2. Use confidence scoring to reflect uncertainty
3. Focus on ranges, not single numbers
4. Disagree and commit: score with current best data, note assumptions
5. Plan to validate with further research if critical

### Scenario: Too Many Features, Not Enough Capacity

**Challenge:** More high-scoring features than capacity.

**Approach:**
1. Rank by score within each priority bucket
2. Slice at capacity line: features above line are P0/P1
3. Create explicit "next cycle" list for features just below the line
4. Revisit in next prioritization cycle
5. Consider: can we simplify features (P0 with reduced scope vs deferring entirely)?

### Scenario: Cross-Team Dependencies

**Challenge:** Feature A depends on Feature B owned by another team.

**Approach:**
1. Map dependency graph before prioritization
2. Score feature sets, not individual features
3. Prioritize foundational features (dependencies) even if they score lower alone
4. Align prioritization cadences across teams
5. Assign dependency owners to unblock

## Communication Strategies

### Announcing Prioritization Decisions

**The "Why Behind the What" Communication:**

```
Subject: Q2 Feature Prioritization Results

Hi team,

After our prioritization process using RICE scoring and stakeholder input, here are the Q2 priorities.

What we're building:
1. [Feature A] (P0) — Highest RICE score, drives activation
2. [Feature B] (P0) — Strategic initiative, supports Q2 OKR
3. [Feature C] (P1) — High impact, deferred from Q1

What we explicitly won't build this quarter:
1. [Feature D] — Scored lower despite interest; revisit Q3
2. [Feature E] — Low confidence on impact; needs user research first

Why:
- [Feature A] scored highest on reach (50K users) and impact (activation +15%)
- [Feature D] scored lower because confidence was low (0.5); we need data
- [Feature C] was deferred from Q1 but is our highest priority P1

Trade-offs made:
- Committed to [Feature F] (sales commitment) but moved to P1
- Will allocate 20% capacity for tech debt and bug fixes

Next steps:
- Individual feature specs due [date]
- Sprint planning [date]
- Next prioritization review [date]

Questions? The rationale document is linked below, or reach out directly.

[Product Manager name]
```

### Handling Disappointed Stakeholders

1. **One-on-one conversation** before public announcement
2. **Acknowledge their perspective**: "I know this feature is important to you"
3. **Explain the decision rationale**: reference the framework, not personal opinion
4. **Show the data**: comparison of scores, trade-offs
5. **Discuss options**: when might it be revisited? What data would change the ranking?
6. **Alternative wins**: help them find other wins in the current priority set
7. **Maintain relationship**: prioritize ongoing communication

## Building a Prioritization Culture

### Maturity Model

| Level | Name | Characteristics |
|-------|------|-----------------|
| 1 | Reactive | CEO decides, no framework, frequent changes |
| 2 | Ad-hoc | Framework exists but not consistently used, rules bent for executives |
| 3 | Defined | Framework is standard practice, scoring documented, but stakeholders still challenge |
| 4 | Integrated | Framework accepted across organization, monthly prioritization rhythm |
| 5 | Proactive | Continuous prioritization, data-rich, stakeholders trust the process |

### Governance

| Element | Description |
|---------|-------------|
| Decision authority | Clearly defined who makes the final call |
| Prioritization cadence | Monthly or quarterly, tied to planning cycles |
| Escalation path | Process for unresolved disagreements |
| Framework review | Quarterly evaluation: is the framework still working? |
| Data quality review | Monthly: are we scoring with good data? |
| Retrospective | After each cycle: what could improve the process? |

### Metrics for Prioritization Effectiveness

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| Stakeholder satisfaction with process | % of stakeholders who feel process is fair | >80% |
| Decision clarity score | % of stakeholders who understand why priorities are what they are | >90% |
| Framework adoption rate | % of prioritization decisions using the framework | >90% |
| Re-prioritization frequency | How often priorities change between cycles | <1 change/cycle |
| Feature delivery accuracy | % of prioritized features delivered on time | >80% |
| Post-launch impact validation | % of features that achieve expected impact | >60% |

## Templates

### Stakeholder Input Template
```
Stakeholder: {name}
Role: {role}
Date: {date}

Top 3 Priority Features (from your perspective):
1. {feature} — {rationale}
2. {feature} — {rationale}
3. {feature} — {rationale}

Key Concerns:
- {concern}
- {concern}

Data/Evidence I Can Provide:
- {data point}
- {data point}

Questions or Assumptions:
- {question}
- {assumption}
```

### Prioritization Decision Record
```
Date: {date}
Facilitator: {name}
Approver: {name}
Participants: {names}

Framework Used: {RICE / Kano / MoSCoW / Weighted / Opportunity}

Decisions:
| Feature | Score | Priority Bucket | Rationale |
|---------|-------|-----------------|-----------|
| {feature} | {score} | {P0-P3} | {key reason} |

Disputed Items:
| Feature | Disagreement | Resolution |
|---------|-------------|------------|
| {feature} | {disagreement} | {resolution} |

Trade-offs Made:
1. {trade-off statement}
2. {trade-off statement}

Explicit Won't Dos:
| Feature | Rationale | Next Review |
|---------|-----------|-------------|
| {feature} | {rationale} | {date} |

Next Priority Review: {date}
```

### Retrospective Template (Prioritization Process)
```
Prioritization Cycle: {Q# YYYY}

What worked well:
- {aspect}
- {aspect}

What could improve:
- {aspect} — {suggestion}
- {aspect} — {suggestion}

Framework effectiveness:
- Did the framework help make the right decisions? {Yes/No/Maybe}
- What was missing from the framework? {gaps}
- Were scores accurate? {if tracked, compare to post-launch impact}

Stakeholder engagement:
- Participation rate: {X%}
- Most engaged stakeholders: {names}
- Least engaged: {names} — {how to improve}

Improvements for next cycle:
1. {improvement}
2. {improvement}
3. {improvement}
```
