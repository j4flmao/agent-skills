---
name: readme-writer
description: >
  Use this skill when the user says 'write README', 'create README', 'README for
  this project', 'project documentation', 'README.md', or when a project needs a
  comprehensive README. Covers: project overview, features, tech stack, getting
  started guide, development setup, environment variables, testing instructions,
  deployment, architecture links, and contribution guidelines. Works with any
  project. Do NOT use this for: CHANGELOG generation, API documentation, or
  inline code documentation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, documentation, phase-4]
---

# README Writer

## Purpose
Generate a comprehensive, well-structured README.md for any project.

## Agent Protocol

### Trigger
Exact user phrases: "write README", "create README", "README for this project", "project documentation", "README.md".

### Input Context
Before activating, verify:
- The project structure and dependencies are readable.
- The project's purpose and problem statement are clear.
- The target audience (developers, users, both) is known.

### Output Artifact
Writes to `README.md` at the project root.

### Response Format
Write to `README.md` at the project root.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of what a README should contain.

### Completion Criteria
This skill is complete when:
- [ ] README covers: Overview, Features, Tech Stack, Getting Started, Development Setup, Environment Variables, Testing, Deployment.
- [ ] Installation instructions work from scratch (copy-pasteable commands).
- [ ] All links point to existing files.
- [ ] README is < 200 lines.

### Max Response Length
Direct file write. Response text: "README.md generated."

## Quick Start
Read the project structure and dependencies (package.json, Cargo.toml, etc.). Generate README with: Overview, Features, Tech Stack, Getting Started, Development, Environment Variables, Testing, Deployment.

## When to Use This Skill
- Starting a new open-source project
- A project doesn't have a README yet
- Updating an outdated README
- User explicitly requests README creation

## Core Workflow

### Step 1: Gather Project Information
Read:
- `package.json` / `Cargo.toml` / `go.mod` / `pyproject.toml` — dependencies, scripts
- `AGENTS.md` or `CLAUDE.md` — project-specific rules
- Config files — environment variables, ports
- `docs/` folder — architecture documents, ADRs
- Folder structure — understand the project layout

### Step 2: Generate README
```markdown
# Project Name
> {One-line tagline — what problem does this solve?}

## Overview
{2-3 paragraphs. What is this project? Who is it for? What makes it different?}

## Features
- {Feature 1}: {one-line description}
- {Feature 2}: {one-line description}

## Tech Stack
| Category | Technology |
|----------|-----------|
| Runtime | Node.js 22 |
| Framework | NestJS 11 |
| Database | PostgreSQL 16 |
| Message Broker | Redis / BullMQ |

## Prerequisites
- {Required software} version {x}
- {Required accounts/services}

## Getting Started

### Installation
```bash
git clone https://github.com/org/project.git
cd project
npm install
cp .env.example .env
```

### Development
```bash
npm run dev
# Server starts at http://localhost:3000
```

### Database Setup
```bash
npm run db:migrate
npm run db:seed
```

## Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | Postgres connection string |
| `JWT_SECRET` | Yes | — | JWT signing key |
| `PORT` | No | 3000 | Server port |

## Testing
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Deployment
{Deployment instructions. Link to CI/CD pipeline docs.}

## Architecture
See [docs/architecture.md](docs/architecture.md) for architecture documentation.

## Contributing
{Contribution guidelines. Link to CONTRIBUTING.md if exists.}

## License
MIT © {Author}
```

### Step 3: Verify Completeness
- [ ] Installation instructions work from scratch
- [ ] Environment variables documented
- [ ] Testing instructions work
- [ ] Links point to existing files

## Rules & Constraints
- README must work for someone who has NO prior knowledge of the project
- Include exact commands that can be copy-pasted — don't use placeholders without examples
- Link to `docs/` for detailed documentation — don't duplicate content
- Keep it concise — < 200 lines for most projects
- Badges (CI, coverage, license) at the top if available
- Screenshots/diagrams for UI projects — not for backend libraries

## Output Format
Write to `README.md` at the project root.

## References
- `references/readme-template.md` — comprehensive README template

## Handoff
After completing this skill:
- Next skill: **changelog-generator** — if release is upcoming
- Pass context: project overview, tech stack, setup instructions
