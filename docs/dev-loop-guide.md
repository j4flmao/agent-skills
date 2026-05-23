# Dev Loop Skills Guide

12 skills covering the inner development loop: code review, debugging, refactoring, security auditing, performance profiling, changelog generation, readme writing, PR writing, git workflow, dev container setup, tech debt tracking, and API client generation.

## Skill Map

| Skill | Directory | Focus |
|-------|-----------|-------|
| API Client Generator | `skills/dev-loop/api-client-generator/` | OpenAPI→client, typed wrappers, endpoint stubs |
| Changelog Generator | `skills/dev-loop/changelog-generator/` | Keep a Changelog, conventional commits, auto-release |
| Code Review | `skills/dev-loop/code-review/` | Review checklist, security scan, diff analysis |
| Debugging Strategy | `skills/dev-loop/debugging-strategy/` | Root cause, bisect, logging, REPL debugging |
| Dev Container | `skills/dev-loop/dev-container/` | Devcontainer.json, Docker, VS Code remote |
| Git Workflow | `skills/dev-loop/git-workflow/` | Branch strategy, commit conventions, merge vs rebase |
| Performance Profiler | `skills/dev-loop/performance-profiler/` | CPU, memory, I/O profiling, flame graphs |
| PR Writer | `skills/dev-loop/pr-writer/` | PR templates, changelog, reviewers, description |
| Readme Writer | `skills/dev-loop/readme-writer/` | Setup, API docs, badges, examples, contribution |
| Refactor Guide | `skills/dev-loop/refactor-guide/` | Code smells, extraction, patterns, testing strategy |
| Security Auditor | `skills/dev-loop/security-auditor/` | Dependency audit, SAST, secrets, container scan |
| Tech Debt Tracker | `skills/dev-loop/tech-debt-tracker/` | Debt catalog, prioritization, repayment plan |

## Decision Framework

```
Starting a new feature?
  1. dev-loop/git-workflow — branch from main
  2. dev-loop/dev-container — consistent environment
  3. Write code
  4. dev-loop/code-review — self-review before PR
  5. dev-loop/debugging-strategy — fix any issues
  6. dev-loop/pr-writer — create PR
  7. dev-loop/changelog-generator — update changelog

Maintaining existing code?
  1. dev-loop/refactor-guide — identify smells
  2. dev-loop/tech-debt-tracker — catalog debt
  3. dev-loop/security-auditor — scan for vulns
  4. dev-loop/performance-profiler — profile hotspots

Shipping a project?
  1. dev-loop/readme-writer — document setup/usage
  2. dev-loop/api-client-generator — generate SDKs
  3. dev-loop/changelog-generator — release notes
```

## Dev Loop Flow

```
┌─────────────────────────────────────────────────────┐
│                  INNER DEV LOOP                       │
│                                                       │
│  Plan → [Dev Container] → Code → [Debug] → Test      │
│                                          │            │
│  ┌────────────────────────────────────────┘           │
│  ▼                                                     │
│  Code Review → [Security] → [Perf] → PR Writer        │
│                                          │            │
│  ┌────────────────────────────────────────┘           │
│  ▼                                                     │
│  Merge → Changelog → [Readme] → Deploy                │
│                                                       │
│  [Tech Debt] ← periodic backlog review                │
└─────────────────────────────────────────────────────┘
```

## Skills List

- `skills/dev-loop/api-client-generator/SKILL.md`
- `skills/dev-loop/changelog-generator/SKILL.md`
- `skills/dev-loop/code-review/SKILL.md`
- `skills/dev-loop/debugging-strategy/SKILL.md`
- `skills/dev-loop/dev-container/SKILL.md`
- `skills/dev-loop/git-workflow/SKILL.md`
- `skills/dev-loop/performance-profiler/SKILL.md`
- `skills/dev-loop/pr-writer/SKILL.md`
- `skills/dev-loop/readme-writer/SKILL.md`
- `skills/dev-loop/refactor-guide/SKILL.md`
- `skills/dev-loop/security-auditor/SKILL.md`
- `skills/dev-loop/tech-debt-tracker/SKILL.md`
