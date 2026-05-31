---
name: ml-experiment-tracking
description: >
  Use this skill when asked about MLflow, W&B, Neptune, DVC, experiment tracking, run logging, metric logging, artifact store, model registry, hyperparameter logging, or experiment comparison. This skill enforces: experiment tracking platform setup (MLflow, W&B, Neptune), run logging conventions (params, metrics, artifacts), model registry versioning with stage promotion, experiment comparison using parallel coordinates, and full reproducibility through code + data + environment tracking. Do NOT use for: model training itself, feature engineering pipelines, or production deployment.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, experiment, tracking, phase-11]
---

# ML Experiment Tracking

## Purpose
Track machine learning experiments with full reproducibility: log parameters, metrics, artifacts, and environment. Use the model registry to version, compare, and promote models through staging. Experiment tracking is the foundation of disciplined ML development — it transforms ad-hoc model building into a systematic, comparable, and repeatable process.

## Architecture/Decision Trees

### Platform Selection Decision Tree
```
Is your team size 1-3 data scientists working locally?
  |-- YES --> MLflow (local mode, simple setup)
  |-- NO --> Do you need rich collaboration features with non-ML stakeholders?
        |-- YES --> W&B (rich UI, reports, dashboards)
        |-- NO --> Do you have strict data sovereignty requirements?
              |-- YES --> MLflow (self-hosted, full control)
              |-- NO --> Do you need structured metadata with nested runs?
                    |-- YES --> Neptune (structured logging, comparison)
                    |-- NO --> MLflow (open standard, broad ecosystem)

Do you need experiment tracking for deep learning specifically?
  |-- YES --> W&B (tight PyTorch/HuggingFace integration) or Neptune
  |-- NO --> MLflow (sufficient for sklearn, XGBoost, lightGBM)

Do you need model registry with CI/CD integration?
  |-- YES --> MLflow Model Registry (stages, API, deployment)
  |-- NO --> Platform-specific registry is sufficient
```

## Agent Protocol

### Trigger
Exact user phrases: "experiment tracking", "MLflow", "WandB", "Weights and Biases", "Neptune", "DVC", "run logging", "metric logging", "artifact store", "model registry", "hyperparameter logging", "experiment comparison", "model versioning", "run comparison".

### Input Context
Before activating, verify:
- Experiment tracking platform (MLflow, W&B, Neptune) or greenfield
- ML framework (PyTorch, TensorFlow, scikit-learn, XGBoost)
- Team size and collaboration model
- Infrastructure (local, on-premise server, cloud-managed)
- Artifact storage requirements (model files, datasets, plots)
- Model registry needs (manual vs automated promotion)

### Output Artifact
Experiment tracking configuration with logging setup, artifact structure, and model registry workflow.

### Response Format
```python
# Experiment tracking setup
# Training loop with logging
# Model registry operations
```
```yaml
# MLflow tracking server config
# Artifact store configuration
# Model registry stage rules
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Experiment tracking platform selected and configured
- [ ] Run logging conventions established (params, metrics, tags)
- [ ] Artifact store configured with structure (models, plots, datasets)
- [ ] Model registry set up with versioning and stage promotion
- [ ] Reproducibility ensured (code version, data version, environment)
- [ ] Experiment comparison setup (parallel coordinates, scatter plots)
- [ ] Alerting or regression detection for metric degradation

### Max Response Length
300 lines of configuration and code.

## Workflow

### Step 1: Platform Selection
MLflow: open-source, self-hosted, language-agnostic, tracking + registry + projects + models. W&B: cloud-hosted, rich UI, collaboration, tight PyTorch/HuggingFace integration. Neptune: cloud-hosted, structured logging, rich comparison views. Local development: MLflow. Team collaboration: W&B or Neptune. Enterprise compliance: MLflow self-hosted on Kubernetes.

```yaml
tracking_uri: http://mlflow-server:5000
default_artifact_root: s3://mlflow-artifacts/
experiment_defaults:
  lifecycle_stage: active
  tags:
    team: ml-platform
    project: recommendation-engine
```

### Step 2: Run Logging Conventions
Structured parameter names: `model.learning_rate`, `model.architecture.n_layers`, `data.train_size`. Metric logging: log after every epoch and at the end. Use dictionary logging for grouped metrics. Tags for searchability: `status`, `dataset`, `model_type`, `git_branch`, `gpu_id`.

### Step 3: Artifact Storage
Log model files with signature and conda/pip environment. Log plots as PNG/HTML. Log dataset samples and preprocessing config. Structure: `models/`, `plots/`, `data/`, `configs/`, `code/`.

### Step 4: Model Registry
Model versioning: each logged model creates a new version. Stage promotion: None -> Staging -> Production -> Archived. Transition rules: automated via metric thresholds, manual approval for production.

### Step 5: Experiment Comparison
Parallel coordinates: compare hyperparameters across runs. Scatter plots: metric vs metric. Table view: sortable columns for params and metrics. Regression detection: compare against baseline, alert on degradation.

### Step 6: Reproducibility
Code: log git commit hash. Data: log dataset hash or DVC version. Environment: log conda/pip environment files. Random seeds: log and control all seeds. Source code: log snapshot of training script.

## Rules
- Every run logs params, metrics, tags, and artifacts.
- Parameter names use dot notation for grouping (`model.lr`, `data.size`).
- Metrics logged per-epoch (step) and final.
- Model signature logged with every model artifact.
- Git commit hash always logged as a tag.
- Dataset hash or version always logged as a tag.
- Environment pinned at the package level.
- Model registry stages: None -> Staging -> Production -> Archived.
- Automated promotion only to Staging, manual approval for Production.
- Never delete runs — archive them instead.

## Best Practices
- Use consistent naming conventions for experiments and runs across the team.
- Log intermediate metrics during training, not just final values.
- Tag runs with meaningful attributes (dataset version, branch name, model architecture).
- Create dashboards for frequently compared experiments.
- Set up alerts for metric regression after each new run.

## Common Pitfalls
- **Missing data version**: A model without a data version reference cannot be reproduced.
- **Environment drift**: Pinning Python version but not package versions leads to unreproducible runs.
- **Inconsistent metric names**: Different team members use different names for the same metric (e.g., "val_accuracy" vs "validation_accuracy").
- **Forgetting to log test metrics**: Logging only training metrics makes it impossible to detect overfitting in the registry.
- **Not setting random seeds**: Without fixed seeds, the exact same parameters produce different results across runs.
- **Overwriting model registry versions**: Registry versions must be immutable; always create a new version.

## Compared With
| Feature | MLflow | W&B | Neptune | DVC |
|---------|--------|-----|---------|-----|
| Self-hosted | Yes | Optional | No | Yes |
| Model Registry | Yes | Yes | Yes | Limited |
| Experiment Comparison | Basic | Rich | Rich | None |
| Nested Runs | No | Yes | Yes | No |
| Reports/Dashboards | Limited | Yes | Yes | No |
| Pipeline versioning | Projects | Limited | Limited | Full |
| Cost | Free | Freemium | Freemium | Free |

## Performance
- MLflow tracking server overhead: < 1ms per log call (local), 5-20ms (remote).
- Artifact storage: depends on network speed to artifact store.
- Parallel coordinates rendering: 500+ runs may cause lag in UI.
- Registry lookup: sub-second for stage-based queries, seconds for full history.

## Tooling/Methodology
- **MLflow**: Tracking Server, Model Registry, Projects, Models (serving).
- **W&B**: Experiments, Artifacts, Sweeps, Reports, Tables.
- **Neptune**: Runs, Metadata, Artifacts, Monitoring, Model Registry.
- **DVC**: Data versioning, pipeline versioning, experiment tracking (git-based).
- **Integration libraries**: PyTorch Lightning, HuggingFace Transformers, Keras, XGBoost.

## References
  - references/data-versioning.md — Data Versioning
  - references/experiment-collaboration.md — Experiment Collaboration
  - references/experiment-platforms.md — Experiment Tracking Platforms
  - references/experiment-tracking-advanced.md — Experiment Tracking Advanced Topics
  - references/experiment-tracking-fundamentals.md — Experiment Tracking Fundamentals
  - references/mlflow-setup.md — MLflow Setup and Configuration
  - references/experiment-tracking-tools.md — Experiment Tracking Tools
  - references/experiment-reproducibility.md — Experiment Reproducibility
## Handoff
`ml-classical-ml` for model training workflows. `ml-deep-learning` for deep learning experiment tracking.
