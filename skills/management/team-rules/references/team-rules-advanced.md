# Team Rules Advanced Topics

## Introduction
Advanced team rules cover scaling protocols across multiple teams, automated enforcement, metrics-driven process improvement, conflict resolution systems, and building a continuous improvement culture.

## Scaling Team Rules Across Multiple Teams

### Consistency vs Autonomy

When scaling to multiple teams, balance:
- **Consistent rules**: common standards enable cross-team mobility, reduce context switching, ensure minimum quality bar
- **Team autonomy**: each team adapts rules to their context, owns their process

**Recommended approach**: core rules (20%) are org-wide mandatory. Team-specific rules (80%) are up to each team.

**Core rules examples**:
- Main branch protected, no direct pushes
- CI must pass before merge
- At least one approval before merge
- No secrets in code
- P0/P1 incidents have post-mortem within 48 hours

### Cross-Team Coordination

**Team API**: each team documents their interface for other teams:

```
Team: {name}
Purpose: {mission statement}
Dependencies: {what we need from other teams}
Exposed services: {APIs, libraries, tools we provide}
Communication: {channel, response SLA, best contact time}
RFC process: {link to their RFC template and timeline}
```

**Dependency management**: track cross-team dependencies in visible board. Each dependency has owner and target date. Escalate when dependency blocks critical path.

**Service level expectations**: platform teams define SLAs for their services. Consuming teams define expected response times for requests. Document and review quarterly.

### Guilds and Communities of Practice

Cross-team groups focused on specific practices:

**Code Review Guild**: defines review standards, trains reviewers, audits review quality across teams.

**Incident Response Guild**: maintains incident response process, runs game days, reviews post-mortems for systemic patterns.

**DevOps Guild**: manages CI/CD standards, deployment automation, infrastructure practices.

Guilds are voluntary, meet monthly, and produce recommendations (not mandates).

## Automated Enforcement

### CI/CD Gates

Automate rule enforcement in CI pipeline:

```
PR → Lint → Type Check → Unit Tests → SAST → Dep Scan → Build → Integration Tests → Security Scan
        ↓ fail        ↓ fail      ↓ fail   ↓ fail   ↓ fail     ↓ fail     ↓ fail             ↓ fail
       Block        Block       Block    Block    Block      Block      Block              Block
```

Gates are: warning (non-blocking, trend metrics), block (prevents merge), or advisory (post-merge notification).

### Branch Protection Rules

Git platform settings that enforce rules automatically:

- Require pull request before merging
- Require at least one approval
- Require status checks to pass
- Require up-to-date branches
- Restrict push access to specific roles
- Require linear history (no merge commits)
- Include administrators (no bypass)

### Automated Linting and Formatting

Enforce code style without manual review:
- Pre-commit hooks run linters and formatters
- CI fails if lint rules violated
- Use consistent config across all repos (shared ESLint/ruff configs)
- Auto-fix where possible (format on save, CI auto-format)

## Metrics-Driven Process Improvement

### Metrics That Matter

Track these metrics to evaluate rule effectiveness:

| Metric | What It Measures | Target | Action If Off |
|--------|-----------------|--------|---------------|
| PR review time | Time from open to first review | < 4 hours | Review reviewer capacity, adjust rotation |
| PR merge time | Time from open to merge | < 24 hours | Check CI speed, review criteria, PR size |
| Revert rate | % of PRs reverted | < 5% | Investigate review quality, test coverage |
| CI green rate | % of CI runs passing | > 90% | Fix flaky tests, review CI configuration |
| Incident MTTR | Time from detection to resolution | < 1 hour | Review runbooks, on-call training, tooling |
| Bug escape rate | Bugs found in production | Decreasing | Improve test coverage, code review |
| Rule compliance | % of PRs following all rules | > 95% | Review rule clarity, enforcement automation |

### Retro Data-Driven Improvement

Use retro data to identify process issues:

- Track action item completion rate (target: > 80%)
- Categorize action items by type (review, communication, tooling, process)
- Identify recurring themes across retros
- Measure time from problem identification to resolution

### Process Experimentation

Treat process changes as experiments:

1. **Define hypothesis**: "Reducing WIP limit from 5 to 3 will decrease cycle time by 20%"
2. **Set duration**: 2 sprints (long enough to measure, short enough to undo)
3. **Define metrics**: baseline cycle time, new cycle time, throughput, team satisfaction
4. **Run experiment**: apply change, measure metrics
5. **Decide**: adopt (metrics improved), reject (metrics worsened or unchanged), extend (more data needed)

Document experiments in decision log with hypothesis, results, and decision.

## Conflict Resolution Systems

### Technical Dispute Resolution

Escalation path for technical disagreements:

1. **Direct discussion**: engineers discuss, try to reach consensus
2. **Spike**: implement both approaches at small scale, compare results
3. **ADR**: document both positions, evaluation criteria, and decision
4. **Tech lead decision**: if no consensus, tech lead decides based on evidence
5. **Architecture review board**: for cross-team or high-impact decisions

**Rules**:
- Discuss in good faith, focus on evidence not seniority
- Disagree and commit once decision is made
- Revisit decision if new evidence emerges

### Process Conflict Resolution

Escalation path for process disagreements:

1. **Retro discussion**: raise in retro, team discusses pros and cons
2. **Experiment**: try alternative for 1 sprint, compare outcomes
3. **Team vote**: if experiment inconclusive, team votes
4. **Manager decision**: if team can't decide, manager makes call

**Rules**:
- Focus on data and outcomes, not preferences
- Experiments are low-risk — try before arguing
- Document decision and revisit criteria

## Building Continuous Improvement Culture

### Blameless Culture

Characteristics:
- Incidents are system failures, not individual failures
- Post-mortems focus on prevention, not punishment
- People surface issues early without fear
- "5 Whys" analysis stops at systemic root causes, not individual errors

**Practices**:
- No blame in retros or post-mortems
- Celebrate thorough incident analysis
- Share lessons learned across teams
- Reward people who identify problems early

### Innovation Time

Allocate time for improvement work:

- 15-20% sprint capacity for tech debt and process improvement
- Hack days or innovation sprints quarterly
- Retro action items are prioritized alongside feature work
- Process improvement is not optional — it's core work

### Feedback Culture

Continuous feedback on rules and processes:

- Retro includes "rate our rules" (1-5 per rule, helpful vs hindrance)
- Anonymous survey quarterly for rule satisfaction
- Open RFC period for rule changes
- "Rules inbox" where anyone can propose rule changes anytime

## Key Points
- 20% core rules are mandatory; 80% team-specific for autonomy
- Team APIs document interfaces and dependencies for cross-team coordination
- CI/CD gates automate rule enforcement — prevent before it reaches review
- Branch protection rules are the most impactful automation investment
- Track metrics (PR time, CI green rate, MTTR) to measure rule effectiveness
- Treat process changes as experiments: hypothesis → measure → decide
- Technical disputes: discuss → spike → ADR → tech lead decides
- Blameless culture enables honest incident analysis and early problem detection
- Allocate 15-20% capacity for improvement work
- Continuous improvement is a habit, not an event
