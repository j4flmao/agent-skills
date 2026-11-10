# Site Reliability Engineer

**Who this is for:** You own uptime, SLOs, incidents and capacity.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |
| [`security-container-security`](../../skills/security/container-security/SKILL.md) | `security/container-security` | Build a container security program spanning image scanning (Trivy, Grype, Clair, Snyk), Dockerfile hardening (distroless, multi-stage, non-root),… |

## Level 1 — Essentials (6 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devops-sre-practices`](../../skills/devops/sre-practices/SKILL.md) | `devops/sre-practices` | Implement Site Reliability Engineering practices: define SLIs/SLOs aligned with business goals, manage error budgets with burn rate alerts,… |
| [`sre-sli-slo-management`](../../skills/site-reliability-engineering/sli-slo-management/SKILL.md) | `site-reliability-engineering/sli-slo-management` | Express reliability as a ratio of good events to valid events, set a target users would actually notice, and alert on how fast the error budget is… |
| [`devops-incident-response`](../../skills/devops/incident-response/SKILL.md) | `devops/incident-response` | Establish a structured incident response framework with clear severity levels, defined roles, documented runbooks, and a blameless postmortem… |
| [`observability`](../../skills/devops/observability/SKILL.md) | `devops/observability` | Set up structured logging, metrics, and distributed tracing to understand system behavior in production. |
| [`monitoring`](../../skills/devops/monitoring/SKILL.md) | `devops/monitoring` | Define and enforce monitoring stack configuration with Prometheus, Grafana, Loki, and ELK for metrics, logs, traces, and alerting. |
| [`alerting`](../../skills/management/alerting/SKILL.md) | `management/alerting` | Design alert rules following the RED/USE method with severity classification, threshold tuning, notification routing, and escalation paths. |

## Level 2 — Professional (7 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devops-opentelemetry`](../../skills/devops/opentelemetry/SKILL.md) | `devops/opentelemetry` | Implement OpenTelemetry for vendor-neutral observability across distributed systems, covering traces, metrics, and logs collection, processing,… |
| [`apm-observability`](../../skills/devops/apm-observability/SKILL.md) | `devops/apm-observability` | Design and implement observability for distributed systems using metrics, traces, and logs with OpenTelemetry, SLI/SLO frameworks, and actionable… |
| [`sre-observability-scaling`](../../skills/site-reliability-engineering/observability-scaling/SKILL.md) | `site-reliability-engineering/observability-scaling` | Metrics systems fail at scale because of active series count (memory), churn, and query fan-out, not raw sample volume. |
| [`backup-dr`](../../skills/devops/backup-dr/SKILL.md) | `devops/backup-dr` | Design and implement backup strategies and disaster recovery plans with defined RPO/RTO, the 3-2-1 rule, automation, validation, and cloud DR… |
| [`enterprise-high-availability`](../../skills/enterprise/high-availability/SKILL.md) | `enterprise/high-availability` | Design and operate systems that hold availability targets from 95% to 99.999% across the full stack: database replica + slave topology, load… |
| [`enterprise-capacity-planning`](../../skills/enterprise/capacity-planning/SKILL.md) | `enterprise/capacity-planning` | Forecast capacity demand 1-4 quarters ahead, size infrastructure with the right headroom for each service tier, and trigger procurement with… |
| [`enterprise-sla-management`](../../skills/enterprise/sla-management/SKILL.md) | `enterprise/sla-management` | Defines, measures, and enforces service level agreements with error budgets, burn rate alerts, and multi-tier reliability structures. |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`sre-chaos-engineering`](../../skills/site-reliability-engineering/chaos-engineering/SKILL.md) | `site-reliability-engineering/chaos-engineering` | Every chaos tool ultimately uses a small set of Linux mechanisms. |
| [`enterprise-business-continuity`](../../skills/enterprise/business-continuity/SKILL.md) | `enterprise/business-continuity` | Define the BCP that keeps the business running through any plausible disruption -- regional outage, vendor collapse, ransomware, key-person loss,… |
| [`kubernetes-internals`](../../skills/devops/kubernetes-internals/SKILL.md) | `devops/kubernetes-internals` | Kubernetes is a set of independent control loops coordinating through one strongly consistent API. |
| [`devops-sre-engineer`](../../skills/personas/devops-sre-engineer/SKILL.md) | `personas/devops-sre-engineer` | Adopt the mindset of a Staff DevOps/SRE Engineer: everything as code, zero-downtime CI/CD, SLO/error-budget discipline, deep observability, and… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill devops-sre-practices --skill sre-sli-slo-management --skill devops-incident-response --skill observability --skill monitoring --skill alerting --skill security-secrets-management --skill security-container-security
```

**Level 1 + 2 + security baseline (15 skills):**

```bash
npx skills add j4flmao/agent-skills --skill devops-sre-practices --skill sre-sli-slo-management --skill devops-incident-response --skill observability --skill monitoring --skill alerting --skill devops-opentelemetry --skill apm-observability --skill sre-observability-scaling --skill backup-dr --skill enterprise-high-availability --skill enterprise-capacity-planning --skill enterprise-sla-management --skill security-secrets-management --skill security-container-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`sre-reliability`](../bundles.md#sre-reliability) | 20 | Reliability engineering: SLOs, incident response, observability, chaos, capacity, HA, DR, alerting |
| [`kubernetes-platform`](../bundles.md#kubernetes-platform) | 36 | Kubernetes and platform engineering: clusters, operators, Helm, GitOps, service mesh, autoscaling, policy, IDPs |

## Combine with

- [DevOps & Platform Engineer](devops-platform.md)
- [Security Engineer](security.md)

## Watch out

`devops/incident-response` and `site-reliability-engineering/incident-response` overlap: keep the SRE one if you run formal postmortems, otherwise the DevOps one.
