# Open-Source Maintainer

**Who this is for:** You run a public repository with contributors and releases.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-sbom`](../../skills/security/sbom/SKILL.md) | `security/sbom` | Design an SBOM generation pipeline with format selection, vulnerability correlation, license compliance, and policy enforcement for software… |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`dev-loop-readme-writer`](../../skills/dev-loop/readme-writer/SKILL.md) | `dev-loop/readme-writer` | Write clear, structured, and effective README files that help users and contributors understand, install, use, and contribute to a project. |
| [`dev-loop-changelog-generator`](../../skills/dev-loop/changelog-generator/SKILL.md) | `dev-loop/changelog-generator` | Generate structured, human-readable changelogs and release notes from conventional commit history, GitHub release data, or JIRA release versions. |
| [`dev-loop-pr-writer`](../../skills/dev-loop/pr-writer/SKILL.md) | `dev-loop/pr-writer` | Write effective pull request descriptions — clear, structured, and reviewable — that communicate what changed, why it changed, and how it was… |
| [`dev-loop-git-workflow`](../../skills/dev-loop/git-workflow/SKILL.md) | `dev-loop/git-workflow` | Establish and maintain effective Git workflows — branching strategy, commit conventions, merge patterns, and history management — that enable team… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`github-actions`](../../skills/devops/github-actions/SKILL.md) | `devops/github-actions` | Define CI/CD pipelines using GitHub Actions workflows, reusable workflows, and composite actions. |
| [`dependency-management`](../../skills/devops/dependency-management/SKILL.md) | `devops/dependency-management` | Automate dependency updates, vulnerability scanning, and policy enforcement with Dependabot and Renovate. |
| [`conflict-resolution`](../../skills/tools/git/conflict-resolution/SKILL.md) | `tools/git/conflict-resolution` | Conflicts are Git asking a human to combine two edits of the same region; most bad resolutions come from not seeing the common ancestor or… |
| [`husky-and-hooks`](../../skills/tools/git/husky-and-hooks/SKILL.md) | `tools/git/husky-and-hooks` | Client-side hooks catch formatting, lint and commit-message problems seconds after they are made instead of minutes later in CI. |
| [`code-review`](../../skills/dev-loop/code-review/SKILL.md) | `dev-loop/code-review` | Provide systematic, structured code reviews covering correctness, architecture, clarity, performance, security, and tests. |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`advanced-workflows`](../../skills/tools/git/advanced-workflows/SKILL.md) | `tools/git/advanced-workflows` | A Git workflow is a contract between developers, CI and release tooling. |
| [`enterprise-release-engineering`](../../skills/enterprise/release-engineering/SKILL.md) | `enterprise/release-engineering` | Keep many teams integrating continuously into a shared mainline so that integration cost stays small and releases are routine. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill dev-loop-readme-writer --skill dev-loop-changelog-generator --skill dev-loop-pr-writer --skill dev-loop-git-workflow --skill security-sbom --skill security-secrets-management
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill dev-loop-readme-writer --skill dev-loop-changelog-generator --skill dev-loop-pr-writer --skill dev-loop-git-workflow --skill github-actions --skill dependency-management --skill conflict-resolution --skill husky-and-hooks --skill code-review --skill security-sbom --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`dev-workflow`](../bundles.md#dev-workflow) | 23 | Developer workflow: code review, debugging, refactoring, git, PRs, changelogs, dev containers, CI, monorepos, dependencies |

## Combine with

- [QA & Test Engineer](quality.md)
- [Tech Lead & Staff Engineer](tech-lead.md)

## Watch out

Public CI runs untrusted pull requests: never expose secrets to `pull_request` jobs from forks.
