# Stakeholder Mapping

## Overview
Stakeholder mapping identifies who has power over and interest in
your project, enabling targeted communication and engagement.
A stakeholder is anyone who can affect or is affected by the project:
internal (team, leadership) and external (clients, regulators, partners).

## Power/Influence Grid
Plot each stakeholder on a 2x2 grid based on power (ability to
influence project outcomes) and interest (level of concern).

| | Low Interest | High Interest |
|---|---|---|
| **High Power** | Keep Satisfied | Manage Closely |
| **Low Power** | Monitor | Keep Informed |

### Quadrant Strategies

**Manage Closely** (High Power + High Interest)
Can make or break the project. Engage frequently and deeply.
Involve in decisions, invite to reviews, schedule one-on-ones.
Examples: executive sponsor, key client, regulatory body.
Danger: if neglected, they block the project.

**Keep Satisfied** (High Power + Low Interest)
Have power but don't care about day-to-day details.
Engage periodically with focus on outcomes.
Send executive summaries, milestone updates.
Examples: C-suite not directly involved, board members.
Danger: lose interest, become blockers when decisions needed.

**Keep Informed** (Low Power + High Interest)
Care deeply but lack direct authority.
Provide regular updates: newsletters, group emails, demos.
Leverage interest for quality feedback and advocacy.
Examples: end users, subject matter experts, support teams.
Danger: if excluded, escalate to higher power stakeholders.

**Monitor** (Low Power + Low Interest)
Minimal engagement: quarterly newsletters only.
Check periodically that power/interest hasn't changed.
Examples: peripheral teams, industry observers.
Danger: can emerge as unexpected blockers.

## Salience Model (Mitchell, Agle, Wood)

### Three Attributes
Classify by: Power (ability to impose will), Legitimacy
(socially accepted relationship), Urgency (need for attention).

Stakeholders with 2+ attributes are highly salient.
Require active management.
Stakeholders with all 3 are definitive — prioritize above all.

Application: map each stakeholder's attribute count.
3 = definitive (manage extremely closely).
2 = expectant (active management).
1 = latent (monitor).

Attribute counts change over time — reassess monthly.

## RACI Matrix

### Format
| Decision | Sponsor | PM | Dev Lead | Team | QA | Ops |
|---|---|---|---|---|---|---|
| Scope change | A | R | C | C | I | I |
| Tech stack | I | C | R | C | C | C |
| Release date | A | R | C | C | I | C |
| Bug priority | I | A | R | C | R | I |
| Vendor selection | A | C | C | I | I | I |

R = Responsible (does the work, may be multiple).
A = Accountable (approves, exactly one per row).
C = Consulted (input before decision, two-way).
I = Informed (notified after, one-way).

### RACI Rules
Exactly one Accountable per decision.
Shared A means no accountability.
Too many Rs with no A → decisions stall.
Too many Cs → analysis paralysis and delays.
Empty rows or columns → missing coverage.
Review RACI at project phase transitions.

## Stakeholder Persona Template

### Format
Name: {individual or group}
Role: {relationship to project}
Power score: {1-5}
Interest score: {1-5}
Quadrant: {manage closely / keep satisfied / keep informed / monitor}
Communication preference: {format and frequency}
Key concerns: {budget, timeline, quality, compliance}
Resistance risk: {LOW / MED / HIGH} — {why they might resist}
Engagement approach: {1-on-1s, reports, demos, newsletters}

### Example
Name: Sarah Chen, VP Engineering
Role: Executive sponsor
Power: 5, Interest: 4
Quadrant: Manage closely
Communication: Biweekly 1:1 + monthly steering committee
Key concerns: Timeline, resource allocation, technical quality
Resistance risk: MED — concerned about team capacity
Engagement: Proactive risk updates, involve in major decisions, share wins

## Key Points
Power and interest can change during the project — remap monthly.
High power + high interest need a named relationship owner.
RACI must have exactly one Accountable per decision.
Stakeholder resistance is data — understand and address it, don't dismiss.
Stakeholder map is a living document, not a one-time exercise.
Conflicts: facilitate discussion, escalate if needed, document resolution.
