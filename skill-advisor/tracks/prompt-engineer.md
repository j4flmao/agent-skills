# Prompt Engineer & AI Evaluator

**Who this is for:** You design prompts, evaluation sets and quality gates for LLM features.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ai-defense-mechanisms`](../../skills/rnd/security/ai-defense-mechanisms/SKILL.md) | `rnd/security/ai-defense-mechanisms` | No classifier or prompt reliably stops prompt injection, so defenses must assume the model can be manipulated and limit what a manipulated model… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`prompt-few-shot`](../../skills/prompt-engineering/few-shot-prompting/SKILL.md) | `prompt-engineering/few-shot-prompting` | Demonstrations in the prompt show the model the task format, label space, and style without changing its weights (in-context learning). |
| [`prompt-chain-of-thought`](../../skills/prompt-engineering/chain-of-thought/SKILL.md) | `prompt-engineering/chain-of-thought` | Autoregressive models spend a fixed amount of computation per generated token. |
| [`prompt-tree-of-thoughts`](../../skills/prompt-engineering/tree-of-thoughts/SKILL.md) | `prompt-engineering/tree-of-thoughts` | Tree of Thoughts (ToT) treats problem solving as search: a thought is a coherent intermediate step, the LLM proposes several candidate next… |
| [`prompt-rag-query-design`](../../skills/prompt-engineering/rag-design/SKILL.md) | `prompt-engineering/rag-design` | User questions are often short, ambiguous, or compositional, and a single embedding search misses what they need. |

## Level 2 — Professional (3 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`agent-observability`](../../skills/harness-engineering/agent-observability/SKILL.md) | `harness-engineering/agent-observability` | This skill provides the complete knowledge required to build production-grade observability systems for AI agent deployments. |
| [`ai-agentic-workflows`](../../skills/ai/agentic-workflows/SKILL.md) | `ai/agentic-workflows` | Choose and implement the simplest control flow that solves the task reliably. |
| [`ml-model-evaluation`](../../skills/ml/model-evaluation/SKILL.md) | `ml/model-evaluation` | Design comprehensive model evaluation frameworks with appropriate metrics, cross-validation strategies, bias-variance diagnosis, and statistical… |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`adversarial-prompting`](../../skills/rnd/security/adversarial-prompting/SKILL.md) | `rnd/security/adversarial-prompting` | LLMs process instructions and data in the same token stream, so any text the model reads can try to steer it. |
| [`data-science-experimentation`](../../skills/data-science/experimentation/SKILL.md) | `data-science/experimentation` | Design and analyze rigorous A/B tests and experiments. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill prompt-few-shot --skill prompt-chain-of-thought --skill prompt-tree-of-thoughts --skill prompt-rag-query-design --skill ai-defense-mechanisms
```

**Level 1 + 2 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill prompt-few-shot --skill prompt-chain-of-thought --skill prompt-tree-of-thoughts --skill prompt-rag-query-design --skill agent-observability --skill ai-agentic-workflows --skill ml-model-evaluation --skill ai-defense-mechanisms
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`ai-engineering`](../bundles.md#ai-engineering) | 26 | AI engineering: LLM apps, RAG, prompting, fine-tuning, inference, vector search, agent harnesses |

## Combine with

- [LLM Application Developer](llm-app.md)
- [AI Safety & LLM Red Team](ai-safety.md)

## Watch out

Measure prompt changes on a fixed eval set; the evaluation architecture is in `reports/Agent skills evaluation architecture.md`.
