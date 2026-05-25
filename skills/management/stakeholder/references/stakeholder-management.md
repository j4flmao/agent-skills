# Stakeholder Management

## Stakeholder Identification

### Stakeholder Categories
```
Internal:
- Executive sponsor (funding, decisions, escalation)
- Project team (delivery, execution)
- Department heads (resource allocation, dependencies)
- Legal/Compliance (regulatory review, contracts)
- Finance (budget approval, cost tracking)

External:
- Clients/Customers (requirements, acceptance)
- Partners/Vendors (integration, dependencies)
- Regulators (compliance, reporting)
- End users (adoption, feedback)
- Industry bodies (standards, certification)
```

### Identification Techniques
```
Brainstorming: Team workshop to list all affected parties
Org chart analysis: Map stakeholders by department and level
Supplier mapping: Document upstream and downstream dependencies
Process mapping: Walk end-to-end process, note each touchpoint
Historical review: Past projects with similar stakeholders
```

### Stakeholder Register Template
```
| ID | Name | Role | Organization | Category | Contact | Notes |
|----|------|------|-------------|----------|---------|-------|
| S01 | Alice Chen | Sponsor | Executive | Internal | alice@co.com | Budget owner |
| S02 | Bob Smith | Client PM | Acme Corp | External | bob@acme.com | Primary contact |
| S03 | Carol Davis | Legal | Legal Team | Internal | carol@co.com | Contract review |
```

## Power/Interest Grid

### Quadrant Strategies

**High Power + High Interest — Manage Closely**
```
Strategy: Deep engagement, frequent communication, involve in decisions
Cadence: Weekly one-on-one, monthly steering committee
Format: Detailed updates, decision involvement
Danger: They can block the project if neglected
Examples: Executive sponsor, key client, regulatory body
```

**High Power + Low Interest — Keep Satisfied**
```
Strategy: Outcome-focused updates, proactive issue surfacing
Cadence: Monthly executive summary, milestone reviews
Format: One-page summary, dashboard link
Danger: May become blockers if they lose interest
Examples: C-suite not directly involved, board members
```

**Low Power + High Interest — Keep Informed**
```
Strategy: Regular updates with adequate context
Cadence: Weekly newsletter, bi-weekly demos
Format: Group email, team chat, show and tell
Danger: May escalate concerns to higher-power stakeholders
Examples: End users, SMEs, support teams
```

**Low Power + Low Interest — Monitor**
```
Strategy: Minimal engagement, periodic check-ins
Cadence: Quarterly newsletter, ad-hoc as needed
Format: Brief email update
Danger: Can emerge as unexpected blockers
Examples: General staff, peripheral vendors
```

### Power/Influence Scoring
```
Score each stakeholder 1-5 on:
Power: Ability to make decisions, allocate resources, enforce compliance
Interest: Level of concern about project outcomes
Influence: Ability to shape others' opinions

Composite score = (Power + Interest + Influence) / 3
Priority mapping:
  > 4.0: Manage Closely
  3.0 - 4.0: Keep Satisfied or Keep Informed
  < 3.0: Monitor
```

## Engagement Strategies

### Engagement Level Tracking
```
| Stakeholder | Current | Desired | Gap | Approach |
|-------------|---------|---------|-----|----------|
| Alice Chen | Supportive | Champion | +1 | Provide visibility, involve in wins |
| Bob Smith | Neutral | Supportive | +1 | Build relationship, address concerns |
| Carol Davis | Resistant | Neutral | +2 | One-on-one, understand objections |
| Dave Lee | Unaware | Informed | +1 | Onboarding session, regular updates |
```

### Engagement Levels
```
Unaware → Informed → Neutral → Supportive → Champion
Unaware: No knowledge of project
Informed: Aware but not actively engaged
Neutral: Neither supports nor opposes
Supportive: Actively helps project succeed
Champion: Promotes project to others
```

### Moving Resistant Stakeholders
```
1. Understand resistance source (fear of change, resource loss, past experience)
2. Address concerns directly with data and empathy
3. Find common ground and shared objectives
4. Enlist allies who have influence with them
5. Provide early wins that demonstrate value
6. Escalate only if resistance blocks critical decisions
```

## Communication Plans

### Communication Matrix Template
```
| Stakeholder | Channel | Cadence | Content | Owner |
|-------------|---------|---------|---------|-------|
| Executive Sponsor | One-on-one meeting | Weekly | Decisions, risks, metrics | PM |
| Client Team | Status meeting | Weekly | Progress, blockers, demos | PM |
| Steering Committee | Formal meeting | Monthly | Milestones, budget, risks | Sponsor |
| Dev Team | Standup | Daily | Blockers, progress | Tech Lead |
| End Users | Newsletter | Bi-weekly | Features, timeline | Product |
| All Stakeholders | Email digest | Monthly | Highlights, milestones | PM |
```

### Communication Channel Selection
```
| Channel | Best For | Response Expectation |
|---------|----------|---------------------|
| In-person meeting | Decisions, sensitive topics | Immediate |
| Video call | Alignment, demos | Immediate |
| Email | Records, formal communication | 24 hours |
| Slack/Teams | Quick updates, coordination | 1 hour |
| Dashboard | Real-time metrics | N/A |
| Document | Detailed specs, plans | On review |
```

## Status Reporting

### Status Report Template
```
# Project Status Report
## Period: {date} to {date}
## Overall Status: {Green/Amber/Red}

### Accomplishments This Period
- {measurable achievement 1}
- {measurable achievement 2}

### Next Period Priorities
1. {priority 1}
2. {priority 2}

### Key Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| On track | 100% | 85% | 🟡 |
| Velocity | 50 pts | 48 pts | 🟢 |
| Budget | $100K | $92K | 🟢 |

### Risks
| ID | Description | P×I | Status |
|----|-------------|-----|--------|
| R01 | API vendor delay | 16 | 🟡 Mitigating |

### Decisions Needed
1. {decision description} — Due: {date} — By: {name}
```

### RAG Status Definitions
```
Green: On track — all milestones met, no issues requiring attention
Amber: At risk — issue identified, mitigation plan in place
Red: Off track — issue with no resolution path, escalation needed

Rules:
- Never mark Amber or Red without explanation
- Every Amber must have a documented mitigation plan
- Every Red must have an owner and escalation contact
- Status color reflects current state, not trend
```

## Escalation Management

### Escalation Levels
```
Level 1 — PM Level:
  Trigger: Blocker >2 days, budget variance 5-10%
  Escalate to: Project Sponsor
  Response time: 24 hours
  Resolution: Resource adjustment, priority shift

Level 2 — Sponsor Level:
  Trigger: Milestone missed, scope dispute, budget >10%
  Escalate to: Executive
  Response time: 24 hours
  Resolution: Scope change, additional funding

Level 3 — Executive Level:
  Trigger: Strategic risk, budget >15%, P0 incident
  Escalate to: C-suite
  Response time: 4 hours
  Resolution: Strategic decision, project pause
```

### Escalation Format
```
Subject: ESCALATION: {issue} — {project}

What happened:
{factual description, no blame}

Impact:
{quantified business impact}

What has been done:
{actions already taken}

What is needed:
{specific decision or action required}

Decision needed by:
{date/time}
```
