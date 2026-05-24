# Handling Imbalanced Data

## Resampling Strategies

| Method | How It Works | Best For |
|--------|-------------|----------|
| Random Undersampling | Remove majority class samples | Large datasets (>10K) |
| Random Oversampling | Duplicate minority samples | Small datasets |
| SMOTE | Interpolate synthetic minority samples | Tabular data, medium imbalance |
| Borderline-SMOTE | SMOTE near decision boundary | Clear class boundaries |
| ADASYN | SMOTE weighted by density | Highly imbalanced (1:100+) |
| SMOTE-ENN | SMOTE + Edited Nearest Neighbors | Noisy boundaries |
| SMOTE-Tomek | SMOTE + Tomek Links removal | Clean separation |

```python
# SMOTE pipeline with cross-validation
from imblearn.pipeline import Pipeline
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import RandomForestClassifier

pipeline = Pipeline([
    ('smote', SMOTE(sampling_strategy='auto', k_neighbors=5, random_state=42)),
    ('classifier', RandomForestClassifier(class_weight='balanced'))
])

# Evaluate with stratified CV
from imblearn.metrics import geometric_mean_score
from sklearn.model_selection import StratifiedKFold

cv = StratifiedKFold(n_splits=5)
scores = cross_val_score(pipeline, X, y, cv=cv, scoring='roc_auc')
```

## Cost-Sensitive Learning

| Approach | Implementation | Framework |
|----------|---------------|-----------|
| Class weights | `class_weight='balanced'` | sklearn, XGBoost |
| Sample weights | `sample_weight` per instance | Any framework |
| Cost matrix | TP=0, FP=cost_FP, FN=cost_FN, TN=0 | Custom training |
| Threshold moving | Optimal threshold from precision-recall curve | Post-training |

```python
# Cost-sensitive XGBoost
model = xgb.XGBClassifier(
    scale_pos_weight=sum(y_train == 0) / sum(y_train == 1),  # Ratio
    max_delta_step=1,  # For extreme imbalance
    eval_metric='aucpr'  # Precision-recall AUC better than ROC
)

# Optimal threshold from validation
from sklearn.metrics import precision_recall_curve
precision, recall, thresholds = precision_recall_curve(y_val, y_pred_prob)
f1_scores = 2 * precision * recall / (precision + recall + 1e-8)
optimal_threshold = thresholds[f1_scores.argmax()]
```

## Metrics for Imbalanced Data

| Metric | Why Better Than Accuracy | When |
|--------|-------------------------|------|
| Precision-Recall AUC | Focuses on minority class | Always for imbalanced |
| F1 / F2 | Balance of precision/recall (F2 weights recall) | When false negatives cost more |
| Matthews Correlation | Balanced even for 1:1000 | Scientific, binary |
| G-Mean | sqrt(sensitivity * specificity) | Balanced sensitivity/specificity |
| Cohen's Kappa | Agreement beyond chance | Multi-class imbalanced |
| Lift at k | Ratio of minority in top k predictions | Ranking, marketing |

## Ensemble Methods

```python
# Balanced Random Forest
from imblearn.ensemble import BalancedRandomForestClassifier

brf = BalancedRandomForestClassifier(
    n_estimators=100,
    sampling_strategy='auto',
    replacement=True,
    bootstrap=True
)

# EasyEnsemble (bagging with undersampling)
from imblearn.ensemble import EasyEnsembleClassifier

eec = EasyEnsembleClassifier(
    n_estimators=10,
    sampling_strategy='auto'
)
```

## Best Practices

- Never use accuracy for imbalanced data
- Use stratified CV to maintain class ratios
- SMOTE before feature selection (to avoid synthetic feature selection bias)
- SMOTE after train-test split (never before)
- For extreme imbalance (1:1000+): anomaly detection may be more appropriate
- Consider if minority class is truly "rare event" vs "measurement artifact"
- Test multiple resampling strategies — optimal method depends on data structure
- SMOTE on high-dimensional data can create noisy samples
