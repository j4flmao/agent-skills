# Classical ML Advanced: Gradient Boosting in Depth, Calibration, Thresholds, Uncertainty, Constraints and Scale

Advanced techniques for production-quality tabular models: tuning and early stopping for gradient boosting libraries, native categorical handling, probability calibration, decision threshold optimization, prediction intervals and conformal prediction, monotonic constraints, stacking, large-data training, and safe persistence. Fundamentals, feature engineering, model selection and interpretability are in sibling references.

## Gradient Boosting Libraries

| Library | Distinctive features |
|---------|----------------------|
| scikit-learn `HistGradientBoosting*` | Histogram-based, native missing values and categorical features, monotonic and interaction constraints, no extra dependency |
| XGBoost | Mature, GPU training (`device="cuda"`), native categorical support (`enable_categorical=True`), many objectives |
| LightGBM | Fast on large data, leaf-wise growth, native categorical, GPU options |
| CatBoost | Ordered target statistics for categorical features, strong defaults, robust to overfitting on small data |

### Key hyperparameters (concepts are shared)

| Parameter (generic) | Effect | Typical search range |
|---------------------|--------|----------------------|
| Learning rate | Lower = more trees, often better generalization | 0.01 to 0.2 |
| Number of trees | With early stopping, set high and let validation decide | Up to thousands |
| Tree size (max depth / max leaves) | Model capacity, interaction order | Depth 3 to 10; leaves 15 to 255 |
| Min samples/weight per leaf | Regularizes small leaves | Data-size dependent |
| Row / column subsampling | Variance reduction, speed | 0.5 to 1.0 |
| L1/L2 regularization on leaf weights | Shrinks extreme leaves | Log-uniform search |

### Early stopping

```python
import lightgbm as lgb

model = lgb.LGBMClassifier(
    n_estimators=5000, learning_rate=0.03, num_leaves=63,
    subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
    reg_lambda=1.0, random_state=42,
)
model.fit(
    X_tr, y_tr,
    eval_set=[(X_val, y_val)],
    eval_metric="auc",
    callbacks=[lgb.early_stopping(stopping_rounds=100), lgb.log_evaluation(200)],
)
print(model.best_iteration_)
```

```python
from xgboost import XGBClassifier

model = XGBClassifier(
    n_estimators=5000, learning_rate=0.03, max_depth=6,
    subsample=0.8, colsample_bytree=0.8, tree_method="hist",
    early_stopping_rounds=100, eval_metric="aucpr", enable_categorical=True,
)
model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
```

```python
from sklearn.ensemble import HistGradientBoostingClassifier

model = HistGradientBoostingClassifier(
    learning_rate=0.05, max_iter=2000, max_leaf_nodes=31,
    early_stopping=True, validation_fraction=0.1, n_iter_no_change=50,
    categorical_features="from_dtype",       # pandas 'category' columns treated natively
    random_state=42,
)
```

The early-stopping validation set must not be the final test set. Inside cross-validation, carve the early-stopping split from each training fold.

## Categorical Features at Scale

| Approach | When |
|----------|------|
| One-hot | Low cardinality, linear models |
| Native categorical (HistGB, LightGBM, XGBoost, CatBoost) | Tree models, moderate to high cardinality |
| Target encoding with cross-fitting (`sklearn.preprocessing.TargetEncoder`) | High cardinality with linear or other models |
| Hashing | Very high or unbounded cardinality |

`TargetEncoder.fit_transform` uses internal cross-fitting to prevent target leakage on training data; calling `fit` then `transform` on the same data does not, so use `fit_transform` for training.

## Probability Calibration

Many models (boosting with heavy regularization, SVMs, naive Bayes, models trained with class weights or resampling) produce scores that are not calibrated probabilities.

```python
from sklearn.calibration import CalibratedClassifierCV, CalibrationDisplay

calibrated = CalibratedClassifierCV(estimator=pipeline, method="isotonic", cv=5)
calibrated.fit(X_train, y_train)

CalibrationDisplay.from_estimator(calibrated, X_test, y_test, n_bins=10)
```

- `method="sigmoid"` (Platt scaling) for small calibration sets; `isotonic` needs more data (roughly a thousand or more samples) but is more flexible.
- Measure with Brier score and reliability diagrams; log loss also rewards calibration.
- Resampling (SMOTE, undersampling) and `class_weight` distort probabilities; calibrate afterwards on data with the true class distribution.

## Decision Thresholds

The default 0.5 threshold is rarely optimal for the business decision.

```python
from sklearn.model_selection import TunedThresholdClassifierCV
from sklearn.metrics import make_scorer, fbeta_score

tuned = TunedThresholdClassifierCV(
    estimator=pipeline,
    scoring=make_scorer(fbeta_score, beta=2),   # recall weighted higher than precision
    cv=5,
)
tuned.fit(X_train, y_train)
print(tuned.best_threshold_)
```

For explicit costs, maximize expected value: `value = TP*benefit - FP*cost_fp - FN*cost_fn` over thresholds on validation predictions (scikit-learn 1.5+ supports custom scorers for this; `FixedThresholdClassifier` applies a chosen threshold). Revisit thresholds when base rates change.

## Uncertainty: Quantiles and Conformal Prediction

Prediction intervals for regression:

```python
from sklearn.ensemble import HistGradientBoostingRegressor

lower = HistGradientBoostingRegressor(loss="quantile", quantile=0.05).fit(X_tr, y_tr)
upper = HistGradientBoostingRegressor(loss="quantile", quantile=0.95).fit(X_tr, y_tr)
```

Quantile models are not guaranteed to achieve nominal coverage. **Conformal prediction** wraps any model to provide intervals or prediction sets with finite-sample coverage guarantees under exchangeability (split conformal, conformalized quantile regression). Libraries: MAPIE, crepes. Verify coverage on held-out data, and note that guarantees weaken under distribution shift (time series need adapted methods).

## Monotonic and Interaction Constraints

Domain knowledge often requires monotonic relationships (risk increases with debt ratio). Constraints improve trust, regulatory acceptability and robustness to extrapolation.

```python
model = HistGradientBoostingClassifier(
    monotonic_cst={"debt_ratio": 1, "income": -1},     # dict by feature name (pandas input)
    interaction_cst=[["age", "tenure_months"], ["debt_ratio", "income"]],
)
```

XGBoost (`monotone_constraints`), LightGBM (`monotone_constraints`) and CatBoost support the same idea.

## Stacking and Blending

```python
from sklearn.ensemble import StackingClassifier
from sklearn.linear_model import LogisticRegression

stack = StackingClassifier(
    estimators=[("hgb", hgb_pipeline), ("lr", linear_pipeline)],
    final_estimator=LogisticRegression(),
    cv=5,
    stack_method="predict_proba",
)
```

- Out-of-fold predictions feed the meta-model, preventing leakage.
- Gains are usually small on well-tuned boosting models; weigh against complexity and latency.
- Diversity between base models (linear + trees + kNN) matters more than count.

## Large Data

| Constraint | Technique |
|------------|-----------|
| Data larger than memory | Train on a representative sample; out-of-core learners with `partial_fit` (`SGDClassifier`, `MiniBatchKMeans`, `IncrementalPCA`); LightGBM/XGBoost external memory or distributed (Dask, Spark, Ray) |
| Many rows | Histogram-based boosting; subsampling for tuning, full data for final fit |
| Slow hyperparameter search | Successive halving (`HalvingRandomSearchCV`), Optuna with pruning |
| Wide sparse data | Linear models with sparse matrices, hashing |

Use `n_jobs` for parallelism and keep data as float32 where precision permits to halve memory.

## Metadata Routing

scikit-learn's metadata routing passes sample weights, groups or other metadata through pipelines and CV correctly:

```python
import sklearn
sklearn.set_config(enable_metadata_routing=True)

clf = LogisticRegression().set_fit_request(sample_weight=True)
pipe = Pipeline([("prep", preprocess), ("clf", clf)])
cross_val_score(pipe, X, y, params={"sample_weight": w}, cv=5)
```

## Safe Persistence and Reproducibility

- Pickle/joblib files execute code on load; load only trusted artifacts. `skops.io` restricts loadable types and supports inspection (`get_untrusted_types`) before loading.
- Pin library versions (scikit-learn, LightGBM, XGBoost) between training and serving; minor version changes can alter predictions.
- Store the pipeline with its training data version, hyperparameters, metrics and feature list.
- For cross-language serving, export to ONNX (`skl2onnx`, `onnxmltools`) and validate prediction parity.

## Checklist

- [ ] Gradient boosting tuned with early stopping on a validation split separate from test
- [ ] Categorical handling chosen per model; target encoding cross-fitted
- [ ] Probabilities calibrated when used as probabilities; Brier score reported
- [ ] Decision threshold optimized for business cost
- [ ] Prediction intervals with verified coverage where uncertainty matters
- [ ] Monotonic constraints applied where domain requires
- [ ] Scale strategy chosen deliberately for large data
- [ ] Safe persistence format and pinned versions
