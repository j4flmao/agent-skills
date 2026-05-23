---
name: devops-sre-practices
description: >
  Use when the user asks about Site Reliability Engineering, SRE, SLI, SLO, error budgets, toil reduction, reliability engineering, incident analysis, postmortems, or production readiness. Do NOT use for: general monitoring (devops-monitoring), incident response tools (devops-incident-response), or chaos engineering (devops-chaos-engineering).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, sre, phase-3]
---

# SRE Practices

## Purpose
Implement Site Reliability Engineering practices: define SLIs/SLOs, manage error budgets, reduce toil, conduct incident analysis, and build production readiness.

## Agent Protocol

### Trigger
Phrases: "SRE", "site reliability", "SLI", "SLO", "error budget", "toil", "toil reduction", "reliability engineering", "postmortem", "incident analysis", "production readiness review", "PRR".

### Input Context
- Current monitoring and alerting stack
- Existing incident response process
- Team size and on-call rotation
- Service-level objectives (if any)
- Known reliability pain points

### Output Artifact
- SLI/SLO definition document
- Error budget policy
- Toil assessment and reduction plan
- Postmortem template
- Production readiness checklist

### Completion Criteria
- [ ] SLIs identified for each service
- [ ] SLO targets defined with business alignment
- [ ] Error budget policy documented
- [ ] Toil assessment completed with reduction targets
- [ ] Postmortem culture established (blameless, actionable)

## Workflow

### Step 1: Define SLIs
| Indicator | Example | Measurement |
|-----------|---------|-------------|
| Latency | p99 response time < 200ms | Request duration metrics |
| Availability | % successful requests | HTTP 200 vs 5xx ratio |
| Throughput | Requests per second | Request count metrics |
| Durability | % data not lost | Storage integrity checks |
| Correctness | % accurate responses | Validation/consistency checks |

### Step 2: Set SLO Targets
- SLO must be < 100% (100% is impossible)
- Tier 1 services: 99.99% (4-nines)
- Tier 2 services: 99.9% (3-nines)
- Tier 3 services: 99% (2-nines)
- Error budget = 100% − SLO (e.g., 99.9% SLO = 0.1% error budget)

### Step 3: Error Budget Policy
| Budget Remaining | Action |
|-----------------|--------|
| > 50% | Normal operations, deploy freely |
| 25-50% | Monitor, slow deploys, review changes |
| 10-25% | Freeze feature deploys, focus on reliability |
| < 10% | Emergency: all hands on reliability |

### Step 4: Reduce Toil
Toil categories: manual operations, repetitive tasks, overhead, context switches.
- Track toil hours per week per engineer
- Target: < 50% of time spent on toil
- Automate anything done more than twice
- Document everything before automating

### Step 5: Incident Analysis
- Blameless postmortem within 48 hours
- Timeline of events
- Root cause + contributing factors
- Action items with owners and deadlines
- Track action items to closure

## Rules
- Error budgets must be visible to the entire engineering org
- Postmortems are always blameless — focus on systems, not people
- Toil reduction is everyone's responsibility, not just SRE team
- SLOs must be agreed with product/business stakeholders
- Any service can have a production readiness review requested

## References
- `references/sli-slo-guide.md` — SLI/SLO definition patterns and examples
- `references/toil-automation.md` — Toil assessment and automation strategies
- `references/incident-analysis.md` — Incident analysis and postmortem framework

## Handoff
Related skills: devops-platform-engineering (IDP), devops-incident-response (on-call), devops-chaos-engineering (resilience testing), devops-monitoring (observability stack).
