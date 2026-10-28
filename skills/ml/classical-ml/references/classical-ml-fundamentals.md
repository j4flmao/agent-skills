# Classical ML Fundamentals: Problem Framing, Data Splits, Leakage, Pipelines and Algorithm Choice

Core concepts for building classical (non-deep-learning) machine learning models on tabular data with scikit-learn: framing the problem, the bias-variance trade-off, correct train/validation/test splits, avoiding data leakage, the estimator API and pipelines, baselines, and choosing an algorithm. Feature engineering, model selection, imbalanced data and interpretability have dedicated sibling references.

## Framing the Problem

| Question | Why it matters |
|----------|----------------|
| What decision will the prediction drive? | Defines the metric and acceptable error types |
| What is the target, exactly, and when is it known? | Label definition and prediction time determine which features are legal |
| Classification, regression, ranking, or clustering? | Algorithm family and metrics |
| What is the cost of false positives vs false negatives? | Threshold and metric choice |
| What does a trivial baseline achieve? | Measures whether ML adds value |
| How will it be served (batch, online, latency)? | Constrains model complexity and features |

Write the prediction point explicitly: "At the moment an order is placed, predict whether it will be returned within 30 days." Every feature must be available at that moment.

## Bias-Variance Trade-off

| Symptom | Diagnosis | Remedies |
|---------|-----------|----------|
| High training error, similar validation error | High bias (underfitting) | More expressive model, better features, less regularization |
| Low training error, much higher validation error | High variance (overfitting) | More data, regularization, simpler model, feature selection, ensembling (bagging) |

Learning curves (score vs training set size) show which regime you are in: if validation score still rises with more data, collecting data helps.

## Data Splits

| Situation | Split strategy |
|-----------|----------------|
| i.i.d. rows | Random train/validation/test (for example 70/15/15) or train/test + cross-validation |
| Imbalanced classes | Stratified splits (`stratify=y`, `StratifiedKFold`) |
| Repeated entities (customers, patients) | Group splits (`GroupKFold`, `GroupShuffleSplit`) so an entity is never in both train and test |
| Time-dependent data | Time-based split: train on the past, test on the future (`TimeSeriesSplit`); never shuffle |

```python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)
```

The test set is used once, at the end. Repeatedly checking it while tuning turns it into a validation set and makes the final estimate optimistic.

## Data Leakage

Leakage means the model sees information during training that will not be available at prediction time. It produces excellent offline scores and poor production performance.

| Leakage type | Example | Prevention |
|--------------|---------|------------|
| Target leakage | Feature "refund_issued" when predicting returns | Check each feature's availability at prediction time |
| Preprocessing leakage | Scaling or imputing using statistics computed on the full dataset | Fit transformers inside a pipeline on training folds only |
| Temporal leakage | Random split on time series; features aggregated over future windows | Time-based splits; point-in-time feature computation |
| Group leakage | Same customer in train and test | Group-aware splits |
| Duplicate leakage | Near-duplicate rows across splits | Deduplicate before splitting |

A suspiciously high score (for example AUC near 1.0 on a hard problem) is a leakage signal; inspect the top features.

## scikit-learn Estimator API

| Method | Purpose |
|--------|---------|
| `fit(X, y)` | Learn parameters from training data |
| `predict(X)` | Predictions (labels or values) |
| `predict_proba(X)` / `decision_function(X)` | Scores for ranking and thresholding |
| `transform(X)` / `fit_transform(X)` | Transformers (scalers, encoders) |
| `score(X, y)` | Default metric (accuracy or R2); prefer explicit metrics |
| `get_params()` / `set_params()` | Hyperparameters, used by search tools |

Fitted attributes end with an underscore (`coef_`, `feature_importances_`, `classes_`).

## Pipelines and ColumnTransformer

Pipelines bundle preprocessing and model so that cross-validation fits preprocessing on training folds only, and the same transformations apply in production.

```python
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

numeric = ["age", "tenure_months", "monthly_spend"]
categorical = ["plan", "region"]

preprocess = ColumnTransformer([
    ("num", Pipeline([("impute", SimpleImputer(strategy="median")),
                      ("scale", StandardScaler())]), numeric),
    ("cat", Pipeline([("impute", SimpleImputer(strategy="most_frequent")),
                      ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical),
])

model = Pipeline([
    ("prep", preprocess),
    ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc")
print(f"ROC AUC {scores.mean():.3f} +/- {scores.std():.3f}")
```

- `handle_unknown="ignore"` prevents failures on unseen categories at inference.
- `model.set_output(transform="pandas")` keeps feature names through transformations for inspection.

## Baselines

Always compare against:

| Baseline | Tool |
|----------|------|
| Majority class / mean prediction | `DummyClassifier(strategy="most_frequent")`, `DummyRegressor()` |
| Simple heuristic or business rule | Domain logic |
| Linear model | `LogisticRegression`, `Ridge` |

If a gradient-boosted model beats logistic regression by a negligible margin, the simpler model may be preferable for interpretability and maintenance.

## Algorithm Overview

| Algorithm | Strengths | Weaknesses | Scaling needed? |
|-----------|-----------|------------|-----------------|
| Linear / logistic regression (with L1/L2) | Fast, interpretable, good baseline | Needs feature engineering for non-linearity | Yes |
| k-nearest neighbors | Simple, no training | Slow prediction, curse of dimensionality | Yes |
| Naive Bayes | Very fast, good for text counts | Strong independence assumption | No |
| Support vector machines | Effective in high dimensions, kernels | Scales poorly beyond tens of thousands of rows (kernel SVM) | Yes |
| Decision tree | Interpretable, handles mixed data | High variance alone | No |
| Random forest | Robust, little tuning | Larger models, less accurate than boosting on many tasks | No |
| Gradient boosting (HistGradientBoosting, XGBoost, LightGBM, CatBoost) | Usually strongest on tabular data, handles missing values | More hyperparameters, can overfit small data | No |
| Clustering (k-means, DBSCAN, Gaussian mixtures) | Unsupervised structure discovery | Results depend on scaling and parameters | Yes |

For most tabular supervised problems, start with a linear baseline and a gradient boosting model.

## Evaluating Correctly

- Choose the metric from the decision: ROC AUC or PR AUC for ranking quality, precision/recall at an operating threshold for actions, MAE/RMSE for regression in business units.
- Report variability across folds, not only the mean.
- Inspect errors by segment (region, customer type) to find where the model fails.
- Calibrate probabilities if they are used as probabilities (see the advanced reference).

## Persisting Models

Save the whole fitted pipeline, not only the final estimator. `joblib.dump` uses pickle: loading a pickle can execute arbitrary code, so only load files you trust; `skops.io` provides a safer format for scikit-learn models. Record library versions: models pickled with one scikit-learn version may not load or behave identically in another.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Preprocessing fit on all data before splitting | Pipelines inside cross-validation |
| Random split on temporal data | Time-based split |
| Accuracy on imbalanced data | PR AUC, recall/precision, balanced accuracy |
| Tuning on the test set | Separate validation or nested CV |
| No baseline | Dummy and linear baselines |
| Ignoring how features are computed in production | Same pipeline object or shared feature code |

## Checklist

- [ ] Prediction point and label defined; features available at prediction time
- [ ] Split strategy matches data structure (stratified, grouped, temporal)
- [ ] Preprocessing and model in one pipeline evaluated with cross-validation
- [ ] Baselines reported alongside candidate models
- [ ] Metric chosen from the business decision; variance across folds reported
- [ ] Test set used once; fitted pipeline persisted with versions recorded
