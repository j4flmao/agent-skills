# Full-Stack Product Team

**Who this is for:** One team owns UI, API, database and deployment.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (9 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`master-orchestrator`](../../skills/core/master-orchestrator/SKILL.md) | `core/master-orchestrator` | Inspect project state and route to the correct skill. |
| [`project-init`](../../skills/core/project-init/SKILL.md) | `core/project-init` | Scaffold a complete, production-ready project folder structure with AGENTS.md, .gitignore, and docs/ skeleton. |
| [`create-tech-spec`](../../skills/planning/create-tech-spec/SKILL.md) | `planning/create-tech-spec` | Produce a detailed, actionable technical specification that a developer can implement without ambiguity. |
| [`backend-api-design`](../../skills/backend/universal/api-design/SKILL.md) | `backend/universal/api-design` | Design consistent, production-grade REST or GraphQL APIs. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |
| [`backend-auth-patterns`](../../skills/backend/universal/auth-patterns/SKILL.md) | `backend/universal/auth-patterns` | Implement authentication and authorization that is secure by default. |
| [`frontend-state-management`](../../skills/frontend/universal/state-management/SKILL.md) | `frontend/universal/state-management` | Choose and implement the correct state management pattern for each type of state. |
| [`frontend-data-fetching`](../../skills/frontend/universal/data-fetching/SKILL.md) | `frontend/universal/data-fetching` | Manage server state efficiently on the client — eliminating boilerplate, providing caching, deduplication, background refetching, and optimistic… |
| [`docker-patterns`](../../skills/devops/docker-patterns/SKILL.md) | `devops/docker-patterns` | Containerize applications following Docker best practices for development and production. |

## Level 2 — Professional (9 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`github-actions`](../../skills/devops/github-actions/SKILL.md) | `devops/github-actions` | Define CI/CD pipelines using GitHub Actions workflows, reusable workflows, and composite actions. |
| [`cicd-pipeline`](../../skills/devops/cicd-pipeline/SKILL.md) | `devops/cicd-pipeline` | Design and implement CI/CD pipelines with proper stages, dependency caching, parallel execution, security scanning, deployment strategies, and… |
| [`e2e-testing`](../../skills/quality/e2e-testing/SKILL.md) | `quality/e2e-testing` | Configure and write reliable end-to-end browser tests with framework selection, page objects, parallel execution, and CI integration. |
| [`quality-integration-testing`](../../skills/quality/integration-testing/SKILL.md) | `quality/integration-testing` | Design and implement integration tests that verify components work together: API integration, database integration, external service mocking, and… |
| [`frontend-design-system`](../../skills/frontend/universal/design-system/SKILL.md) | `frontend/universal/design-system` | Build a three-tier design token system with CVA-based component variants and theme-aware architecture. |
| [`backend-caching`](../../skills/backend/universal/caching/SKILL.md) | `backend/universal/caching` | Design consistent, production-grade caching layers. |
| [`backend-background-jobs`](../../skills/backend/universal/background-jobs/SKILL.md) | `backend/universal/background-jobs` | Design reliable background job processing with queue topology, retry, concurrency, and monitoring. |
| [`code-review`](../../skills/dev-loop/code-review/SKILL.md) | `dev-loop/code-review` | Provide systematic, structured code reviews covering correctness, architecture, clarity, performance, security, and tests. |
| [`dev-loop-pr-writer`](../../skills/dev-loop/pr-writer/SKILL.md) | `dev-loop/pr-writer` | Write effective pull request descriptions — clear, structured, and reviewable — that communicate what changed, why it changed, and how it was… |

## Level 3 — Specialist (6 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`observability`](../../skills/devops/observability/SKILL.md) | `devops/observability` | Set up structured logging, metrics, and distributed tracing to understand system behavior in production. |
| [`devops-progressive-delivery`](../../skills/devops/progressive-delivery/SKILL.md) | `devops/progressive-delivery` | Implement progressive delivery strategies: canary releases, blue-green deployments, feature flags in production, traffic mirroring, and automated… |
| [`backend-feature-flags`](../../skills/backend/universal/feature-flags/SKILL.md) | `backend/universal/feature-flags` | Design feature flag systems with lifecycle management, targeting, and risk controls. |
| [`frontend-performance`](../../skills/frontend/universal/performance/SKILL.md) | `frontend/universal/performance` | Optimize Core Web Vitals (LCP, CLS, INP) and bundle size. |
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`database-migration`](../../skills/devops/database-migration/SKILL.md) | `devops/database-migration` | Plan and execute database migrations including schema changes, cross-engine migration, zero-downtime deployments, and rollback strategies. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (9 skills):**

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-tech-spec --skill backend-api-design --skill backend-database-patterns --skill backend-auth-patterns --skill frontend-state-management --skill frontend-data-fetching --skill docker-patterns
```

**Level 1 + 2 (18 skills):**

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-tech-spec --skill backend-api-design --skill backend-database-patterns --skill backend-auth-patterns --skill frontend-state-management --skill frontend-data-fetching --skill docker-patterns --skill github-actions --skill cicd-pipeline --skill e2e-testing --skill quality-integration-testing --skill frontend-design-system --skill backend-caching --skill backend-background-jobs --skill code-review --skill dev-loop-pr-writer
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-nestjs-react`](../bundles.md#fullstack-nestjs-react) | 225 | Full stack: NestJS backend + React frontend |
| [`fullstack-golang-vue`](../bundles.md#fullstack-golang-vue) | 218 | Full stack: Go backend + Vue frontend |
| [`fullstack-rust-angular`](../bundles.md#fullstack-rust-angular) | 217 | Full stack: Rust backend + Angular frontend |
| [`fullstack-dotnet-react`](../bundles.md#fullstack-dotnet-react) | 218 | Full stack: C# .NET backend + React frontend |
| [`fullstack-nodejs-react`](../bundles.md#fullstack-nodejs-react) | 223 | Full stack: Node.js backend + React frontend |
| [`fullstack-elysia-react`](../bundles.md#fullstack-elysia-react) | 218 | Full stack: ElysiaJS (Bun) backend + React frontend |
| [`fullstack-rails-svelte`](../bundles.md#fullstack-rails-svelte) | 216 | Full stack: Ruby on Rails backend + SvelteKit frontend |

## Combine with

- [Frontend Engineer](frontend.md)
- [Backend Engineer](backend.md)
- [DevOps & Platform Engineer](devops-platform.md)

## Watch out

The `fullstack-*` bundles are broad (216–225 skills). Start from Level 1–2 here plus your stack folders, and move to a full bundle only if the agent keeps missing skills.
