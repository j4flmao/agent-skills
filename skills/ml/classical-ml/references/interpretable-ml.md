# Interpretable Classical ML

## Glass-Box Models

| Model | Interpretability | Performance | Use Case |
|-------|-----------------|-------------|----------|
| Linear Regression | Very High (coefficients = feature importance) | Low (linear only) | Baseline, simple relationships |
| Logistic Regression | Very High (odds ratios) | Medium | Binary classification, risk scoring |
| Decision Tree | Very High (rule path) | Medium | Explainable rules, regulatory |
| GAM (Generalized Additive Model) | High (partial dependence per feature) | Medium-High | Tabular with non-linear patterns |
| GLM with interactions | High | Medium | Insurance, finance |
| RuleFit | High (rule-based + linear) | High | When you need both |

```python
# GAM with pyGAM
from pygam import LinearGAM, s, te

gam = LinearGAM(s(0, n_splines=20) + s(1) + te(2, 3))
gam.fit(X_train, y_train)

# Partial dependence for each feature
for i, term in enumerate(gam.terms):
    XX = gam.generate_X_grid(term=i)
    pdep, confi = gam.partial_dependence(term=i, X=XX, width=0.95)
    plt.plot(XX[:, i], pdep)
    plt.fill_between(XX[:, i], confi[:, 0], confi[:, 1], alpha=0.3)
```

## Model Distillation for Interpretability

```python
# Distill XGBoost into a decision tree
import xgboost as xgb
from sklearn.tree import DecisionTreeRegressor

# Train complex model
xgb_model = xgb.XGBRegressor(n_estimators=100, max_depth=6)
xgb_model.fit(X_train, y_train)

# Train interpretable surrogate on same data
surrogate = DecisionTreeRegressor(max_depth=3)
surrogate.fit(X_train, xgb_model.predict(X_train))

# Surrogate captures 85%+ of XGBoost behavior
# with fully interpretable decision rules
print(export_text(surrogate, feature_names=feature_names))
```

## Feature Importance Comparison

| Method | Scope | How It Works | Stability |
|--------|-------|-------------|-----------|
| Coefficient magnitude | Global | |weight| | Low (scaling dependent) |
| Permutation importance | Global | Drop column, measure performance drop | Medium |
| Gain (tree-based) | Global | Total reduction in loss from splits | Medium |
| SHAP values | Local + Global | Shapley values from game theory | High |
| LIME | Local | Local linear surrogate | Medium |

## Regulatory Compliance

| Requirement | Technique |
|-------------|-----------|
| Fair lending (ECOA) | Remove protected attributes, check disparate impact |
| Explainable credit decisions | Decision tree or GAM with feature cards |
| Model documentation | Model cards with performance slices |
| Audit trail | Versioned features, data lineage, model versioning |
| Right to explanation | Store SHAP values per prediction for legal review |
