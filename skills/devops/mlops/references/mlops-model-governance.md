# MLOps Model Governance

## Overview

Model governance is the system of policies, processes, and controls that ensure ML models are developed, deployed, and maintained responsibly, reproducibly, and in compliance with regulatory requirements. As ML systems make increasingly consequential decisions, governance becomes as important as model accuracy. This reference covers model lineage tracking, approval workflows, compliance documentation, model risk management, and auditing practices.

## Governance Framework

### Governance Pillars

```
┌──────────────────────────────────────────────────────────┐
│                   Model Governance                         │
├──────────────┬──────────────┬──────────────┬──────────────┤
│  Lineage &   │  Approval &  │  Risk &      │  Compliance  │
│  Reproduci-  │  Promotion   │  Monitoring  │  & Audit     │
│  bility      │  Workflows   │              │              │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Data source  │ Stage gates  │ Risk         | Regulatory    │
│ versioning   │ Manual/auto  │ assessment   | requirement   │
│ Code version │ promotion    │ per model    | mapping       │
│ Hyperpara-   │ Change       │ Model        | Audit trail   │
│ meters       │ review board │ card docs    | Reporting     │
│ Environment  │ Rollback     │ Fairness     | Data          │
│ pinning      │ approval     | checks       | retention     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Governance Maturity Levels

| Level | Name | Characteristics | Typical Stage |
|-------|------|----------------|---------------|
| 1 - Ad-hoc | No formal governance | Models deployed by individual data scientists, no tracking | Startup, < 5 models |
| 2 - Defined | Basic governance exists | Model registry with versioning, manual approval gates | Growth, 5-20 models |
| 3 - Managed | Automated governance | CI/CD gates, automated testing, model cards, drift monitoring | Scale, 20-100 models |
| 4 - Measured | Quantitative governance | Fairness metrics, bias detection, SLA monitoring, automated compliance | Enterprise, 100+ models |
| 5 - Optimized | Continuous governance | Automated retraining triggers, predictive governance, self-healing | Mature enterprise |

## Model Lineage Tracking

### Lineage Data Model

```yaml
model_lineage:
  model_version: "recommendation-xgb-v5"
  registered_at: "2024-06-15T10:30:00Z"
  registered_by: "data-science-team"

  source_code:
    repository: "github.com/company/ml-models"
    commit_hash: "a1b2c3d4e5f6"
    branch: "main"
    training_script: "models/recommendation/train.py"

  training_data:
    source: "feature_store://recommendation/features/v3"
    dataset_hash: "sha256:abc123def456"
    row_count: 2500000
    feature_count: 45
    date_range:
      start: "2024-01-01"
      end: "2024-05-31"

  training_environment:
    python_version: "3.11.5"
    mlflow_version: "2.10.0"
    xgboost_version: "2.0.3"
    cuda_version: "12.1"
    dependencies:
      - "xgboost==2.0.3"
      - "scikit-learn==1.4.0"
      - "pandas==2.1.4"
    infrastructure: "AWS SageMaker ml.p3.2xlarge"

  hyperparameters:
    max_depth: 8
    learning_rate: 0.01
    n_estimators: 1000
    subsample: 0.8
    colsample_bytree: 0.7
    min_child_weight: 3
    random_seed: 42

  evaluation_metrics:
    primary:
      test_auc: 0.892
      test_logloss: 0.234
    secondary:
      precision_at_10: 0.45
      recall_at_10: 0.38
      ndcg_at_10: 0.52
    baseline_comparison:
      baseline_test_auc: 0.871
      improvement_pct: 2.4

  evaluation_data:
    source: "feature_store://recommendation/evaluation/v1"
    dataset_hash: "sha256:def789ghi012"
    row_count: 500000
    time_period: "2024-06-01 to 2024-06-14"

  model_artifacts:
    model_file: "model.xgb"
    model_size_mb: 45
    model_signature:
      inputs: "float[45]"
      outputs: "float[1] (probability)"
    explainer: "shap_values.npy"

  experiment_reference:
    experiment_id: "42"
    run_id: "f1e2d3c4b5a6"
    parent_run_id: null
```

### Programmatic Lineage Capture

```python
class LineageTracker:
    def __init__(self, tracking_uri: str):
        mlflow.set_tracking_uri(tracking_uri)

    def create_lineage_record(self, model_name: str, version: int) -> dict:
        client = MlflowClient()

        # Get model version details
        model_version = client.get_model_version(model_name, version)
        run = client.get_run(model_version.run_id)

        lineage = {
            'model_name': model_name,
            'model_version': version,
            'status': model_version.status,
            'stage': model_version.current_stage,
            'run_id': model_version.run_id,
            'experiment_id': run.info.experiment_id,
            'source_run_id': model_version.run_id,
            'registered_at': model_version.creation_timestamp,
            'registered_by': model_version.user_id,
            'source': model_version.source,
            'description': model_version.description,
            'tags': model_version.tags,
            'params': run.data.params,
            'metrics': run.data.metrics,
            'artifacts': self._list_artifacts(run.info.run_id),
        }

        # Store lineage in governance database
        self._persist_lineage(lineage)
        return lineage

    def get_lineage(self, model_name: str, version: int) -> dict:
        return self._load_lineage(model_name, version)

    def get_lineage_graph(self, model_name: str) -> list[dict]:
        # Return all versions with dependency edges
        versions = self._get_all_versions(model_name)
        graph = []
        for i, version in enumerate(versions):
            node = {
                'version': version.version,
                'stage': version.current_stage,
                'created_at': version.creation_timestamp,
                'predecessor': versions[i - 1].version if i > 0 else None,
                'lineage': self.get_lineage(model_name, version.version),
            }
            graph.append(node)
        return graph
```

## Approval Workflows

### Stage Gate Definitions

```yaml
stage_gates:
  development:
    entry_criteria:
      - "Training pipeline passes CI checks"
      - "Data validation succeeds"
    exit_criteria:
      - "Model accuracy >= threshold"
      - "Bias/fairness checks pass"
      - "Model card created"
    approvers: ["Data Scientist lead"]
    automation_level: "Automated"

  staging:
    entry_criteria:
      - "Model promoted from development"
      - "Evaluation against baseline passed"
    exit_criteria:
      - "Integration tests pass"
      - "Shadow deployment metrics healthy"
      - "Load test within performance budget"
    approvers: ["ML Engineer lead"]
    automation_level: "Automated + Manual on failure"

  production_canary:
    entry_criteria:
      - "Model promoted from staging"
      - "Approval from ML engineer"
    exit_criteria:
      - "Canary metrics stable for 24 hours"
      - "No error rate spike"
      - "No significant drift detected"
    approvers: ["ML Engineer + Product owner"]
    automation_level: "Automated with manual override"

  production_full:
    entry_criteria:
      - "Canary phase completed successfully"
      - "A/B test statistically significant (if applicable)"
    exit_criteria:
      - "Full rollout metrics match canary"
      - "Business KPIs meet targets"
    approvers: ["ML Engineer lead + Product lead"]
    automation_level: "Semi-automated"
```

### Approval Workflow Implementation

```python
class ApprovalWorkflow:
    def __init__(self, registry_client, notification_client):
        self.registry = registry_client
        self.notifier = notification_client

    async def request_promotion(self, model_name: str, version: int,
                                 target_stage: str, requestor: str):
        # Check entry criteria
        entry_met = await self._check_entry_criteria(model_name, version, target_stage)
        if not entry_met:
            return {'approved': False, 'reason': 'Entry criteria not met'}

        # Determine required approvers
        approvers = self._get_approvers(target_stage)

        # Create approval request
        request = {
            'model_name': model_name,
            'version': version,
            'target_stage': target_stage,
            'requestor': requestor,
            'requested_at': datetime.utcnow(),
            'status': 'pending',
            'approvers': approvers,
            'approvals': {},
        }

        await self._save_approval_request(request)

        # Notify approvers
        for approver in approvers:
            await self.notifier.send_approval_request(approver, request)

        return {
            'approved': False,
            'status': 'pending',
            'request_id': request['id'],
            'approvers': approvers,
        }

    async def approve(self, request_id: str, approver: str, decision: bool, comment: str = ''):
        request = await self._load_approval_request(request_id)
        request['approvals'][approver] = {
            'decision': decision,
            'comment': comment,
            'decided_at': datetime.utcnow(),
        }

        await self._save_approval_request(request)

        # Check if all approvals received
        all_decided = all(
            a in request['approvals'] for a in request['approvers']
        )

        if all_decided:
            all_approved = all(
                v['decision'] for v in request['approvals'].values()
            )

            if all_approved:
                # Promote model
                self.registry.transition_model_version_stage(
                    name=request['model_name'],
                    version=request['version'],
                    stage=request['target_stage'],
                )
                request['status'] = 'approved'
                await self.notifier.send_approval_notification(
                    request, 'approved'
                )
            else:
                request['status'] = 'rejected'
                await self.notifier.send_approval_notification(
                    request, 'rejected'
                )

            await self._save_approval_request(request)

        return request['status']
```

## Model Cards

### Model Card Template

```markdown
# Model Card: {Model Name}

## Model Details
- **Model Name**: {name}
- **Version**: {version}
- **Model Type**: {e.g., Gradient Boosted Tree, Neural Network}
- **Date**: {training date}
- **Author**: {team/individual}
- **License**: {MIT, proprietary, etc.}

## Intended Use
- **Primary Use**: {what the model is designed to predict or classify}
- **Primary Users**: {who is expected to use the model's outputs}
- **Out-of-Scope Uses**: {use cases the model should NOT be applied to}

## Training Data
- **Dataset**: {name and version}
- **Size**: {row count, feature count}
- **Time Period**: {training data date range}
- **Data Sources**: {where the data originated}
- **Preprocessing**: {feature engineering, transformations applied}
- **Known Biases**: {any known biases in the training data}

## Evaluation Data
- **Dataset**: {name and version}
- **Size**: {row count}
- **Time Period**: {evaluation data date range}
- **Distribution**: {how evaluation data differs from training}

## Performance
- **Primary Metric**: {metric name}: {score} (threshold: {value})
- **Secondary Metrics**: {metric}: {score}, {metric}: {score}
- **Baseline Comparison**: {baseline metric}: {baseline score} → {improvement}%
- **Performance by Segment**: {segment}: {score}, {segment}: {score}
- **Latency**: P50: {N}ms, P95: {N}ms, P99: {N}ms

## Fairness Analysis
| Segment | Metric | Score | Disparity |
|---------|--------|-------|-----------|
| Group A | {metric} | {score} | baseline |
| Group B | {metric} | {score} | {delta} |
| Group C | {metric} | {score} | {delta} |

## Limitations
- {known limitation 1}
- {known limitation 2}

## Ethical Considerations
- {consideration 1}
- {consideration 2}

## Governance
- **Approval Status**: {approved / pending / rejected}
- **Last Review Date**: {date}
- **Review Frequency**: {quarterly / annually}
- **Owner**: {team/individual}
- **Escalation Path**: {who to contact for issues}
```

## Model Risk Management

### Risk Classification

```yaml
risk_classification:
  low_risk:
    examples:
      - "Product recommendation (non-critical)"
      - "Content personalization"
      - "Internal dashboard predictions"
    governance_requirements:
      - "Basic model card"
      - "Automated monitoring"
      - "Quarterly review"

  medium_risk:
    examples:
      - "Credit scoring"
      - "Customer churn prediction"
      - "Fraud detection with human review"
    governance_requirements:
      - "Full model card"
      - "Bias analysis"
      - "Approval workflow"
      - "Monthly review"

  high_risk:
    examples:
      - "Automated loan approval"
      - "Medical diagnosis support"
      - "Autonomous system decisions"
    governance_requirements:
      - "Full model card with fairness analysis"
      - "External audit"
      - "Human-in-the-loop validation"
      - "Weekly review"
      - "Regulatory compliance documentation"
```

### Risk Assessment Template

```markdown
## Model Risk Assessment

### Model Information
- **Model**: {name} v{version}
- **Risk Classifier**: {low / medium / high}
- **Assessment Date**: {date}
- **Assessor**: {name}

### Risk Factors
| Factor | Rating | Rationale |
|--------|--------|-----------|
| Decision criticality | {1-5} | {explanation} |
| Regulatory impact | {1-5} | {explanation} |
| Data sensitivity | {1-5} | {explanation} |
| Failure impact | {1-5} | {explanation} |
| Bias potential | {1-5} | {explanation} |
| **Overall Risk Score** | **{sum}** | |

### Mitigation Measures
- [ ] Human review for high-stakes predictions
- [ ] Automated monitoring and alerting
- [ ] Bias detection in CI pipeline
- [ ] Explainability (SHAP/LIME) available
- [ ] Rollback plan documented

### Approval
- **Risk Accepted By**: {name}
- **Date**: {date}
```

## Compliance and Auditing

### Audit Log Structure

```sql
CREATE TABLE model_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(200) NOT NULL,
  model_version INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  -- registered, promoted, deployed, rolled_back, archived, retrained
  previous_stage VARCHAR(50),
  new_stage VARCHAR(50),
  actor VARCHAR(200) NOT NULL,
  action_source VARCHAR(50) NOT NULL,
  -- manual, automated_pipeline, scheduled, triggered
  metadata JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_model ON model_audit_log(model_name, model_version);
CREATE INDEX idx_audit_actor ON model_audit_log(actor);
CREATE INDEX idx_audit_time ON model_audit_log(created_at);
```

### Auditing Implementation

```python
class ModelAuditor:
    def __init__(self, db_session):
        self.db = db_session

    def log_event(self, event: ModelAuditEvent):
        self.db.execute("""
            INSERT INTO model_audit_log
                (model_name, model_version, event_type, previous_stage,
                 new_stage, actor, action_source, metadata, description)
            VALUES
                (:model_name, :model_version, :event_type, :previous_stage,
                 :new_stage, :actor, :action_source, :metadata, :description)
        """, event.dict())

    def get_model_history(self, model_name: str) -> list[dict]:
        return self.db.query("""
            SELECT * FROM model_audit_log
            WHERE model_name = :model_name
            ORDER BY created_at DESC
        """, {'model_name': model_name})

    def get_audit_report(self, start_date: str, end_date: str) -> dict:
        return {
            'total_promotions': self.db.query("""
                SELECT COUNT(*) FROM model_audit_log
                WHERE event_type = 'promoted'
                AND created_at BETWEEN :start AND :end
            """, {'start': start_date, 'end': end_date}),
            'total_rollbacks': self.db.query("""
                SELECT COUNT(*) FROM model_audit_log
                WHERE event_type = 'rolled_back'
                AND created_at BETWEEN :start AND :end
            """, {'start': start_date, 'end': end_date}),
            'models_by_stage': self.db.query("""
                SELECT model_name, MAX(created_at) as last_promoted,
                       COUNT(*) as total_versions
                FROM model_audit_log
                WHERE event_type = 'promoted'
                GROUP BY model_name
            """),
        }

    def generate_compliance_report(self, model_name: str, version: int) -> dict:
        lineage = self.get_model_history(model_name, version)
        model_card = self.get_model_card(model_name, version)
        risk_assessment = self.get_risk_assessment(model_name, version)
        approvals = self.get_approvals(model_name, version)

        return {
            'model': f"{model_name} v{version}",
            'lineage_complete': len(lineage) > 0,
            'model_card_exists': model_card is not None,
            'risk_assessment_complete': risk_assessment is not None,
            'approval_chain_complete': all(
                a['status'] == 'approved' for a in approvals
            ),
            'monitoring_active': self.is_monitoring_active(model_name, version),
            'last_drift_check': self.get_last_drift_check(model_name, version),
            'compliance_status': 'pass' if all([
                len(lineage) > 0,
                model_card is not None,
                risk_assessment is not None,
            ]) else 'fail',
        }
```

## Automated Governance Checks

### Governance CI Pipeline

```yaml
# .github/workflows/model-governance.yml
name: Model Governance Checks

on:
  pull_request:
    paths:
      - 'models/**'
      - 'config/model-registry.yaml'

jobs:
  governance-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check model card exists
        run: |
          for model in models/*/; do
            if [ ! -f "$model/model_card.md" ]; then
              echo "Missing model card for $model"
              exit 1
            fi
          done

      - name: Validate model card completeness
        run: python scripts/validate_model_card.py

      - name: Check risk assessment exists
        run: |
          for model in models/*/; do
            if [ ! -f "$model/risk_assessment.md" ]; then
              echo "Missing risk assessment for $model"
              exit 1
            fi
          done

      - name: Verify bias tests pass
        run: python scripts/run_bias_tests.py

      - name: Check data lineage is documented
        run: python scripts/check_data_lineage.py

      - name: Verify evaluation metrics meet thresholds
        run: python scripts/check_metric_thresholds.py

      - name: Generate governance report
        if: always()
        run: python scripts/generate_governance_report.py

      - name: Upload governance report
        uses: actions/upload-artifact@v4
        with:
          name: governance-report
          path: reports/governance/
```

## Periodic Review Process

### Model Review Schedule

```yaml
review_schedule:
  low_risk:
    frequency: "Quarterly"
    scope:
      - "Performance metrics review"
      - "Drift analysis"
      - "Model card review"
    participants: ["Data scientist", "ML engineer"]

  medium_risk:
    frequency: "Monthly"
    scope:
      - "Performance metrics review"
      - "Drift analysis"
      - "Bias analysis update"
      - "Feature importance review"
      - "Model card update"
    participants: ["Data scientist", "ML engineer", "Product owner"]

  high_risk:
    frequency: "Weekly"
    scope:
      - "Performance metrics review"
      - "Drift analysis"
      - "Bias analysis"
      - "Fairness metrics"
      - "Human-in-the-loop metrics"
      - "Regulatory compliance check"
    participants: ["Data scientist", "ML engineer", "Product owner",
                   "Compliance officer", "Risk manager"]
```

### Model Retirement Process

```python
class ModelRetirement:
    def __init__(self, registry, monitoring, auditor):
        self.registry = registry
        self.monitoring = monitoring
        self.auditor = auditor

    async def retire_model(self, model_name: str, version: int, reason: str,
                            replacement: str = None):
        # 1. Route traffic away from model
        await self.monitoring.disable_model(model_name, version)

        # 2. Wait for in-flight predictions to complete
        await asyncio.sleep(60)

        # 3. Archive model in registry
        self.registry.transition_model_version_stage(
            name=model_name,
            version=version,
            stage='Archived',
        )

        # 4. Update model card
        await self.update_model_card(model_name, version, {
            'status': 'retired',
            'retirement_date': datetime.utcnow(),
            'retirement_reason': reason,
            'replacement_model': replacement,
        })

        # 5. Log retirement event
        self.auditor.log_event(ModelAuditEvent(
            model_name=model_name,
            model_version=version,
            event_type='retired',
            description=f"Model retired: {reason}. Replacement: {replacement}",
        ))

        # 6. Schedule data cleanup
        await self.schedule_cleanup(model_name, version, retention_days=90)
```

## References
- references/ml-cicd-pipeline.md — ML CI/CD Pipeline
- references/ml-deployment.md — ML Deployment & Monitoring
- references/ml-experiment-tracking.md — ML Experiment Tracking
- references/ml-retraining.md — ML Model Retraining
- references/mlops-pipeline-automation.md — MLOps Pipeline Automation
- references/mlops-advanced.md — MLOps Advanced Topics
