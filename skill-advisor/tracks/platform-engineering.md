# Platform Engineer (IDP)

**Who this is for:** You build the internal developer platform and paved roads for product teams.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (3 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devsecops`](../../skills/security/devsecops/SKILL.md) | `security/devsecops` | Embed security directly into CI/CD pipelines to catch vulnerabilities early (shift-left). |
| [`security-container-security`](../../skills/security/container-security/SKILL.md) | `security/container-security` | Build a container security program spanning image scanning (Trivy, Grype, Clair, Snyk), Dockerfile hardening (distroless, multi-stage, non-root),… |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devops-platform-engineering`](../../skills/devops/platform-engineering/SKILL.md) | `devops/platform-engineering` | Design and build Internal Developer Platforms (IDP) that accelerate developer velocity through self-service capabilities, golden paths, and… |
| [`devops-internal-developer-platform`](../../skills/devops/internal-developer-platform/SKILL.md) | `devops/internal-developer-platform` | Design and build a production-grade Internal Developer Platform with golden paths, platform APIs, Backstage customization, and adoption measurement. |
| [`kubernetes`](../../skills/devops/kubernetes/SKILL.md) | `devops/kubernetes` | Design, deploy, secure, and operate production-grade Kubernetes clusters covering architecture decisions, networking, storage, security,… |
| [`gitops`](../../skills/devops/gitops/SKILL.md) | `devops/gitops` | Manage Kubernetes deployments using Git as the single source of truth with ArgoCD or Flux. |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devops-kubernetes-operators`](../../skills/devops/kubernetes-operators/SKILL.md) | `devops/kubernetes-operators` | Build Kubernetes operators and custom controllers using Kubebuilder, Operator SDK, or raw controller-runtime to automate application management on… |
| [`cloud-native-k8s-operators`](../../skills/cloud-native/k8s-operators/SKILL.md) | `cloud-native/k8s-operators` | An operator is a custom controller plus a CRD that encodes operational knowledge (provisioning, upgrades, failover, backup) as code. |
| [`devops-gitops-advanced`](../../skills/devops/gitops-advanced/SKILL.md) | `devops/gitops-advanced` | Implement advanced GitOps patterns: multi-cluster management, ApplicationSets, sync strategies, progressive delivery, cluster bootstrapping, and… |
| [`devops-policy-as-code`](../../skills/devops/policy-as-code/SKILL.md) | `devops/policy-as-code` | Implement policy as code using OPA/Rego and Kyverno: write admission policies, enforce guardrails, validate configurations, and automate… |
| [`devops-progressive-delivery`](../../skills/devops/progressive-delivery/SKILL.md) | `devops/progressive-delivery` | Implement progressive delivery strategies: canary releases, blue-green deployments, feature flags in production, traffic mirroring, and automated… |
| [`helm-patterns`](../../skills/devops/helm-patterns/SKILL.md) | `devops/helm-patterns` | Develop, test, deploy, and operate Helm charts for Kubernetes with best practices for templating, dependency management, security, CI/CD… |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`cloud-native-kubernetes-patterns`](../../skills/cloud-native/kubernetes-patterns/SKILL.md) | `cloud-native/kubernetes-patterns` | Design pods and their placement so workloads survive node drains, zone failures, and rollouts with zero dropped requests. |
| [`cilium-ebpf`](../../skills/devops/cilium-ebpf/SKILL.md) | `devops/cilium-ebpf` | Implement Cilium-based Kubernetes networking with eBPF for high-performance networking, security policies, observability, and multi-cluster… |
| [`devops-service-mesh`](../../skills/devops/service-mesh/SKILL.md) | `devops/service-mesh` | Install, configure, and operate a service mesh (Istio or Linkerd) for traffic management, mTLS security, observability, and resilience patterns in… |
| [`management-team-topology`](../../skills/management/team-topology/SKILL.md) | `management/team-topology` | Designs team structures aligned with stream-aligned, enabling, complicated-subsystem, and platform topologies using Conway's Law, cognitive load… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill devops-platform-engineering --skill devops-internal-developer-platform --skill kubernetes --skill gitops --skill devsecops --skill security-container-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (13 skills):**

```bash
npx skills add j4flmao/agent-skills --skill devops-platform-engineering --skill devops-internal-developer-platform --skill kubernetes --skill gitops --skill devops-kubernetes-operators --skill cloud-native-k8s-operators --skill devops-gitops-advanced --skill devops-policy-as-code --skill devops-progressive-delivery --skill helm-patterns --skill devsecops --skill security-container-security --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`kubernetes-platform`](../bundles.md#kubernetes-platform) | 36 | Kubernetes and platform engineering: clusters, operators, Helm, GitOps, service mesh, autoscaling, policy, IDPs |

## Combine with

- [DevOps & Platform Engineer](devops-platform.md)
- [Site Reliability Engineer](sre.md)

## Watch out

`devops/kubernetes-operators` and `cloud-native/k8s-operators` overlap; keep one unless you write operators daily.
