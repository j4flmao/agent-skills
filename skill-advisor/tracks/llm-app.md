# LLM Application Developer

**Who this is for:** You ship features on top of LLM APIs: chat, RAG, extraction, tools.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (3 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ai-defense-mechanisms`](../../skills/rnd/security/ai-defense-mechanisms/SKILL.md) | `rnd/security/ai-defense-mechanisms` | No classifier or prompt reliably stops prompt injection, so defenses must assume the model can be manipulated and limit what a manipulated model… |
| [`adversarial-prompting`](../../skills/rnd/security/adversarial-prompting/SKILL.md) | `rnd/security/adversarial-prompting` | LLMs process instructions and data in the same token stream, so any text the model reads can try to steer it. |
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |

## Level 1 — Essentials (5 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`prompt-few-shot`](../../skills/prompt-engineering/few-shot-prompting/SKILL.md) | `prompt-engineering/few-shot-prompting` | Demonstrations in the prompt show the model the task format, label space, and style without changing its weights (in-context learning). |
| [`prompt-chain-of-thought`](../../skills/prompt-engineering/chain-of-thought/SKILL.md) | `prompt-engineering/chain-of-thought` | Autoregressive models spend a fixed amount of computation per generated token. |
| [`llm-rag-retrieval-internals`](../../skills/ai/llm-engineering/rag-architecture/SKILL.md) | `ai/llm-engineering/rag-architecture` | Retrieval quality caps RAG quality: the generator cannot use a passage that was never retrieved. |
| [`prompt-rag-query-design`](../../skills/prompt-engineering/rag-design/SKILL.md) | `prompt-engineering/rag-design` | User questions are often short, ambiguous, or compositional, and a single embedding search misses what they need. |
| [`data-vector-databases`](../../skills/data/vector-databases/SKILL.md) | `data/vector-databases` | Store embedding vectors with metadata and return the nearest neighbors of a query vector fast enough for interactive use. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`tool-calling-principles`](../../skills/ai/ai-agents/tool-calling-principles/SKILL.md) | `ai/ai-agents/tool-calling-principles` | Tools are the agent's only way to read or change the world, and the model chooses and fills them using nothing but names, descriptions, and schemas. |
| [`ai-agentic-workflows`](../../skills/ai/agentic-workflows/SKILL.md) | `ai/agentic-workflows` | Choose and implement the simplest control flow that solves the task reliably. |
| [`agent-observability`](../../skills/harness-engineering/agent-observability/SKILL.md) | `harness-engineering/agent-observability` | This skill provides the complete knowledge required to build production-grade observability systems for AI agent deployments. |
| [`ml-inference-optimization`](../../skills/ml/inference-optimization/SKILL.md) | `ml/inference-optimization` | Serve LLMs at the required latency for the lowest cost. |
| [`genai-vision`](../../skills/ai/genai-vision/SKILL.md) | `ai/genai-vision` | Ship image generation and speech transcription with open models: pick a model whose license fits the use case, load it in half precision with… |

## Level 3 — Specialist (5 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`llm-kv-cache-paged-attention`](../../skills/ai/llm-engineering/kv-cache/SKILL.md) | `ai/llm-engineering/kv-cache` | During decoding each new token attends to the keys and values of all previous tokens. |
| [`llm-model-quantization`](../../skills/ai/llm-engineering/model-quantization/SKILL.md) | `ai/llm-engineering/model-quantization` | Quantization stores weights (and optionally activations) in fewer bits so a model fits in less memory and decodes faster, since decoding is… |
| [`llm-finetuning`](../../skills/ai/llm-finetuning/SKILL.md) | `ai/llm-finetuning` | Fine-tuning changes model behaviour (format, style, task skill, domain language) from examples. |
| [`local-slm-inference`](../../skills/rnd/ai-agents/local-slm-inference/SKILL.md) | `rnd/ai-agents/local-slm-inference` | Run small and mid-size language models on a laptop, workstation, or edge box with llama.cpp or Ollama. |
| [`multimodal-pipelines`](../../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md) | `rnd/ai-agents/multimodal-pipelines` | Decide how images and audio reach a language model and build the pipeline. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill prompt-few-shot --skill prompt-chain-of-thought --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill data-vector-databases --skill ai-defense-mechanisms --skill adversarial-prompting --skill security-data-security
```

**Level 1 + 2 + security baseline (13 skills):**

```bash
npx skills add j4flmao/agent-skills --skill prompt-few-shot --skill prompt-chain-of-thought --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill data-vector-databases --skill tool-calling-principles --skill ai-agentic-workflows --skill agent-observability --skill ml-inference-optimization --skill genai-vision --skill ai-defense-mechanisms --skill adversarial-prompting --skill security-data-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`ai-engineering`](../bundles.md#ai-engineering) | 26 | AI engineering: LLM apps, RAG, prompting, fine-tuning, inference, vector search, agent harnesses |

## Combine with

- [AI Agent Builder](ai-agents.md)
- [Python Backend Developer](python-backend.md)

## Watch out

Read `.claude/rules/rag-vector-standards.md` before building retrieval.
