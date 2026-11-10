# Engineering Manager & Delivery Lead

**Who this is for:** You run teams, delivery, risk and stakeholders.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security`](../../skills/management/security/SKILL.md) | `management/security` | Define security team operations including vulnerability management, security review gates, incident response, tool selection, and compliance mapping. |

## Level 1 — Essentials (5 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`agile-scrum-kanban`](../../skills/management/agile-scrum-kanban/SKILL.md) | `management/agile-scrum-kanban` | Choose the delivery approach that fits the work's arrival pattern, then make flow visible and predictable: explicit board policies, WIP limits,… |
| [`sprint-retro`](../../skills/management/sprint-retro/SKILL.md) | `management/sprint-retro` | Help a team inspect how it worked and commit to one to three concrete improvements per sprint — then verify they happened. |
| [`management-stakeholder`](../../skills/management/stakeholder/SKILL.md) | `management/stakeholder` | Develop a stakeholder management strategy that maps influence and interest (power/influence grid, salience model), establishes clear communication… |
| [`management-risk-management`](../../skills/management/risk-management/SKILL.md) | `management/risk-management` | Identify, assess, and mitigate project and technical risks through a structured risk register. |
| [`team-rules`](../../skills/management/team-rules/SKILL.md) | `management/team-rules` | Establish team collaboration protocols covering code review, branch strategy, communication, incident response, decision-making, working… |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`management-hiring`](../../skills/management/hiring/SKILL.md) | `management/hiring` | Design a structured hiring process with objective rubrics, consistent evaluation, bias-resistant practices, and clear decision criteria for… |
| [`management-team-topology`](../../skills/management/team-topology/SKILL.md) | `management/team-topology` | Designs team structures aligned with stream-aligned, enabling, complicated-subsystem, and platform topologies using Conway's Law, cognitive load… |
| [`management-change-management`](../../skills/management/change-management/SKILL.md) | `management/change-management` | Drives organizational change using ADKAR, Kotter 8-Step, and stakeholder impact analysis frameworks with measurable adoption outcomes. |
| [`management-okr-kpi`](../../skills/management/okr-kpi/SKILL.md) | `management/okr-kpi` | Define, cascade, and track Objectives and Key Results (OKRs) alongside KPIs for teams and individuals. |
| [`cost-benefit`](../../skills/management/cost-benefit/SKILL.md) | `management/cost-benefit` | Evaluate technology investments through ROI, TCO, break-even, and NPV analysis to support data-driven decision-making. |
| [`dev-loop-tech-debt-tracker`](../../skills/dev-loop/tech-debt-tracker/SKILL.md) | `dev-loop/tech-debt-tracker` | Systematically identify, track, prioritize, and reduce technical debt — establishing a quantifiable, transparent process that balances feature… |

## Level 3 — Specialist (5 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`enterprise-itil-service-mgmt`](../../skills/enterprise/itil-service-mgmt/SKILL.md) | `enterprise/itil-service-mgmt` | Guides IT service management practice using the ITIL 4 framework across the full service lifecycle including incident, problem, change, release,… |
| [`enterprise-vendor-management`](../../skills/enterprise/vendor-management/SKILL.md) | `enterprise/vendor-management` | Guides end-to-end vendor management from selection through performance management, contract negotiation, and risk oversight for third-party providers. |
| [`enterprise-release-engineering`](../../skills/enterprise/release-engineering/SKILL.md) | `enterprise/release-engineering` | Keep many teams integrating continuously into a shared mainline so that integration cost stays small and releases are routine. |
| [`enterprise-compliance-audit`](../../skills/enterprise/compliance-audit/SKILL.md) | `enterprise/compliance-audit` | Guides compliance audits from framework selection through evidence packaging and remediation tracking. |
| [`enterprise-cost-governance`](../../skills/enterprise/cost-governance/SKILL.md) | `enterprise/cost-governance` | Implements cloud cost governance frameworks including allocation, budgeting, chargeback/showback, anomaly detection, and optimization. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill agile-scrum-kanban --skill sprint-retro --skill management-stakeholder --skill management-risk-management --skill team-rules --skill security
```

**Level 1 + 2 + security baseline (12 skills):**

```bash
npx skills add j4flmao/agent-skills --skill agile-scrum-kanban --skill sprint-retro --skill management-stakeholder --skill management-risk-management --skill team-rules --skill management-hiring --skill management-team-topology --skill management-change-management --skill management-okr-kpi --skill cost-benefit --skill dev-loop-tech-debt-tracker --skill security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`management-only`](../bundles.md#management-only) | 66 | Management: PM, BA, QA, QC, security, pentesting, alerting, team-rules |
| [`enterprise`](../bundles.md#enterprise) | 18 | Enterprise: governance, compliance, identity, multi-tenancy, legacy migration, ITIL, vendors, FinOps, release engineering |

## Combine with

- [Product Manager & Planner](product.md)
- [QA & Test Engineer](quality.md)

## Watch out

`management/agile-scrum` and `management/agile-scrum-kanban` overlap; keep `agile-scrum-kanban`.
