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
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Core Onboarding

## Purpose
Accelerate new team member ramp-up through structured Day 1 / Week 1 onboarding. Covers environment setup, architecture overview, development workflow, and team practices so new joiners ship their first code change by the end of week one.

Great onboarding is a competitive advantage for engineering organizations. New hires who ship their first pull request within their first week are retained at significantly higher rates and reach full productivity much faster than those who spend weeks in setup and documentation reading. This skill produces a structured onboarding plan with a day-by-day checklist, automated environment setup commands, a guided architecture tour, and a practical team practices guide. Crucially, every missing or incorrect piece of documentation that a new hire discovers becomes their first pull request — fixing the documentation for the next person while learning the workflow. Onboarding is not a one-time event; it is a continuous improvement process driven by the people who just experienced it.

The economics of onboarding investment are clear: every hour spent improving onboarding saves dozens of hours across future new hires. A team that hires 5 people per year and reduces ramp-up time from 4 weeks to 2 weeks saves roughly 10 weeks of collective productivity annually. The investment required — maintaining a setup script, keeping documentation current, assigning a buddy — is trivial compared to the return.

The feedback loop is what makes onboarding sustainable. Every new hire who finds missing or inaccurate documentation and fixes it as their first PR creates a self-improving system. The onboarding process gets better with every new joiner rather than degrading as documentation drifts from reality. This turns the natural friction of onboarding into a mechanism for continuous documentation improvement.

## Agent Protocol

### Trigger
"onboarding", "new developer", "new team member", "setup guide", "getting started", "dev environment setup", "new joiner", "ramp up"

### Input Context
- Project repository URL and the default branch name (main, master, or develop)
- Technology stack details: primary programming language(s) and specific versions, framework(s), database system(s) and versions, message queue system, cache system, cloud infrastructure platform
- Team size, team structure, and key contact people: engineering manager, tech lead, assigned onboarding buddy, DevOps or platform contact, product manager, designer contact
- CI/CD pipeline details: CI provider name (GitHub Actions, GitLab CI, CircleCI, Jenkins, Buildkite), exact commands for lint, typecheck, test, build, deployment targets and environment names
- Development workflow rules: branch naming convention with examples, PR template location, minimum required reviewers, required CI checks, merge strategy (squash, rebase, or merge commit), release process and cadence
- Environment requirements: supported host operating systems, minimum hardware specifications, reserved port ranges, required system dependencies and tools
- Documentation structure: exact paths for ADRs, API documentation, runbooks, incident response guides, architecture diagrams

### Output Artifact
Onboarding plan with day-by-day checklist, environment setup commands in executable order, architecture overview with key directories and request flow, and a team practices reference guide

### Response Format
- Day 1 through Day 5 checklist with time estimates for each activity, expected outcome, and a verification step to confirm completion
- Environment setup as ordered, copy-paste-ready command blocks: clone the repo → install the runtime → install project dependencies → configure environment variables → start the dev server → verify the health endpoint → run the test suite
- Architecture overview: a table of key directories (path, purpose, what to find inside), a sequential text diagram of the complete request flow, and a stage-by-stage deployment pipeline map
- Team practices section: standup time and participation format, communication channels with their specific purposes, documentation conventions with concrete examples, on-call rotation schedule and the escalation path
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Complete onboarding checklist verified. The new developer has a running development environment confirmed by a health endpoint returning HTTP 200. They can describe the project's request flow from memory. They have created, reviewed, and merged their first pull request to the main branch.

### Max Response Length
3000 tokens

## Onboarding Flow Design

### Day 1 — Welcome and Environment
The first day focuses entirely on environment setup and the welcome experience. Before the developer arrives, ensure the following are ready: a GitHub/GitLab repository invitation has been sent, cloud infrastructure access (AWS IAM, GCP project, or Azure subscription) has been provisioned with read-only permissions, a 1Password or Vault entry with shared credentials is created, and the onboarding buddy's calendar is blocked for pairing sessions. The developer starts by cloning the repository, reading the project README, and running the setup script. The buddy pairs on the first setup run to catch any missing dependencies or documentation gaps. By the end of day 1, the developer should have a running dev server confirmed by a health endpoint returning HTTP 200. Any missing or incorrect setup step is immediately filed as a documentation issue and becomes the developer's first task for day 2.

### Day 2 — Architecture Tour
The second day walks the developer through the project's architecture. The buddy or tech lead leads a 60-minute architecture walkthrough covering: the directory structure (src/, tests/, docs/, scripts/, infra/), the complete request flow from client to database and back, the deployment pipeline stages (commit → CI → build → staging → prod), the event/message topology (queues, topics, streams), and key infrastructure dependencies (databases, caches, search engines, CDNs). The developer draws the request flow from memory at the end of the session. Gaps in the developer's understanding inform the focus for day 3. The architecture walkthrough also covers the code review workflow, testing pyramid expectations, and the definition of done for pull requests.

### Day 3 — First Code Change
The third day is about making the first meaningful code change. The developer picks a small, well-scoped ticket — typically a documentation fix, a minor bug, or a small feature enhancement with clear acceptance criteria. The buddy pairs on the full workflow: creating a feature branch from main, making the change, writing tests, running the test suite locally, pushing the branch, and opening a draft pull request. The buddy reviews the draft PR focusing on the workflow (branch naming, commit messages, PR description format, CI checks) rather than code quality. The goal is to complete the development cycle, not to produce perfect code. By the end of day 3, a draft PR exists and CI is green.

### Day 4 — PR Review and Merge
The fourth day completes the first pull request cycle. The buddy and a second reviewer perform a thorough code review covering logic, correctness, design, security, and test quality. The developer responds to each review comment, makes requested changes, and pushes additional commits. The buddy ensures the developer understands every review comment — if a comment is unclear, the buddy rephrases it rather than answering for the developer. The PR is merged using the team's standard merge strategy (squash by default). The developer celebrates the merge and verifies the change in the staging environment.

### Day 5 — Reflect and Plan
The fifth day consolidates the week's learning. The developer writes a brief retrospective covering: what was confusing, what was most helpful, what documentation was wrong or missing, and what they will focus on in week 2. The engineering manager and buddy review the retro and prioritize the top three documentation or process improvements. The developer is assigned their first independent ticket (still small, still well-scoped) for week 2. The buddy relationship continues but shifts from active pairing to async support with daily check-ins.

### Welcome Message Template
```
Welcome to the team! Your onboarding buddy is {buddy_name}. Here is your week 1 plan:
- Day 1: Environment setup — goal: health endpoint returns 200
- Day 2: Architecture tour — goal: draw the request flow from memory
- Day 3: First code change — goal: draft PR open with green CI
- Day 4: PR review and merge — goal: first PR merged to main
- Day 5: Retro and planning — goal: documented learnings and next ticket
Your buddy has blocked time for pairing. Slack channel {#engineering} for questions.
```

### Environment Setup Checklist
Before environment setup begins, verify these prerequisites are met: the latest stable version of the OS is installed, at least 16GB RAM and 4 CPU cores are available, Docker Desktop or Rancher Desktop is installed with at least 20GB of disk allocated to containers, Git is configured with the user's name and email and SSH keys are added to GitHub/GitLab, and the appropriate package manager (Homebrew, Chocolatey, apt) is available. The runtime version manager must be installed first: asdf (recommended for polyglot repos with .tool-versions), nvm (Node.js only with .nvmrc), pyenv (Python with .python-version), or rbenv (Ruby with .ruby-version). If the project has a devcontainer configuration (.devcontainer/devcontainer.json), the developer should be offered the option of using it instead of a native setup — devcontainers eliminate environment variance entirely.

### Tool Installation Guide
Language-specific tools to install: Node.js via the version manager (with npm or pnpm as the package manager), Python via pyenv (with Poetry or pip-tools), Go via gvm or the official installer, Rust via rustup, Java via sdkman (with Maven or Gradle). Database clients: psql for PostgreSQL, mysql CLI for MySQL, redis-cli for Redis, mongosh for MongoDB. Infrastructure CLIs: AWS CLI v2, gcloud SDK, az CLI, kubectl, terraform, helm, docker, docker-compose. Formatters and linters: the project's configured tools such as ESLint, Prettier, ruff, black, gofmt, clippy. All tools should be installed via the version manager where possible to allow easy version switching across projects.

### First-Run Experience
The first-run experience is the moment of truth for onboarding. The bin/setup script should handle: checking system prerequisites with clear error messages if anything is missing, installing the correct runtime version, installing project dependencies (npm ci, pip install -e ., go mod download), creating the .env file from .env.example with sensible defaults for local development, creating or migrating the local database, running seed data if applicable, starting the dev server with hot-reload, and running a health check to confirm the server is responding. Each step prints a clear status (PASS/FAIL/SKIP) and the overall result is printed at the end. If any step fails, the script prints the exact command that failed and a link to the relevant troubleshooting section in the docs.

### Context Loading and Persistence
After the setup completes, the developer should understand how the application loads its configuration. Environment variables are loaded from .env by the framework's config module. Feature flags come from LaunchDarkly or a local JSON file. Secrets are fetched from the vault (1Password CLI, AWS Secrets Manager, or Vault agent) using a setup script. The developer's local configuration should persist across sessions — any tool-specific config (editor settings, git hooks, linter overrides) is committed to the repository so all developers share the same defaults.

### Customization
Allow developers to customize their local setup without affecting the shared configuration. Local override files (.env.local, .eslintrc.local, .prettierrc.local) are gitignored and override the shared defaults. Editor settings go in .vscode/ or .idea/ and are committed as shared team defaults. The developer can enable or disable optional services (mail catcher, job queue worker, asset compilation watcher) via environment variables or docker-compose profiles. Customization always preserves the principle that the dev server is a faithful replica of the production stack at the service level.

### Troubleshooting
Common setup issues and their solutions: port conflicts (kill the process on the reserved port or change the local port mapping), database connection refused (check that the database container is running and the .env DATABASE_URL is correct), missing system dependencies (install via the system package manager with the command printed by the setup script), node-gyp or native module build failures (install build-essential, python3, and the C++ compiler), Docker resource exhaustion (increase Docker Desktop memory allocation or prune unused containers and images), authentication failures (re-authenticate with the vault or cloud provider CLI), network timeouts behind a corporate proxy (set HTTP_PROXY and HTTPS_PROXY environment variables in .env.local).

## Workflow

1. **Environment setup** — Produce step-by-step instructions as executable command blocks in strict order. Step 1: clone the repository from the provided URL. Step 2: install the correct language runtime version using the project's version manager (asdf with .tool-versions, nvm with .nvmrc, pyenv with .python-version, rbenv with .ruby-version, sdkman with .sdkmanrc). Step 3: install all project dependencies using the project's package manager. Step 4: configure the environment by copying `.env.example` to `.env` and filling in each variable with a note on where to find the actual value. Step 5: start the development server and confirm the health endpoint returns an HTTP 200 response. Step 6: run the full test suite and confirm all tests pass. If the project lacks a `bin/setup` or equivalent automation script, create one that encapsulates all these steps as part of the onboarding PR.

2. **Architecture overview** — Walk the project's directory structure. Explain the purpose and contents of each top-level directory: `src/` or `app/` contains the application source code organized by feature modules or bounded contexts. `tests/` or `spec/` mirrors the source directory structure and contains all automated test suites (unit, integration, e2e). `docs/` contains architecture decision records in `adr/`, API documentation in `api/`, runbooks in `runbooks/`, and architecture diagrams in `diagrams/`. `scripts/` holds automation scripts for development setup, database operations, and deployment. `infra/` or `ops/` contains infrastructure-as-code configuration (Terraform, Kubernetes manifests, CloudFormation, Docker Compose files). Describe the complete request flow: a client request enters through the CDN, reaches the load balancer, passes through the API gateway for routing and authentication, hits the application service which queries the database (with optional cache check), optionally publishes to a message queue for async processing, and returns the response through the same chain. Map the deployment pipeline: a developer pushes a commit to a feature branch, the CI provider triggers a pipeline that runs linting, type checking, unit tests, integration tests, builds a Docker image, pushes it to the container registry, deploys to a staging environment, runs smoke tests, and then deploys to production using either a blue-green or canary release strategy.

3. **Development workflow** — Document the branch strategy: all feature branches are created from the main branch (never from other feature branches). The naming convention uses a prefix and a short description: `feature/user-login`, `fix/PROJ-123-null-pointer`, `chore/upgrade-deps`. Describe the PR workflow: create a draft PR early to signal your intent and get early feedback, self-review your diff before requesting a review to catch obvious issues, request reviews from the auto-suggested reviewers or explicitly tag your onboarding buddy, address review feedback with additional commits (avoid force-pushing during active review), and merge using the squash strategy to keep a clean, linear main branch history. Document the CI pipeline: every push triggers a pipeline of lint → typecheck → unit tests → integration tests → security scan → build. If the pipeline fails at any stage, it must be fixed before the review can proceed. Document testing expectations: every new feature requires unit tests, every bug fix requires a test that reproduces the bug, API changes require integration tests, and critical user journeys require end-to-end tests. The minimum code coverage threshold for new code is 80%. Document the code review culture: reviewers should respond within 4 business hours of a review request, reviews should focus on logic, correctness, design, and security (linters and formatters handle style), and reviewers should choose either "approve" or "request changes" — a passive comment-only review without explicit approval or change request is not acceptable.

4. **Team practices** — Document the standup schedule: same time every day, same video platform, same format — each person briefly shares what they did yesterday, what they will do today, and what is blocking them. Standups should complete within 15 minutes for teams up to 10 people. Document communication channels: Slack or Discord for asynchronous day-to-day communication organized by topic channels (#engineering, #incidents, #releases, #random, #design), scheduled video calls for agile ceremonies (standup, sprint planning, retro, demo), GitHub for all code-related discussions (PR comments, issue discussions, ADR reviews), and a dedicated on-call channel for incident communication with real-time alerting. Document documentation conventions: ADRs use the standard template with title, status, context, decision, consequences — each ADR is a markdown file with a unique sequential ID stored in `docs/adr/`. API documentation lives alongside the source code as OpenAPI specification files. Architecture diagrams are maintained in `docs/diagrams/` with the source format noted (Mermaid, Draw.io, or Excalidraw). Runbooks are in `docs/runbooks/` and cover deployment procedures, rollback procedures, incident response steps, and common troubleshooting guides.

## Models

### Week 1 Onboarding Target
| Day | Goal | How to Verify |
|---|---|---|
| Day 1 end | Development environment fully running | Health endpoint returns HTTP 200 |
| Day 2 end | Architecture understood at high level | Can describe request flow without notes |
| Day 3 end | First meaningful code change made | Draft pull request is open |
| Day 5 end | First pull request merged to main | PR merged with all checks green |

### Role Responsibilities Matrix
| Role | Pre-Start | Day 1 | Week 1 | Week 2+ |
|---|---|---|---|---|
| Engineering Manager | Provision access, assign buddy | Welcome message, intro to team | Weekly 1:1 check-in | Normal 1:1 cadence |
| Onboarding Buddy | Block calendar, prepare pairing | Pair on setup, first walkthrough | Pair on first PR, daily check-in | Async check-ins, tapering |
| Tech Lead | Prepare arch walkthrough | Architecture tour (60 min) | Review first PR | Normal rotation |
| DevOps Contact | Verify IAM, vault access | Unblock setup issues | Monitor access needs | On-call shadowing |
| New Developer | Read project docs | Setup, first test run | First PR merged | First independent ticket |

## Rules

- **First PR merged by end of week 1** — If the new hire has not shipped code to main by the end of their first Friday, the onboarding process or the development environment is the problem. Fix the process, do not pressure the person.
- **Buddy system is mandatory for all new joiners** — Every new joiner has a dedicated onboarding buddy assigned before their start date. The buddy is not their manager. The buddy is a peer who pairs on the first PR, answers unlimited questions, and provides a safe first point of contact for at least the first 2 weeks.
- **Environment setup must be fully push-button** — Zero manual configuration steps should be required. A single command (`bin/setup`, `make setup`, `npm run setup`) takes the developer from an empty clone to a running dev server. Any step that cannot be automated must be documented as technical debt with a tracking ticket.
- **New hires improve the documentation as their first contribution** — When a new hire finds missing, incorrect, or outdated documentation, their first pull request fixes it. This ensures the onboarding experience continuously and automatically improves for every future team member.
- **Pair on the first pull request** — The first PR is pair-programmed with the onboarding buddy. This teaches the development workflow, code review process, testing expectations, and team coding standards in a real context with a safety net.
- **Week 1 measures learning and understanding, not output** — The goal of the first week is understanding the system, building confidence, and establishing relationships. Feedback should focus on code quality and learning, not on velocity. Production speed comes in weeks 2 through 4.
- **The buddy gets capacity relief during onboarding** — The assigned buddy should have their sprint capacity reduced by approximately 20% during the 2-week buddy period. Effective onboarding requires real-time availability and focused attention — it is real work.
- **Collect structured retro feedback from the new hire** — After week 1 and again after month 1, collect structured feedback from the new hire: what was confusing, what was most helpful, what documentation was wrong or missing, what improved their confidence. Feed these learnings back into the onboarding plan and project documentation.

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
| Day 5 3:00 PM | Manager + buddy + new hire | 30 min | Week 1 retro |
| Daily (async) | Buddy | 15 min | Slack check-in at noon |

## Buddy Responsibilities

### Week 1 Buddy Checklist
The onboarding buddy's role is clearly defined and time-boxed. Before day 1, the buddy: blocks calendar for Mon-Wed 9-12 and Thu-Fri 10-11, prepares a small scoped ticket with clear acceptance criteria, reviews any known environment setup issues, and sets up a pairing environment (VS Code Live Share, tmux, or Tuple). During day 1, the buddy: pairs on bin/setup execution, documents any missing setup steps as issues, guides through the first test suite run, and explains the project README and ARCHITECTURE.md. During days 2-3, the buddy: walks through the request flow, explains the deployment pipeline, pairs on the first code change and test writing, and guides through opening a draft PR. During days 4-5, the buddy: reviews the first PR, explains each review comment, celebrates the merge, and leads the retro session. After week 1, the buddy transitions to async support with daily check-ins, reducing to every-other-day in week 2, and weekly in weeks 3-4.

### Buddy Offboarding
After 4 weeks, the buddy relationship formally ends with a final check-in. The buddy writes a brief handoff note for the manager covering: areas where the new hire is strong, areas that need more support, documentation improvements made, and any ongoing process improvement recommendations. The manager takes over as the primary support contact.

## Continuous Improvement Loop

### Retrospective Structure
After week 1 and month 1, the new hire provides structured feedback in three categories:
1. **What worked well**: environment setup, documentation, buddy support, architecture walkthrough
2. **What was confusing**: unclear documentation, missing steps, unanswered questions, process friction
3. **What should change**: documentation gaps, tool issues, process improvements, team practices

### Feedback Integration
Each retro produces actionable items: documentation updates (assigned to the buddy as a ticket), process changes (escalated to the engineering manager for the next sprint), tool improvements (filed in the infrastructure backlog), and team practice updates (raised in the next retro or team meeting). The retro document is stored in the team's shared drive for future reference and trend analysis. After 3 new hires have completed onboarding, the team reviews all retro findings to identify systemic issues.

## References
- `references/buddy-system-guide.md` — Buddy System Guide
- `references/onboarding-flow.md` — Onboarding Flow
- `references/ramp-up-plan.md` — Ramp Up Plan
- `references/setup-checklist.md` — Setup Checklist

## Related Skills

- **core-context-compressor** — Summarize setup decisions, architecture understanding, and config for continuing work
- **project-init** — Standardize project structure, tooling, and configuration before onboarding begins
- **dev-container** — Set up or improve the dev container for reproducible development environments
- **git-workflow** — Teach branch strategy, conventional commits, and the PR review process
- **code-review** — Guide new team members through their first code review with structured templates
- **team-rules** — Document team working agreements, coding standards, and communication conventions
- **security-auditor** — Introduce secure coding practices and security review expectations early
- **debugging-strategy** — Teach debugging workflows, logging practices, and troubleshooting approaches
- **performance-profiler** — Introduce performance profiling expectations and tooling used by the team

## Handoff
core-context-compressor
