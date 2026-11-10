# Cloud Architect & Engineer

**Who this is for:** You design and run workloads on AWS, Azure or GCP.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (3 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`cloud-native-security-defensive`](../../skills/cloud-native/cloud-security-defensive/SKILL.md) | `cloud-native/cloud-security-defensive` | Turn a cloud estate into one where dangerous actions are prevented by organization-level guardrails, everything else is logged centrally and… |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |
| [`zero-trust-identity`](../../skills/cybersecurity/zero-trust-identity/SKILL.md) | `cybersecurity/zero-trust-identity` | Explain Zero Trust identity mechanics — OIDC/OAuth2 flows (Authorization Code + PKCE), JWT signature validation (RS256 vs HS256 and… |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`cloud-architecture`](../../skills/devops/cloud-architecture/SKILL.md) | `devops/cloud-architecture` | Design cloud architectures following the Well-Architected Framework, landing zone patterns, multi-cloud strategies, and resilience patterns for… |
| [`terraform`](../../skills/devops/terraform/SKILL.md) | `devops/terraform` | Define and enforce Terraform infrastructure provisioning patterns with module design, state management, and CI/CD integration. |
| [`devops-finops`](../../skills/devops/finops/SKILL.md) | `devops/finops` | Implement FinOps practices for cloud cost visibility, allocation, optimization, and governance -- covering compute, storage, Kubernetes, and… |

## Level 2 — Professional (7 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`aws`](../../skills/devops/aws/SKILL.md) | `devops/aws` | Design, deploy, and manage AWS infrastructure following the Well-Architected Framework with service decision trees, networking patterns, security… |
| [`devops-azure`](../../skills/devops/azure/SKILL.md) | `devops/azure` | Provision and operate Azure infrastructure using Bicep, AKS, Azure DevOps pipelines, and Azure-native networking with landing zone design,… |
| [`devops-gcp`](../../skills/devops/gcp/SKILL.md) | `devops/gcp` | Provision and operate Google Cloud infrastructure using GKE, Cloud Run, Cloud Functions, Terraform, and GCP-native networking with cost… |
| [`devops-serverless`](../../skills/devops/serverless/SKILL.md) | `devops/serverless` | Design, deploy, and operate serverless functions (AWS Lambda, Azure Functions, GCP Cloud Functions) with event-driven patterns, cold start… |
| [`cloud-migration`](../../skills/devops/cloud-migration/SKILL.md) | `devops/cloud-migration` | Plan and execute cloud migrations using the 7 Rs strategy framework, with tools, testing, cutover planning, and post-migration optimization. |
| [`backup-dr`](../../skills/devops/backup-dr/SKILL.md) | `devops/backup-dr` | Design and implement backup strategies and disaster recovery plans with defined RPO/RTO, the 3-2-1 rule, automation, validation, and cloud DR… |
| [`cdn-edge`](../../skills/devops/cdn-edge/SKILL.md) | `devops/cdn-edge` | Design and implement content delivery networks with caching strategies, edge computing, WAF, DDoS mitigation, and performance optimization across… |

## Level 3 — Specialist (9 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devops-pulumi`](../../skills/devops/pulumi/SKILL.md) | `devops/pulumi` | Provision, manage, and version cloud infrastructure using Pulumi's programming language approach, enabling real code constructs (loops,… |
| [`hybrid-cloud`](../../skills/devops/hybrid-cloud/SKILL.md) | `devops/hybrid-cloud` | Design and operate hybrid cloud architectures that span on-premises data centers and public cloud providers, with secure networking, consistent… |
| [`enterprise-finops-cloud-cost`](../../skills/enterprise/finops-cloud-cost/SKILL.md) | `enterprise/finops-cloud-cost` | Treat cloud cost as an engineering metric with an owner. |
| [`cloud-cost-optimization`](../../skills/devops/cloud-cost-optimization/SKILL.md) | `devops/cloud-cost-optimization` | Comprehensive description of cloud cost optimization. |
| [`oracle-cloud`](../../skills/devops/oracle-cloud/SKILL.md) | `devops/oracle-cloud` | Manage Oracle Cloud Infrastructure resources: compute, networking, storage, IAM, OKE (Kubernetes), Autonomous Database, and cost governance. |
| [`digitalocean`](../../skills/devops/digitalocean/SKILL.md) | `devops/digitalocean` | Design, deploy, and manage DigitalOcean infrastructure using Terraform, doctl, and best practices for Droplets, Kubernetes, managed databases, and… |
| [`hetzner-cloud`](../../skills/devops/hetzner/SKILL.md) | `devops/hetzner` | Manage Hetzner Cloud and Dedicated infrastructure: servers, networking, volumes, firewalls, load balancers, Storage Boxes, and Kubernetes clusters. |
| [`ibm-cloud`](../../skills/devops/ibm-cloud/SKILL.md) | `devops/ibm-cloud` | Manage IBM Cloud resources: VPC infrastructure, IKS (Kubernetes), Object Storage, IAM, networking, and automation with Terraform and Schematics. |
| [`alibaba-cloud`](../../skills/devops/alibaba-cloud/SKILL.md) | `devops/alibaba-cloud` | Design, deploy, and manage Alibaba Cloud infrastructure using Terraform/Alibaba Cloud CLI with security, cost optimization, and operational… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill cloud-architecture --skill terraform --skill devops-finops --skill cloud-native-security-defensive --skill security-secrets-management --skill zero-trust-identity
```

**Level 1 + 2 + security baseline (13 skills):**

```bash
npx skills add j4flmao/agent-skills --skill cloud-architecture --skill terraform --skill devops-finops --skill aws --skill devops-azure --skill devops-gcp --skill devops-serverless --skill cloud-migration --skill backup-dr --skill cdn-edge --skill cloud-native-security-defensive --skill security-secrets-management --skill zero-trust-identity
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`infra-cloud`](../bundles.md#infra-cloud) | 36 | Infrastructure & Cloud: IaC, CI/CD, K8s, cloud providers, observability, networking |
| [`cloud-architecture`](../bundles.md#cloud-architecture) | 15 | Cloud architecture: landing zone, well-architected framework, governance, multi-cloud |
| [`serverless-edge`](../bundles.md#serverless-edge) | 9 | Serverless and edge: Lambda/Functions, cold starts, Cloudflare Workers, orchestration, event-driven scaling, CDN |

## Combine with

- [DevOps & Platform Engineer](devops-platform.md)
- [Site Reliability Engineer](sre.md)

## Watch out

Install only the providers you use from Level 2 and 3; every extra cloud skill competes for the same requests.
