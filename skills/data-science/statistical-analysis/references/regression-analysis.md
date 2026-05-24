# Regression Analysis Reference

## Linear Regression

### Model Definition
```
y = β₀ + β₁x₁ + β₂x₂ + ... + βₚxₚ + ε
ε ~ N(0, σ²)

Matrix form: y = Xβ + ε
OLS solution: β̂ = (XᵀX)⁻¹ Xᵀy
```

```python
import statsmodels.api as sm
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

def ols_regression(X, y):
    X_with_const = sm.add_constant(X)
    model = sm.OLS(y, X_with_const).fit()
    return model

# Interpretation
print(model.summary())
# Parameters: β, SE(β), t, P>|t|, [0.025, 0.975]
# F-statistic: overall significance
# R²: proportion of variance explained
# Adj. R²: R² penalized for number of predictors
```

### Interpretation of Coefficients
- Continuous predictor: β₁ = change in y per 1-unit increase in x₁, holding other variables constant
- Binary predictor: β₁ = mean difference in y between category 1 and reference category
- Interaction: y = β₀ + β₁x₁ + β₂x₂ + β₃x₁x₂ → effect of x₁ depends on x₂
- Log-transformed outcome: y = β₀ + β₁log(x) → 1% change in x → β₁/100 unit change in y
- Log-log: log(y) = β₀ + β₁log(x) → 1% change in x → β₁% change in y (elasticity)

## Logistic Regression

### Model Definition
```
log(p/(1-p)) = β₀ + β₁x₁ + ... + βₚxₚ
p = 1 / (1 + exp(-(β₀ + β₁x₁ + ... + βₚxₚ)))
```

```python
from sklearn.linear_model import LogisticRegression
import statsmodels.api as sm

def logistic_regression(X, y):
    X_with_const = sm.add_constant(X)
    model = sm.Logit(y, X_with_const).fit(disp=0)
    return model

# Odds ratios and 95% CI
odds_ratios = np.exp(model.params)
ci = np.exp(model.conf_int())

# sklearn (with regularization)
model_sk = LogisticRegression(penalty='l2', C=1.0, solver='lbfgs')
model_sk.fit(X, y)
# Coefficients are log-odds
```

### Interpretation
- β: log-odds change per unit increase in predictor
- exp(β): odds ratio — multiplicative change in odds
- For binary x₁: odds(y=1 | x₁=1) / odds(y=1 | x₁=0) = exp(β₁)
- Predicted probability: p(y=1) = 1 / (1 + exp(-Xβ))

### Model Evaluation
```python
from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix

y_pred_prob = model.predict(X_with_const)
y_pred_class = (y_pred_prob >= 0.5).astype(int)

# Discrimination: AUC-ROC
auc = roc_auc_score(y, y_pred_prob)

# Calibration: Brier score
brier = np.mean((y_pred_prob - y)**2)

# Pseudo R²: McFadden, Cox-Snell, Nagelkerke
mcfadden_r2 = 1 - model.llf / model.llnull
```

## Regression Assumptions (Linear)

### 1. Linearity
Relationship between predictors and outcome is linear.

```python
# Check: scatterplots, residual vs fitted plot
import matplotlib.pyplot as plt

fitted = model.fittedvalues
residuals = model.resid

plt.scatter(fitted, residuals)
plt.axhline(y=0, color='r', linestyle='--')
plt.xlabel("Fitted values")
plt.ylabel("Residuals")
# Pattern (U-shape, curve) → non-linearity

# Solution: polynomial terms, splines, transformations
# y = β₀ + β₁x + β₂x² (quadratic)
X["x_squared"] = X["x"] ** 2
```

### 2. Independence
Observations are independent of each other.

```python
from statsmodels.stats.stattools import durbin_watson

dw = durbin_watson(residuals)
# DW ≈ 2: no autocorrelation
# DW < 1.5: positive autocorrelation
# DW > 2.5: negative autocorrelation

# Solution: clustered standard errors, mixed models, time series
```

### 3. Homoscedasticity
Constant variance of residuals across fitted values.

```python
from statsmodels.stats.diagnostic import het_breuschpagan, het_white

bp_test = het_breuschpagan(residuals, X_with_const)
# H₀: homoscedasticity
bp_stat, bp_p, bp_f, bp_fp = bp_test

white_test = het_white(residuals, X_with_const)

# Check: residual vs fitted plot (cone shape → heteroscedasticity)
# Solution: heteroscedasticity-robust SE (HC0, HC1, HC2, HC3)
model_robust = sm.OLS(y, X_with_const).fit(cov_type='HC3')
```

### 4. Normality of Residuals
Residuals are normally distributed (for inference, not coefficient estimation).

```python
from scipy import stats

# Shapiro-Wilk test
stat, p = stats.shapiro(residuals)

# Q-Q plot
stats.probplot(residuals, dist="norm", plot=plt)

# Solution: robust standard errors, bootstrap, transformation
# Central Limit Theorem helps with large n (n > 100)
```

### 5. No Perfect Multicollinearity
Predictors are not perfectly correlated.

```python
from statsmodels.stats.outliers_influence import variance_inflation_factor

def calculate_vif(X):
    X_with_const = sm.add_constant(X)
    vif_data = pd.DataFrame()
    vif_data["feature"] = X_with_const.columns
    vif_data["VIF"] = [variance_inflation_factor(X_with_const.values, i)
                        for i in range(X_with_const.shape[1])]
    return vif_data

# VIF > 5: moderate multicollinearity
# VIF > 10: severe multicollinearity
# Solution: remove correlated predictors, PCA, ridge regression
```

## Model Diagnostics

### Influence and Leverage
```python
from statsmodels.stats.outliers_influence import influence

inf = model.get_influence()

# Cook's distance: influence on all fitted values
cooks_d = inf.cooks_distance[0]
# D > 4/n or D > 1: influential

# Leverage (hat values)
leverage = inf.hat_matrix_diag
# h > 2p/n: high leverage

# DFBETAS: influence on each coefficient
dfbetas = inf.dfbetas
# |DFBETAS| > 2/√n: influential

# DFFITS: influence on fitted value
dffits = inf.dffits[0]
# |DFFITS| > 2√(p/n): influential

# Studentized residuals
student_resid = inf.resid_studentized_external
# |r| > 3: potential outlier
```

### Partial Regression Plots
```python
# Added-variable plot: effect of x₁ adjusted for other predictors
sm.graphics.plot_partregress(endog=y, exog_i=X["x1"], exog_others=X[["x2","x3"]])
```

## Regularization

### Ridge Regression (L2)
```python
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

ridge = Pipeline([
    ("scaler", StandardScaler()),
    ("ridge", Ridge(alpha=1.0))
])
ridge.fit(X, y)

# alpha controls shrinkage: α→∞ → coefficients → 0
# Cross-validate alpha
from sklearn.linear_model import RidgeCV
ridge_cv = RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0], scoring='neg_mean_squared_error')
ridge_cv.fit(X, y)
best_alpha = ridge_cv.alpha_

# Ridge shrinks coefficients toward 0 but never to exactly 0
```

### Lasso Regression (L1)
```python
from sklearn.linear_model import Lasso, LassoCV

lasso = Lasso(alpha=0.1)
lasso.fit(X, y)
# Lasso can set coefficients to exactly 0 (feature selection)

lasso_cv = LassoCV(cv=5, random_state=42)
lasso_cv.fit(X, y)
print(f"Best alpha: {lasso_cv.alpha_}")
print(f"Features used: {np.sum(lasso_cv.coef_ != 0)}")
```

### Elastic Net
```python
from sklearn.linear_model import ElasticNet, ElasticNetCV

elastic = ElasticNetCV(l1_ratio=[0.1, 0.5, 0.7, 0.9, 1.0], cv=5)
elastic.fit(X, y)
# l1_ratio=1 → Lasso, l1_ratio=0 → Ridge
# Elastic Net combines L1 and L2 penalties
```

### Regularization Path
```python
import matplotlib.pyplot as plt

alphas = np.logspace(-4, 0, 100)
coefs = []
for alpha in alphas:
    model = Lasso(alpha=alpha)
    model.fit(X_scaled, y)
    coefs.append(model.coef_)

plt.plot(alphas, coefs)
plt.xscale('log')
plt.xlabel("Alpha")
plt.ylabel("Coefficients")
plt.title("Regularization Path")
```

## Categorical Predictors

```python
# Dummy coding (treatment coding)
X = pd.get_dummies(df["category"], drop_first=True)  # k-1 dummies

# Effect coding (sum coding)
# Categories sum to 0, compare each to grand mean

# Ordinal coding
from statsmodels.api import add_trend
# Polynomial contrasts for ordered categories
```

## Interaction Effects

```python
# Two-way interaction
model = sm.OLS(y, sm.add_constant(X[["x1", "x2", "x1_x2"]])).fit()
# β₃: how much the effect of x₁ on y changes per unit increase in x₂

# Centering for interpretability
X["x1_c"] = X["x1"] - X["x1"].mean()
X["x2_c"] = X["x2"] - X["x2"].mean()
X["interaction"] = X["x1_c"] * X["x2_c"]
```

## Polynomial and Spline Terms

```python
from sklearn.preprocessing import PolynomialFeatures
from patsy import dmatrix

# Polynomial
poly = PolynomialFeatures(degree=2, include_bias=False)
X_poly = poly.fit_transform(X[["x"]])

# Natural cubic splines
spline_basis = dmatrix("bs(x, df=5, degree=3)", {"x": X["x"]}, return_type='dataframe')

# Restricted cubic splines (natural splines)
r_spline = dmatrix("cr(x, df=5)", {"x": X["x"]}, return_type='dataframe')
```

## Key Formulas

```
OLS: β̂ = (XᵀX)⁻¹Xᵀy
Var(β̂) = σ²(XᵀX)⁻¹
R² = 1 - SS_res / SS_total
Adj R² = 1 - (1-R²)(n-1)/(n-p-1)
F = (R²/p) / ((1-R²)/(n-p-1))

Logistic: log(p/1-p) = Xβ
Ridge: β̂ = (XᵀX + λI)⁻¹Xᵀy
Lasso: β̂ = argmin ||y-Xβ||² + λ|β|₁
Elastic Net: β̂ = argmin ||y-Xβ||² + λ(α|β|₁ + (1-α)|β|₂²/2)

VIF = 1 / (1 - R²ⱼ)  (R²ⱼ from regressing xⱼ on all other predictors)
AIC = -2ln(L) + 2p
BIC = -2ln(L) + p·ln(n)
```
