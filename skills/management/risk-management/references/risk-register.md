# Risk Register Template and Practice

A risk register is the single living list of identified risks for a project or product, with an owner, assessment, response and status for each. This reference gives the fields, a worked example, scoring, and the review routine. Assessment-matrix design, mitigation playbooks and reporting are covered in sibling references.

## Required Fields

| Field | Content | Notes |
|---|---|---|
| ID | `R-001` | Never reused, even after closure |
| Title / description | Cause → event → effect | "Because X, Y may happen, leading to Z" |
| Category | technical, third-party, schedule, people, security, compliance, financial | Fixed list for filtering |
| Probability (P) | 1–5 | Use the scale definitions below |
| Impact (I) | 1–5 | Highest of schedule, cost, quality, security impact |
| Score | P × I | Recompute at every review |
| Proximity | When it could occur | Drives review urgency |
| Trigger / early warning | Observable signal | e.g. "vendor misses 2 release dates" |
| Response strategy | Avoid / Mitigate / Transfer / Accept (threats); Exploit / Enhance / Share / Accept (opportunities) | |
| Actions | Concrete tasks with due dates | Linked to backlog tickets |
| Contingency plan | What to do if it occurs | With a trigger |
| Owner | One named person | Not a team |
| Status | Open, Monitoring, Occurred (→ issue), Closed | |
| Residual score | Expected P × I after actions | Shows value of mitigation |
| Last reviewed | Date | Stale entries are a smell |

## Example Register

| ID | Category | Description (cause → event → effect) | P | I | Score | Response | Trigger | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
| R-001 | technical | Monolith coupling → feature work collides in shared modules → velocity drops | 4 | 4 | 16 | Mitigate: extract billing module | Cycle time up 2 sprints in a row | Alice | Open |
| R-002 | third-party | Payment provider retires the API version we use → checkout breaks after cutoff | 3 | 5 | 15 | Mitigate: migrate to new API before cutoff | Provider deprecation notice | Bob | Monitoring |
| R-003 | people | Only one engineer knows the release pipeline → release blocked during leave | 3 | 4 | 12 | Mitigate: pairing + runbook | Planned leave in calendar | Carol | Open |
| R-004 | security | Critical CVE in a transitive dependency → exploitable service | 2 | 5 | 10 | Mitigate: SCA scanning + patch SLA | Scanner alert | Dave | Monitoring |
| R-005 | compliance | Data-residency requirement for EU customers → contract blocked | 2 | 4 | 8 | Avoid: EU-region deployment | Customer RFP asks for residency | Erin | Open |
| R-006 | schedule | Hardware delivery late → load test slips | 2 | 2 | 4 | Accept, contingency: cloud instances | PO not shipped by date | Frank | Closed |

## Scales

| Value | Probability | Impact (example definitions; calibrate per organization) |
|---|---|---|
| 1 | Rare: < 10% | Negligible; absorbed in sprint |
| 2 | Unlikely: 10–30% | Minor slip or cost within contingency |
| 3 | Possible: 30–50% | Milestone slip, visible to stakeholders |
| 4 | Likely: 50–80% | Release or contract at risk |
| 5 | Almost certain: > 80% | Product failure, legal/regulatory breach, data loss |

## Probability-Impact Matrix

| | I=1 | I=2 | I=3 | I=4 | I=5 |
|---|---|---|---|---|---|
| **P=5** | 5 | 10 | 15 | 20 | 25 |
| **P=4** | 4 | 8 | 12 | 16 | 20 |
| **P=3** | 3 | 6 | 9 | 12 | 15 |
| **P=2** | 2 | 4 | 6 | 8 | 10 |
| **P=1** | 1 | 2 | 3 | 4 | 5 |

- **High (15–25)**: action plan now, escalate to sponsor, review weekly.
- **Medium (6–14)**: owner and actions assigned, review every sprint.
- **Low (1–5)**: accept and log, review monthly or quarterly.

Treat any impact-5 risk (safety, legal, data loss) as at least Medium regardless of probability.

## Response Strategies

| Strategy | Use when | Example |
|---|---|---|
| Avoid | Risk can be removed by changing plan/scope | Drop an unproven library |
| Mitigate | Reduce P or I at acceptable cost | Add tests, redundancy, training |
| Transfer | Another party is better placed to carry it | Insurance, fixed-price contract, managed service |
| Accept (passive) | Cost of action exceeds expected loss | Log and monitor |
| Accept (active) | Keep a contingency reserve or Plan B | Budget buffer, fallback vendor |
| Escalate | Outside the project's authority | Org-level security or legal risk |

## Lifecycle

```
Identified -> Assessed -> Response planned -> Monitoring
     |                                            |
     |                    trigger fires --------> Occurred: open an issue, run contingency
     |                                            |
     +------------------------------------------> Closed (with date and closure note)
```

## Review Routine

| Activity | Cadence |
|---|---|
| Add a new risk | Immediately on discovery; anyone may propose |
| Owner updates P, I, actions | Before each review |
| Team review of High/Medium | Sprint planning or weekly |
| Full register review | Monthly and at each milestone/phase gate |
| Close or archive | When the cause is gone or the window passed; keep history |
| Retrospective input | Which risks occurred unflagged? Add a category or trigger |

## Tooling
- Spreadsheet or Confluence table for small teams; Jira issue type "Risk" with custom fields for P, I, score and owner for larger programs.
- Link each mitigation action to a backlog ticket so progress is visible.
- Export a top-10 by score for status reports.

## Pitfalls
- Vague entries ("project may be late") with no cause or trigger.
- Team-owned risks: nobody acts.
- Scores never updated after mitigation.
- Confusing issues (already happening) with risks (may happen).
- Register maintained only for audits, not used in planning.

## Checklist
- [ ] Every risk has cause-event-effect wording, one owner, and a trigger
- [ ] Scales are defined and shared with the team
- [ ] High risks have dated actions and a contingency
- [ ] Residual score recorded after actions
- [ ] Review cadence on the calendar; last-reviewed dates current
