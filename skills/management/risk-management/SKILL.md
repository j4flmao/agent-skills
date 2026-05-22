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
- Team composition: headcount, roles, skill distribution, availability calendar, known leaves
- External dependencies: vendor APIs, partner integrations, outsourced work packages
- Project timeline with milestones, critical path, and buffer allocations
- Regulatory or compliance requirements with deadlines (GDPR, SOC2, HIPAA, PCI-DSS)
- Previous risk register for delta comparison and trend analysis

### Output Artifact
- Risk register as a table: ID, category, description, probability (1-5), impact (1-5), risk score (P×I), priority level (high/medium/low), response strategy, owner name, current status, target close date
- Risk matrix visualization showing each risk's position on the 5x5 probability-impact grid
- Response plan per risk with specific, actionable mitigation steps

### Response Format
- Risk register table sorted by risk score descending so the highest-priority risks appear first
- Color-coded priority levels using visual indicators (🔴 High, 🟡 Medium, 🟢 Low)
- Response plan as a bullet list per risk with numbered action steps and trigger conditions
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Risk register populated with at least 5-10 identified risks across multiple categories. Every risk has a calculated P×I score, a response strategy, and an assigned owner. The review cadence is defined. At least one contingency plan is pre-defined for a high-score risk.

### Max Response Length
2500 tokens

## Workflow

1. **Identify risks** — Conduct structured brainstorming across all risk categories. Technical: tech debt accumulation slowing feature velocity, performance degradation under load, security vulnerabilities in dependencies, architectural decisions that limit future options, data loss scenarios, single points of failure in the system. Schedule: aggressive timeline estimates, external dependency delays, resource availability gaps at critical milestones, scope creep from unclear requirements, cascading delays on the critical path. Resource: team member unavailability (vacation, sick leave, turnover), key person dependency (only one person knows X), skill gaps for new technology adoption, burnout risk from sustained high velocity. External: vendor API deprecation or breaking changes, ecosystem shifts (framework deprecation, library abandonment), market changes that reduce demand, partner delays or failures. Compliance: new regulations affecting data handling, audit findings with remediation deadlines, privacy requirements changes, accessibility mandates. Operational: deployment failures, missing monitoring, insufficient incident response runbooks, backup and restore gaps.

2. **Categorize** — Tag each risk with exactly one primary category for consistent filtering and trend analysis. Standard categories: technical-debt, third-party-dependency, team-capacity, timeline-pressure, scope-creep, security-vulnerability, compliance, operational, market-risk. Consistent categorization enables the team to run reports like "show all third-party risks" or "what is the total risk score for security items."

3. **Assess** — For each risk, assign two numerical values. Probability (P): 1 = rare (<10% chance), 2 = unlikely (10-25%), 3 = possible (25-50%), 4 = likely (50-90%), 5 = almost certain (>90%). Impact (I): 1 = negligible (minor inconvenience, no schedule effect), 2 = minor (small delay <1 week, easily recoverable), 3 = moderate (1-2 week delay, budget impact), 4 = major (2-4 week delay, feature may be cut), 5 = critical (project-threatening, >1 month delay, significant cost overrun). Calculate risk score = P × I (range 1-25). Map to priority: High = 15-25 (immediate response plan and active monitoring), Medium = 6-14 (assign owner, monitor at sprint retro), Low = 1-5 (log and accept, review quarterly).

4. **Plan response** — For every risk, select and document one of five response strategies. Avoid: change the project plan to eliminate the risk entirely — remove the risky feature, use a different technology, reschedule to avoid the conflict. Mitigate: take action to reduce the probability or impact — add redundancy, increase test coverage, implement feature flags for quick rollback, cross-train team members to reduce key person risk. Transfer: shift the risk to a third party who is better equipped to handle it — purchase insurance, use an SLA-backed vendor, outsource a high-risk component, use a managed service instead of self-hosting. Accept: document the risk and its score, monitor it regularly, but take no active mitigation — appropriate for low-score risks or risks where mitigation costs more than the expected impact. Contingency: pre-define a Plan B that triggers automatically if the risk materializes — rollback plan, fallback vendor, manual override process, incident response runbook.

5. **Monitor and review** — Review the entire risk register at every sprint retrospective. Each risk owner reports the current status: increased (probability or impact has gone up), stable (no change), decreased (probability or impact has gone down), materialized (the risk has happened — execute contingency), or closed (risk is no longer relevant). Add new risks as they are discovered during the sprint. Move materialized risks into contingency execution mode with tracking. Archive closed risks with a closure note explaining why they are no longer relevant. Track the risk burndown: the sum of all risk scores over time should trend downward as mitigation actions take effect.

## Models

### Risk Score Matrix (5 × 5)
| Probability ↓ | Impact → 1 | Impact 2 | Impact 3 | Impact 4 | Impact 5 |
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
| We can't reduce it, but we can prepare for it | Contingency |

## Rules

- **Score every risk with P and I** — No unquantified risks in the register. Every entry must have a numerical probability and impact score. P × I = risk score. Always.
- **Assign exactly one owner per risk** — Shared ownership reliably results in nobody feeling accountable. One person is named as the risk owner and is responsible for monitoring and mitigation.
- **Review the register every sprint** — The risk landscape changes weekly as the project progresses. A risk whose status has not been updated in over a month is a risk being ignored.
- **Pre-define contingency plans before they are needed** — Plan B should be designed, documented, and agreed upon before the risk materializes. The trigger condition must be explicit and measurable.
- **Include positive risks (opportunities)** — Not all risks are threats. An opportunity is a risk with a positive impact: "What if the vendor delivers early?" or "What if demand exceeds our forecast?" These get a response plan too — a plan to capture the upside.
- **Archive risks, never delete them** — Closed risks remain in the register with a closure note and date for the audit trail. Historical risks are valuable for pattern recognition and future risk identification.
- **Make the top 5 risks visible** — The five highest-scoring risks should be displayed on a team-visible board or dashboard. Hidden risks are ignored risks. Visibility drives accountability.

## Related Skills

- **sprint-retro** — Regular risk register review as part of the retro agenda
- **create-roadmap** — Use risk assessments to adjust timeline buffers and milestone planning
- **create-tech-spec** — Identify and document technical risks in architecture specifications
- **security-auditor** — Integrate security vulnerability risks into the risk register

## References

- [Risk Register Template](references/risk-register.md)

## Handoff
sprint-retro (the risk register is reviewed at every sprint retro), create-roadmap (risk scores inform timeline adjustments and buffer allocation on the roadmap).
