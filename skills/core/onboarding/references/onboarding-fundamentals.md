# Onboarding Fundamentals

## Core Principles

### First PR by End of Week 1
The single most important metric for onboarding effectiveness is whether the new hire ships code to main within their first 5 days. This is not about velocity — it's about completing the development cycle end-to-end: environment setup, code change, test, review, merge, deploy. Developers who complete this cycle in week 1 reach full productivity ~3x faster than those who don't.

### The Buddy System
Every new joiner needs a single designated peer (not a manager) as their primary point of contact for the first 2-4 weeks. The buddy pairs on the first PR, answers unlimited questions, and provides a psychologically safe channel for "dumb questions." The buddy must have capacity relief (~20% sprint reduction) during this period.

### Self-Improving Documentation
New hires inevitably find gaps in documentation because they approach the project fresh — they are the most effective documentation auditors the team has. Every missing or incorrect piece they discover becomes their first pull request, creating a feedback loop where onboarding quality improves with every new hire.

## Key Concepts

### Environment Determinism
The single biggest onboarding failure mode is environment variance. If the setup script works for one developer but not another, debugging environment differences can consume days. Solutions ranked by effectiveness:
1. **Dev containers** (.devcontainer.json) — zero variance, OS-independent
2. **Containerized setup** (docker-compose for all services) — minimal variance
3. **Automated setup script** (bin/setup) — reduces but doesn't eliminate variance
4. **Manual setup instructions** — highest variance, highest failure rate

### The Architecture Walkthrough
Reading code in isolation is slow and inefficient. A guided 60-minute architecture walkthrough by a senior engineer compresses what would take days of solo reading into a single session. The walkthrough should cover the complete request flow, key directories, deployment pipeline, and infrastructure dependencies.

### Progressive Independence
Week 1: fully paired. Week 2: independent work with daily buddy check-ins. Week 3: independent work with EOD async check-ins. Weeks 4+: normal workflow with buddy available for questions. This graduated approach builds confidence without creating dependency.

## Deciding What to Cover

### High-Priority Onboarding Elements
- Working development environment
- Complete request flow understanding
- Branch/PR/merge workflow
- CI/CD pipeline understanding
- Testing expectations and pyramid
- Code review culture and process
- Team communication channels and norms

### Lower-Priority Elements (Week 2+)
- Deep domain knowledge of specific modules
- On-call processes and incident response
- Performance profiling tools
- Advanced debugging techniques
- Architecture decision history (ADRs)
- Deployment and release process details

## Common Onboarding Failure Modes

### Environment Setup Takes Multiple Days
If the setup script fails or is missing, the developer spends their most energetic first days in configuration hell rather than learning the codebase. The fix is ruthless automation: every manual step is a bug, not a feature.

### No Buddy or Buddy Without Capacity
An assigned buddy who is too busy to respond creates a worse experience than no buddy at all (because expectations are set but unmet). Buddy capacity relief is non-negotiable.

### Overwhelming Firehose on Day 1
Dumping the entire architecture, codebase tour, and team norms in a single day causes cognitive overload and retention failure. The day-by-day structure spreads information across the week with concrete deliverables at each stage.

### Documentation-Dominated First Week
Handing a new hire a stack of documentation to read on day 1 is the least effective onboarding method. Active learning (doing, building, breaking, fixing) produces dramatically better retention than passive reading.
