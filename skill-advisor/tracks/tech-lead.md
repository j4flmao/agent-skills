# Tech Lead & Staff Engineer

**Who this is for:** You set technical direction, review code and keep quality up.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`threat-modeling`](../../skills/security/threat-modeling/SKILL.md) | `security/threat-modeling` | Identify and mitigate architectural security flaws during the design phase, before any code is written. |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`code-review`](../../skills/dev-loop/code-review/SKILL.md) | `dev-loop/code-review` | Provide systematic, structured code reviews covering correctness, architecture, clarity, performance, security, and tests. |
| [`dev-loop-refactor-guide`](../../skills/dev-loop/refactor-guide/SKILL.md) | `dev-loop/refactor-guide` | Systematically improve code structure, readability, maintainability, and extensibility without changing external behavior — applying proven… |
| [`create-tech-spec`](../../skills/planning/create-tech-spec/SKILL.md) | `planning/create-tech-spec` | Produce a detailed, actionable technical specification that a developer can implement without ambiguity. |
| [`dev-loop-tech-debt-tracker`](../../skills/dev-loop/tech-debt-tracker/SKILL.md) | `dev-loop/tech-debt-tracker` | Systematically identify, track, prioritize, and reduce technical debt — establishing a quantifiable, transparent process that balances feature… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`architecture-domain-driven-design`](../../skills/architecture/system-design/domain-driven-design/SKILL.md) | `architecture/system-design/domain-driven-design` | DDD aligns software structure with the business: a shared language inside explicit boundaries, models that enforce business invariants, and… |
| [`backend-clean-architecture`](../../skills/backend/universal/clean-architecture/SKILL.md) | `backend/universal/clean-architecture` | Enforce strict layer separation in backend code. |
| [`team-rules`](../../skills/management/team-rules/SKILL.md) | `management/team-rules` | Establish team collaboration protocols covering code review, branch strategy, communication, incident response, decision-making, working… |
| [`dev-loop-performance-profiler`](../../skills/dev-loop/performance-profiler/SKILL.md) | `dev-loop/performance-profiler` | Identify, analyze, and resolve performance bottlenecks in applications — CPU profiling, memory profiling, I/O analysis, database query… |
| [`dev-loop-security-auditor`](../../skills/dev-loop/security-auditor/SKILL.md) | `dev-loop/security-auditor` | Systematically identify, assess, and remediate security vulnerabilities in applications — including dependency vulnerabilities, code-level flaws,… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`enterprise-architecture-governance`](../../skills/enterprise/architecture-governance/SKILL.md) | `enterprise/architecture-governance` | Guides establishment and operation of architecture governance including Architecture Review Board operations, decision rights frameworks,… |
| [`management-team-topology`](../../skills/management/team-topology/SKILL.md) | `management/team-topology` | Designs team structures aligned with stream-aligned, enabling, complicated-subsystem, and platform topologies using Conway's Law, cognitive load… |
| [`system-architect`](../../skills/personas/system-architect/SKILL.md) | `personas/system-architect` | Adopt the mindset of a Staff System Architect: assume failure, make explicit CAP trade-offs, favor event-driven/async decoupling, engineer HA with… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill code-review --skill dev-loop-refactor-guide --skill create-tech-spec --skill dev-loop-tech-debt-tracker --skill threat-modeling
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill code-review --skill dev-loop-refactor-guide --skill create-tech-spec --skill dev-loop-tech-debt-tracker --skill architecture-domain-driven-design --skill backend-clean-architecture --skill team-rules --skill dev-loop-performance-profiler --skill dev-loop-security-auditor --skill threat-modeling
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`dev-workflow`](../bundles.md#dev-workflow) | 23 | Developer workflow: code review, debugging, refactoring, git, PRs, changelogs, dev containers, CI, monorepos, dependencies |
| [`architecture-system-design`](../bundles.md#architecture-system-design) | 23 | Software and solution architecture: system design, DDD, microservices, event-driven, CQRS/ES, sagas, CRDTs, sharding, consensus, ADRs |

## Combine with

- [Software & Solution Architect](architecture.md)
- [Engineering Manager & Delivery Lead](management.md)

## Watch out

Use `planning/create-tech-spec` for design docs; the ADR template lives in `.claude/rules/solution-architecture.md`.
