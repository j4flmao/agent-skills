# AI Safety & LLM Red Team

**Who this is for:** You test and harden LLM apps against prompt injection, jailbreaks and data leaks.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`adversarial-prompting`](../../skills/rnd/security/adversarial-prompting/SKILL.md) | `rnd/security/adversarial-prompting` | LLMs process instructions and data in the same token stream, so any text the model reads can try to steer it. |
| [`ai-defense-mechanisms`](../../skills/rnd/security/ai-defense-mechanisms/SKILL.md) | `rnd/security/ai-defense-mechanisms` | No classifier or prompt reliably stops prompt injection, so defenses must assume the model can be manipulated and limit what a manipulated model… |
| [`sandbox-execution`](../../skills/harness-engineering/sandbox-execution/SKILL.md) | `harness-engineering/sandbox-execution` | This skill provides the complete architectural and operational knowledge required to build production-grade sandboxed execution environments for… |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`agent-observability`](../../skills/harness-engineering/agent-observability/SKILL.md) | `harness-engineering/agent-observability` | This skill provides the complete knowledge required to build production-grade observability systems for AI agent deployments. |
| [`tool-calling-principles`](../../skills/ai/ai-agents/tool-calling-principles/SKILL.md) | `ai/ai-agents/tool-calling-principles` | Tools are the agent's only way to read or change the world, and the model chooses and fills them using nothing but names, descriptions, and schemas. |
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |
| [`threat-modeling`](../../skills/security/threat-modeling/SKILL.md) | `security/threat-modeling` | Identify and mitigate architectural security flaws during the design phase, before any code is written. |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`swarm-architectures`](../../skills/rnd/ai-agents/swarm-architectures/SKILL.md) | `rnd/ai-agents/swarm-architectures` | Explore whether several cooperating model instances outperform one: a router sends work to specialists, specialists run in isolation like actors,… |
| [`red-team-operator`](../../skills/personas/red-team-operator/SKILL.md) | `personas/red-team-operator` | Adopt the mindset of a Principal Red Team Operator for authorized, conceptual APT simulation: OSINT, MITRE ATT&CK mapping, and… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill adversarial-prompting --skill ai-defense-mechanisms --skill sandbox-execution
```

**Level 1 + 2 (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill adversarial-prompting --skill ai-defense-mechanisms --skill sandbox-execution --skill agent-observability --skill tool-calling-principles --skill security-data-security --skill threat-modeling
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`ai-engineering`](../bundles.md#ai-engineering) | 26 | AI engineering: LLM apps, RAG, prompting, fine-tuning, inference, vector search, agent harnesses |
| [`ai-agents`](../bundles.md#ai-agents) | 14 | Building AI agents: architectures, memory, tool calling, multi-agent topologies, observability, sandboxing, agent planning docs |

## Combine with

- [AI Agent Builder](ai-agents.md)
- [Application Security & DevSecOps](appsec.md)

## Watch out

Test only systems you own or are authorized to test; keep findings and payloads inside your evaluation suite.
