# Skill Combination Advisor

This repository ships **641 skills** and **59 bundles**. Installing everything makes agents slower and less precise, so this advisor helps you pick a small, well-matched set for your role and project.

## How to choose in 3 steps

1. **Pick your track** below — the role or direction closest to your work.
2. **Pick a level** — start at Level 1, add Level 2 when the project needs it, add Level 3 skills one by one.
3. **Combine** — add a second track or a recipe only for what the first one does not cover; remove overlapping skills.

| Level | Size | Use it when |
|-------|------|-------------|
| **Level 1 — Essentials** | 2–9 skills | Everyday work of the role; safe default for any project |
| **Level 2 — Professional** | +6–12 skills | Production concerns: scaling, security, delivery, team workflow |
| **Level 3 — Specialist** | add one at a time | Deep, narrow problems you actually have right now |

## Pick your track

### Build products

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Frontend Engineer](tracks/frontend.md) | You build web UIs with React, Vue, Angular, Svelte or similar. | 29 | [`frontend-foundations`](bundles.md#frontend-foundations) |
| [Backend Engineer](tracks/backend.md) | You build APIs and services in any language. | 30 | [`backend-patterns`](bundles.md#backend-patterns) |
| [Full-Stack Product Team](tracks/fullstack.md) | One team owns UI, API, database and deployment. | 24 | [`fullstack-nestjs-react`](bundles.md#fullstack-nestjs-react) |
| [Mobile Engineer](tracks/mobile.md) | You ship iOS, Android or cross-platform apps. | 22 | [`mobile-ios`](bundles.md#mobile-ios) |
| [Desktop App Engineer](tracks/desktop.md) | You build native or cross-platform desktop applications. | 13 | [`desktop-all`](bundles.md#desktop-all) |
| [Designer & Design Engineer](tracks/design-ux.md) | You design interfaces and build design systems. | 15 | [`design-ux`](bundles.md#design-ux) |

### Run and secure systems

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [DevOps & Platform Engineer](tracks/devops-platform.md) | You own CI/CD, infrastructure as code, Kubernetes and the internal platform. | 26 | [`kubernetes-platform`](bundles.md#kubernetes-platform) |
| [Site Reliability Engineer](tracks/sre.md) | You own uptime, SLOs, incidents and capacity. | 17 | [`sre-reliability`](bundles.md#sre-reliability) |
| [Security Engineer](tracks/security.md) | You secure applications, cloud and operations. | 23 | [`security-all`](bundles.md#security-all) |
| [QA & Test Engineer](tracks/quality.md) | You own test strategy, automation and release confidence. | 18 | [`quality-testing`](bundles.md#quality-testing) |

### Data and AI

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Data Engineer](tracks/data-engineering.md) | You build pipelines, warehouses, lakes and streaming systems. | 29 | [`data-engineering`](bundles.md#data-engineering) |
| [ML & AI Engineer](tracks/ml-ai.md) | You train, evaluate and serve models, or build LLM applications. | 22 | [`ml-engineering`](bundles.md#ml-engineering) |
| [AI Agent Builder](tracks/ai-agents.md) | You build tool-using LLM agents, multi-agent systems and their harnesses. | 21 | [`ai-agents`](bundles.md#ai-agents) |

### Specialized engineering

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Systems & Embedded Engineer](tracks/systems.md) | You write low-level, embedded, kernel or performance-critical code. | 21 | [`systems-programming`](bundles.md#systems-programming) |
| [Game Developer](tracks/game.md) | You build games, engines or game servers. | 23 | [`game-development`](bundles.md#game-development) |
| [Blockchain & Web3 Engineer](tracks/blockchain.md) | You write smart contracts, dApps or blockchain infrastructure. | 18 | [`blockchain-all`](bundles.md#blockchain-all) |
| [Software & Solution Architect](tracks/architecture.md) | You design systems, write ADRs and govern architecture. | 22 | [`architecture-system-design`](bundles.md#architecture-system-design) |

### Product and people

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Product Manager & Planner](tracks/product.md) | You define what to build: research, specs, roadmaps and growth. | 22 | [`product-growth`](bundles.md#product-growth) |
| [Engineering Manager & Delivery Lead](tracks/management.md) | You run teams, delivery, risk and stakeholders. | 16 | [`management-only`](bundles.md#management-only) |

## I want to…

| Goal | Start here |
|------|-----------|
| Ship a SaaS MVP fast | [Recipe 1](recipes.md#1-saas-mvp-web) |
| Build an LLM / RAG product | [Recipe 2](recipes.md#2-ai-saas-with-rag), then [ML & AI](tracks/ml-ai.md) |
| Build AI agents | [AI Agent Builder](tracks/ai-agents.md) |
| Stop agents producing generic "AI-looking" UI | [Recipe 4](recipes.md#4-ui-that-does-not-look-ai-generated) |
| Launch a mobile app | [Recipe 3](recipes.md#3-mobile-app-with-a-managed-backend), then [Mobile](tracks/mobile.md) |
| Run Kubernetes for many teams | [Recipe 5](recipes.md#5-kubernetes-platform-team) |
| Pass a security review | [Recipe 6](recipes.md#6-security-review-before-launch) |
| Install a whole bundle | [Bundles](bundles.md) |
| Make my own team bundle | [Build a custom bundle](custom-bundles.md) |

## Install

The [`skills` CLI](https://github.com/vercel-labs/skills) installs skills by name; repeat `--skill` for each one:

```bash
npx skills add j4flmao/agent-skills --list
npx skills add j4flmao/agent-skills --skill backend-api-design --skill backend-idempotency -a claude-code
```

Every track page has ready commands for Level 1 and Level 1 + 2, and every bundle has its command on the [bundles page](bundles.md).

## Pages

- [Bundles](bundles.md) — every bundle with its install command and team skill pack
- [Build a custom bundle](custom-bundles.md) — combine bundles, pick single skills, share a set with your team
- [Recipes](recipes.md) — small combinations for common situations
- Tracks: [Frontend Engineer](tracks/frontend.md), [Backend Engineer](tracks/backend.md), [Full-Stack Product Team](tracks/fullstack.md), [Mobile Engineer](tracks/mobile.md), [Desktop App Engineer](tracks/desktop.md), [Designer & Design Engineer](tracks/design-ux.md), [DevOps & Platform Engineer](tracks/devops-platform.md), [Site Reliability Engineer](tracks/sre.md), [Security Engineer](tracks/security.md), [QA & Test Engineer](tracks/quality.md), [Data Engineer](tracks/data-engineering.md), [ML & AI Engineer](tracks/ml-ai.md), [AI Agent Builder](tracks/ai-agents.md), [Systems & Embedded Engineer](tracks/systems.md), [Game Developer](tracks/game.md), [Blockchain & Web3 Engineer](tracks/blockchain.md), [Software & Solution Architect](tracks/architecture.md), [Product Manager & Planner](tracks/product.md), [Engineering Manager & Delivery Lead](tracks/management.md)

Tracks list 365 hand-picked skills. The rest are reachable through [bundles](bundles.md) and the full catalog in the [master summary](../docs/skills-master-summary.md#skills-by-category).
