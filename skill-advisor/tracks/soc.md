# SOC Analyst & Detection Engineer

**Who this is for:** You detect, investigate and respond to security incidents.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`soc-operations`](../../skills/security/soc-operations/SKILL.md) | `security/soc-operations` | Define SOC structure, analyst workflows, tier responsibilities, escalation paths, shift handovers, and SOC performance metrics. |
| [`siem-engineering`](../../skills/security/siem-engineering/SKILL.md) | `security/siem-engineering` | Design and maintain SIEM infrastructure, onboard log sources, develop correlation rules, manage detection use cases, and tune for false positive… |
| [`detection-engineering`](../../skills/security/detection-engineering/SKILL.md) | `security/detection-engineering` | Act as a detection engineer: convert attacker techniques into queryable, high-fidelity detection logic as code (Sigma, portable to Splunk SPL /… |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`edr-xdr`](../../skills/security/edr-xdr/SKILL.md) | `security/edr-xdr` | Design and manage endpoint detection and response capabilities including EDR/XDR platform selection, detection rule creation, and endpoint… |
| [`threat-intelligence`](../../skills/security/threat-intelligence/SKILL.md) | `security/threat-intelligence` | Manage cyber threat intelligence operations including feed management, IoC/TTP handling, threat hunting, and MITRE ATT&CK mapping. |
| [`blueteam-operations`](../../skills/security/blueteam-operations/SKILL.md) | `security/blueteam-operations` | Guide defenders through structured incident response (PICERL), Windows/Linux host forensics, live memory analysis, and hypothesis-driven threat… |
| [`devops-incident-response`](../../skills/devops/incident-response/SKILL.md) | `devops/incident-response` | Establish a structured incident response framework with clear severity levels, defined roles, documented runbooks, and a blameless postmortem… |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`purpleteam-collaboration`](../../skills/security/purpleteam-collaboration/SKILL.md) | `security/purpleteam-collaboration` | Orchestrate purple-team exercises as a continuous feedback loop: threat-intel-driven emulation plans, validation of whether detections fire, and… |
| [`blue-team-soc-operations`](../../skills/cybersecurity/blue-team-soc/SKILL.md) | `cybersecurity/blue-team-soc` | Provide SOC and blue-team methodology: SIEM architecture and log ontology, the NIST SP 800-61 / SANS incident response lifecycle, and… |
| [`ebpf-threat-detection`](../../skills/cybersecurity/ebpf-threat-detection/SKILL.md) | `cybersecurity/ebpf-threat-detection` | Explain how eBPF enables low-overhead, high-fidelity runtime threat detection on Linux: the load/verify/JIT lifecycle, syscall interception via… |
| [`soc-analyst`](../../skills/personas/soc-analyst/SKILL.md) | `personas/soc-analyst` | Adopt the mindset of a Principal SOC Analyst: zero-trust vigilance, meticulous log correlation, NIST-aligned incident response, and conceptual… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill soc-operations --skill siem-engineering --skill detection-engineering
```

**Level 1 + 2 (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill soc-operations --skill siem-engineering --skill detection-engineering --skill edr-xdr --skill threat-intelligence --skill blueteam-operations --skill devops-incident-response
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`soc-all`](../bundles.md#soc-all) | 18 | SOC: operations, SIEM engineering, SOAR automation, threat intelligence, EDR/XDR |
| [`security-all`](../bundles.md#security-all) | 30 | All security skills: SAST/DAST, SBOM, secrets, container, API, data, Zero Trust, EDR, SOC, SIEM, SOAR, Threat Intel |

## Combine with

- [Security Engineer](security.md)
- [Site Reliability Engineer](sre.md)

## Watch out

Offensive skills are not needed for detection work; add `security/purpleteam-collaboration` instead of red-team skills.
