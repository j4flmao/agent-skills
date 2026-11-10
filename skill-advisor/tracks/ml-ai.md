# ML & AI Engineer

**Who this is for:** You train, evaluate and serve models, or build LLM applications.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |
| [`ai-defense-mechanisms`](../../skills/rnd/security/ai-defense-mechanisms/SKILL.md) | `rnd/security/ai-defense-mechanisms` | No classifier or prompt reliably stops prompt injection, so defenses must assume the model can be manipulated and limit what a manipulated model… |

## Level 1 — Essentials (6 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ml-classical-ml`](../../skills/ml/classical-ml/SKILL.md) | `ml/classical-ml` | Build supervised and unsupervised machine learning pipelines with scikit-learn, XGBoost, LightGBM, and CatBoost. |
| [`ml-deep-learning`](../../skills/ml/deep-learning/SKILL.md) | `ml/deep-learning` | Design and train deep neural networks with PyTorch and TensorFlow. |
| [`ml-model-evaluation`](../../skills/ml/model-evaluation/SKILL.md) | `ml/model-evaluation` | Design comprehensive model evaluation frameworks with appropriate metrics, cross-validation strategies, bias-variance diagnosis, and statistical… |
| [`ml-feature-engineering`](../../skills/ml/feature-engineering/SKILL.md) | `ml/feature-engineering` | Transform raw data into effective ML features through encoding, scaling, extraction, interaction, and selection. |
| [`prompt-few-shot`](../../skills/prompt-engineering/few-shot-prompting/SKILL.md) | `prompt-engineering/few-shot-prompting` | Demonstrations in the prompt show the model the task format, label space, and style without changing its weights (in-context learning). |
| [`prompt-chain-of-thought`](../../skills/prompt-engineering/chain-of-thought/SKILL.md) | `prompt-engineering/chain-of-thought` | Autoregressive models spend a fixed amount of computation per generated token. |

## Level 2 — Professional (9 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ml-model-serving`](../../skills/ml/model-serving/SKILL.md) | `ml/model-serving` | Design model serving architecture with framework selection, deployment strategy, autoscaling, and inference optimization for production workloads. |
| [`ml-inference-optimization`](../../skills/ml/inference-optimization/SKILL.md) | `ml/inference-optimization` | Serve LLMs at the required latency for the lowest cost. |
| [`ml-experiment-tracking`](../../skills/ml/experiment-tracking/SKILL.md) | `ml/experiment-tracking` | Track machine learning experiments with full reproducibility: log parameters, metrics, artifacts, and environment. |
| [`devops-mlops`](../../skills/devops/mlops/SKILL.md) | `devops/mlops` | Implements ML CI/CD pipelines with model registry, canary deployment, monitoring, and rollback for production ML systems. |
| [`llm-rag-retrieval-internals`](../../skills/ai/llm-engineering/rag-architecture/SKILL.md) | `ai/llm-engineering/rag-architecture` | Retrieval quality caps RAG quality: the generator cannot use a passage that was never retrieved. |
| [`prompt-rag-query-design`](../../skills/prompt-engineering/rag-design/SKILL.md) | `prompt-engineering/rag-design` | User questions are often short, ambiguous, or compositional, and a single embedding search misses what they need. |
| [`data-vector-databases`](../../skills/data/vector-databases/SKILL.md) | `data/vector-databases` | Store embedding vectors with metadata and return the nearest neighbors of a query vector fast enough for interactive use. |
| [`llm-finetuning`](../../skills/ai/llm-finetuning/SKILL.md) | `ai/llm-finetuning` | Fine-tuning changes model behaviour (format, style, task skill, domain language) from examples. |
| [`data-science-experimentation`](../../skills/data-science/experimentation/SKILL.md) | `data-science/experimentation` | Design and analyze rigorous A/B tests and experiments. |

## Level 3 — Specialist (7 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`llm-kv-cache-paged-attention`](../../skills/ai/llm-engineering/kv-cache/SKILL.md) | `ai/llm-engineering/kv-cache` | During decoding each new token attends to the keys and values of all previous tokens. |
| [`llm-model-quantization`](../../skills/ai/llm-engineering/model-quantization/SKILL.md) | `ai/llm-engineering/model-quantization` | Quantization stores weights (and optionally activations) in fewer bits so a model fits in less memory and decodes faster, since decoding is… |
| [`flash-attention`](../../skills/hardware-acceleration/flash-attention/SKILL.md) | `hardware-acceleration/flash-attention` | Compute exact softmax attention without materializing the N x N score matrix in GPU HBM. |
| [`paged-attention`](../../skills/hardware-acceleration/paged-attention/SKILL.md) | `hardware-acceleration/paged-attention` | During autoregressive decoding every request keeps Keys and Values for all past tokens. |
| [`distributed-training`](../../skills/hardware-acceleration/distributed-training/SKILL.md) | `hardware-acceleration/distributed-training` | Train models that are too slow or too large for one GPU by splitting data, optimizer state, parameters, or layers across devices. |
| [`ml-model-interpretability`](../../skills/ml/model-interpretability/SKILL.md) | `ml/model-interpretability` | Design interpretability strategies combining global explanations (which features matter overall) and local explanations (why this specific… |
| [`genai-vision`](../../skills/ai/genai-vision/SKILL.md) | `ai/genai-vision` | Ship image generation and speech transcription with open models: pick a model whose license fits the use case, load it in half precision with… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill ml-classical-ml --skill ml-deep-learning --skill ml-model-evaluation --skill ml-feature-engineering --skill prompt-few-shot --skill prompt-chain-of-thought --skill security-data-security --skill ai-defense-mechanisms
```

**Level 1 + 2 + security baseline (17 skills):**

```bash
npx skills add j4flmao/agent-skills --skill ml-classical-ml --skill ml-deep-learning --skill ml-model-evaluation --skill ml-feature-engineering --skill prompt-few-shot --skill prompt-chain-of-thought --skill ml-model-serving --skill ml-inference-optimization --skill ml-experiment-tracking --skill devops-mlops --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill data-vector-databases --skill llm-finetuning --skill data-science-experimentation --skill security-data-security --skill ai-defense-mechanisms
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`ml-engineering`](../bundles.md#ml-engineering) | 24 | Machine learning and data science: classical/deep learning, features, evaluation, serving, MLOps, experimentation |
| [`ai-engineering`](../bundles.md#ai-engineering) | 26 | AI engineering: LLM apps, RAG, prompting, fine-tuning, inference, vector search, agent harnesses |
| [`gpu-hpc`](../bundles.md#gpu-hpc) | 14 | GPU and high-performance computing: CUDA, Triton, PTX/SASS, attention kernels, quantization, distributed training, RDMA |

## Combine with

- [AI Agent Builder](ai-agents.md)
- [Data Engineer](data-engineering.md)

## Watch out

Keep GPU kernel skills (`hardware-acceleration/*`) out unless you write kernels or tune serving; they trigger on generic performance questions.
