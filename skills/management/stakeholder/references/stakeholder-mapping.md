# Stakeholder Mapping

## Overview
Stakeholder mapping identifies who has power over and interest in your project, enabling targeted communication and engagement strategies.

## Power/Influence Grid
Plot each stakeholder on a 2x2 grid:

| | Low Interest | High Interest |
|---|---|---|
| **High Power** | Keep Satisfied | Manage Closely |
| **Low Power** | Monitor | Keep Informed |

### Quadrant Strategies
- **Manage Closely**: frequent, deep engagement — involve in decisions, invite to reviews, one-on-one meetings. Danger: they can block the project.
- **Keep Satisfied**: periodic engagement, focus on outcomes — executive summaries, milestone updates. Danger: they can lose interest and become blockers when decisions are needed.
- **Keep Informed**: regular updates, no decision input — newsletters, group emails, demos. Danger: they can feel excluded and escalate.
- **Monitor**: minimal engagement — quarterly newsletters, public dashboards. Danger: they can emerge as unexpected blockers.

## Salience Model (Mitchell, Agle, Wood)
Stakeholders classified by three attributes: Power (ability to impose will), Legitimacy (socially accepted relationship), Urgency (need for immediate attention). Having 2+ attributes means the stakeholder is highly salient and requires active management.

## RACI Matrix

| Decision | Sponsor | PM | Dev Lead | Team | QA | Ops |
|---|---|---|---|---|---|---|
| Scope change | A | R | C | C | I | I |
| Tech stack | I | C | R | C | C | C |
| Release date | A | R | C | C | I | C |
| Bug priority | I | A | R | C | R | I |

**R** = Responsible (does the work), **A** = Accountable (approves, one per row), **C** = Consulted (input before decision), **I** = Informed (notified after decision).

## Stakeholder Persona Template
```
Name: {individual or group}
Role: {relationship to project}
Power score: {1-5}
Interest score: {1-5}
Quadrant: {manage closely / keep satisfied / keep informed / monitor}
Communication preference: {format + frequency}
Key concerns: {what they care about most}
Resistance risk: {LOW / MED / HIGH} — {why}
Engagement approach: {specific strategy}
```

## Key Points
- A stakeholder's power and interest can change during the project — remap monthly
- High power + high interest stakeholders need a named relationship owner
- RACI must have exactly one Accountable per decision — no shared accountability
- Stakeholder resistance is data — understand the concern and address it, don't dismiss it
