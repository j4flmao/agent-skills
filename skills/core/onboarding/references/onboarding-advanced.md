# Onboarding Advanced Topics

## Multi-Role Onboarding Plans

### Engineering Manager Onboarding
EM onboarding requires additional context beyond developer onboarding:
- Team topology: squad structure, reporting lines, skill distribution
- Delivery metrics: velocity trends, cycle time, deployment frequency
- Stakeholder map: product, design, infrastructure, business stakeholders
- Career development: growth paths, promotion criteria, performance review cycle
- Budget and headcount: hiring plan, contractor relationships, tooling budget

### DevOps/Platform Onboarding
DevOps onboarding shifts focus from application code to infrastructure:
- Infrastructure topology: all environments (dev, staging, prod), regions, accounts
- Access management: IAM roles, service accounts, vault policies
- Monitoring stack: Prometheus/Grafana, PagerDuty, log aggregation
- CI/CD pipelines: all pipeline definitions, deployment targets, rollback procedures
- Incident response: on-call rotation, escalation paths, runbook locations

### Data Engineer Onboarding
Data engineering onboarding emphasizes data infrastructure:
- Data pipeline topology: sources, destinations, transformation layers
- Storage systems: data lakes, warehouses, OLAP/OLTP databases
- Orchestration: Airflow/Dagster schedules, DAG structure
- Data quality: monitoring, alerting, SLAs for freshness and accuracy
- Access patterns: read models, analytical queries, ML feature pipelines

## Distributed/Remote Onboarding

### Async-First Adjustments
For fully remote teams across time zones:
- Pairing uses async code review (Loom videos, detailed PR comments) for timezone gaps
- Day 1 welcome package shipped physically: laptop, monitor, team swag
- Buddy overlaps at least 4 hours with new hire's working hours
- Architecture walkthrough recorded for reference (but delivered live first)
- Standup replaced with async text updates in a dedicated channel

### Timezone Challenges
- Buddy and new hire in very different timezones: assign two buddies (one in each timezone cluster)
- Critical setup day (Day 1) requires live pairing — shift schedules to find overlap
- Code review expectations adjusted: 8 business hour response target instead of 4

## Large-Scale Onboarding Programs

### Cohort-Based Onboarding
When hiring multiple developers simultaneously (e.g., office expansion, new team formation):
- Cohort orientation on Day 1: shared presentation on company/team/stack
- Individual buddies still assigned, but cohort has shared Slack channel for peer support
- Architecture walkthrough delivered to cohort as a group (more efficient, encourages peer learning)
- Group retro at end of week 1: shared pain points become systemic improvements
- Competition element: first cohort member to merge a PR gets a prize

### Onboarding Maturity Model
| Level | Characteristics | Buddy | Setup | First PR |
|---|---|---|---|---|
| 1: Ad-hoc | No documentation, manual setup | None | 3-5 days | Week 3+ |
| 2: Documented | Setup instructions exist, partially automated | Assigned but no capacity relief | 1-2 days | Week 2 |
| 3: Automated | Push-button setup script, starter tickets prepared | Assigned with capacity relief | <1 day | Week 1 |
| 4: Optimized | Dev container, automated starter ticket assignment, buddy training program | Trained and supported | <2 hours | Day 3-4 |
| 5: Self-improving | Onboarding quality metrics tracked, retrospective-driven improvements, automated buddy pairing | Continuous improvement cycle | <1 hour | Day 2-3 |

## Buddy Training Program

### Buddy Selection Criteria
- Has been on the team for 6+ months
- Has shipped at least 10 PRs and reviewed 20+
- Is a patient communicator who enjoys teaching
- Is not the new hire's manager (preserves psychological safety)
- Has capacity for ~4 hours/week of dedicated onboarding time

### Buddy Training Topics
1. Active listening and asking clarifying questions
2. How to conduct a pairing session (driver-navigator rotation)
3. How to explain code review feedback constructively
4. Recognizing overwhelm and adjusting pace
5. Giving positive reinforcement and celebrating small wins
6. When to escalate to manager (performance concerns, access blockers)
