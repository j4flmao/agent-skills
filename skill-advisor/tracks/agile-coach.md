# Agile Coach & Scrum Master

**Who this is for:** You improve how teams plan, deliver and learn.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`agile-scrum-kanban`](../../skills/management/agile-scrum-kanban/SKILL.md) | `management/agile-scrum-kanban` | Choose the delivery approach that fits the work's arrival pattern, then make flow visible and predictable: explicit board policies, WIP limits,… |
| [`sprint-retro`](../../skills/management/sprint-retro/SKILL.md) | `management/sprint-retro` | Help a team inspect how it worked and commit to one to three concrete improvements per sprint — then verify they happened. |
| [`team-rules`](../../skills/management/team-rules/SKILL.md) | `management/team-rules` | Establish team collaboration protocols covering code review, branch strategy, communication, incident response, decision-making, working… |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`management-team-topology`](../../skills/management/team-topology/SKILL.md) | `management/team-topology` | Designs team structures aligned with stream-aligned, enabling, complicated-subsystem, and platform topologies using Conway's Law, cognitive load… |
| [`management-change-management`](../../skills/management/change-management/SKILL.md) | `management/change-management` | Drives organizational change using ADKAR, Kotter 8-Step, and stakeholder impact analysis frameworks with measurable adoption outcomes. |
| [`management-okr-kpi`](../../skills/management/okr-kpi/SKILL.md) | `management/okr-kpi` | Define, cascade, and track Objectives and Key Results (OKRs) alongside KPIs for teams and individuals. |
| [`management-stakeholder`](../../skills/management/stakeholder/SKILL.md) | `management/stakeholder` | Develop a stakeholder management strategy that maps influence and interest (power/influence grid, salience model), establishes clear communication… |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`management-risk-management`](../../skills/management/risk-management/SKILL.md) | `management/risk-management` | Identify, assess, and mitigate project and technical risks through a structured risk register. |
| [`dev-loop-tech-debt-tracker`](../../skills/dev-loop/tech-debt-tracker/SKILL.md) | `dev-loop/tech-debt-tracker` | Systematically identify, track, prioritize, and reduce technical debt — establishing a quantifiable, transparent process that balances feature… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill agile-scrum-kanban --skill sprint-retro --skill team-rules
```

**Level 1 + 2 (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill agile-scrum-kanban --skill sprint-retro --skill team-rules --skill management-team-topology --skill management-change-management --skill management-okr-kpi --skill management-stakeholder
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`management-only`](../bundles.md#management-only) | 66 | Management: PM, BA, QA, QC, security, pentesting, alerting, team-rules |

## Combine with

- [Engineering Manager & Delivery Lead](management.md)
- [Product Manager & Planner](product.md)

## Watch out

`management/agile-scrum` duplicates `agile-scrum-kanban`; keep the Kanban one.
