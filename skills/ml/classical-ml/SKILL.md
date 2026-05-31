---
name: ml-classical-ml
description: >
  Use this skill when asked about scikit-learn, XGBoost, LightGBM, CatBoost, regression, classification, clustering, ensemble, random forest, gradient boosting, SVM, PCA, feature importance, or cross-validation. This skill enforces: supervised learning pipelines (regression and classification metrics), ensemble methods (bagging, boosting, stacking), gradient boosting hyperparameter tuning (XGBoost, LightGBM, CatBoost), unsupervised learning (clustering dimensionality reduction), scikit-learn Pipeline and ColumnTransformer, cross-validation strategies, and imbalanced data handling. Do NOT use for: deep neural networks, reinforcement learning, or transformer models.
version: "1.1.0"
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
Regression: MSE/RMSE, MAE, R-squared, MAPE. Binary classification: AUC-ROC, F1, log loss, precision@k, recall. Multiclass: macro/micro/weighted F1. Ranking: NDCG, MAP.

```python
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    roc_auc_score, f1_score, log_loss,
    precision_recall_curve, average_precision_score,
    classification_report
)
```

### Step 2: Model Selection
Linear: LogisticRegression, LinearRegression, Ridge — interpretable, fast. Tree: DecisionTree, RandomForest — non-linear, robust. Gradient Boosting: XGBoost (fast, defaults), LightGBM (fastest, large data), CatBoost (categorical native). SVM: high-dimensional spaces.

```yaml
# Model selection guide
regression:
  linear: LinearRegression, Ridge, Lasso, ElasticNet
  tree: RandomForestRegressor, GradientBoostingRegressor
  boosting: XGBRegressor, LGBMRegressor, CatBoostRegressor
classification:
  linear: LogisticRegression, LinearSVC
  tree: RandomForestClassifier, ExtraTreesClassifier
  boosting: XGBClassifier, LGBMClassifier, CatBoostClassifier
  svm: SVC, NuSVC
```

### Step 3: Preprocessing Pipeline
scikit-learn Pipeline chains transforms. ColumnTransformer applies different transforms by column type. Numeric: StandardScaler, MinMaxScaler, RobustScaler, PowerTransformer. Categorical: OneHotEncoder, OrdinalEncoder. Missing: SimpleImputer, KNNImputer.

```python
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder, OrdinalEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier

numeric_features = ["age", "income", "score"]
categorical_features = ["region", "tier"]
ordinal_features = ["education"]

preprocessor = ColumnTransformer(transformers=[
    ("num", Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ]), numeric_features),
    ("cat", Pipeline([
        ("imputer", SimpleImputer(strategy="constant", fill_value="MISSING")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ]), categorical_features),
    ("ord", Pipeline([
        ("encoder", OrdinalEncoder(categories=[["HS", "BS", "MS", "PhD"]])),
    ]), ordinal_features),
])

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", RandomForestClassifier(n_estimators=200, random_state=42)),
])
```

### Step 4: Cross-Validation
K-Fold: default for i.i.d. data. StratifiedKFold: classification with imbalanced classes. GroupKFold: no leakage across groups. TimeSeriesSplit: temporal data. Repeated K-Fold: lower variance estimate.

```python
from sklearn.model_selection import (
    KFold, StratifiedKFold, GroupKFold,
    TimeSeriesSplit, RepeatedKFold, cross_validate
)

# Stratified CV for imbalanced classification
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# Time series CV
ts_cv = TimeSeriesSplit(n_splits=5, gap=0)

# Group CV
group_cv = GroupKFold(n_splits=5)

scores = cross_validate(
    pipeline, X_train, y_train,
    cv=cv, scoring=["roc_auc", "f1", "precision", "recall"],
    n_jobs=-1, return_estimator=True,
    return_train_score=True,
)
```

### Step 5: Hyperparameter Tuning
GridSearchCV: exhaustive (small spaces). RandomizedSearchCV: random sampling (large spaces). Optuna: Bayesian optimization with pruning. HalvingGridSearchCV: successive halving for faster search.

```python
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import randint, uniform

param_dist = {
    "classifier__n_estimators": randint(100, 1000),
    "classifier__max_depth": randint(3, 20),
    "classifier__min_samples_split": randint(2, 20),
    "classifier__min_samples_leaf": randint(1, 10),
    "classifier__max_features": uniform(0.3, 0.7),
}

random_search = RandomizedSearchCV(
    pipeline, param_distributions=param_dist,
    n_iter=50, cv=5, scoring="roc_auc",
    n_jobs=-1, random_state=42, verbose=1,
)
random_search.fit(X_train, y_train)
```

### Step 6: Model Interpretation
Feature importance (tree-based): gain-based, permutation importance, SHAP values. Partial dependence plots. LIME for local explanations. Use permutation importance as the most reliable global method.

```python
import shap
import matplotlib.pyplot as plt

# Permutation importance
from sklearn.inspection import permutation_importance
result = permutation_importance(
    best_model, X_val, y_val,
    n_repeats=10, random_state=42, n_jobs=-1,
)
feature_importance = pd.DataFrame({
    "feature": feature_names,
    "importance": result.importances_mean,
    "std": result.importances_std,
}).sort_values("importance", ascending=False)

# SHAP explanation
explainer = shap.TreeExplainer(best_model.named_steps["classifier"])
shap_values = explainer.shap_values(
    preprocessor.transform(X_val[:100])
)
shap.summary_plot(shap_values, X_val[:100])
```

### Step 7: Imbalanced Data Handling
Resampling: SMOTE, RandomUnderSampler, SMOTEENN. Algorithmic: class_weight='balanced', scale_pos_weight (XGBoost). Metric: precision-recall curve, AUC-PR. Threshold tuning.

```python
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTEENN
from imblearn.pipeline import Pipeline as ImbPipeline

# SMOTE within pipeline
imb_pipeline = ImbPipeline([
    ("preprocessor", preprocessor),
    ("smote", SMOTE(sampling_strategy="auto", random_state=42, k_neighbors=5)),
    ("classifier", XGBClassifier(
        scale_pos_weight=len(y_train[y_train==0]) / len(y_train[y_train==1]),
        eval_metric="logloss",
    )),
])

# Threshold tuning from PR curve
from sklearn.metrics import precision_recall_curve
probs = imb_pipeline.predict_proba(X_val)[:, 1]
precision, recall, thresholds = precision_recall_curve(y_val, probs)
f1_scores = 2 * precision * recall / (precision + recall)
best_threshold = thresholds[f1_scores.argmax()]
```

### Step 8: Model Serialization
Joblib for numpy-heavy models. ONNX for cross-platform deployment. Native formats: XGBoost .json/.ubj, LightGBM .txt, CatBoost .cbm. Serialize full pipeline, not just model weights.

```python
import joblib
# Save full pipeline
joblib.dump(pipeline, "models/churn_pipeline_v2.pkl")

# XGBoost native format
pipeline.named_steps["classifier"].save_model("models/xgb_model.json")

# Load and predict
loaded = joblib.load("models/churn_pipeline_v2.pkl")
predictions = loaded.predict(new_data)
```

### Step 9: Ensemble Methods
Beyond individual models, use ensemble methods: Voting classifier (soft/hard voting), Stacking (meta-model on base model predictions), and Bagging (bootstrap aggregation).

```python
from sklearn.ensemble import VotingClassifier, StackingClassifier

# Soft voting
voting = VotingClassifier(estimators=[
    ("lr", LogisticRegression()),
    ("rf", RandomForestClassifier(n_estimators=200)),
    ("xgb", XGBClassifier(eval_metric="logloss")),
], voting="soft")

# Stacking with meta-model
stacking = StackingClassifier(estimators=[
    ("rf", RandomForestClassifier(n_estimators=200)),
    ("xgb", XGBClassifier(eval_metric="logloss")),
    ("cat", CatBoostClassifier(verbose=0)),
], final_estimator=LogisticRegression(), cv=5)
```

### Step 10: Feature Engineering
Feature engineering transforms raw data into informative predictors. Include interaction features, polynomial features, binning, and target encoding for high-cardinality categoricals.

```python
from sklearn.preprocessing import PolynomialFeatures, KBinsDiscretizer
from sklearn.feature_selection import SelectFromModel

# Add interaction and polynomial features
poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)

# Target encoding for high-cardinality categories
from category_encoders import TargetEncoder

# Feature selection from model importance
selector = SelectFromModel(
    RandomForestClassifier(n_estimators=100, random_state=42),
    threshold="median", max_features=50,
)
```

## Architecture / Decision Trees

### Model Selection

```
Problem type
  ├── Regression (continuous target)
  │   ├── Linear relationship + interpretability → LinearRegression / Ridge
  │   ├── Non-linear, robust → RandomForest / XGBoost
  │   ├── High cardinality categorical → CatBoost
  │   └── Large dataset (> 100K rows) → LightGBM
  ├── Classification (binary)
  │   ├── Interpretability needed → LogisticRegression
  │   ├── Imbalanced → XGBoost + scale_pos_weight or SMOTE
  │   ├── High-dimensional → LinearSVC
  │   └── Default robust → GradientBoosting / RandomForest
  ├── Multiclass
  │   └── Any ensemble method with multiclass support
  ├── Clustering (unsupervised)
  │   ├── Known clusters → K-Means
  │   ├── Unknown shape → DBSCAN
  │   └── Hierarchical → Agglomerative
  └── Dimensionality reduction
      ├── Linear → PCA
      └── Non-linear → t-SNE / UMAP (visualization)
```

### Cross-Validation Strategy

```
Data type
  ├── I.I.D. samples → KFold (regression), StratifiedKFold (classification)
  ├── Grouped data (same subject, multiple samples) → GroupKFold
  ├── Time series → TimeSeriesSplit (no future leakage)
  ├── Small dataset (< 1000 samples) → LeaveOneOut or RepeatedKFold
  └── Large dataset (> 100K samples) → ShuffleSplit (fewer folds)
```

## Common Pitfalls

1. **Data leakage**: scaling/encoding before train/test split, or using target information in preprocessing. Fix: always use Pipeline to chain transforms.
2. **Hyperparameter overfitting**: tuning on test set. Fix: nested cross-validation or separate validation set.
3. **Ignoring feature scaling**: distance-based models (SVM, KNN, PCA) require scaling. Tree models don't.
4. **Imbalanced data with accuracy metric**: 99% accuracy on 99:1 imbalance is misleading. Fix: use precision-recall, AUC-PR.
5. **Too many features**: overfitting and slow training. Fix: feature selection, dimensionality reduction.
6. **Not cross-validating time series**: random shuffle breaks temporal order. Fix: TimeSeriesSplit.
7. **Confusing correlation with causation**: feature importance shows correlation, not causation.
8. **Using default hyperparameters without tuning**: defaults are rarely optimal for your specific dataset.
9. **Testing multiple hypotheses on same test set**: each test set evaluation erodes statistical validity. Fix: hold out test set until final evaluation.
10. **Ignoring multicollinearity in linear models**: correlated features inflate coefficient variance in linear regression.
11. **Not encoding cyclical features properly**: hour, day of week, month need sin/cos encoding for ML algorithms to understand cyclical nature.
12. **Applying SMOTE before train/test split**: SMOTE on full dataset leaks synthetic samples across folds. Apply inside CV loop.
13. **Not setting random_state**: non-deterministic results make debugging and comparison impossible.
14. **Using AUC-ROC for highly imbalanced data**: AUC-ROC over-optimistic for 99:1 imbalance. Use AUC-PR.

## Best Practices

- Use Pipeline and ColumnTransformer for ALL preprocessing. Never manually transform.
- Fit preprocessing on training data only. Transform validation/test with fitted transformer.
- Select scoring metric based on business problem, not convention.
- Stratified CV for classification. Group CV for grouped data. TimeSeriesSplit for time series.
- Cross-validate hyperparameters on training folds, never tune on test set.
- Use AUC-PR for imbalanced data instead of AUC-ROC.
- Scale features for distance-based models (KNN, SVM, PCA, clustering).
- Tree-based models need no scaling.
- Feature importance from gradient boosting informs feature selection.
- Test set is for final evaluation only — one inference.
- Set random_state for reproducibility across all training runs.
- Log all experiments with parameters, metrics, and data versions.
- Use learning curves to diagnose bias vs variance.
- Start with a simple baseline (mean, majority class) before complex models.
- Monitor feature distributions over time for concept drift.
- Validate model calibration with reliability diagrams (calibration curves).
- Ensemble diverse models (different families) for better generalization.
- Profile prediction latency before deploying to production.

## Compared With

| Model | Accuracy | Training Speed | Inference Speed | Interpretability | Categorical Support |
|---|---|---|---|---|---|
| Logistic Regression | Low | Very fast | Very fast | High | Requires encoding |
| Random Forest | Medium | Medium | Fast | Medium (importance) | Requires encoding |
| XGBoost | High | Medium | Fast | Medium | Requires encoding |
| LightGBM | High | Fast | Fast | Medium | Native |
| CatBoost | High | Slow | Medium | Medium | Native (best) |
| SVM (RBF) | Medium | Slow | Medium | Low | Requires encoding |
| Gradient Boosting | High | Slow | Fast | Medium | Requires encoding |
| KNN | Medium | None | Slow | Low | Requires encoding |

Classical ML vs deep learning: classical ML (especially gradient boosting) often outperforms deep learning on tabular data with < 100K samples. Deep learning excels with unstructured data (images, text, audio) and large datasets. For tabular data, start with gradient boosting. Use deep learning when you have > 1M samples or unstructured inputs.

Classical ML vs rule-based: rule-based systems are fully interpretable but don't generalize beyond explicit rules. Classical ML learns patterns from data. Use rule-based for compliance-critical decisions (credit scoring, medical triage), ML for complex pattern recognition.

## Performance

- XGBoost vs LightGBM: LightGBM 2-4x faster training, similar accuracy. LightGBM uses histogram-based splits.
- CatBoost: 1.5-2x slower training but best categorical support (no encoding needed).
- Random Forest: scales with n_estimators * max_depth. O(1) per tree, parallel by default.
- Pipeline overhead: minimal (< 5ms per prediction for 100 features).
- SHAP: O(2^n * T) for exact TreeSHAP. Use approximate or interventional for large models.
- Feature importance (permutation): O(n * T) where n = iterations, T = trees.
- Memory: XGBoost histogram mode uses ~2x data memory. LightGBM leaf-wise growth uses ~1.5x. CatBoost uses ~3x.
- GPU training: XGBoost GPU 3-5x speedup, LightGBM GPU 2-3x, CatBoost GPU 2-4x.
- Inference optimization: convert to ONNX for 2-5x faster inference. Quantize to float16 for 2x memory reduction.
- Large dataset strategy: for datasets > 1M rows, use histogram-based boosting (LightGBM/XGBoost hist). For > 10M rows, use sampling or distributed training (Spark + XGBoost).
- Feature selection reduces training time linearly. Remove features with near-zero variance or extremely low importance.

## Tooling

| Tool | Purpose |
|---|---|
| scikit-learn | General ML pipeline, preprocessing, models |
| XGBoost | Gradient boosting (fast, well-tuned defaults) |
| LightGBM | Gradient boosting (very fast, large data) |
| CatBoost | Gradient boosting (native categorical) |
| Optuna / Hyperopt | Bayesian hyperparameter optimization |
| SHAP | Model interpretation |
| imbalanced-learn | SMOTE, sampling strategies |
| MLflow | Experiment tracking |
| ONNX | Cross-platform model deployment |
| category_encoders | Target encoding, leave-one-out encoding |
| feature-engine | Advanced feature engineering, selection |
| Pandas / Polars | Data manipulation and exploration |
| Yellowbrick | Visual diagnostics for ML models |
| Dask ML | Distributed scikit-learn for large datasets |

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
- Set random_state for all experiments
- Log experiments with parameters, metrics, data versions
- Start with a simple baseline before complex models
- Validate calibration for probabilistic predictions
- Profile inference latency before production deployment
- Monitor for concept drift post-deployment
- Use learning curves to diagnose bias-variance tradeoff
- Never apply SMOTE before train/test split

## References
  - references/classical-ml-advanced.md — Classical Ml Advanced Topics
  - references/classical-ml-fundamentals.md — Classical Ml Fundamentals
  - references/imbalanced-learn.md — Handling Imbalanced Data
  - references/interpretable-ml.md — Interpretable Classical ML
  - references/supervised-learning.md — Supervised Learning Reference
  - references/unsupervised-pipeline.md — Unsupervised Learning and Pipelines
  - references/classical-ml-feature-engineering.md — Feature Engineering Reference
  - references/classical-ml-model-selection.md — Model Selection Reference
## Handoff
`ml-deep-learning` for deep learning/neural network methods
`ml-feature-engineering` for feature extraction and selection
