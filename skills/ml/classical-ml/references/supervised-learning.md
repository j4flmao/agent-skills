# Supervised Learning Reference

## Regression Metrics

```python
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import numpy as np

y_true, y_pred = [100, 200, 300, 400, 500], [95, 210, 290, 410, 480]

rmse = np.sqrt(mean_squared_error(y_true, y_pred))
mae = mean_absolute_error(y_true, y_pred)
r2 = r2_score(y_true, y_pred)
mape = np.mean(np.abs((np.array(y_true) - np.array(y_pred)) / np.array(y_true))) * 100
print(f"RMSE: {rmse:.2f}, MAE: {mae:.2f}, R2: {r2:.4f}, MAPE: {mape:.2f}%")
```

## Classification Metrics

```python
from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score, log_loss

y_true = [0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
y_pred = [0, 1, 0, 0, 1, 0, 1, 1, 0, 1]
y_proba = [0.1, 0.9, 0.4, 0.2, 0.8, 0.3, 0.7, 0.85, 0.15, 0.95]

auc = roc_auc_score(y_true, y_proba)
precision = precision_score(y_true, y_pred)
recall = recall_score(y_true, y_pred)
f1 = f1_score(y_true, y_pred)
logloss = log_loss(y_true, y_proba)
print(f"AUC: {auc:.4f}, Precision: {precision:.3f}, Recall: {recall:.3f}, F1: {f1:.3f}, LogLoss: {logloss:.4f}")

# Multiclass
from sklearn.metrics import f1_score
y_true_mc, y_pred_mc = [0, 1, 2, 0, 1, 2], [0, 2, 1, 0, 1, 2]
print(f"Macro F1: {f1_score(y_true_mc, y_pred_mc, average='macro'):.4f}")
print(f"Weighted F1: {f1_score(y_true_mc, y_pred_mc, average='weighted'):.4f}")
```

## Ensemble Methods

### Random Forest
```python
from sklearn.ensemble import RandomForestClassifier
rf = RandomForestClassifier(
    n_estimators=300, max_depth=12, min_samples_split=10,
    min_samples_leaf=4, max_features="sqrt", oob_score=True, n_jobs=-1,
)
```

### XGBoost
```python
import xgboost as xgb
xgb_model = xgb.XGBClassifier(
    n_estimators=500, max_depth=6, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8,
    reg_alpha=0.1, reg_lambda=1.0, min_child_weight=3,
    eval_metric="auc", random_state=42,
)
```

### LightGBM
```python
import lightgbm as lgb
lgb_model = lgb.LGBMClassifier(
    n_estimators=500, num_leaves=31, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1,
    reg_lambda=0.1, min_child_samples=20, class_weight="balanced",
)
```

### CatBoost
```python
from catboost import CatBoostClassifier
cb_model = CatBoostClassifier(
    iterations=500, learning_rate=0.05, depth=6,
    l2_leaf_reg=3.0, auto_class_weights="Balanced", verbose=0,
)
```

## Hyperparameter Guide

### XGBoost Parameter Grid
```python
param_grid = {
    "n_estimators": [100, 300, 500, 1000],
    "max_depth": [3, 4, 6, 8, 10, 12],
    "learning_rate": [0.01, 0.05, 0.1, 0.3],
    "subsample": [0.6, 0.8, 1.0],
    "colsample_bytree": [0.6, 0.8, 1.0],
    "min_child_weight": [1, 3, 5, 10],
    "reg_alpha": [0, 0.01, 0.1, 1.0],
    "reg_lambda": [0, 0.01, 0.1, 1.0],
}
```

### LightGBM Tuning Priority
1. num_leaves + min_child_samples
2. max_depth
3. subsample + colsample_bytree
4. reg_alpha + reg_lambda
5. learning_rate + n_estimators

## Imbalanced Data

```python
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTEENN

smote = SMOTE(sampling_strategy=0.5, k_neighbors=5, random_state=42)
X_res, y_res = smote.fit_resample(X_train, y_train)

# Cost-sensitive
scale_pos_weight = sum(y_train == 0) / sum(y_train == 1)
xgb_model = XGBClassifier(scale_pos_weight=scale_pos_weight)

# Threshold tuning
from sklearn.metrics import precision_recall_curve
probs = model.predict_proba(X_val)[:, 1]
precisions, recalls, thresholds = precision_recall_curve(y_val, probs)
f1_scores = 2 * (precisions[:-1] * recalls[:-1]) / (precisions[:-1] + recalls[:-1] + 1e-10)
best_threshold = thresholds[np.argmax(f1_scores)]
print(f"Best threshold: {best_threshold:.3f}")
```

## References
- XGBoost docs: https://xgboost.readthedocs.io/
- LightGBM docs: https://lightgbm.readthedocs.io/
- CatBoost docs: https://catboost.ai/docs/
