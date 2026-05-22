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

## Rules

- **First PR merged by end of week 1** — If the new hire has not shipped code to main by the end of their first Friday, the onboarding process or the development environment is the problem. Fix the process, do not pressure the person.
- **Buddy system is mandatory for all new joiners** — Every new joiner has a dedicated onboarding buddy assigned before their start date. The buddy is not their manager. The buddy is a peer who pairs on the first PR, answers unlimited questions, and provides a safe first point of contact for at least the first 2 weeks.
- **Environment setup must be fully push-button** — Zero manual configuration steps should be required. A single command (`bin/setup`, `make setup`, `npm run setup`) takes the developer from an empty clone to a running dev server. Any step that cannot be automated must be documented as technical debt with a tracking ticket.
- **New hires improve the documentation as their first contribution** — When a new hire finds missing, incorrect, or outdated documentation, their first pull request fixes it. This ensures the onboarding experience continuously and automatically improves for every future team member.
- **Pair on the first pull request** — The first PR is pair-programmed with the onboarding buddy. This teaches the development workflow, code review process, testing expectations, and team coding standards in a real context with a safety net.
- **Week 1 measures learning and understanding, not output** — The goal of the first week is understanding the system, building confidence, and establishing relationships. Feedback should focus on code quality and learning, not on velocity. Production speed comes in weeks 2 through 4.
- **The buddy gets capacity relief during onboarding** — The assigned buddy should have their sprint capacity reduced by approximately 20% during the 2-week buddy period. Effective onboarding requires real-time availability and focused attention — it is real work.
- **Collect structured retro feedback from the new hire** — After week 1 and again after month 1, collect structured feedback from the new hire: what was confusing, what was most helpful, what documentation was wrong or missing, what improved their confidence. Feed these learnings back into the onboarding plan and project documentation.

## References

- [Onboarding Checklist](references/onboarding-checklist.md)

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
