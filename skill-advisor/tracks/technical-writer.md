# Technical Writer & Docs Engineer

**Who this is for:** You write READMEs, API docs, specs and changelogs.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`dev-loop-readme-writer`](../../skills/dev-loop/readme-writer/SKILL.md) | `dev-loop/readme-writer` | Write clear, structured, and effective README files that help users and contributors understand, install, use, and contribute to a project. |
| [`backend-openapi-documentation`](../../skills/backend/universal/openapi-documentation/SKILL.md) | `backend/universal/openapi-documentation` | Drive all API development with an OpenAPI 3.x spec-first workflow: spec defines the contract, code is generated from it, and the spec is versioned… |
| [`api-documentation`](../../skills/devops/api-documentation/SKILL.md) | `devops/api-documentation` | Design and maintain API documentation following OpenAPI 3.x specification, docs-as-code workflows, and developer portal best practices. |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`create-tech-spec`](../../skills/planning/create-tech-spec/SKILL.md) | `planning/create-tech-spec` | Produce a detailed, actionable technical specification that a developer can implement without ambiguity. |
| [`dev-loop-changelog-generator`](../../skills/dev-loop/changelog-generator/SKILL.md) | `dev-loop/changelog-generator` | Generate structured, human-readable changelogs and release notes from conventional commit history, GitHub release data, or JIRA release versions. |
| [`agent-walkthrough-report`](../../skills/planning/agent-walkthrough-report/SKILL.md) | `planning/agent-walkthrough-report` | After finishing work, give the reader a report they can trust and scan in a minute: what changed (with paths), why, the actual verification… |
| [`agent-observability`](../../skills/harness-engineering/agent-observability/SKILL.md) | `harness-engineering/agent-observability` | This skill provides the complete knowledge required to build production-grade observability systems for AI agent deployments. |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`planning-bpmn-modeling`](../../skills/planning/bpmn-modeling/SKILL.md) | `planning/bpmn-modeling` | Design, document, and analyze business processes using BPMN 2.0 standards for process improvement and automation. |
| [`design-information-architecture`](../../skills/design/information-architecture/SKILL.md) | `design/information-architecture` | Design information architecture: organize content, create navigation systems, define taxonomies, design user flows, and ensure findability across… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill dev-loop-readme-writer --skill backend-openapi-documentation --skill api-documentation
```

**Level 1 + 2 (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill dev-loop-readme-writer --skill backend-openapi-documentation --skill api-documentation --skill create-tech-spec --skill dev-loop-changelog-generator --skill agent-walkthrough-report --skill agent-observability
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`planning-docs`](../bundles.md#planning-docs) | 17 | Planning and specification documents: briefs, PRDs, stories, tech specs, roadmaps, BDD/ATDD, BPMN, cost-benefit, agent plans |
| [`dev-workflow`](../bundles.md#dev-workflow) | 23 | Developer workflow: code review, debugging, refactoring, git, PRs, changelogs, dev containers, CI, monorepos, dependencies |

## Combine with

- [Product Manager & Planner](product.md)
- [Open-Source Maintainer](oss-maintainer.md)

## Watch out

`backend/universal/openapi-documentation` and `devops/api-documentation` overlap; keep the backend one for spec-first work.
