# DevOps & Platform Engineer

**Who this is for:** You own CI/CD, infrastructure as code, Kubernetes and the internal platform.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (7 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`docker-patterns`](../../skills/devops/docker-patterns/SKILL.md) | `devops/docker-patterns` | Containerize applications following Docker best practices for development and production. |
| [`cicd-pipeline`](../../skills/devops/cicd-pipeline/SKILL.md) | `devops/cicd-pipeline` | Design and implement CI/CD pipelines with proper stages, dependency caching, parallel execution, security scanning, deployment strategies, and… |
| [`github-actions`](../../skills/devops/github-actions/SKILL.md) | `devops/github-actions` | Define CI/CD pipelines using GitHub Actions workflows, reusable workflows, and composite actions. |
| [`terraform`](../../skills/devops/terraform/SKILL.md) | `devops/terraform` | Define and enforce Terraform infrastructure provisioning patterns with module design, state management, and CI/CD integration. |
| [`kubernetes`](../../skills/devops/kubernetes/SKILL.md) | `devops/kubernetes` | Design, deploy, secure, and operate production-grade Kubernetes clusters covering architecture decisions, networking, storage, security,… |
| [`helm-patterns`](../../skills/devops/helm-patterns/SKILL.md) | `devops/helm-patterns` | Develop, test, deploy, and operate Helm charts for Kubernetes with best practices for templating, dependency management, security, CI/CD… |
| [`observability`](../../skills/devops/observability/SKILL.md) | `devops/observability` | Set up structured logging, metrics, and distributed tracing to understand system behavior in production. |

## Level 2 — Professional (10 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`gitops`](../../skills/devops/gitops/SKILL.md) | `devops/gitops` | Manage Kubernetes deployments using Git as the single source of truth with ArgoCD or Flux. |
| [`argo-cd`](../../skills/devops/argo-cd/SKILL.md) | `devops/argo-cd` | Implement GitOps workflows using Argo CD for Kubernetes deployments with sync strategies, application sets, multi-cluster management, and security… |
| [`vault`](../../skills/devops/vault/SKILL.md) | `devops/vault` | Manage secrets, encryption, and access control using HashiCorp Vault. |
| [`devops-kubernetes-autoscaling`](../../skills/devops/kubernetes-autoscaling/SKILL.md) | `devops/kubernetes-autoscaling` | Design, implement, and optimize Kubernetes autoscaling strategies using HPA, VPA, Keda, and Cluster Autoscaler to achieve cost-efficient,… |
| [`devops-policy-as-code`](../../skills/devops/policy-as-code/SKILL.md) | `devops/policy-as-code` | Implement policy as code using OPA/Rego and Kyverno: write admission policies, enforce guardrails, validate configurations, and automate… |
| [`devops-progressive-delivery`](../../skills/devops/progressive-delivery/SKILL.md) | `devops/progressive-delivery` | Implement progressive delivery strategies: canary releases, blue-green deployments, feature flags in production, traffic mirroring, and automated… |
| [`devops-service-mesh`](../../skills/devops/service-mesh/SKILL.md) | `devops/service-mesh` | Install, configure, and operate a service mesh (Istio or Linkerd) for traffic management, mTLS security, observability, and resilience patterns in… |
| [`dependency-management`](../../skills/devops/dependency-management/SKILL.md) | `devops/dependency-management` | Automate dependency updates, vulnerability scanning, and policy enforcement with Dependabot and Renovate. |
| [`monorepo`](../../skills/devops/monorepo/SKILL.md) | `devops/monorepo` | Configure and manage monorepo workspaces with Nx or Turborepo for efficient build orchestration and caching. |
| [`database-migration`](../../skills/devops/database-migration/SKILL.md) | `devops/database-migration` | Plan and execute database migrations including schema changes, cross-engine migration, zero-downtime deployments, and rollback strategies. |

## Level 3 — Specialist (9 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devops-platform-engineering`](../../skills/devops/platform-engineering/SKILL.md) | `devops/platform-engineering` | Design and build Internal Developer Platforms (IDP) that accelerate developer velocity through self-service capabilities, golden paths, and… |
| [`devops-internal-developer-platform`](../../skills/devops/internal-developer-platform/SKILL.md) | `devops/internal-developer-platform` | Design and build a production-grade Internal Developer Platform with golden paths, platform APIs, Backstage customization, and adoption measurement. |
| [`devops-kubernetes-operators`](../../skills/devops/kubernetes-operators/SKILL.md) | `devops/kubernetes-operators` | Build Kubernetes operators and custom controllers using Kubebuilder, Operator SDK, or raw controller-runtime to automate application management on… |
| [`devops-gitops-advanced`](../../skills/devops/gitops-advanced/SKILL.md) | `devops/gitops-advanced` | Implement advanced GitOps patterns: multi-cluster management, ApplicationSets, sync strategies, progressive delivery, cluster bootstrapping, and… |
| [`cilium-ebpf`](../../skills/devops/cilium-ebpf/SKILL.md) | `devops/cilium-ebpf` | Implement Cilium-based Kubernetes networking with eBPF for high-performance networking, security policies, observability, and multi-cluster… |
| [`devops-pulumi`](../../skills/devops/pulumi/SKILL.md) | `devops/pulumi` | Provision, manage, and version cloud infrastructure using Pulumi's programming language approach, enabling real code constructs (loops,… |
| [`devops-finops`](../../skills/devops/finops/SKILL.md) | `devops/finops` | Implement FinOps practices for cloud cost visibility, allocation, optimization, and governance -- covering compute, storage, Kubernetes, and… |
| [`cloud-migration`](../../skills/devops/cloud-migration/SKILL.md) | `devops/cloud-migration` | Plan and execute cloud migrations using the 7 Rs strategy framework, with tools, testing, cutover planning, and post-migration optimization. |
| [`cloud-architecture`](../../skills/devops/cloud-architecture/SKILL.md) | `devops/cloud-architecture` | Design cloud architectures following the Well-Architected Framework, landing zone patterns, multi-cloud strategies, and resilience patterns for… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill docker-patterns --skill cicd-pipeline --skill github-actions --skill terraform --skill kubernetes --skill helm-patterns --skill observability
```

**Level 1 + 2 (17 skills):**

```bash
npx skills add j4flmao/agent-skills --skill docker-patterns --skill cicd-pipeline --skill github-actions --skill terraform --skill kubernetes --skill helm-patterns --skill observability --skill gitops --skill argo-cd --skill vault --skill devops-kubernetes-autoscaling --skill devops-policy-as-code --skill devops-progressive-delivery --skill devops-service-mesh --skill dependency-management --skill monorepo --skill database-migration
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`kubernetes-platform`](../bundles.md#kubernetes-platform) | 36 | Kubernetes and platform engineering: clusters, operators, Helm, GitOps, service mesh, autoscaling, policy, IDPs |
| [`infra-foundations`](../bundles.md#infra-foundations) | 15 | Infrastructure foundations: Docker, Terraform, Ansible, Consul, networking, storage, bare metal, datacenters, hybrid cloud |
| [`serverless-edge`](../bundles.md#serverless-edge) | 9 | Serverless and edge: Lambda/Functions, cold starts, Cloudflare Workers, orchestration, event-driven scaling, CDN |
| [`devops-only`](../bundles.md#devops-only) | 68 | DevOps-only: Docker, CI/CD, K8s, monitoring, IaC, automation |
| [`infra-cloud`](../bundles.md#infra-cloud) | 36 | Infrastructure & Cloud: IaC, CI/CD, K8s, cloud providers, observability, networking |
| [`cloud-architecture`](../bundles.md#cloud-architecture) | 15 | Cloud architecture: landing zone, well-architected framework, governance, multi-cloud |

## Combine with

- [Site Reliability Engineer](sre.md)
- [Security Engineer](security.md)
- [Backend Engineer](backend.md)

## Watch out

Add only the cloud you run on (`devops/aws`, `devops/azure`, `devops/gcp`, `devops/hetzner`, …). `devops/chaos-engineering` and `site-reliability-engineering/chaos-engineering` overlap: keep one.
