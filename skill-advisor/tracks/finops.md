# FinOps & Cloud Cost Engineer

**Who this is for:** You make cloud spend visible, accountable and lower.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devops-finops`](../../skills/devops/finops/SKILL.md) | `devops/finops` | Implement FinOps practices for cloud cost visibility, allocation, optimization, and governance -- covering compute, storage, Kubernetes, and… |
| [`cloud-cost-optimization`](../../skills/devops/cloud-cost-optimization/SKILL.md) | `devops/cloud-cost-optimization` | Comprehensive description of cloud cost optimization. |
| [`enterprise-finops-cloud-cost`](../../skills/enterprise/finops-cloud-cost/SKILL.md) | `enterprise/finops-cloud-cost` | Treat cloud cost as an engineering metric with an owner. |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`enterprise-cost-governance`](../../skills/enterprise/cost-governance/SKILL.md) | `enterprise/cost-governance` | Implements cloud cost governance frameworks including allocation, budgeting, chargeback/showback, anomaly detection, and optimization. |
| [`data-cost-optimization`](../../skills/data/data-cost-optimization/SKILL.md) | `data/data-cost-optimization` | Analyze, optimize, and manage cloud data platform costs across Snowflake, BigQuery, and S3, implementing FinOps practices for cost allocation,… |
| [`devops-kubernetes-autoscaling`](../../skills/devops/kubernetes-autoscaling/SKILL.md) | `devops/kubernetes-autoscaling` | Design, implement, and optimize Kubernetes autoscaling strategies using HPA, VPA, Keda, and Cluster Autoscaler to achieve cost-efficient,… |
| [`ml-inference-optimization`](../../skills/ml/inference-optimization/SKILL.md) | `ml/inference-optimization` | Serve LLMs at the required latency for the lowest cost. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`cloud-architecture`](../../skills/devops/cloud-architecture/SKILL.md) | `devops/cloud-architecture` | Design cloud architectures following the Well-Architected Framework, landing zone patterns, multi-cloud strategies, and resilience patterns for… |
| [`devops-serverless`](../../skills/devops/serverless/SKILL.md) | `devops/serverless` | Design, deploy, and operate serverless functions (AWS Lambda, Azure Functions, GCP Cloud Functions) with event-driven patterns, cold start… |
| [`planning-cost-benefit`](../../skills/planning/cost-benefit/SKILL.md) | `planning/cost-benefit` | Produce a defensible cost-benefit analysis quantifying investment costs, expected benefits, ROI, NPV, payback period, and sensitivity ranges to… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill devops-finops --skill cloud-cost-optimization --skill enterprise-finops-cloud-cost
```

**Level 1 + 2 (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill devops-finops --skill cloud-cost-optimization --skill enterprise-finops-cloud-cost --skill enterprise-cost-governance --skill data-cost-optimization --skill devops-kubernetes-autoscaling --skill ml-inference-optimization
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`infra-cloud`](../bundles.md#infra-cloud) | 36 | Infrastructure & Cloud: IaC, CI/CD, K8s, cloud providers, observability, networking |
| [`cloud-architecture`](../bundles.md#cloud-architecture) | 15 | Cloud architecture: landing zone, well-architected framework, governance, multi-cloud |

## Combine with

- [Cloud Architect & Engineer](cloud.md)
- [Engineering Manager & Delivery Lead](management.md)

## Watch out

`devops/finops` and `enterprise/finops-cloud-cost` overlap; engineers keep the DevOps one, finance-facing roles the enterprise one.
