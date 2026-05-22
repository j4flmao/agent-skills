---
name: ml-classical-ml
description: >
  Use this skill when asked about scikit-learn, XGBoost, LightGBM, CatBoost, regression, classification, clustering, ensemble, random forest, gradient boosting, SVM, PCA, feature importance, or cross-validation. This skill enforces: supervised learning pipelines (regression and classification metrics), ensemble methods (bagging, boosting, stacking), gradient boosting hyperparameter tuning (XGBoost, LightGBM, CatBoost), unsupervised learning (clustering dimensionality reduction), scikit-learn Pipeline and ColumnTransformer, cross-validation strategies, and imbalanced data handling. Do NOT use for: deep neural networks, reinforcement learning, or transformer models.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, classical, machine-learning, phase-11]
---

# ML Classical ML

## Purpose
Build supervised and unsupervised machine learning pipelines with scikit-learn, XGBoost, LightGBM, and CatBoost. Select models by problem type, tune hyperparameters systematically, validate with appropriate cross-validation, and handle class imbalance.

## Agent Protocol

### Trigger
Exact user phrases: "scikit-learn", "XGBoost", "LightGBM", "CatBoost", "regression", "classification", "clustering", "ensemble", "random forest", "gradient boosting", "SVM", "PCA", "feature importance", "cross-validation", "imbalanced data", "SMOTE", "hyperparameter tuning".

### Input Context
Before activating, verify:
- Problem type (regression, binary classification, multiclass, clustering)
- Dataset size (rows, features, sparsity)
- Target distribution (balanced, imbalanced ratio)
- Feature types (numeric, categorical, text, datetime)
- Performance requirements (latency, throughput, memory)
- Interpretability needs (must explain predictions vs black-box OK)
- Existing baseline or prior experiments

### Output Artifact
ML pipeline with model selection, hyperparameter configuration, cross-validation strategy, and training code as Python.

### Response Format
```python
# Pipeline definition (preprocessing + model)
# Training and validation code
# Hyperparameter search configuration
```
```yaml
# Model hyperparameters
# Cross-validation config
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Problem type identified and metric selected (RMSE, AUC, F1, NDCG)
- [ ] Model selected with rationale (linear, tree-based, ensemble)
- [ ] Scikit-learn Pipeline with ColumnTransformer for preprocessing
- [ ] Cross-validation strategy chosen (K-Fold, Stratified, Group, TimeSeries)
- [ ] Hyperparameter search configured (GridSearch, RandomizedSearch, Optuna)
- [ ] Imbalanced data handling applied if needed (SMOTE, class_weight, sampling)
- [ ] Feature importance analysis completed
- [ ] Final model evaluated on held-out test set

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Problem Type and Metric Selection
Regression: MSE/RMSE (scale-dependent), MAE (robust to outliers), R-squared (variance explained), MAPE (relative error). Binary classification: AUC-ROC (threshold-independent), F1 (precision-recall balance), log loss (probability calibration), precision@k (cost of false positives), recall (cost of false negatives). Multiclass: macro/micro/weighted F1. Ranking: NDCG, MAP.

| Problem Type | Primary Metric | Secondary Metrics |
|-------------|----------------|-------------------|
| Regression | RMSE | MAE, R2, MAPE |
| Binary Classification | AUC-ROC | F1, Precision, Recall, LogLoss |
| Multiclass | Weighted F1 | Macro F1, Micro F1, Accuracy |
| Imbalanced | AUC-PR | F1, Recall@k |
| Regression (outliers) | MAE | Huber loss |

### Step 2: Model Selection
Linear: LogisticRegression, LinearRegression, Ridge, Lasso, ElasticNet — interpretable, fast, linear relationships. Tree: DecisionTree, RandomForest — non-linear, interpretable (small trees), robust to outliers. Gradient Boosting: XGBoost (fast, well-tuned defaults), LightGBM (very fast, large data, categorical support), CatBoost (categorical features natively, robust to small data). SVM: high-dimensional spaces, RBF kernel for non-linear. Ensemble stacking: combine multiple base models with meta-learner.

```python
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor

models = {
    "random_forest": RandomForestRegressor(n_estimators=300, max_depth=12, n_jobs=-1),
    "xgboost": XGBRegressor(n_estimators=500, learning_rate=0.05, max_depth=6),
    "lightgbm": LGBMRegressor(n_estimators=500, learning_rate=0.05, num_leaves=31),
    "catboost": CatBoostRegressor(iterations=500, learning_rate=0.05, depth=6, verbose=0),
}
```

### Step 3: Preprocessing Pipeline
scikit-learn Pipeline chains transforms. ColumnTransformer applies different transforms by column type. Numeric: StandardScaler (normal distribution), MinMaxScaler (bounded), RobustScaler (outliers), PowerTransformer (skewed). Categorical: OneHotEncoder (nominal, high cardinality -> dimensionality concerns), OrdinalEncoder (ordinal). Missing values: SimpleImputer (mean, median, mode, constant), KNNImputer (advanced).

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, OrdinalEncoder
from sklearn.ensemble import GradientBoostingClassifier

numeric_features = ["age", "income", "tenure"]
categorical_features = ["education", "occupation", "region"]
ordinal_features = ["satisfaction_rating"]

numeric_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])

categorical_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
    ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
])

ordinal_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("ordinal", OrdinalEncoder(categories=[
        ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"]
    ])),
])

preprocessor = ColumnTransformer([
    ("num", numeric_transformer, numeric_features),
    ("cat", categorical_transformer, categorical_features),
    ("ord", ordinal_transformer, ordinal_features),
])

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", GradientBoostingClassifier(n_estimators=200, max_depth=4)),
])
```

### Step 4: Cross-Validation
K-Fold: default for i.i.d. data. StratifiedKFold: preserves class proportions (classification). GroupKFold: no data leakage across groups (same patient in train and test). TimeSeriesSplit: temporal order preserved. Repeated K-Fold: lower variance estimate. Leave-One-Out: for very small datasets (n<30). Custom splits for domain-specific structure.

```python
from sklearn.model_selection import (
    cross_val_score, StratifiedKFold, TimeSeriesSplit,
    GroupKFold, RepeatedKFold, GridSearchCV
)

# Stratified for classification
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(pipeline, X, y, cv=cv, scoring="roc_auc")
print(f"AUC: {scores.mean():.4f} (+/- {scores.std() * 2:.4f})")

# Time-series for temporal data
ts_cv = TimeSeriesSplit(n_splits=5, gap=0)
ts_scores = cross_val_score(pipeline, X, y, cv=ts_cv, scoring="neg_mean_absolute_error")

# Group-aware
group_cv = GroupKFold(n_splits=5)
group_scores = cross_val_score(pipeline, X, y, groups=patient_ids, cv=group_cv, scoring="roc_auc")
```

### Step 5: Hyperparameter Tuning
GridSearchCV: exhaustive search for small parameter spaces. RandomizedSearchCV: random sampling for larger spaces (n_iter=50-200). Optuna: Bayesian optimization with pruning (best for complex spaces). HalvingGridSearchCV: successive halving for faster search. Define search space by model type: tree depth, learning rate, subsample, regularization.

```python
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import uniform, randint
from xgboost import XGBClassifier

param_dist = {
    "classifier__n_estimators": randint(100, 1000),
    "classifier__max_depth": randint(3, 12),
    "classifier__learning_rate": uniform(0.01, 0.3),
    "classifier__subsample": uniform(0.6, 0.4),
    "classifier__colsample_bytree": uniform(0.5, 0.5),
    "classifier__reg_alpha": uniform(0, 5),
    "classifier__reg_lambda": uniform(0, 5),
    "classifier__min_child_weight": randint(1, 10),
}

random_search = RandomizedSearchCV(
    pipeline, param_distributions=param_dist,
    n_iter=100, cv=5, scoring="roc_auc",
    n_jobs=-1, random_state=42, verbose=1,
)
random_search.fit(X_train, y_train)
print(f"Best params: {random_search.best_params_}")
print(f"Best CV AUC: {random_search.best_score_:.4f}")
```

### Step 6: Model Interpretation
Feature importance for tree-based models: gain-based (how much a feature reduces impurity), permutation importance (drop in metric when feature is shuffled), SHAP values (consistent per-feature contribution). Partial dependence plots show how model output changes with a feature. LIME for local explanations of individual predictions. Feature importance guides feature selection and debugging. For linear models, coefficients give direction and magnitude. Use permutation importance as the most reliable global method.

```python
import shap
from sklearn.inspection import permutation_importance

# SHAP explainer
explainer = shap.TreeExplainer(model.named_steps["classifier"])
shap_values = explainer.shap_values(X_processed)
shap.summary_plot(shap_values, X_processed, feature_names=feature_names)

# Permutation importance
result = permutation_importance(
    model, X_val, y_val, n_repeats=10, scoring="roc_auc", n_jobs=-1
)
importance_df = pd.DataFrame({
    "feature": feature_names,
    "importance": result.importances_mean,
    "std": result.importances_std,
}).sort_values("importance", ascending=False)
```

### Step 7: Imbalanced Data Handling
Resampling: SMOTE (synthetic oversampling), RandomUnderSampler (random undersampling), SMOTEENN (combined). Algorithmic: class_weight='balanced', scale_pos_weight (XGBoost), is_unbalance (CatBoost). Metric: precision-recall curve, AUC-PR instead of AUC-ROC. Threshold tuning: find optimal decision threshold using precision-recall trade-off.

```python
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTEENN
from xgboost import XGBClassifier

# Method 1: SMOTE in pipeline
imb_pipeline = ImbPipeline([
    ("preprocessor", preprocessor),
    ("smote", SMOTE(sampling_strategy=0.5, random_state=42, k_neighbors=5)),
    ("classifier", XGBClassifier(scale_pos_weight=3, eval_metric="aucpr")),
])

# Method 2: Class weights
weighted_model = XGBClassifier(
    scale_pos_weight=sum(y_train == 0) / sum(y_train == 1),
    eval_metric="aucpr",
)

# Method 3: Threshold tuning
from sklearn.metrics import precision_recall_curve
probs = model.predict_proba(X_val)[:, 1]
precisions, recalls, thresholds = precision_recall_curve(y_val, probs)
f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-10)
best_threshold = thresholds[np.argmax(f1_scores[:-1])]
```

### Step 8: Model Serialization and Deployment
Pickle for small scikit-learn models (PyTorch format for sklearn). Joblib for numpy-heavy models (compressed by default). ONNX for cross-platform deployment (convert sklearn with sklearn-onnx, XGBoost with onnxmltools). Native formats: XGBoost .json/.ubj, LightGBM .txt, CatBoost .cbm. Export feature metadata (names, types, preprocessing pipeline) alongside model. For production: serialize full pipeline (preprocessor + model), not just model weights. Version models and store in model registry.

```python
import joblib
from sklearn.pipeline import Pipeline

# Serialize full pipeline
joblib.dump(pipeline, "models/pipeline_v1.joblib", compress=True)

# Save metadata alongside model
model_metadata = {
    "model_name": "xgboost_classifier",
    "version": "1.0.0",
    "features": feature_names,
    "n_features": len(feature_names),
    "target": target_name,
    "classes": list(model.classes_),
    "metrics": {"val_auc": 0.892, "test_auc": 0.874},
    "training_date": "2025-03-15",
    "feature_importance": feature_importance.to_dict(),
    "preprocessing": "ColumnTransformer with StandardScaler + OneHotEncoder",
}
with open("models/metadata_v1.json", "w") as f:
    json.dump(model_metadata, f, indent=2)

# Load for inference
loaded_pipeline = joblib.load("models/pipeline_v1.joblib")
predictions = loaded_pipeline.predict(new_data)
```

## Rules
- Use Pipeline and ColumnTransformer for all preprocessing
- Fit preprocessing on training data only, transform validation/test
- Select scoring metric by business problem, not convention
- Use stratified cross-validation for classification
- Cross-validate hyperparameters, never tune on test set
- Use AUC-PR instead of AUC-ROC for imbalanced data
- Scale features for distance-based models (KNN, SVM, PCA)
- Tree-based models need no scaling
- Feature importance from gradient boosting informs feature selection
- Test set is for final evaluation only — one inference

## References
- `references/supervised-learning.md` — Regression/classification metrics, ensemble methods, XGBoost/LightGBM/CatBoost, hyperparameter guide, imbalanced data
- `references/unsupervised-pipeline.md` — Clustering K-means/DBSCAN/HDBSCAN, PCA/UMAP/t-SNE, scikit-learn Pipeline, ColumnTransformer, cross-validation

## Handoff
`ml-deep-learning` for deep learning/neural network methods
`ml-feature-engineering` for feature extraction and selection
