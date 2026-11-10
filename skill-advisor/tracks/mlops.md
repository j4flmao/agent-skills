# MLOps Engineer

**Who this is for:** You take models from notebooks to reliable production.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`devops-mlops`](../../skills/devops/mlops/SKILL.md) | `devops/mlops` | Implements ML CI/CD pipelines with model registry, canary deployment, monitoring, and rollback for production ML systems. |
| [`ml-model-serving`](../../skills/ml/model-serving/SKILL.md) | `ml/model-serving` | Design model serving architecture with framework selection, deployment strategy, autoscaling, and inference optimization for production workloads. |
| [`ml-experiment-tracking`](../../skills/ml/experiment-tracking/SKILL.md) | `ml/experiment-tracking` | Track machine learning experiments with full reproducibility: log parameters, metrics, artifacts, and environment. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ml-ml-pipeline`](../../skills/ml/ml-pipeline/SKILL.md) | `ml/ml-pipeline` | Design production ML pipelines with component decomposition, validation gates, artifact tracking, and CI/CD integration for reliable model… |
| [`ml-feature-store`](../../skills/ml/feature-store/SKILL.md) | `ml/feature-store` | Design feature store architecture with Feast or Tecton for consistent feature computation, serving, and validation across training and inference. |
| [`ml-model-evaluation`](../../skills/ml/model-evaluation/SKILL.md) | `ml/model-evaluation` | Design comprehensive model evaluation frameworks with appropriate metrics, cross-validation strategies, bias-variance diagnosis, and statistical… |
| [`ml-inference-optimization`](../../skills/ml/inference-optimization/SKILL.md) | `ml/inference-optimization` | Serve LLMs at the required latency for the lowest cost. |
| [`devops-kubernetes-for-data`](../../skills/devops/kubernetes-for-data/SKILL.md) | `devops/kubernetes-for-data` | Configures Kubernetes for data-intensive workloads: Spark, Airflow, Kafka, with GPU scheduling, node pools, and storage optimization. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`tensorrt-optimization`](../../skills/hardware-acceleration/tensorrt-optimization/SKILL.md) | `hardware-acceleration/tensorrt-optimization` | TensorRT compiles a network (usually ONNX) into an engine optimized for one GPU model and TensorRT version: it fuses layers, selects the fastest… |
| [`distributed-training`](../../skills/hardware-acceleration/distributed-training/SKILL.md) | `hardware-acceleration/distributed-training` | Train models that are too slow or too large for one GPU by splitting data, optimizer state, parameters, or layers across devices. |
| [`data-data-versioning`](../../skills/data/data-versioning/SKILL.md) | `data/data-versioning` | Implement data versioning with DVC or LakeFS for reproducibility, branching, diff, rollback, and experiment tracking across data pipelines and ML… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill devops-mlops --skill ml-model-serving --skill ml-experiment-tracking --skill security-data-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill devops-mlops --skill ml-model-serving --skill ml-experiment-tracking --skill ml-ml-pipeline --skill ml-feature-store --skill ml-model-evaluation --skill ml-inference-optimization --skill devops-kubernetes-for-data --skill security-data-security --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`ml-engineering`](../bundles.md#ml-engineering) | 24 | Machine learning and data science: classical/deep learning, features, evaluation, serving, MLOps, experimentation |
| [`data-engineering`](../bundles.md#data-engineering) | 45 | Data engineering: pipelines, orchestration, streaming/CDC, lakes and lakehouses, warehousing, modeling, quality, governance |

## Combine with

- [ML & AI Engineer](ml-ai.md)
- [DevOps & Platform Engineer](devops-platform.md)

## Watch out

Read `.claude/rules/resource-aware-ml.md` (dtypes, serving engines, device selection).
