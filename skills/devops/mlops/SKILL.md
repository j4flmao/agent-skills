---
name: devops-mlops
description: >
  Use this skill when implementing MLOps: ML CI/CD pipelines, model deployment pipelines, model registry CI/CD, canary deploy ML, A/B testing ML, model monitoring, model drift, model rollback, feature store CI/CD.
  This skill enforces: CI/CD for model pipeline, registry promotion, canary/blue-green deployment, drift monitoring, rollback strategy.
  Do NOT use for: model training (use ml-training), feature engineering (use feature-engineering), data pipeline CI/CD (use devops-dataops).
version: "1.0.0"
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
Implements ML CI/CD pipelines with model registry, canary deployment, monitoring, and rollback for production ML systems.

## Agent Protocol

### Trigger
User request includes: MLOps, ML pipeline CI/CD, model deployment pipeline, model registry CI/CD, canary deploy ML, A/B testing ML, model monitoring, model drift, model rollback, feature store CI/CD.

### Protocol
1. Design CI pipeline: data validation → training → evaluation → registry promotion.
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
Stages: [data-validate → train → evaluate → register]
Validation: {data schema / statistics / anomaly detection}
Evaluation Thresholds: {metric >= N}
Registry Promotion: {staging → prod gate}

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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

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
Define stages: data validation (schema, statistics, missing values), feature engineering, model training, evaluation (against baseline and threshold), model registration. Run in parallel where possible (e.g., multiple model candidates).

### Step 2: Model Registry
Use MLflow stages: None → Staging → Production → Archived. Register model only on CI success. Promote to Staging on merge to staging branch. Promote to Production on merge to main or manual approval. Archive old versions.

### Step 3: Deployment Strategy
- **Canary**: Route N% traffic to new model. Observe for X hours. Auto-rollback if metric drops.
- **Blue-green**: Full swap with complete cutover. Fast rollback by swapping back.
- **Rolling**: Gradual pod replacement. Best for stateless serving.

### Step 4: A/B Testing
Route traffic by user_id hash or experiment flag. Log predictions with treatment arm. Compare metrics: CTR, conversion, latency. Statistical significance test before full rollout.

### Step 5: Model Monitoring
Data drift: KL divergence, JS divergence, PSI on feature distributions. Concept drift: accuracy decay, prediction distribution shift. Performance monitor: schedule periodic evaluation against labeled data. Alert thresholds pre-configured.

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

## References
- `references/ml-cicd-pipeline.md` — CI/CD for model training → validation → deployment → monitoring, registry promotion
- `references/ml-deployment.md` — Canary/blue-green deployment, A/B testing infra, drift monitoring, performance decay, rollback
- `references/ml-experiment-tracking.md` — MLflow setup, experiment tracking, model registry, artifact storage, CI/CD for experiments
- `references/ml-retraining.md` — Automated retraining pipeline, data drift detection, model refresh strategies, canary deployment, rollback

## Handoff
For data pipeline CI/CD, hand off to `devops-dataops`. For Kubernetes deployment of ML models, hand off to `devops-kubernetes-for-data`.
