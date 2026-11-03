# Product Manager & Planner

**Who this is for:** You define what to build: research, specs, roadmaps and growth.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (6 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`create-brief`](../../skills/planning/create-brief/SKILL.md) | `planning/create-brief` | Transform a vague product idea into a structured, one-page Product Brief. |
| [`create-prd`](../../skills/planning/create-prd/SKILL.md) | `planning/create-prd` | Expand a Product Brief into a comprehensive Product Requirements Document with epics, user stories (Gherkin), non-functional requirements, and… |
| [`create-story`](../../skills/planning/create-story/SKILL.md) | `planning/create-story` | Generate a single, well-defined implementation story from the PRD backlog, complete with acceptance criteria, technical notes, and complexity… |
| [`planning-create-roadmap`](../../skills/planning/create-roadmap/SKILL.md) | `planning/create-roadmap` | Build strategic product roadmaps that align stakeholder priorities with team capacity. |
| [`product-user-research`](../../skills/product/user-research/SKILL.md) | `product/user-research` | Designs and executes user research studies including interviews, usability testing, insight synthesis, and persona development. |
| [`pm`](../../skills/management/pm/SKILL.md) | `management/pm` | Provide structured project management workflows covering agile ceremonies, estimation, risk management, stakeholder communication, and status… |

## Level 2 — Professional (9 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`product-analytics`](../../skills/product/analytics/SKILL.md) | `product/analytics` | Turn user behaviour into decisions: pick a small set of metrics tied to value, instrument a consistent event taxonomy that answers them, and… |
| [`product-ab-testing`](../../skills/product/ab-testing/SKILL.md) | `product/ab-testing` | Designs and analyzes A/B tests with rigorous hypothesis formation, experiment design, statistical frameworks, and decision criteria. |
| [`product-onboarding-flow`](../../skills/product/onboarding-flow/SKILL.md) | `product/onboarding-flow` | Designs and optimizes user onboarding flows including activation milestones, funnel mapping, progressive disclosure, and experimentation. |
| [`product-pricing-strategy`](../../skills/product/pricing-strategy/SKILL.md) | `product/pricing-strategy` | Designs product pricing strategy including value metric identification, model selection, packaging, and willingness-to-pay research. |
| [`product-go-to-market`](../../skills/product/go-to-market/SKILL.md) | `product/go-to-market` | Designs go-to-market plans for product launches including target market definition, channel selection, launch tiering, messaging, and rollout… |
| [`product-customer-journey`](../../skills/product/customer-journey/SKILL.md) | `product/customer-journey` | Analyzes and optimizes customer journeys through journey mapping, service blueprinting, quantitative funnel analysis, and experimentation to… |
| [`product-persona-development`](../../skills/product/persona-development/SKILL.md) | `product/persona-development` | Creates data-driven user personas with empathy maps and connects them to feature decisions, enabling user-centered product design and prioritization. |
| [`management-okr-kpi`](../../skills/management/okr-kpi/SKILL.md) | `management/okr-kpi` | Define, cascade, and track Objectives and Key Results (OKRs) alongside KPIs for teams and individuals. |
| [`planning-market-analysis`](../../skills/planning/market-analysis/SKILL.md) | `planning/market-analysis` | Produce data-driven market and competitive analyses to inform product strategy. |

## Level 3 — Specialist (7 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`product-growth-engineering`](../../skills/product/growth-engineering/SKILL.md) | `product/growth-engineering` | Designs and executes growth engineering initiatives including growth loops, activation optimization, viral mechanics, and experimentation pipelines. |
| [`data-science-experimentation`](../../skills/data-science/experimentation/SKILL.md) | `data-science/experimentation` | Design and analyze rigorous A/B tests and experiments. |
| [`data-science-causal-inference`](../../skills/data-science/causal-inference/SKILL.md) | `data-science/causal-inference` | Estimate causal effects from observational and experimental data using rigorous frameworks and methods: causal frameworks (potential outcomes /… |
| [`planning-create-pitch-deck`](../../skills/planning/create-pitch-deck/SKILL.md) | `planning/create-pitch-deck` | Craft compelling investor pitch decks following storytelling best practices. |
| [`planning-cost-benefit`](../../skills/planning/cost-benefit/SKILL.md) | `planning/cost-benefit` | Produce a defensible cost-benefit analysis quantifying investment costs, expected benefits, ROI, NPV, payback period, and sensitivity ranges to… |
| [`planning-bpmn-modeling`](../../skills/planning/bpmn-modeling/SKILL.md) | `planning/bpmn-modeling` | Design, document, and analyze business processes using BPMN 2.0 standards for process improvement and automation. |
| [`product-manager`](../../skills/personas/product-manager/SKILL.md) | `personas/product-manager` | Adopt the mindset of a Principal Product Manager: map every feature to an OKR, prioritize ruthlessly (RICE), write user-problem stories, and… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill create-brief --skill create-prd --skill create-story --skill planning-create-roadmap --skill product-user-research --skill pm
```

**Level 1 + 2 (15 skills):**

```bash
npx skills add j4flmao/agent-skills --skill create-brief --skill create-prd --skill create-story --skill planning-create-roadmap --skill product-user-research --skill pm --skill product-analytics --skill product-ab-testing --skill product-onboarding-flow --skill product-pricing-strategy --skill product-go-to-market --skill product-customer-journey --skill product-persona-development --skill management-okr-kpi --skill planning-market-analysis
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`product-growth`](../bundles.md#product-growth) | 18 | Product management and growth: discovery, analytics, A/B tests, pricing, GTM, onboarding, roadmaps, PRDs, OKRs |
| [`planning-docs`](../bundles.md#planning-docs) | 17 | Planning and specification documents: briefs, PRDs, stories, tech specs, roadmaps, BDD/ATDD, BPMN, cost-benefit, agent plans |
| [`management-only`](../bundles.md#management-only) | 66 | Management: PM, BA, QA, QC, security, pentesting, alerting, team-rules |

## Combine with

- [Designer & Design Engineer](design-ux.md)
- [Engineering Manager & Delivery Lead](management.md)

## Watch out

These skills write documents; pair them with one engineering track so specs stay buildable.
