# Search Strategies for Hyperparameter Tuning

## Overview
Search strategy selection depends on budget, dimensionality, and cost per trial.

## Grid Search

```
from sklearn.model_selection import GridSearchCV

param_grid = {
    "n_estimators": [50, 100, 200],
    "max_depth": [3, 5, 7, 10],
    "min_samples_split": [2, 5, 10],
}
grid = GridSearchCV(
    estimator=RandomForestClassifier(),
    param_grid=param_grid,
    cv=5,
    scoring="f1_macro",
    n_jobs=-1,
)
grid.fit(X_train, y_train)
print(grid.best_params_)
```

Use when: dimensions <= 4, budget covers full grid, discrete parameters. Total runs = product of all cardinalities. Exponential cost in dimensionality — 10 params with 5 values each = 9.7M trials (infeasible). Best for small, well-understood search spaces.

## Random Search

```
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import uniform, loguniform, randint

param_dist = {
    "n_estimators": randint(50, 500),
    "max_depth": randint(3, 20),
    "learning_rate": loguniform(1e-4, 1e-1),
    "subsample": uniform(0.5, 0.5),
}

random = RandomizedSearchCV(
    estimator=XGBClassifier(),
    param_distributions=param_dist,
    n_iter=100,
    cv=5,
    scoring="f1_macro",
    random_state=42,
    n_jobs=-1,
)
random.fit(X_train, y_train)
```

Random search covers more distinct values per parameter than grid with same budget. When 10% of parameters matter most, random has ~90% chance of finding good regions vs ~50% for grid. Use log-uniform for learning rates, regularization strengths. Use uniform for probabilities, ratios.

## Bayesian Optimization

```
from skopt import BayesSearchCV
from skopt.space import Real, Integer, Categorical

opt = BayesSearchCV(
    estimator=XGBClassifier(),
    search_spaces={
        "learning_rate": Real(1e-3, 1e-1, prior="log-uniform"),
        "max_depth": Integer(3, 15),
        "subsample": Real(0.5, 1.0, prior="uniform"),
        "colsample_bytree": Real(0.3, 1.0, prior="uniform"),
    },
    n_iter=50,
    cv=5,
    scoring="f1_macro",
    random_state=42,
)
opt.fit(X_train, y_train)
```

Gaussian Process surrogate: models mean and uncertainty. Acquisition function (EI, PI, UCB) balances exploration vs exploitation. GP cost scales as O(n^3) — use GP for <1000 trials. Tree-structured Parzen Estimator (TPE): models density of good vs bad trials. Scales to thousands of trials. Better for high-dimensional (>10) and mixed spaces.

## TPE (Tree-structured Parzen Estimator)

```
from hyperopt import fmin, tpe, hp, Trials, STATUS_OK

space = {
    "learning_rate": hp.loguniform("lr", -7, -1),
    "max_depth": hp.quniform("depth", 3, 15, 1),
    "subsample": hp.uniform("subsample", 0.5, 1.0),
    "booster": hp.choice("booster", ["gbtree", "dart"]),
}

def objective(params):
    params["max_depth"] = int(params["max_depth"])
    model = XGBClassifier(**params)
    score = cross_val_score(model, X, y, cv=5).mean()
    return {"loss": -score, "status": STATUS_OK}

trials = Trials()
best = fmin(
    fn=objective,
    space=space,
    algo=tpe.suggest,
    max_evals=100,
    trials=trials,
)
```

TPE models two densities: l(x) from top quantile (good) and g(x) from bottom (bad). Selects parameters where l(x)/g(x) is maximized. Handles conditional spaces naturally — parameters that only apply to certain choices.

## Search Space Design

```
# Good space design
space = {
    "learning_rate": hp.loguniform("lr", math.log(1e-5), math.log(1)),
    "batch_size": hp.choice("batch_size", [16, 32, 64, 128, 256]),
    "optimizer": hp.choice("optimizer", ["adam", "sgd"]),
    # Conditional: momentum only for sgd
    "momentum": hp.uniform("momentum", 0.8, 0.99),
}
```

Design rules: use log scale for positive multiplicative parameters (lr, reg, decay). Use linear scale for additive parameters (depth, width, dropout). Use choice for discrete options (optimizer, activation). Use conditional for hierarchical decisions. Set bounds wide enough to include optimum but not so wide that search is wasted — pilot runs help calibrate ranges.

## Bayesian Optimization Acquisition Functions

- Expected Improvement (EI): maximizes expected gain over current best. Good balance of exploration/exploitation. Most commonly used.
- Probability of Improvement (PI): maximizes probability of beating current best. More greedy — can get stuck in local optima.
- Upper Confidence Bound (UCB): maximize mean + kappa * std. Tunable exploration via kappa. Higher kappa = more exploration.
- Knowledge Gradient: considers future updates to surrogate. Better for multi-step optimization but expensive to compute.
