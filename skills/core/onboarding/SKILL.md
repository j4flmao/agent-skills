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

## Remote & Distributed Onboarding Patterns

### Async Onboarding Protocol
For fully remote teams without synchronous pairing:
1. **Day 0**: Send welcome packet (README, architecture doc, setup video). Self-serve environment setup.
2. **Day 1-2**: Buddy pairing slots (2x 1-hour). Focus on: dev env verification, first PR walkthrough, team norms.
3. **Day 3-5**: Small ticket assignment (docs, minor bug fix). Buddy reviews PR, provides structured feedback.
4. **Week 2**: First feature ticket with explicit scope. Pair on architecture review, solo on implementation.
5. **Week 3-4**: Own a small feature end-to-end. Present in sprint review. Retro on onboarding experience.

### Async Communication Channels

| Channel | Purpose | Norms |
|---|---|---|
| #onboarding | Public Q&A — anyone can answer | Search before asking. Answer publicly. |
| #dev-help | Technical blockers | Include error logs, steps tried, expected outcome. |
| Buddy DM | Private 1:1 check-ins | Daily 15-min async check-in first 2 weeks. |
| Weekly 1:1 | Manager + engineer | Career, team dynamics, feedback. Not technical. |
| Pairing calendar | Deep-dive sessions | Block 2x 2hr/week for optional pairing. |

### Documentation Requirements
Before onboarding a new engineer, ensure:
- [ ] `README.md` has: prerequisites, setup steps, architecture overview
- [ ] `CONTRIBUTING.md` has: PR process, code review checklist, commit conventions
- [ ] `docs/architecture.md` has: system diagram, key decisions, data flow
- [ ] `docs/setup.md` has: exact commands, expected outputs, troubleshooting table
- [ ] `docs/deployment.md` has: CI/CD pipeline, environment promotion, rollback process
- [ ] `.env.example` has all required variables with descriptions
- [ ] `scripts/setup.sh` (or equivalent) automates the entire setup

### Mentorship Framework

**Buddy responsibilities (first 4 weeks):**
- Approve environment setup PR
- Review first 3 PRs within 24 hours
- Daily 15-min async standup check-in
- Introduce to team members and stakeholders
- Point to relevant docs before answering questions ("I know the answer is in docs/testing.md — let's find it together")

**Senior engineer responsibilities (first 2 weeks):**
- Architecture walkthrough (recorded for future hires)
- Domain modeling session (whiteboard key entities and relationships)
- Pair on first complex ticket

**Onboarding mentor rotation:**
- Rotate buddy every 2 weeks in first month
- Prevents burnout, exposes new hire to different perspectives
- Each buddy leaves a brief handoff note for next buddy

### Environment Troubleshooting Checklist

**Node.js issues:**
- Wrong version: `nvm use` reads `.nvmrc` — check file exists
- Permissions errors: `npm cache clean --force`, reinstall
- Missing packages: delete `node_modules` + `package-lock.json` → reinstall
- Global tools not found: PATH doesn't include `~/.npm-global/bin`

**Docker issues:**
- Docker daemon not running: `systemctl start docker` (Linux), start Docker Desktop (macOS/Windows)
- Port conflicts: `lsof -i :PORT` to find what's using the port
- Volume mount permissions: `:delegated` on macOS for faster mounts
- Container logs: `docker compose logs -f service-name`

**Database issues:**
- Connection refused: check `.env` values, DB host, port
- Migration failed: `npx prisma migrate reset` or `npm run db:reset`
- Seed data missing: run `npm run db:seed` after migrations
- Wrong data in dev: `npm run db:reset` — always safe in development

**Python issues:**
- Virtual env not activated: `source .venv/bin/activate` (Linux/macOS), `.venv\Scripts\Activate.ps1` (Windows)
- Missing dependencies: `pip install -r requirements.txt`
- Python version mismatch: `pyenv local 3.12` reads `.python-version`
- Conflicting global packages: use `pip install --user` or virtual environments always

### Progressive Autonomy Model

```
Week 1: Guided — buddy pairs on everything
Week 2: Supported — buddy reviews, but new hire drives
Week 3: Independent — own small tickets, ask when stuck
Week 4: Contributing — own features, contribute to design discussions
Month 2: Proficient — review others' PRs, mentor new hires
Month 3: Autonomous — lead features, influence architecture
```

### Feedback & Retrospective

**Week 1 check-in questions:**
- What was confusing about the setup?
- What documentation was missing or unclear?
- Did you feel supported when stuck?
- What would you change about the process?

**Week 4 retrospective:**
- Rate onboarding: 1-10, what would make it a 10?
- What did you wish you knew on day 1?
- Which team norms were unclear?
- What should we automate next?

**Metrics to track:**
- Time to first PR merged (target: < 1 week)
- Time to first feature shipped (target: < 3 weeks)
- Buddy satisfaction score (target: > 4/5)
- Setup success rate (target: > 90% first attempt)

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|---|---|---|
| Dump all docs on day 1 | Information overload — nothing is retained | Progressive disclosure: day 1 setup, day 2 workflow, week 2 architecture |
| No dedicated buddy | New hire ping-pongs between team members, no consistent support | Assign a primary buddy for first 4 weeks with a backup buddy |
| "Just read the code" | New hires don't know where to start or what matters | Provide guided tours: "Start in src/auth/, then src/api/, then..." |
| Skip setup automation | Every setup is unique, env drift, takes days | Automate with scripts, maintain `.env.example`, test setup fresh each quarter |
| No code review mentorship | Feedback feels personal, new hires get discouraged | Review PRs together live first 2 weeks, explain "why" not just "what" |
| First PR is too large | Overwhelming changes, lengthy review process | Break into 3 smaller PRs: scaffold, logic, tests |
| Ignoring diversity & inclusion | Assumptions about background, experience, learning style | Provide written + video + pairing options. Ask about pronouns. Respect time zones. |
| No ramp-down | Week 4 ends and new hire is on their own | Buddy support tapers: daily → every other day → weekly check-ins |

## Diversity & Inclusion in Onboarding

- **Time zone respect**: Record sync meetings. Async-first communication. Buddy pairing alternates time slots.
- **Language inclusion**: Use simple English. Avoid idioms ("hit the ground running", "drink from the firehose"). Define acronyms on first use.
- **Learning styles**: Provide written docs, video walkthroughs, and live pairing. Let new hires choose.
- **Psychological safety**: "It's okay to be stuck" culture. No blame for breaking things in dev. "Ask in public, answer in public" norm.
- **Accessibility**: All onboarding docs screen-reader friendly. Caption recorded videos. Color-blind friendly diagrams. Keyboard-navigable tools.
- **Background diversity**: Don't assume familiarity with specific tools, frameworks, or conventions. Explain "why" the team chose this approach.

## Onboarding Session Templates

### Day 1: Environment & Culture
```
09:00 — Welcome call (manager + buddy)
  - Team intro, communication channels, expectations
  - Schedule recurring 1:1s (daily buddy check-in, weekly 1:1 with manager)

10:00 — Environment setup (self-paced + buddy available)
  - Run automated setup script
  - Verify clone, build, and test pass
  - Pair on any blockers

12:00 — Lunch / break

13:00 — Codebase tour (buddy-led)
  - monorepo structure overview
  - Key entry points (main.ts, router, DB schema)
  - "Where to find X" quick reference

15:00 — First PR preparation
  - Create a branch, make a trivial change (update README)
  - Open first PR
  - Learn: branch naming, commit conventions, PR template

16:30 — Retro on day 1 (new hire + buddy)
  - What was confusing?
  - Update onboarding docs with any gaps found
```

### Day 2-3: Tooling & Workflow
```
Session 1 — Editor mastery (buddy demos)
  - Debugger configuration and usage
  - Snippets, multi-cursor, find/replace patterns
  - Integrated terminal workflows
  - Git integration (blame, history, stash)

Session 2 — CI/CD pipeline walkthrough
  - Commit → CI → Review → Merge → Deploy flow
  - How to read CI logs, rerun failed jobs
  - Feature flags and canary deployments
  - Rollback procedure

Session 3 — Testing culture
  - Where tests live, naming conventions
  - Run the full test suite
  - Write a unit test + integration test (guided)
  - Learn: mocking strategy, test fixtures, snapshot review

Session 4 — Debugging hands-on
  - Buddy introduces a known bug in a sandbox branch
  - New hire debugs it: read logs, set breakpoints, fix
  - Learn: error tracking tool, logging system, local debug workflow
```

### Week 2: Domain Immersion
```
Day 1 — Small bug fix (assigned, scoped)
  - New hire independently picks up a labeled "good-first-issue"
  - Buddy reviews PR, explains reasoning behind comments
  - Goal: ship the fix by end of day

Day 2 — Architecture deep-dive (senior engineer)
  - 1-hour whiteboard session on system architecture
  - Covers: bounded contexts, events, data flow, key ADRs
  - Recorded for future hires

Day 3 — First feature (part 1)
  - Feature with clear scope: 1 API endpoint + 1 UI component
  - Pair on design review (whiteboard approach before coding)
  - Implement endpoint (independent)

Day 4 — First feature (part 2)
  - Implement UI component
  - Write tests for both
  - Open PR for review

Day 5 — First feature (part 3)
  - Address PR feedback
  - Feature flag configuration and testing
  - Deploy to staging, verify, get sign-off
  - Celebrate first shipped feature
```

## Tool-Specific Setup by OS

### Windows
```powershell
# Package manager
winget install Microsoft.PowerShell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Docker.DockerDesktop
winget install Microsoft.VisualStudioCode

# WSL2 (for Docker compatibility)
wsl --install -d Ubuntu-24.04

# Path configuration (add these to $PROFILE)
$env:Path += ";$env:USERPROFILE\AppData\Roaming\npm"
$env:Path += ";$env:USERPROFILE\.local\bin"
```

### macOS
```bash
# Homebrew (package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Core tools
brew install git node pnpm docker colima gh
brew install --cask visual-studio-code

# ASDF (version manager for all languages)
brew install asdf
asdf plugin add nodejs && asdf install nodejs latest
asdf plugin add python && asdf install python latest
asdf global nodejs latest
asdf global python latest
```

### Linux (Ubuntu/Debian)
```bash
# System packages
sudo apt update && sudo apt install -y \
  git curl wget build-essential docker.io docker-compose-v2

# Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -

# VS Code
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /etc/apt/keyrings/packages.microsoft.gpg
sudo apt install -y code
```

## Code Review Mentorship Program

### PR Review Template for New Hires
```markdown
## Review Checklist

### Correctness
- [ ] Does the code do what the ticket describes?
- [ ] Are edge cases handled (empty state, error state, loading state)?
- [ ] Are there tests for success and failure paths?
- [ ] Does the change break existing tests?

### Design & Architecture
- [ ] Does this follow the team's patterns (file structure, naming, exports)?
- [ ] Is the change at the right abstraction level?
- [ ] Could this be simpler? Fewer files, fewer conditionals?
- [ ] Are there unnecessary dependencies introduced?

### Security & Performance
- [ ] Are user inputs validated and sanitized?
- [ ] Are there N+1 queries or missing database indexes?
- [ ] Are secrets handled properly (env vars, not hardcoded)?

### Maintainability
- [ ] Are variable/function names clear?
- [ ] Is the change easy to revert?
- [ ] Would a teammate understand this in 6 months?
```

### Buddy PR Review Protocol
1. **First 3 PRs**: Buddy and new hire review together live (screen share). Buddy explains each comment and its rationale.
2. **PRs 4-7**: Buddy reviews independently, adds written comments. Pairs for 15 min to discuss feedback.
3. **PRs 8-10**: Buddy reviews + tags a second reviewer. New hire responds to feedback independently.
4. **After 10 PRs**: New hire is added to the team's reviewer rotation. Buddy is optional.

## Security Onboarding

### Day 1 Security Checklist
- [ ] Enable 2FA on GitHub/GitLab/Bitbucket
- [ ] Generate and register SSH key (ed25519)
- [ ] Set up GPG key for signed commits
- [ ] Install password manager (1Password/Bitwarden)
- [ ] Request access to: production logs (read-only), staging environment, CI/CD console, incident response tools
- [ ] Review security policy: reporting process, responsible disclosure, PII handling
- [ ] Review `.env` requirements — never commit secrets

### Secure Development Practices
```bash
# Git secrets pre-commit hook
# Prevent committing passwords, keys, tokens
git secrets --install
git secrets --register-aws

# Or use gitleaks for CI scanning
# .gitleaks.toml
[allowlist]
  description = "False positive exceptions"
  paths = [
    "test/fixtures/",
    "*.test.ts"
  ]
```

## Role-Specific Onboarding Tracks

### Frontend Engineer
- Week 1 focus: Component library, design system, storybook
- Key concepts: State management (Zustand/Redux), data fetching (React Query), CSS strategy (Tailwind/CSS modules)
- First PR: Add a component to the design system
- Architecture deep-dive: SSR vs CSR rendering, bundle optimization, image pipeline

### Backend Engineer
- Week 1 focus: API patterns, database schema, service architecture
- Key concepts: Authentication/authorization flow, message queues, caching strategy
- First PR: Add an API endpoint with input validation, tests, and OpenAPI docs
- Architecture deep-dive: Event-driven architecture, CQRS, saga patterns

### DevOps / Platform Engineer
- Week 1 focus: Infrastructure-as-code, CI/CD pipelines, monitoring stack
- Key concepts: Kubernetes clusters, service mesh, observability (logs/metrics/traces)
- First PR: Add a monitoring dashboard or update a CI workflow
- Architecture deep-dive: Cluster topology, network policy, disaster recovery

### ML / Data Engineer
- Week 1 focus: Data pipeline infrastructure, feature store, model registry
- Key concepts: Batch vs streaming, feature engineering, experiment tracking
- First PR: Add a data quality test or update a transformation pipeline
- Architecture deep-dive: Data lakehouse architecture, schema registry, lineage tracking

### Full-Stack Engineer
- Combined FE + BE track over 3 weeks
- Week 1: Full stack on a single feature (API → DB → UI)
- Week 2: Cross-cutting concerns (auth, error handling, logging)
- Week 3: Ownership of a vertical slice end-to-end

## Common Environment Gotchas by Stack

| Stack | Common Issue | Fix |
|-------|-------------|-----|
| Node.js | EACCES: permission denied for global install | Use `nvm` or `pnpm setup` — never `sudo npm install -g` |
| Node.js | Module not found after pull | `rm -rf node_modules && pnpm install` |
| Docker | Volume mounts empty on macOS | Add `:delegated` suffix to mount: `./src:/app/src:delegated` |
| Docker | Port already allocated | `lsof -ti:3000 | xargs kill` or change `docker-compose.ports` |
| Python | `pip install` fails with SSL | Upgrade pip: `pip install --upgrade pip setuptools wheel` |
| Python | `ModuleNotFoundError` | Ensure virtual env is activated and `pip install -e .` for local packages |
| Rust | `linker `cc` not found` | Install build tools: `brew install llvm` (macOS), `apt install build-essential` (Linux) |
| Rust | Slow compile times | Use `mold` linker, `cargo-chef` for Docker builds |
| Java | `Unsupported class file major version` | Mismatched JDK version — use `sdk use java 21.0.1` |
| Kubernetes | `context was canceled` | Check kubeconfig context: `kubectl config current-context`, increase `--request-timeout` |
| PostgreSQL | `role "user" does not exist` | `createuser -s postgres` or set `PGUSER=postgres` in .env |
| Redis | `NOAUTH Authentication required` | Set `REDIS_PASSWORD` in .env or disable password in dev |
| Git | `fatal: refusing to merge unrelated histories` | `git pull origin main --allow-unrelated-histories` (one-time) |

## Remote Pairing Best Practices

### Tools
| Tool | Use Case | Notes |
|------|----------|-------|
| VS Code Live Share | Real-time collaborative editing | Each developer keeps own environment, extensions, themes |
| Tuple | Low-latency screen sharing | No audio echo, 4K, macOS-first |
| tmux (terminal) | Shared terminal session | Free, works over SSH, persistent sessions |
| FigJam / Miro | Whiteboard collaboration | System design, architecture diagrams, brainstorming |
| Slack huddle | Quick voice calls | Low friction, integrates with Slack threads |

### Pairing Etiquette
- **Driver-Navigator model**: Driver types, Navigator thinks ahead. Switch every 15-20 min.
- **Ping-pong pairing**: One writes test, other implements. Switch on each test.
- **Strong-style pairing**: "For the next 10 minutes, your ideas, my hands."
- **Take breaks**: 5 min every 45 min. Block focus time before/after pairing.
- **Record sessions** (with consent): Helps async teammates and future hires.

### Async-First Pairing
For teams across 8+ time zones:
- Record architecture decisions (Loom or screen recording, < 15 min)
- Leave detailed PR comments with code contexts and reasoning
- Document pairing session outcomes in shared doc (who, what, decisions, action items)
- Use GitHub/Linear issues with acceptance criteria for handoffs
- "Follow the sun" handoff: document state clearly so next time zone can pick up

## Onboarding Metrics & Success Criteria

### Week 1 Metrics
- [ ] Environment setup complete with all tools verified
- [ ] First PR merged (even if trivial: README fix, test addition)
- [ ] Full test suite passes locally
- [ ] New hire can run the app end-to-end in dev environment
- [ ] Daily standup participation

### Month 1 Metrics
- [ ] 3+ PRs merged (at least 1 non-trivial feature or bug fix)
- [ ] Code review participation: 3+ reviews completed
- [ ] Deployed a change to production independently (with buddy review)
- [ ] Understands deployment pipeline and rollback process
- [ ] Can navigate the codebase without buddy assistance

### Quarter 1 Metrics
- [ ] Leads a small feature end-to-end (design → implementation → deploy)
- [ ] Reviews PRs as primary reviewer for other team members
- [ ] Participates in on-call rotation (if applicable)
- [ ] Contributes to architecture discussions
- [ ] Mentors a new hire (buddy role)

## Continuous Improvement

Onboarding documents should be updated after each new hire:
1. New hire flags unclear docs during setup — file an issue immediately
2. Buddy compiles "surprising" questions weekly — add to FAQ
3. At end of onboarding, new hire submits PR to improve docs
4. Quarterly, rotate a senior engineer to audit and refresh onboarding materials
5. Track "time to first PR" as a team KPI — if it trends up, investigate friction

## Handoff
core-context-compressor — summary of setup knowledge, architecture understanding, and config for continuing work
