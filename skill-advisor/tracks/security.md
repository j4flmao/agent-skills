# Security Engineer

**Who this is for:** You secure applications, cloud and operations.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (6 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`threat-modeling`](../../skills/security/threat-modeling/SKILL.md) | `security/threat-modeling` | Identify and mitigate architectural security flaws during the design phase, before any code is written. |
| [`security-sast-dast`](../../skills/security/sast-dast/SKILL.md) | `security/sast-dast` | Build a security scanning pipeline with static analysis rule sets, dynamic analysis scenarios, false positive management, and CI gating. |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`devsecops`](../../skills/security/devsecops/SKILL.md) | `security/devsecops` | Embed security directly into CI/CD pipelines to catch vulnerabilities early (shift-left). |
| [`owasp-web-security`](../../skills/cybersecurity/owasp-web-security/SKILL.md) | `cybersecurity/owasp-web-security` | Explain the root-cause mechanics of common OWASP web vulnerability classes (injection, SSRF, XSS) and the secure-coding controls that eliminate them. |

## Level 2 — Professional (8 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-container-security`](../../skills/security/container-security/SKILL.md) | `security/container-security` | Build a container security program spanning image scanning (Trivy, Grype, Clair, Snyk), Dockerfile hardening (distroless, multi-stage, non-root),… |
| [`security-sbom`](../../skills/security/sbom/SKILL.md) | `security/sbom` | Design an SBOM generation pipeline with format selection, vulnerability correlation, license compliance, and policy enforcement for software… |
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |
| [`rbac`](../../skills/security/rbac/SKILL.md) | `security/rbac` | Comprehensive Role-Based Access Control with OIDC flow integration. |
| [`abac-access-control`](../../skills/security/abac/SKILL.md) | `security/abac` | Implement fine-grained access control using policies that evaluate attributes of the subject, resource, action, and environment. |
| [`zero-trust-identity`](../../skills/cybersecurity/zero-trust-identity/SKILL.md) | `cybersecurity/zero-trust-identity` | Explain Zero Trust identity mechanics — OIDC/OAuth2 flows (Authorization Code + PKCE), JWT signature validation (RS256 vs HS256 and… |
| [`modern-cryptography`](../../skills/cybersecurity/modern-cryptography/SKILL.md) | `cybersecurity/modern-cryptography` | Explain the mechanics and correct selection of modern asymmetric cryptography — ECC/ECDHE for key exchange and forward secrecy, and NIST PQC… |
| [`cloud-native-security-defensive`](../../skills/cloud-native/cloud-security-defensive/SKILL.md) | `cloud-native/cloud-security-defensive` | Turn a cloud estate into one where dangerous actions are prevented by organization-level guardrails, everything else is logged centrally and… |

## Level 3 — Specialist (9 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`soc-operations`](../../skills/security/soc-operations/SKILL.md) | `security/soc-operations` | Define SOC structure, analyst workflows, tier responsibilities, escalation paths, shift handovers, and SOC performance metrics. |
| [`siem-engineering`](../../skills/security/siem-engineering/SKILL.md) | `security/siem-engineering` | Design and maintain SIEM infrastructure, onboard log sources, develop correlation rules, manage detection use cases, and tune for false positive… |
| [`detection-engineering`](../../skills/security/detection-engineering/SKILL.md) | `security/detection-engineering` | Act as a detection engineer: convert attacker techniques into queryable, high-fidelity detection logic as code (Sigma, portable to Splunk SPL /… |
| [`edr-xdr`](../../skills/security/edr-xdr/SKILL.md) | `security/edr-xdr` | Design and manage endpoint detection and response capabilities including EDR/XDR platform selection, detection rule creation, and endpoint… |
| [`threat-intelligence`](../../skills/security/threat-intelligence/SKILL.md) | `security/threat-intelligence` | Manage cyber threat intelligence operations including feed management, IoC/TTP handling, threat hunting, and MITRE ATT&CK mapping. |
| [`blueteam-operations`](../../skills/security/blueteam-operations/SKILL.md) | `security/blueteam-operations` | Guide defenders through structured incident response (PICERL), Windows/Linux host forensics, live memory analysis, and hypothesis-driven threat… |
| [`purpleteam-collaboration`](../../skills/security/purpleteam-collaboration/SKILL.md) | `security/purpleteam-collaboration` | Orchestrate purple-team exercises as a continuous feedback loop: threat-intel-driven emulation plans, validation of whether detections fire, and… |
| [`redteam-operations`](../../skills/security/redteam-operations/SKILL.md) | `security/redteam-operations` | Provide architectural and strategic insight into authorized adversary simulation (C2 design, initial access, lateral movement at a conceptual… |
| [`red-team-pentest-methodology`](../../skills/cybersecurity/red-team-pentest/SKILL.md) | `cybersecurity/red-team-pentest` | Provide the methodology and structure of authorized penetration testing and red-team engagements — the Cyber Kill Chain, MITRE ATT&CK mapping, and… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill threat-modeling --skill security-sast-dast --skill security-secrets-management --skill security-api-security --skill devsecops --skill owasp-web-security
```

**Level 1 + 2 (14 skills):**

```bash
npx skills add j4flmao/agent-skills --skill threat-modeling --skill security-sast-dast --skill security-secrets-management --skill security-api-security --skill devsecops --skill owasp-web-security --skill security-container-security --skill security-sbom --skill security-data-security --skill rbac --skill abac-access-control --skill zero-trust-identity --skill modern-cryptography --skill cloud-native-security-defensive
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`security-all`](../bundles.md#security-all) | 30 | All security skills: SAST/DAST, SBOM, secrets, container, API, data, Zero Trust, EDR, SOC, SIEM, SOAR, Threat Intel |
| [`soc-all`](../bundles.md#soc-all) | 18 | SOC: operations, SIEM engineering, SOAR automation, threat intelligence, EDR/XDR |
| [`access-control`](../bundles.md#access-control) | 7 | Authentication and authorization: auth patterns, RBAC, ABAC, fine-grained policies, identity providers, zero trust identity |
| [`advanced-security-bundle`](../bundles.md#advanced-security-bundle) | 11 | Advanced security skills including red team, blue team, and cloud attacks (educational) |

## Combine with

- [DevOps & Platform Engineer](devops-platform.md)
- [Backend Engineer](backend.md)

## Watch out

Offensive skills (`advanced-security-bundle`) are educational and defensive in intent; install them only for authorized testing teams.
