---
name: management-risk-management
description: >
  Use this skill when the user says 'risk management', 'risk register', 'risk assessment', 'risk mitigation', 'project risk', 'technical risk', 'risk matrix', 'risk analysis', 'probability impact', 'risk log'. Identify, assess, and plan responses for project and technical risks. Do NOT use for: security vulnerability scanning or compliance audits.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, risk, phase-7]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Management Risk Management

## Purpose
Identify, assess, and mitigate project and technical risks through a structured risk register. Calculates risk scores as probability times impact, assigns named owners, and tracks mitigation through regular review during sprint retrospectives.

Risk management is not about eliminating risk entirely — that is neither possible nor desirable. It is about making informed decisions under uncertainty by surfacing risks before they become emergencies. This skill provides a systematic five-step process: identify risks across all categories, categorize them for trend analysis, assess each with a probability and impact score, plan a specific response strategy for each, and review regularly. Every risk in the register has a score, a responsible owner, and a clear response plan. An empty risk register is not a sign of a low-risk project — it is a sign that risks have not been surfaced yet.

The maturity model for risk management is visible in the register itself. A startup may have three items tracked in someone's head. A mature team maintains 10-20 documented risks with scores, owners, and response plans reviewed every sprint. The goal is not to reach zero risks — that is impossible. The goal is to have every significant risk visible, quantified, and managed so the team makes conscious tradeoffs rather than being surprised by avoidable problems.

## Agent Protocol

### Trigger
"risk management", "risk register", "risk assessment", "risk mitigation", "project risk", "technical risk", "risk matrix", "risk analysis", "probability impact", "risk log"

### Input Context
- Project scope document, goals, and key deliverables with defined success criteria
- Technology stack with specific versions and known limitations
- Third-party dependencies with their current status and support timelines
- Team composition: headcount, roles, skill distribution, availability calendar
- External dependencies: vendor APIs, partner integrations, outsourced work packages
- Project timeline with milestones, critical path, and buffer allocations
- Regulatory or compliance requirements with deadlines

### Output Artifact
- Risk register as a table: ID, category, description, probability (1-5), impact (1-5), risk score (PxI), priority level (high/medium/low), response strategy, owner, status, target close date
- Risk matrix visualization showing each risk's position on the 5x5 probability-impact grid
- Response plan per risk with specific, actionable mitigation steps

### Response Format
- Risk register table sorted by risk score descending
- Color-coded priority levels using visual indicators (RED High, YELLOW Medium, GREEN Low)
- Response plan as a bullet list per risk with numbered action steps and trigger conditions
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
Risk register populated with at least 5-10 identified risks across multiple categories. Every risk has a calculated PxI score, a response strategy, and an assigned owner. The review cadence is defined. At least one contingency plan is pre-defined for a high-score risk.

### Max Response Length
2500 tokens

## Framework and Methodology

### Risk Management Framework Comparison

| Framework | Focus | Structure | Best For | Maturity |
|-----------|-------|-----------|----------|----------|
| PMBOK Risk Management | Project risks | 6 processes (plan, identify, analyze, respond, monitor) | Traditional project management | High |
| ISO 31000 | Enterprise risk | Principles, framework, process | Organization-wide risk management | Very high |
| FAIR | Cyber risk quantification | Monte Carlo simulation, loss magnitude | Security risk quantification | Quantitative |
| OCTAVE | Information security | Asset-driven, organizational | Security risk assessment | Medium |
| NIST RMF | Risk management framework | 7 steps (prepare, categorize, select, implement, assess, authorize, monitor) | US government, compliance | Very high |
| Simple PxI (this skill) | Project + technical risks | Probability x Impact matrix | Agile teams, startups | Low - Medium |

### Decision Tree: Risk Response Strategy

```
What is the risk score (P x I)?
  ├── 15-25 (High)
  │   ├── Can the risk be eliminated by changing the plan?
  │   │   ├── Yes → Avoid (change approach, remove risky feature)
  │   │   └── No → Can we reduce probability or impact?
  │   │       ├── Yes → Mitigate (add redundancy, increase testing)
  │   │       └── No → Can someone else handle it?
  │   │           ├── Yes → Transfer (insurance, SLA-backed vendor)
  │   │           └── No → Contingency (pre-define Plan B, monitor trigger)
  ├── 6-14 (Medium)
  │   ├── Does mitigation cost less than expected impact?
  │   │   ├── Yes → Mitigate
  │   │   └── No → Accept + monitor at sprint retro
  └── 1-5 (Low)
      └── Accept (log and review quarterly)
```

### Risk Categories and Examples

| Category | Description | Examples |
|----------|-------------|----------|
| Technical | Technology, architecture, implementation | Tech debt slowing velocity, performance degradation, security vulns |
| Schedule | Timeline, milestones, delivery | Aggressive estimates, dependency delays, scope creep |
| Resource | People, budget, tools | Team member unavailability, skill gaps, key person dependency |
| External | Vendors, market, regulations | API deprecation, framework abandonment, new regulations |
| Operational | Process, deployment, incidents | Deployment failures, missing monitoring, backup gaps |
| Strategic | Direction, alignment, competition | Wrong prioritization, competitor moves, market shifts |

### Risk Maturity Model

| Level | Stage | Characteristics | Register Size |
|-------|-------|-----------------|---------------|
| 1 | Ad-hoc | Risks in someone's head, reactive | 0-3 undocumented |
| 2 | Aware | Basic register exists, not regularly reviewed | 3-7 documented |
| 3 | Managed | Register reviewed at sprint retro, owners assigned | 8-15 tracked |
| 4 | Measured | Risk burndown tracked, trends analyzed, quantified | 10-20 active |
| 5 | Optimizing | Predictive risk modeling, automated triggers, continuous monitoring | 15-25 active |

## Workflow

### Step 1: Identify Risks

Conduct structured brainstorming across all risk categories. Technical: tech debt accumulation slowing feature velocity, performance degradation under load, security vulnerabilities in dependencies, architectural decisions that limit future options, data loss scenarios, single points of failure in the system. Schedule: aggressive timeline estimates, external dependency delays, resource availability gaps at critical milestones, scope creep from unclear requirements, cascading delays on the critical path. Resource: team member unavailability (vacation, sick leave, turnover), key person dependency (only one person knows X), skill gaps for new technology adoption, burnout risk from sustained high velocity. External: vendor API deprecation or breaking changes, ecosystem shifts (framework deprecation, library abandonment), market changes that reduce demand, partner delays or failures. Compliance: new regulations affecting data handling, audit findings with remediation deadlines, privacy requirements changes, accessibility mandates. Operational: deployment failures, missing monitoring, insufficient incident response runbooks, backup and restore gaps.

### Step 2: Categorize

Tag each risk with exactly one primary category for consistent filtering and trend analysis. Standard categories: technical-debt, third-party-dependency, team-capacity, timeline-pressure, scope-creep, security-vulnerability, compliance, operational, market-risk. Consistent categorization enables the team to run reports like "show all third-party risks" or "what is the total risk score for security items."

### Step 3: Assess

For each risk, assign two numerical values. Probability (P): 1 = rare (<10% chance), 2 = unlikely (10-25%), 3 = possible (25-50%), 4 = likely (50-90%), 5 = almost certain (>90%). Impact (I): 1 = negligible (minor inconvenience, no schedule effect), 2 = minor (small delay <1 week, easily recoverable), 3 = moderate (1-2 week delay, budget impact), 4 = major (2-4 week delay, feature may be cut), 5 = critical (project-threatening, >1 month delay, significant cost overrun). Calculate risk score = P x I (range 1-25). Map to priority: High = 15-25 (immediate response plan and active monitoring), Medium = 6-14 (assign owner, monitor at sprint retro), Low = 1-5 (log and accept, review quarterly).

### Step 4: Plan Response

For every risk, select and document one of five response strategies. Avoid: change the project plan to eliminate the risk entirely — remove the risky feature, use a different technology, reschedule to avoid the conflict. Mitigate: take action to reduce the probability or impact — add redundancy, increase test coverage, implement feature flags for quick rollback, cross-train team members to reduce key person risk. Transfer: shift the risk to a third party who is better equipped to handle it — purchase insurance, use an SLA-backed vendor, outsource a high-risk component, use a managed service instead of self-hosting. Accept: document the risk and its score, monitor it regularly, but take no active mitigation — appropriate for low-score risks or risks where mitigation costs more than the expected impact. Contingency: pre-define a Plan B that triggers automatically if the risk materializes — rollback plan, fallback vendor, manual override process, incident response runbook.

### Step 5: Monitor and Review

Review the entire risk register at every sprint retrospective. Each risk owner reports the current status: increased (probability or impact has gone up), stable (no change), decreased (probability or impact has gone down), materialized (the risk has happened — execute contingency), or closed (risk is no longer relevant). Add new risks as they are discovered during the sprint. Move materialized risks into contingency execution mode with tracking. Archive closed risks with a closure note explaining why they are no longer relevant. Track the risk burndown: the sum of all risk scores over time should trend downward as mitigation actions take effect.

### Step 6: Perform Quantitative Risk Analysis

For high-score risks, perform quantitative analysis: estimate the expected monetary value (probability x estimated cost impact), run Monte Carlo simulation for schedule impact (use 3-point estimates for task durations), calculate contingency reserves (budget buffer based on risk exposure), determine the critical path risk (which risks affect the critical path most). Document confidence levels for completion dates. Update quantitative analysis after each risk review.

### Step 7: Manage Opportunities (Positive Risks)

Not all risks are threats. An opportunity is a risk with positive impact. Identify opportunities alongside threats: early vendor delivery, faster-than-expected adoption, technology breakthrough, team productivity gains. For each opportunity: assign probability and positive impact score, plan response — exploit (make it happen), enhance (increase probability or impact), share (partner to capture upside), or accept (benefit if it occurs). Track opportunities in the same register as threats but with positive impact scores.

### Step 8: Communicate Risks to Stakeholders

Tailor risk communication to audience: executives need top 5 risks with business impact and mitigation status (one-page summary), project team needs full register with action items and owners, stakeholders need risk profile changes since last update. Use RAG status for quick visualization. Highlight new risks, closed risks, and score changes. Escalate critical risks (score 15+) immediately, not at next review.

### Step 9: Integrate Risk Management with Planning

At sprint planning: review top 5 risks and adjust sprint scope if needed, allocate capacity for risk mitigation tasks, ensure risk owners are assigned to sprint. At quarterly planning: reassess all risks against new scope, adjust risk scores based on progress, add new risks identified in the quarter, update contingency plans. At project milestones: conduct formal risk reassessment with stakeholders, validate risk response effectiveness, close risks that are no longer relevant.

### Step 10: Conduct Risk Retrospective

After project completion or major milestone: review the entire risk management process, evaluate accuracy of probability and impact estimates, identify risks that were missed (should have been identified), assess effectiveness of response strategies, document lessons learned for future projects. Update risk identification checklist based on lessons learned.

## Models

### Risk Score Matrix (5 x 5)
| Probability Down Arrow | Impact 1 | Impact 2 | Impact 3 | Impact 4 | Impact 5 |
|---|---|---|---|---|---|
| **5 (Almost Certain)** | 5 Low | 10 Medium | 15 High | 20 High | 25 High |
| **4 (Likely)** | 4 Low | 8 Medium | 12 Medium | 16 High | 20 High |
| **3 (Possible)** | 3 Low | 6 Medium | 9 Medium | 12 Medium | 15 High |
| **2 (Unlikely)** | 2 Low | 4 Low | 6 Medium | 8 Medium | 10 Medium |
| **1 (Rare)** | 1 Low | 2 Low | 3 Low | 4 Low | 5 Low |

### Response Strategy Selection
| Condition | Recommended Strategy |
|---|---|
| Risk can be eliminated by changing the plan | Avoid |
| Probability or impact can be reduced | Mitigate |
| A third party can handle it better | Transfer |
| Low score, mitigation costs more than impact | Accept |
| Can't reduce but can prepare | Contingency |

### Risk Burndown Tracking
| Metric | Formula | Target |
|--------|---------|--------|
| Total Risk Exposure | Sum of (P x I) for all risks | Decreasing trend |
| Risk Density | Active risks / total risks tracked | < 30% high risks |
| Mitigation Velocity | Closed risks per sprint | > 2 per sprint |
| Time to Escalation | Days from risk identified to score > 10 | < 7 days |
| Risk Identification Lag | Days from risk emerging to register entry | < 3 days |

### Risk Appetite vs Tolerance

| Concept | Definition | Example |
|---------|------------|---------|
| Risk Appetite | Amount of risk the organization is willing to accept | "We accept moderate schedule risk for innovation features" |
| Risk Tolerance | Specific acceptable variation from targets | "Schedule delay up to 2 weeks is acceptable; more requires escalation" |
| Risk Threshold | Point at which risk requires action | "Any risk scoring > 15 triggers immediate mitigation plan" |

## Common Pitfalls

### Pitfall 1: Empty Risk Register
A completely clean risk register is not a sign of low risk — it is a sign that risks have not been surfaced. Every project has risks. An empty register means no one is looking.

### Pitfall 2: Ignoring the Register After Creation
Creating a risk register at project start and never updating it. Fix: review at every sprint retro. Risk status must be updated at least monthly.

### Pitfall 3: Scoring Without Action
Assigning high scores but no response plan. Fix: every risk with a score > 6 must have a named response strategy and owner.

### Pitfall 4: One-Size-Fits-All Scoring
Using the same probability/impact criteria for different risk types. Fix: tailor impact criteria to each category (schedule impact = delay, technical impact = performance degradation, financial impact = cost overrun).

### Pitfall 5: Ignoring Low-Probability High-Impact Risks
Risks with P=1, I=5 (score 5, low) can still destroy a project. Fix: classify risks by both score and impact level. High-impact risks need contingency plans regardless of score.

### Pitfall 6: No Opportunity Management
Only tracking threats and missing positive risks. Fix: explicitly ask "what could go better than expected?" during identification.

### Pitfall 7: Risk Owner Without Authority
Assigning ownership without the authority to implement mitigation. Fix: risk owners must have the resources and decision rights to act.

### Pitfall 8: Vague Mitigation Plans
"Monitor the situation" is not a mitigation plan. Fix: every mitigation must have specific, actionable steps with deadlines.

### Pitfall 9: Overconfidence in Estimates
Treating P and I estimates as precise when they are guesses. Fix: use ranges instead of single values. Document confidence level for each estimate.

### Pitfall 10: Not Closing Risks
Risks that are no longer relevant remain in the register as noise. Fix: review and close risks that have passed their window of relevance.

## Best Practices

- **Score every risk with P and I** — No unquantified risks in the register. Every entry must have a numerical probability and impact score.
- **Assign exactly one owner per risk** — Shared ownership reliably results in nobody feeling accountable.
- **Review the register every sprint** — The risk landscape changes weekly. A risk not updated in over a month is being ignored.
- **Pre-define contingency plans before they are needed** — Plan B should be designed before the risk materializes.
- **Include positive risks (opportunities)** — Not all risks are threats. An opportunity is a risk with a positive impact.
- **Archive risks, never delete them** — Closed risks remain for audit trail and pattern recognition.
- **Make the top 5 risks visible** — Display on a team-visible board. Hidden risks are ignored risks.
- **Use ranges for probability and impact, not point estimates** — Express uncertainty explicitly.
- **Tailor risk communication to the audience** — Executives need top 5, teams need full register.
- **Escalate critical risks immediately, not at next review** — Bad news does not improve with age.

## Compared With

| Approach | Strengths | Weaknesses |
|----------|-----------|------------|
| Simple P x I Matrix (this skill) | Fast, intuitive, low overhead | Subjective, no quantification |
| Expected Monetary Value | Financial quantification, supports ROI | Requires cost estimates for all impacts |
| Monte Carlo Simulation | Handles uncertainty, provides confidence intervals | Complex, requires tools |
| Decision Tree Analysis | Explicit choices, visual | Limited to sequential decisions |
| Scenario Analysis | Captures extreme outcomes | Few discrete scenarios |
| Bow Tie Analysis | Visual cause-consequence | Complex for multiple risks |

## Templates and Tools

### Risk Register Template
| ID | Category | Description | P | I | Score | Priority | Response | Owner | Status |
|----|----------|-------------|---|---|--------|----------|----------|-------|--------|
| R-001 | Technical | Database migration may cause data loss | 2 | 5 | 10 | Medium | Mitigate: test migration on full copy | DB lead | Active |
| R-002 | Schedule | Vendor API delivery may slip 2 weeks | 4 | 3 | 12 | Medium | Contingency: mock API ready by week 4 | PM | Active |

### Risk Report Template (Executive)
```
## Top 5 Risks — {project} — {date}

Risk Score Trend: {up/stable/down} — Total Exposure: {n}

1. {risk} — Score {n} — {P}x{I} — {status} — {mitigation status}
2. {risk} — Score {n} — {P}x{I} — {status} — {mitigation status}
3. {risk} — Score {n} — {P}x{I} — {status} — {mitigation status}
4. {risk} — Score {n} — {P}x{I} — {status} — {mitigation status}
5. {risk} — Score {n} — {P}x{I} — {status} — {mitigation status}

New this period: {n}  |  Closed: {n}  |  Escalated: {n}
```

### Contingency Plan Template
```
Risk: {name}
Trigger Condition: {specific, measurable event that triggers Plan B}
Trigger Threshold: {warning level before trigger activates}
Plan B Steps:
  1. {action} — Owner: {name} — Timeline: {deadline}
  2. {action} — Owner: {name} — Timeline: {deadline}
Activation Authority: {who decides to execute contingency}
Success Criteria: {how to confirm Plan B worked}
Fallback from Fallback: {what if Plan B also fails}
```

## Case Studies

### Case Study 1: SaaS Platform — Dependency Risk
A SaaS team building on a third-party API identified the risk "Vendor API deprecation with 30-day notice" scoring P=3, I=4 (score 12). They mitigated by building an abstraction layer that could swap to a second provider. When the vendor announced deprecation with only 14 days notice, the team switched providers in 10 days with no customer impact. Cost of mitigation: 2 weeks engineering. Cost avoided: 3 months of rework + customer churn.

### Case Study 2: Fintech — Compliance Risk
A fintech startup ignored regulatory risk until mid-project, when new KYC requirements added 6 weeks of work and delayed launch. Post-mortem: the risk was identifiable from the start (P=4, I=5, score 20) but was not tracked because no formal risk register existed. Fix: implemented risk register with mandatory regulatory review at project initiation.

## Rules

- **Score every risk with P and I** — No unquantified risks in the register
- **Assign exactly one owner per risk** — Shared ownership = no accountability
- **Review the register every sprint** — A risk not updated in a month is being ignored
- **Pre-define contingency plans before they are needed** — Trigger conditions must be explicit
- **Include positive risks (opportunities)** — Opportunities get response plans too
- **Archive risks, never delete them** — Closure notes needed for audit trail
- **Make the top 5 risks visible** — Dashboard or team board, updated after each review
- **Tailor communication to audience** — Executives get top 5, teams get full register
- **Escalate critical risks immediately** — Do not wait for the next review
- **Every risk must have a response strategy** — High score without response is a gap
- **Impact criteria must be defined per category** — Not all impacts are schedule delays
- **Mitigation plans must be specific and actionable** — "Monitor" is not a plan
- **Risk owners must have authority to act** — Ownership without authority is hollow
- **Use ranges not point estimates for high uncertainty** — Express confidence level
- **Close risks that are no longer relevant** — Don't let the register accumulate debris

## Risk Taxonomy — Common Categories with Examples

| Category | Example | Typical P | Typical I | Response |
|----------|---------|-----------|-----------|----------|
| Technical | Core library deprecation EOL next quarter | High | High | Mitigate: upgrade before EOL |
| Technical | CI pipeline outage during release | Medium | High | Mitigate: redundant CI runners |
| Schedule | Key dependency delayed by 2 sprints | Medium | High | Mitigate: buffer allocation |
| Resource | Team member departure mid-project | Low | Critical | Accept: document knowledge |
| Budget | Cloud cost overrun from unexpected usage | Medium | Medium | Mitigate: cost alerts + budget |
| Requirements | Scope creep from ambiguous requirements | High | Medium | Avoid: strict definition of ready |
| External | Regulatory change affecting data handling | Low | Critical | Transfer: legal review + insurance |
| External | Vendor goes out of business | Low | High | Mitigate: vendor diversification |
| Organizational | Reorg changes team composition | Medium | Medium | Accept: knowledge transfer plan |
| Security | Data breach from unpatched vulnerability | Medium | Critical | Mitigate: patch SLA + WAF |

## Risk Assessment Matrix (5×5)

| Impact ↓ \ Probability → | 1 Rare | 2 Unlikely | 3 Possible | 4 Likely | 5 Almost Certain |
|--------------------------|--------|------------|------------|----------|------------------|
| 5 Critical | Medium | High | High | Critical | Critical |
| 4 Major | Medium | Medium | High | High | Critical |
| 3 Moderate | Low | Medium | Medium | High | High |
| 2 Minor | Low | Low | Medium | Medium | High |
| 1 Negligible | Low | Low | Low | Medium | Medium |

### Response Strategy by Score

| Score | Label | Required Action | Review Cadence | Authority |
|-------|-------|----------------|----------------|-----------|
| 1-4 | Low | Accept, monitor | Quarterly | Team lead |
| 5-9 | Medium | Active mitigation plan | Monthly | Team lead |
| 10-14 | High | Detailed response plan | Bi-weekly | Program manager |
| 15-19 | Critical | Escalated to steering | Weekly | Steering committee |
| 20-25 | Unacceptable | Immediate escalation | Daily | Executive sponsor |

## Response Planning Template

```
Risk ID: R-{nnn}
Date Identified: {date}
Identified By: {name}

Description:
  {Clear, specific statement of the risk}

Category:
  {Technical | Schedule | Resource | Budget | Requirements | External | Organizational | Security}

Causes:
  - {Root cause or trigger condition 1}
  - {Root cause or trigger condition 2}

Consequences:
  - {Negative outcome if risk occurs}
  - {Secondary effects}

Probability: {1-5 | Low to Almost Certain}
Impact: {1-5 | Negligible to Critical}
Risk Score: P × I = {score}

Response Strategy: {Avoid | Mitigate | Transfer | Accept}
Response Plan:
  - {Action 1 with owner}
  - {Action 2 with owner}
  - {Action 3 with owner}

Contingency Plan (if risk materializes):
  - {Step 1 with owner}
  - {Step 2 with owner}

Trigger Condition:
  {What event indicates the risk has occurred and contingency should activate}

Residual Risk Score (after mitigation): P × I = {score}

Owner: {name}
Status: {Open | Mitigating | Monitoring | Closed | Realized}
Review Date: {date}
```

## Risk Response Strategies in Detail

### Avoid
```
Eliminate the risk by changing the plan.
Example: If a third-party API is unstable, avoid by building an in-house alternative.
Trade-off: May cost more time/money upfront.
When to use: When probability or impact is too high to accept.
```

### Mitigate
```
Reduce probability or impact.
Example: If data loss risk during migration, mitigate by running parallel systems.
Probability reduction: Add validation, testing, redundancy.
Impact reduction: Limit blast radius, prepare rollback.
When to use: When probability and/or impact can be meaningfully reduced.
```

### Transfer
```
Shift risk to another party.
Example: Cyber insurance for security incidents. Fixed-price contract for vendor delivery.
Does NOT eliminate the risk — transfers financial/consequence impact.
When to use: When another party can better manage the risk.
```

### Accept
```
Acknowledge the risk and proceed without mitigation.
Passive acceptance: Monitor without action.
Active acceptance: Set aside contingency budget/time.
When to use: When cost of mitigation exceeds expected impact, or when risk is low.
```

## Positive Risk (Opportunity) Response Strategies

| Strategy | Description | Example |
|----------|-------------|---------|
| Exploit | Make it happen | Accelerate delivery if early customer interest is high |
| Enhance | Increase probability/impact | Add more resources to capture unexpected market demand |
| Share | Partner to capture opportunity | Co-invest with another team for shared benefit |
| Accept | Take advantage if it occurs | If regulatory changes favor us, fast-track expansion |

## Quantitative Risk Analysis — Expected Monetary Value (EMV)

```
EMV = P(risk) × Impact($) + P(opportunity) × Impact($)

Example:
  Risk: API vendor price increase of $50k with 40% probability
    EMV (risk) = 0.4 × (-$50k) = -$20k
  Opportunity: Early vendor discount of $20k with 30% probability  
    EMV (opportunity) = 0.3 × $20k = $6k
  Net EMV = -$20k + $6k = -$14k

Application:
  - Use EMV for budget contingency calculation
  - Sum EMV across all identified risks for total contingency
  - Confidence level: P50, P80, P90 for different risk tolerances
```

## Risk Burndown Chart Template

```
Sprint | Risk Count | Total Score | Critical Count | Mitigated This Sprint | New This Sprint
Sprint 1 | 15 | 62 | 3 | — | —
Sprint 2 | 14 | 54 | 2 | 2 | 1
Sprint 3 | 12 | 41 | 1 | 3 | 1
Sprint 4 | 10 | 35 | 1 | 2 | 0
Sprint 5 | 9 | 28 | 0 | 1 | 0

Goal: Trend toward 0 on total score and critical count by delivery date.
```

## Risk Review Meeting Template

```
Meeting: Risk Review #{n}
Date: {date} | Duration: 30 min

Agenda:
1. New risks since last review (5 min)
   - Present new risks, assign preliminary score and owner
2. Existing risks status update (10 min)
   - Walk through open risks; review mitigation progress
3. Risk score changes (5 min)
   - Update P and I as conditions change
4. Risk burndown review (5 min)
   - Dashboard: trend lines for total score, critical count
5. Top 3 risks deep dive (5 min)
   - Focused discussion on highest-scored active risks
6. Action items and owners (5 min)

Decision log:
  - {n} risks accepted
  - {n} risks closed
  - {n} new actions assigned
```

## References
  - references/mitigation-strategies.md — Mitigation Strategies
  - references/risk-assessment-matrix.md — Risk Assessment Matrix
  - references/risk-management-advanced.md — Risk Management Advanced
  - references/risk-management-framework.md — Risk Management Framework
  - references/risk-management-fundamentals.md — Risk Management Fundamentals
  - references/risk-monitoring.md — Risk Monitoring
  - references/risk-register.md — Risk Register Template
  - references/risk-reporting.md — Risk Reporting

## Handoff
sprint-retro (the risk register is reviewed at every sprint retro), create-roadmap (risk scores inform timeline adjustments and buffer allocation on the roadmap).
