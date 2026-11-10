# Application Security & DevSecOps

**Who this is for:** You make the software delivery pipeline and code secure.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`threat-modeling`](../../skills/security/threat-modeling/SKILL.md) | `security/threat-modeling` | Identify and mitigate architectural security flaws during the design phase, before any code is written. |
| [`security-sast-dast`](../../skills/security/sast-dast/SKILL.md) | `security/sast-dast` | Build a security scanning pipeline with static analysis rule sets, dynamic analysis scenarios, false positive management, and CI gating. |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |
| [`devsecops`](../../skills/security/devsecops/SKILL.md) | `security/devsecops` | Embed security directly into CI/CD pipelines to catch vulnerabilities early (shift-left). |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-sbom`](../../skills/security/sbom/SKILL.md) | `security/sbom` | Design an SBOM generation pipeline with format selection, vulnerability correlation, license compliance, and policy enforcement for software… |
| [`security-container-security`](../../skills/security/container-security/SKILL.md) | `security/container-security` | Build a container security program spanning image scanning (Trivy, Grype, Clair, Snyk), Dockerfile hardening (distroless, multi-stage, non-root),… |
| [`security-api-security`](../../skills/security/api-security/SKILL.md) | `security/api-security` | Design comprehensive API security controls covering OWASP API Top 10 threat modeling, authentication (JWT, OAuth2, API keys), rate limiting (token… |
| [`owasp-web-security`](../../skills/cybersecurity/owasp-web-security/SKILL.md) | `cybersecurity/owasp-web-security` | Explain the root-cause mechanics of common OWASP web vulnerability classes (injection, SSRF, XSS) and the secure-coding controls that eliminate them. |
| [`frontend-security`](../../skills/frontend/universal/security/SKILL.md) | `frontend/universal/security` | Prevent XSS, CSRF, and injection attacks. |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |
| [`modern-cryptography`](../../skills/cybersecurity/modern-cryptography/SKILL.md) | `cybersecurity/modern-cryptography` | Explain the mechanics and correct selection of modern asymmetric cryptography — ECC/ECDHE for key exchange and forward secrecy, and NIST PQC… |
| [`dev-loop-security-auditor`](../../skills/dev-loop/security-auditor/SKILL.md) | `dev-loop/security-auditor` | Systematically identify, assess, and remediate security vulnerabilities in applications — including dependency vulnerabilities, code-level flaws,… |
| [`security-engineer`](../../skills/personas/security-engineer/SKILL.md) | `personas/security-engineer` | Adopt the mindset of a Principal Security Engineer: defense in depth, zero trust, least privilege, shift-left SAST/DAST, OWASP mastery, and… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill threat-modeling --skill security-sast-dast --skill security-secrets-management --skill devsecops
```

**Level 1 + 2 (9 skills):**

```bash
npx skills add j4flmao/agent-skills --skill threat-modeling --skill security-sast-dast --skill security-secrets-management --skill devsecops --skill security-sbom --skill security-container-security --skill security-api-security --skill owasp-web-security --skill frontend-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`security-all`](../bundles.md#security-all) | 30 | All security skills: SAST/DAST, SBOM, secrets, container, API, data, Zero Trust, EDR, SOC, SIEM, SOAR, Threat Intel |

## Combine with

- [DevOps & Platform Engineer](devops-platform.md)
- [Backend Engineer](backend.md)

## Watch out

Pair with `.claude/rules/secure-by-default.md` and `crypto-deprecation.md`; they are the baseline these skills enforce.
