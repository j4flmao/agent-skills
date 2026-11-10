# AI Agent Builder

**Who this is for:** You build tool-using LLM agents, multi-agent systems and their harnesses.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ai-defense-mechanisms`](../../skills/rnd/security/ai-defense-mechanisms/SKILL.md) | `rnd/security/ai-defense-mechanisms` | No classifier or prompt reliably stops prompt injection, so defenses must assume the model can be manipulated and limit what a manipulated model… |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (5 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ai-agent-architectures`](../../skills/ai/ai-agents/SKILL.md) | `ai/ai-agents` | Design a single LLM agent end to end: the control loop, the tool surface, memory, planning strategy, guardrails, and how it is evaluated. |
| [`ai-agent-core-loop`](../../skills/ai/ai-agents/core-architectures/SKILL.md) | `ai/ai-agents/core-architectures` | Every agent reduces to a loop: build context from state, ask the model for the next action, execute it, record the observation, decide whether to… |
| [`tool-calling-principles`](../../skills/ai/ai-agents/tool-calling-principles/SKILL.md) | `ai/ai-agents/tool-calling-principles` | Tools are the agent's only way to read or change the world, and the model chooses and fills them using nothing but names, descriptions, and schemas. |
| [`ai-agentic-workflows`](../../skills/ai/agentic-workflows/SKILL.md) | `ai/agentic-workflows` | Choose and implement the simplest control flow that solves the task reliably. |
| [`prompt-chain-of-thought`](../../skills/prompt-engineering/chain-of-thought/SKILL.md) | `prompt-engineering/chain-of-thought` | Autoregressive models spend a fixed amount of computation per generated token. |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ai-agent-memory-systems`](../../skills/ai/ai-agents/memory-systems/SKILL.md) | `ai/ai-agents/memory-systems` | An LLM is stateless between calls; anything the agent "remembers" is either placed in the context window or retrieved into it. |
| [`ai-multi-agent-systems`](../../skills/ai/multi-agent-systems/SKILL.md) | `ai/multi-agent-systems` | Implement and operate systems where several specialized agents cooperate. |
| [`multi-agent-topology`](../../skills/ai/ai-agents/multi-agent-topology/SKILL.md) | `ai/ai-agents/multi-agent-topology` | A topology is the graph of who talks to whom, who decides, and what data crosses each edge. |
| [`agent-observability`](../../skills/harness-engineering/agent-observability/SKILL.md) | `harness-engineering/agent-observability` | This skill provides the complete knowledge required to build production-grade observability systems for AI agent deployments. |
| [`sandbox-execution`](../../skills/harness-engineering/sandbox-execution/SKILL.md) | `harness-engineering/sandbox-execution` | This skill provides the complete architectural and operational knowledge required to build production-grade sandboxed execution environments for… |
| [`llm-rag-retrieval-internals`](../../skills/ai/llm-engineering/rag-architecture/SKILL.md) | `ai/llm-engineering/rag-architecture` | Retrieval quality caps RAG quality: the generator cannot use a passage that was never retrieved. |

## Level 3 — Specialist (9 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`local-slm-inference`](../../skills/rnd/ai-agents/local-slm-inference/SKILL.md) | `rnd/ai-agents/local-slm-inference` | Run small and mid-size language models on a laptop, workstation, or edge box with llama.cpp or Ollama. |
| [`multimodal-pipelines`](../../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md) | `rnd/ai-agents/multimodal-pipelines` | Decide how images and audio reach a language model and build the pipeline. |
| [`swarm-architectures`](../../skills/rnd/ai-agents/swarm-architectures/SKILL.md) | `rnd/ai-agents/swarm-architectures` | Explore whether several cooperating model instances outperform one: a router sends work to specialists, specialists run in isolation like actors,… |
| [`adversarial-prompting`](../../skills/rnd/security/adversarial-prompting/SKILL.md) | `rnd/security/adversarial-prompting` | LLMs process instructions and data in the same token stream, so any text the model reads can try to steer it. |
| [`prompt-tree-of-thoughts`](../../skills/prompt-engineering/tree-of-thoughts/SKILL.md) | `prompt-engineering/tree-of-thoughts` | Tree of Thoughts (ToT) treats problem solving as search: a thought is a coherent intermediate step, the LLM proposes several candidate next… |
| [`write-implementation-plan`](../../skills/planning/agent-implementation-plan/SKILL.md) | `planning/agent-implementation-plan` | Prevent blind edits on non-trivial tasks. |
| [`agent-task-checklist`](../../skills/planning/agent-task-checklist/SKILL.md) | `planning/agent-task-checklist` | Make long agent tasks observable and resumable. |
| [`agent-walkthrough-report`](../../skills/planning/agent-walkthrough-report/SKILL.md) | `planning/agent-walkthrough-report` | After finishing work, give the reader a report they can trust and scan in a minute: what changed (with paths), why, the actual verification… |
| [`ai-architect`](../../skills/personas/ai-architect/SKILL.md) | `personas/ai-architect` | Adopt the mindset of a Staff AI Solutions Architect: pragmatic about when GenAI earns its place, rigorous on RAG-vs-fine-tuning trade-offs, token… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill ai-agent-architectures --skill ai-agent-core-loop --skill tool-calling-principles --skill ai-agentic-workflows --skill prompt-chain-of-thought --skill ai-defense-mechanisms --skill security-secrets-management
```

**Level 1 + 2 + security baseline (13 skills):**

```bash
npx skills add j4flmao/agent-skills --skill ai-agent-architectures --skill ai-agent-core-loop --skill tool-calling-principles --skill ai-agentic-workflows --skill prompt-chain-of-thought --skill ai-agent-memory-systems --skill ai-multi-agent-systems --skill multi-agent-topology --skill agent-observability --skill sandbox-execution --skill llm-rag-retrieval-internals --skill ai-defense-mechanisms --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`ai-agents`](../bundles.md#ai-agents) | 14 | Building AI agents: architectures, memory, tool calling, multi-agent topologies, observability, sandboxing, agent planning docs |
| [`ai-engineering`](../bundles.md#ai-engineering) | 26 | AI engineering: LLM apps, RAG, prompting, fine-tuning, inference, vector search, agent harnesses |

## Combine with

- [ML & AI Engineer](ml-ai.md)
- [Backend Engineer](backend.md)
- [Security Engineer](security.md)

## Watch out

Read the repo rule `.claude/rules/agent-persona-design.md` with this track: it sets the tool-count and human-in-the-loop rules these skills assume.
