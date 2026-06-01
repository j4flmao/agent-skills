---
name: core-onboarding
description: >
  Use this skill when the user says 'onboarding', 'new developer', 'new team member', 'setup guide', 'getting started', 'dev environment setup', 'new joiner', 'ramp up'. Produces a structured onboarding plan and environment setup guide for new team members. Do NOT use for: project initialization or README writing.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [core, onboarding, phase-7]
version: "1.1.0"
author: "j4flmao"
license: "MIT"
---

# Core Onboarding

## Purpose
Accelerate new team member ramp-up through structured Day 1 / Week 1 onboarding. Covers environment setup, architecture overview, development workflow, and team practices so new joiners ship their first code change by end of week one.

Great onboarding is a competitive advantage for engineering organizations. New hires who ship their first PR within the first week reach full productivity faster and are retained at higher rates. Every hour invested in onboarding saves dozens of hours across future new hires. The feedback loop: every new hire who finds missing documentation and fixes it as their first PR creates a self-improving system.

## Agent Protocol

### Trigger
"onboarding", "new developer", "new team member", "setup guide", "getting started", "dev environment setup", "new joiner", "ramp up"

### Input Context
- Project repository URL and default branch (main, master, develop)
- Technology stack: primary language(s) and versions, framework(s), database(s), queue, cache, cloud platform
- Team structure: EM, tech lead, assigned buddy, DevOps contact, PM, designer
- CI/CD details: provider (GitHub Actions, GitLab CI, CircleCI, Jenkins), lint/typecheck/test/build commands, deployment targets and environments
- Development workflow: branch naming convention, PR template, required reviewers, CI checks, merge strategy, release cadence
- Environment requirements: supported host OS, minimum hardware, reserved ports, system dependencies
- Documentation paths: ADRs, API docs, runbooks, incident response guides, architecture diagrams

### Output Artifact
Onboarding plan with day-by-day checklist, environment setup commands in executable order, architecture overview with key directories and request flow, and team practices reference guide.

### Response Format
- Day 1-5 checklist with time estimates, expected outcomes, verification steps
- Environment setup as ordered copy-paste-ready command blocks
- Architecture overview: key directories table, request flow diagram, deployment pipeline map
- Team practices: standup format, communication channels, documentation conventions, on-call rotation
- No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
Complete onboarding checklist verified. Dev server running (health endpoint HTTP 200). New developer can describe request flow from memory. First PR created, reviewed, and merged to main.

### Max Response Length
3000 tokens

## Onboarding Flow Design

### Day 1 — Welcome and Environment
Before developer arrives: send GitHub/GitLab invite, provision cloud IAM (read-only), create shared credential entry, block buddy's calendar for pairing. Developer: clone repo, read README, run setup script. Buddy pairs on first setup run. End of day: dev server running, health endpoint returns 200. Any missing step → file as issue → developer's first Day 2 task.

### Day 2 — Architecture Tour
Buddy or tech lead leads 60-min walkthrough: directory structure (src, tests, docs, scripts, infra), request flow client→DB→back, deployment pipeline (commit→CI→build→staging→prod), event/message topology (queues, topics, streams), key infra dependencies (DBs, caches, search, CDNs). Developer draws request flow from memory at end. Gaps inform Day 3 focus.

### Day 3 — First Code Change
Pick small, well-scoped ticket (docs fix, minor bug, small feature with clear AC). Buddy pairs on full workflow: branch from main, make change, write tests, run suite locally, push, open draft PR. Focus on workflow correctness (branch name, commit messages, PR format, CI) not code quality. End of day: draft PR exists with green CI.

### Day 4 — PR Review and Merge
Buddy + second reviewer perform thorough review: logic, correctness, design, security, tests. Developer responds to each comment, pushes fixes. Buddy ensures developer understands every comment. PR merged with team's standard strategy (squash by default). Developer verifies change in staging.

### Day 5 — Reflect and Plan
Developer writes brief retro: what was confusing, what was most helpful, what docs were wrong/missing, week 2 plan. EM + buddy review, prioritize top 3 improvements. Developer assigned first independent ticket (still small, well-scoped). Buddy transitions from active pairing to async support.

### Welcome Message Template
```
Welcome to the team! Your onboarding buddy is {buddy_name}.
- Day 1: Environment setup — goal: health endpoint returns 200
- Day 2: Architecture tour — goal: draw request flow from memory
- Day 3: First code change — goal: draft PR open with green CI
- Day 4: PR review and merge — goal: first PR merged to main
- Day 5: Retro and planning — goal: documented learnings + next ticket
```

### Environment Decision Tree
```
Setup approach:
├── .devcontainer.json exists?
│   ├── YES → Offer devcontainer option (eliminates env variance)
│   └── NO → Native setup (check prerequisites first)
├── Install runtime:
│   ├── .tool-versions → asdf (recommended for polyglot repos)
│   ├── .nvmrc → nvm
│   ├── .python-version → pyenv
│   └── .ruby-version → rbenv
├── Install dependencies:
│   ├── package-lock.json → npm ci
│   ├── pnpm-lock.yaml → pnpm install --frozen-lockfile
│   ├── Cargo.lock → cargo build
│   ├── go.sum → go mod download
│   └── requirements.txt → pip install -r requirements.txt
├── Configure env:
│   ├── .env.example exists → cp to .env, fill each var
│   └── No .env.example → create one as first contribution
└── Verify:
    ├── Health endpoint → HTTP 200
    └── Test suite → all passing
```

## Workflow

### Step 1: Environment Setup
Produce step-by-step instructions as executable command blocks in strict order. Clone → install runtime → install deps → configure env → start dev server → verify health → run tests. If project lacks `bin/setup` or equivalent automation, create one as part of onboarding PR.

### Step 2: Architecture Overview
Walk directory structure. `src/` or `app/` = application source by feature module or bounded context. `tests/` or `spec/` = all automated tests mirroring source. `docs/` = ADRs, API docs, runbooks, diagrams. `scripts/` = automation (setup, DB ops, deploy). `infra/` or `ops/` = IaC (Terraform, K8s, CloudFormation, Docker Compose). Describe request flow: CDN → load balancer → API gateway (routing + auth) → service → DB (optional cache) → optional queue → response. Deployment pipeline: push → CI (lint, typecheck, unit, int, security, build) → registry → staging → smoke tests → prod (blue-green or canary).

### Step 3: Development Workflow
Branch strategy: all feature branches from main (never other feature branches). Naming: `feature/user-login`, `fix/PROJ-123-null-pointer`, `chore/upgrade-deps`. PR workflow: draft PR early for intent signal → self-review before requesting → request reviewers → address feedback with additional commits (no force-push during review) → squash merge. CI: every push triggers lint → typecheck → unit → integration → security scan → build. Fix failures at each stage before proceeding. Testing: features need unit tests, bug fixes need reproduction test, API changes need integration tests, critical paths need E2E. Min 80% coverage on new code. Code review culture: respond within 4 business hours, focus on logic/correctness/design/security (linters handle style), explicit approve or request changes (no passive comments-only).

### Step 4: Team Practices
Standup: same time daily, same platform, same format (yesterday/today/blocks), ≤15 min for teams ≤10. Communication: Slack/Discord by topic channels (#engineering, #incidents, #releases), scheduled video for agile ceremonies, GitHub for code discussions, dedicated on-call channel. Documentation conventions: ADRs per template (title, status, context, decision, consequences) as markdown with sequential ID in `docs/adr/`. API docs as OpenAPI alongside source. Architecture diagrams in `docs/diagrams/` (Mermaid, Draw.io, Excalidraw). Runbooks in `docs/runbooks/` (deploy, rollback, incident response, troubleshooting).

## Models

### Week 1 Onboarding Target
| Day | Goal | How to Verify |
|---|---|---|
| Day 1 end | Dev environment fully running | Health endpoint returns HTTP 200 |
| Day 2 end | Architecture understood at high level | Can describe request flow without notes |
| Day 3 end | First meaningful code change made | Draft pull request is open |
| Day 5 end | First pull request merged to main | PR merged with all checks green |

### Role Responsibilities Matrix
| Role | Pre-Start | Day 1 | Week 1 | Week 2+ |
|---|---|---|---|---|
| EM | Provision access, assign buddy | Welcome, team intro | Weekly 1:1 | Normal cadence |
| Buddy | Block calendar, prepare pairing | Pair on setup + walkthrough | Pair on first PR, daily check-in | Async, tapering |
| Tech Lead | Prepare arch walkthrough | Architecture tour (60 min) | Review first PR | Normal rotation |
| DevOps | Verify IAM, vault access | Unblock setup issues | Monitor access needs | On-call shadowing |
| New Dev | Read project docs | Setup, first test run | First PR merged | First independent ticket |

## Rules
- **First PR merged by end of week 1** — If not shipped, the process or environment is the problem. Fix the process, not the person.
- **Buddy system is mandatory** — Dedicated peer (not manager) assigned pre-start, pairs on first PR, answers unlimited questions for ≥2 weeks.
- **Push-button environment setup** — Single command (`bin/setup`, `make setup`, `npm run setup`) takes from empty clone to running dev server. Non-automatable steps tracked as tech debt.
- **New hires improve docs as first contribution** — Missing/incorrect docs → first PR fixes them.
- **Pair on first PR** — Teaches workflow, review process, testing expectations, coding standards in real context with safety net.
- **Week 1 measures understanding, not output** — Goal: understanding system, building confidence, establishing relationships. Feedback on quality and learning, not velocity.
- **Buddy gets capacity relief** — ~20% sprint capacity reduction during 2-week buddy period.
- **Structured retro at week 1 and month 1** — Collect feedback on confusing parts, helpful parts, wrong/missing docs, confidence builders. Feed back into plan.

## Day-by-Day Activity Table
| Time | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|---|---|---|---|---|---|
| 9:00-10:00 | Welcome + manager intro | Architecture walkthrough | Ticket selection + planning | PR review session | Retro writing |
| 10:00-12:00 | Environment setup pairing | Directory tour + request flow | First code change (pair) | Address review comments | Improvement tickets |
| 12:00-13:00 | Team lunch | Lunch | Lunch | Lunch | Lunch |
| 13:00-15:00 | First test suite run | CI/CD pipeline review | Write tests for change | Second reviewer feedback | First independent ticket |
| 15:00-17:00 | Health check + verify | Meeting the team | Open draft PR | Merge to main + verify | Week 2 planning |

## Communication Schedule
### Week 1 Check-ins
| When | Who | Duration | Format |
|---|---|---|---|
| Daily 9:00 AM | Buddy + new hire | 15 min | Standup-style check-in |
| Day 1 4:00 PM | Manager + new hire | 30 min | How was day 1? |
| Day 3 3:00 PM | Buddy + new hire | 60 min | PR pairing session |
| Day 5 3:00 PM | Manager + buddy + hire | 30 min | Week 1 retro |
| Daily (async) | Buddy | 15 min | Slack check-in noon |

## Buddy Responsibilities

### Week 1 Checklist
Before Day 1: block calendar Mon-Wed 9-12 and Thu-Fri 10-11, prepare scoped ticket with clear AC, review known setup issues, set up pairing environment (VS Code Live Share, tmux, Tuple). Day 1: pair on setup, document missing steps, guide through first test suite run, explain README + ARCHITECTURE.md. Days 2-3: walk request flow, explain deployment pipeline, pair on first code change + tests, guide through opening draft PR. Days 4-5: review first PR, explain each review comment, celebrate merge, lead retro.

### Buddy Offboarding
After 4 weeks, final check-in. Buddy writes handoff note for manager: areas of strength, areas needing support, documentation improvements made, process improvement recommendations. Manager takes over as primary support.

## Continuous Improvement Loop

### Retro Structure (Week 1 + Month 1)
1. **What worked well**: environment setup, documentation, buddy support, architecture walkthrough
2. **What was confusing**: unclear docs, missing steps, unanswered questions, process friction
3. **What should change**: doc gaps, tool issues, process improvements, team practices

### Feedback Integration
Each retro produces actionable items: doc updates (assigned to buddy as ticket), process changes (escalated to EM for next sprint), tool improvements (infrastructure backlog), team practice updates (next retro/team meeting). After 3 new hires, review all findings for systemic issues.

## References
  - references/buddy-system-guide.md — Buddy System Guide
  - references/dev-environment-automation.md — Dev Environment Automation
  - references/onboarding-advanced.md — Onboarding Advanced Topics
  - references/onboarding-flow.md — Onboarding Flow
  - references/onboarding-fundamentals.md — Onboarding Fundamentals
  - references/onboarding-templates.md — Onboarding Templates
  - references/ramp-up-plan.md — Ramp-Up Plan
  - references/setup-checklist.md — Setup Checklist

## Handoff
core-context-compressor — summary of setup knowledge, architecture understanding, and config for continuing work
