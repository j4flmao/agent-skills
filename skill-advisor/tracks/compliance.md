# Compliance & Privacy Engineer

**Who this is for:** You make systems meet SOC 2, ISO 27001, GDPR, HIPAA or PCI requirements.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`enterprise-compliance-audit`](../../skills/enterprise/compliance-audit/SKILL.md) | `enterprise/compliance-audit` | Guides compliance audits from framework selection through evidence packaging and remediation tracking. |
| [`enterprise-data-governance`](../../skills/enterprise/data-governance/SKILL.md) | `enterprise/data-governance` | Implements data governance across classification, cataloging, lineage, quality, and retention. |
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`backend-audit-logging`](../../skills/backend/universal/audit-logging/SKILL.md) | `backend/universal/audit-logging` | Record every sensitive data access and state change in an immutable, tamper-evident audit trail for regulatory compliance (SOC 2, SOX, HIPAA, GDPR). |
| [`backend-data-masking`](../../skills/backend/universal/data-masking/SKILL.md) | `backend/universal/data-masking` | Protect personally identifiable information (PII) using masking, encryption, tokenization, and anonymization techniques for GDPR/CCPA compliance. |
| [`rbac`](../../skills/security/rbac/SKILL.md) | `security/rbac` | Comprehensive Role-Based Access Control with OIDC flow integration. |
| [`abac-access-control`](../../skills/security/abac/SKILL.md) | `security/abac` | Implement fine-grained access control using policies that evaluate attributes of the subject, resource, action, and environment. |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-lineage`](../../skills/data/data-lineage/SKILL.md) | `data/data-lineage` | Capture, store, query, and visualize end-to-end data lineage from source systems through transformations to dashboards, supporting impact… |
| [`data-clean-room`](../../skills/data/data-clean-room/SKILL.md) | `data/data-clean-room` | Enable privacy-preserving data collaboration between multiple parties using clean room architectures, private set intersection, differential… |
| [`enterprise-vendor-management`](../../skills/enterprise/vendor-management/SKILL.md) | `enterprise/vendor-management` | Guides end-to-end vendor management from selection through performance management, contract negotiation, and risk oversight for third-party providers. |
| [`enterprise-itil-service-mgmt`](../../skills/enterprise/itil-service-mgmt/SKILL.md) | `enterprise/itil-service-mgmt` | Guides IT service management practice using the ITIL 4 framework across the full service lifecycle including incident, problem, change, release,… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill enterprise-compliance-audit --skill enterprise-data-governance --skill security-data-security
```

**Level 1 + 2 (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill enterprise-compliance-audit --skill enterprise-data-governance --skill security-data-security --skill backend-audit-logging --skill backend-data-masking --skill rbac --skill abac-access-control --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`enterprise`](../bundles.md#enterprise) | 18 | Enterprise: governance, compliance, identity, multi-tenancy, legacy migration, ITIL, vendors, FinOps, release engineering |
| [`access-control`](../bundles.md#access-control) | 7 | Authentication and authorization: auth patterns, RBAC, ABAC, fine-grained policies, identity providers, zero trust identity |

## Combine with

- [Security Engineer](security.md)
- [Software & Solution Architect](architecture.md)

## Watch out

Skills describe controls and evidence; legal interpretation of a regulation still needs your compliance or legal team.
