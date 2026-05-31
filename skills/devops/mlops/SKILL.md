---
name: devops-mlops
description: >
  Use this skill when implementing MLOps: ML CI/CD pipelines, model deployment pipelines, model registry CI/CD, canary deploy ML, A/B testing ML, model monitoring, model drift, model rollback, feature store CI/CD.
  This skill enforces: CI/CD for model pipeline, registry promotion, canary/blue-green deployment, drift monitoring, rollback strategy.
  Do NOT use for: model training (use ml-training), feature engineering (use feature-engineering), data pipeline CI/CD (use devops-dataops).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, mlops, ml, phase-11]
---

# MLOps Agent

## Purpose
Implements ML CI/CD pipelines with model registry, canary deployment, monitoring, and rollback for production ML systems. MLOps applies DevOps principles to machine learning, adding data and model versioning, experiment tracking, model registry, deployment strategies, and monitoring for drift and performance decay.

## Architecture/Decision Trees

### Deployment Strategy Decision Tree
```
Is this a real-time inference service (< 100ms latency)?
  |-- YES --> Does the model serve critical user-facing traffic?
  |     |-- YES --> Canary deployment (gradual rollout, auto-rollback)
  |     |-- NO  --> Blue-green (fast rollback with full cutover)
  |-- NO --> Is this a batch inference job?
        |-- YES --> Shadow deployment (run new model in parallel, compare results)
        |-- NO --> Rolling update (gradual pod replacement)

Do you have A/B testing infrastructure for model comparison?
  |-- YES --> Canary with traffic splitting (by user_id or experiment flag)
  |-- NO --> Blue-green (simpler deployment without experiment infrastructure)
```

### Monitoring Strategy Decision Tree
```
Is the input data distribution stable or changing?
  |-- Stable --> Focus on concept drift (prediction accuracy over time)
  |-- Changing --> Focus on data drift (feature distribution changes)

Do you have ground truth labels available in near real-time?
  |-- YES --> Monitor accuracy metrics directly (precision, recall, RMSE)
  |-- NO --> Monitor prediction distribution shift as proxy for performance

Do you have business KPIs correlated with model performance?
  |-- YES --> Monitor business metrics (conversion rate, revenue per user)
  |-- NO --> Monitor model metrics only (latency, error rate, drift)
```

## Agent Protocol

### Trigger
User request includes: MLOps, ML pipeline CI/CD, model deployment pipeline, model registry CI/CD, canary deploy ML, A/B testing ML, model monitoring, model drift, model rollback, feature store CI/CD.

### Protocol
1. Design CI pipeline: data validation -> training -> evaluation -> registry promotion.
2. Configure model registry (MLflow, DVC, custom).
3. Design CD pipeline: deployment strategy (canary, blue-green).
4. Set up A/B testing infrastructure.
5. Configure model monitoring (data drift, concept drift, performance decay).
6. Implement rollback strategy.
7. Set up feature pipeline CI/CD.

## Output
MLOps pipeline with CI/CD config, model registry, deployment strategy, monitoring.

### Response Format
```
## MLOps Pipeline
### CI Pipeline
Stages: [data-validate -> train -> evaluate -> register]
Validation: {data schema / statistics / anomaly detection}
Evaluation Thresholds: {metric >= N}
Registry Promotion: {staging -> prod gate}

### Model Registry
Platform: {MLflow / DVC / custom}
Registry Stages: [none, staging, production, archived]
Artifacts: [{model binary, metadata, metrics, plots}]

### Deployment
Strategy: {canary / blue-green / rolling}
Canary Traffic: {N%} | Observation: {duration}
Auto-rollback: {metric drop >= X%}

### Monitoring
Drift Detection: {data / concept / both}
Frequency: {per batch / real-time}
Alerts: {metric name: threshold}
Performance Decay: {monitor accuracy every N days}

### Rollback
Trigger: {drift alert / error rate / performance decay}
Strategy: {revert to previous prod version / shadow traffic}
```

### Completion Criteria
- [ ] CI pipeline validates data, trains model, evaluates against thresholds.
- [ ] Model registry stages mapped to environments.
- [ ] Deployment strategy selected with traffic management.
- [ ] A/B testing infrastructure configured.
- [ ] Drift monitoring active for data and concept drift.
- [ ] Rollback strategy tested and automated.
- [ ] Feature pipeline has separate CI/CD.

## Workflow

### Step 1: CI Pipeline
Define stages: data validation (schema, statistics, missing values), feature engineering, model training, evaluation (against baseline and threshold), model registration. Run in parallel where possible.

### Step 2: Model Registry
Use MLflow stages: None -> Staging -> Production -> Archived. Register model only on CI success. Promote to Staging on merge to staging branch. Promote to Production on merge to main or manual approval. Archive old versions.

### Step 3: Deployment Strategy
- **Canary**: Route N% traffic to new model. Observe for X hours. Auto-rollback if metric drops.
- **Blue-green**: Full swap with complete cutover. Fast rollback by swapping back.
- **Rolling**: Gradual pod replacement. Best for stateless serving.

### Step 4: A/B Testing
Route traffic by user_id hash or experiment flag. Log predictions with treatment arm. Compare metrics: CTR, conversion, latency. Statistical significance test before full rollout.

### Step 5: Model Monitoring
Data drift: KL divergence, JS divergence, PSI on feature distributions. Concept drift: accuracy decay, prediction distribution shift. Performance monitor: schedule periodic evaluation against labeled data.

### Step 6: Rollback
Automatic: trigger by drift alert, error rate spike, latency increase. Manual: via registry version revert. Shadow rollback: route copy of traffic to previous version, compare.

### Step 7: Feature Pipeline CI/CD
Separate from model pipeline. Validate feature transformations produce expected distributions. Test feature consistency between training and serving. Version feature definitions alongside model.

## Rules
- Never promote to production without passing evaluation thresholds.
- Canary period minimum: N complete business cycles (e.g., 24h).
- Every model deployment must have a rollback plan.
- Monitor drift on every inference batch — not just on schedule.
- Feature consistency: training and serving must use identical transformations.
- Registry stages must be immutable — no overwrites.
- A/B tests must reach statistical significance before declaring winner.
- Log all prediction requests and responses for audit and debugging.
- Version training data alongside model artifacts for full reproducibility.

## Best Practices
- Automate model retraining on data drift detection.
- Use feature stores to ensure training-serving consistency.
- Implement model explainability (SHAP, LIME) in evaluation pipeline.
- Monitor infrastructure metrics (GPU utilization, memory, latency) alongside model metrics.
- Run model evaluation against a holdout test set that is never used in training.
- Document model cards (intended use, performance, limitations) for every registered model.

## Common Pitfalls
- **Training-serving skew**: Feature transformations differ between training and inference pipelines. Use a feature store to guarantee consistency.
- **Silent model degradation**: Model accuracy decays gradually and escapes notice without automated monitoring. Schedule periodic evaluation.
- **Canary blindness**: Insufficient traffic routed to canary means metrics never reach statistical significance. Ensure minimum traffic percentage.
- **Rollback that breaks backward compatibility**: New model changes the prediction schema; rolling back means clients receive incompatible format. Version the prediction schema.
- **Data drift threshold tuning**: Too sensitive causes false alarms; too insensitive misses real drift. Tune on historical data.

## Compared With
| Aspect | Traditional DevOps | MLOps |
|--------|-------------------|-------|
| Artifact versioning | Code only | Code + Data + Model |
| CI trigger | Code change | Code change + Data change + Retrain trigger |
| Test scope | Unit + Integration + E2E | + Data validation + Model evaluation |
| Deployment | Traffic shift | Traffic shift + Model registry promotion |
| Monitoring | System metrics (CPU, memory) | + Data drift + Concept drift + Model accuracy |
| Rollback | Code revert | Model version revert + Data version revert |

## Performance
- Model evaluation latency: 1-10 minutes for typical tabular models, 10-60 minutes for deep learning.
- Canary observation period: 24-72 hours minimum for business cycle coverage.
- Drift detection latency: near real-time for data drift, 1-7 days for concept drift (needs labels).
- Model registry operations: sub-second for version lookup, seconds for artifact download.

## Tooling/Methodology
- **ML platforms**: MLflow, Kubeflow, SageMaker, Vertex AI, Azure ML.
- **Orchestration**: Airflow, Prefect, Dagster, Argo Workflows, Kubeflow Pipelines.
- **Deployment**: KServe, Seldon Core, BentoML, TF Serving, TorchServe.
- **Monitoring**: Evidently AI, WhyLabs, Arize AI, NannyML, Alibi Detect.
- **Registry**: MLflow Model Registry, DVC, Hugging Face Hub.

## References
  - references/ml-cicd-pipeline.md — ML CI/CD Pipeline
  - references/ml-deployment.md — ML Deployment & Monitoring
  - references/ml-experiment-tracking.md — ML Experiment Tracking
  - references/ml-retraining.md — ML Model Retraining
  - references/mlops-advanced.md — Mlops Advanced Topics
  - references/mlops-fundamentals.md — Mlops Fundamentals
  - references/mlops-pipeline-automation.md — MLOps Pipeline Automation
  - references/mlops-model-governance.md — MLOps Model Governance
## Handoff
For data pipeline CI/CD: `devops-dataops`. For Kubernetes deployment: `devops-kubernetes-for-data`.
