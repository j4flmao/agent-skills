# Fairness & Model Auditing

## Fairness Definitions

| Definition | Description | Metric |
|------------|-------------|--------|
| Demographic parity | Positive rate equal across groups | Statistical parity difference |
| Equal opportunity | TPR equal across groups | Equal opportunity difference |
| Equalized odds | TPR + FPR equal across groups | Average odds difference |
| Predictive parity | Precision equal across groups | Precision difference |
| Individual fairness | Similar individuals get similar predictions | Consistency score |

### Demographic Parity

```
from fairlearn.metrics import demographic_parity_difference

dp_diff = demographic_parity_difference(
    y_true, y_pred, sensitive_features=group_labels
)
# dp_diff = 0 means perfect parity
# dp_diff > 0.1 typically indicates concern
```

### Equal Opportunity

```
from fairlearn.metrics import equal_opportunity_difference

eo_diff = equal_opportunity_difference(
    y_true, y_pred, sensitive_features=group_labels
)
# TPR difference across groups
```

## Bias Detection

```
import pandas as pd
from sklearn.metrics import confusion_matrix

def audit_bias(y_true, y_pred, sensitive_feature, groups):
    results = []
    for group in groups:
        mask = sensitive_feature == group
        tn, fp, fn, tp = confusion_matrix(
            y_true[mask], y_pred[mask]
        ).ravel()
        tpr = tp / (tp + fn)
        tnr = tn / (tn + fp)
        ppv = tp / (tp + fp)
        results.append({
            "group": group,
            "count": mask.sum(),
            "TPR": tpr,
            "TNR": tnr,
            "Precision": ppv,
            "FPR": 1 - tnr,
        })
    return pd.DataFrame(results)
```

## Mitigation Strategies

### Pre-processing

| Method | How It Works | Tools |
|--------|-------------|-------|
| Reweighing | Adjust sample weights | Fairlearn |
| Disparate impact remover | Transform features | AIF360 |
| Optimized preprocessing | Learn fair transformation | AIF360 |
| Correlation removal | Remove correlated features | Manual |

### In-processing

```
from fairlearn.reductions import ExponentiatedGradient, DemographicParity
from sklearn.linear_model import LogisticRegression

classifier = LogisticRegression()
mitigator = ExponentiatedGradient(
    classifier, constraints=DemographicParity()
)
mitigator.fit(X_train, y_train, sensitive_features=sensitive_features)
```

### Post-processing

```
from fairlearn.postprocessing import ThresholdOptimizer

optimizer = ThresholdOptimizer(
    estimator=model,
    constraints="equalized_odds",
    prefit=True,
)
optimizer.fit(X_val, y_val, sensitive_features=group_val)
y_pred_fair = optimizer.predict(X_test, sensitive_features=group_test)
```

## Model Auditing Report

```
## Model Audit Report
### Dataset
Total samples: {N}
Protected attribute: {attribute}
Groups: [{group_names}]
Base rate: {positive_rate}%

### Metrics by Group
| Group | Count | TPR | FPR | Precision | Recall | F1 |
|-------|-------|-----|-----|-----------|--------|-----|
| {g1}  | {N}   | {v} | {v} | {v}       | {v}    | {v} |
| {g2}  | {N}   | {v} | {v} | {v}       | {v}    | {v} |

### Fairness Metrics
Demographic Parity Difference: {value} (target < 0.1)
Equal Opportunity Difference: {value} (target < 0.1)
Average Odds Difference: {value} (target < 0.1)

### Mitigation
Strategy: {reweighing / threshold / grid search}
Post-Mitigation Parity Difference: {value}
Trade-off: accuracy dropped {N}%, fairness improved {N}%
```

## Production Monitoring

- Track fairness metrics per batch in production
- Set up alerts when parity difference exceeds threshold
- Monitor model confidence calibration per group
- Audit model outputs quarterly for fairness degradation
- Log predictions with group membership for post-hoc analysis
- Maintain an audit trail for regulatory compliance (GDPR, ECOA)

## Framework Integration

- Fairlearn: metrics, mitigation (reduction, post-processing), visualization dashboard
- AIF360: comprehensive bias detection, pre/in/post-processing algorithms
- SHAP: detect bias by analyzing feature contributions across groups
- What-If Tool: interactive fairness exploration
- TF Responsible AI: model card toolkit, fairness indicators

## Best Practices

- Define fairness metric before training — don't cherry-pick after seeing results
- Audit on held-out test data only — never mitigate on training data
- Document trade-offs between fairness and model performance
- Consider intersectional groups (not just single attributes)
- Involve domain experts in defining fairness criteria
- Retain model versions with fairness audit reports for compliance
- Re-audit when data distribution shifts or new groups emerge
