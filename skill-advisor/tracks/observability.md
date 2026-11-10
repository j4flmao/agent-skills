# Observability Engineer

**Who this is for:** You own logs, metrics, traces and alerting.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-data-masking`](../../skills/backend/universal/data-masking/SKILL.md) | `backend/universal/data-masking` | Protect personally identifiable information (PII) using masking, encryption, tokenization, and anonymization techniques for GDPR/CCPA compliance. |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`observability`](../../skills/devops/observability/SKILL.md) | `devops/observability` | Set up structured logging, metrics, and distributed tracing to understand system behavior in production. |
| [`devops-opentelemetry`](../../skills/devops/opentelemetry/SKILL.md) | `devops/opentelemetry` | Implement OpenTelemetry for vendor-neutral observability across distributed systems, covering traces, metrics, and logs collection, processing,… |
| [`backend-structured-logging`](../../skills/backend/universal/structured-logging/SKILL.md) | `backend/universal/structured-logging` | Design structured JSON logging with consistent schema, context propagation, and sampling. |
| [`alerting`](../../skills/management/alerting/SKILL.md) | `management/alerting` | Design alert rules following the RED/USE method with severity classification, threshold tuning, notification routing, and escalation paths. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`prometheus-grafana`](../../skills/devops/observability/prometheus-grafana/SKILL.md) | `devops/observability/prometheus-grafana` | Collect numeric time series by pulling (scraping) /metrics endpoints, query them with PromQL, alert through Alertmanager, and visualize in Grafana. |
| [`opentelemetry-tracing`](../../skills/devops/observability/opentelemetry-tracing/SKILL.md) | `devops/observability/opentelemetry-tracing` | Get useful traces from a service quickly: auto-instrument frameworks and clients, add a few manual spans around business operations, export via… |
| [`apm-observability`](../../skills/devops/apm-observability/SKILL.md) | `devops/apm-observability` | Design and implement observability for distributed systems using metrics, traces, and logs with OpenTelemetry, SLI/SLO frameworks, and actionable… |
| [`cloud-native-distributed-tracing`](../../skills/cloud-native/distributed-tracing/SKILL.md) | `cloud-native/distributed-tracing` | Make every request traceable across services, queues, and async jobs without unbounded cost. |
| [`sre-sli-slo-management`](../../skills/site-reliability-engineering/sli-slo-management/SKILL.md) | `site-reliability-engineering/sli-slo-management` | Express reliability as a ratio of good events to valid events, set a target users would actually notice, and alert on how fast the error budget is… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`sre-observability-scaling`](../../skills/site-reliability-engineering/observability-scaling/SKILL.md) | `site-reliability-engineering/observability-scaling` | Metrics systems fail at scale because of active series count (memory), churn, and query fan-out, not raw sample volume. |
| [`cloud-native-ebpf-observability`](../../skills/cloud-native/ebpf-observability/SKILL.md) | `cloud-native/ebpf-observability` | Observe what the kernel and processes are actually doing — syscalls, scheduling, I/O latency, network connections, function calls in binaries —… |
| [`agent-observability`](../../skills/harness-engineering/agent-observability/SKILL.md) | `harness-engineering/agent-observability` | This skill provides the complete knowledge required to build production-grade observability systems for AI agent deployments. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill observability --skill devops-opentelemetry --skill backend-structured-logging --skill alerting --skill backend-data-masking
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill observability --skill devops-opentelemetry --skill backend-structured-logging --skill alerting --skill prometheus-grafana --skill opentelemetry-tracing --skill apm-observability --skill cloud-native-distributed-tracing --skill sre-sli-slo-management --skill backend-data-masking
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`sre-reliability`](../bundles.md#sre-reliability) | 20 | Reliability engineering: SLOs, incident response, observability, chaos, capacity, HA, DR, alerting |

## Combine with

- [Site Reliability Engineer](sre.md)
- [DevOps & Platform Engineer](devops-platform.md)

## Watch out

`devops/observability`, `devops/monitoring` and `devops/apm-observability` overlap; keep `devops/observability` as the entry point and add the others only for vendor-specific work.
