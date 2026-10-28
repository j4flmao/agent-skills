# Feature Engineering Fundamentals

Turning raw data into model inputs that expose signal: feature types, missing values, numeric transformations, outliers, datetime features, interactions and aggregations, and building it all into leak-free scikit-learn pipelines. Categorical encoding details are in `feature-encoding.md`, text in `text-features.md`, leakage in `validation-leakage.md`.

## Feature Types

| Type | Examples | Typical handling |
|------|----------|------------------|
| Continuous numeric | Price, duration, age | Scaling (for linear/distance models), log/power transforms for skew |
| Count | Number of logins | `log1p`, capping |
| Ordinal | Size S/M/L, rating | Ordered integer encoding |
| Nominal categorical | Country, device | One-hot (low cardinality), target/frequency/hash encoding (high cardinality) |
| Boolean | Is_premium | 0/1 |
| Datetime | Signup time | Components, cyclical encoding, elapsed time |
| Text | Description | TF-IDF, embeddings |
| Geospatial | Lat/long | Distances, geohash/H3 cells, clustering |
| Identifiers | user_id | Usually drop; aggregate behaviour per ID instead |

## Model Sensitivity

| Model family | Needs scaling? | Handles missing natively? | Benefits from manual interactions? |
|--------------|----------------|---------------------------|-------------------------------------|
| Linear / logistic regression | Yes | No | Yes |
| k-NN, SVM, neural nets | Yes | No | Sometimes |
| Tree ensembles (XGBoost, LightGBM, CatBoost, HistGradientBoosting) | No | Yes | Less (trees learn interactions), but ratios/aggregates still help |

## Missing Values

| Strategy | When |
|----------|------|
| Native handling | Gradient-boosted trees, `HistGradientBoosting*` |
| Median/mode imputation + missing indicator | Linear models, neural nets; indicator preserves "missingness is informative" |
| Constant (e.g. "unknown" category) | Categoricals |
| Model-based (`IterativeImputer`, KNN) | When relationships matter and data is moderate in size |
| Drop rows/columns | Only when missingness is rare and random, or the column is mostly empty |

Always fit imputers on training data only.

## Numeric Transformations

```python
import numpy as np
from sklearn.preprocessing import StandardScaler, RobustScaler, PowerTransformer, QuantileTransformer, KBinsDiscretizer

np.log1p(x)                                      # right-skewed counts/amounts (x >= 0)
PowerTransformer(method="yeo-johnson")           # handles zeros/negatives
QuantileTransformer(output_distribution="normal")  # robust to outliers, non-linear
RobustScaler()                                   # median/IQR scaling
KBinsDiscretizer(n_bins=10, encode="ordinal", strategy="quantile")
```

- Ratios and differences often carry more signal than raw values: `debt / income`, `price - category_median_price`.
- Clip extreme values at percentiles learned from training data (winsorizing) when outliers are errors or dominate linear models.

## Datetime Features

```python
import numpy as np
import pandas as pd

def add_time_features(df: pd.DataFrame, col: str) -> pd.DataFrame:
    ts = pd.to_datetime(df[col], utc=True)
    out = df.copy()
    out[f"{col}_hour"] = ts.dt.hour
    out[f"{col}_dow"] = ts.dt.dayofweek
    out[f"{col}_month"] = ts.dt.month
    out[f"{col}_is_weekend"] = ts.dt.dayofweek >= 5
    out[f"{col}_hour_sin"] = np.sin(2 * np.pi * ts.dt.hour / 24)
    out[f"{col}_hour_cos"] = np.cos(2 * np.pi * ts.dt.hour / 24)
    return out
```

- Elapsed time features (`days_since_signup`, `days_since_last_purchase`) usually beat raw timestamps.
- Use the event's local time zone for human-behaviour features (hour of day).
- Holidays and business calendars as flags where relevant.

## Interactions and Aggregations

- Interactions: products/ratios of related numeric features; crossed categoricals (`country x device`) for linear models; `PolynomialFeatures(degree=2, interaction_only=True)` for small feature sets.
- Group aggregations: per-entity statistics (mean, count, std, min/max, recency) over historical windows: `user_avg_order_value_90d`, `merchant_chargeback_rate_30d`.
- Aggregations must use only data available before the prediction time (see `feature-engineering-advanced.md` for point-in-time joins).

## Building a Pipeline

```python
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

numeric = ["age", "income", "tenure_days"]
categorical = ["country", "plan"]

preprocess = ColumnTransformer([
    ("num", Pipeline([
        ("impute", SimpleImputer(strategy="median", add_indicator=True)),
        ("scale", StandardScaler()),
    ]), numeric),
    ("cat", Pipeline([
        ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
        ("onehot", OneHotEncoder(handle_unknown="infrequent_if_exist", min_frequency=20)),
    ]), categorical),
])

model = Pipeline([("prep", preprocess), ("clf", LogisticRegression(max_iter=1000))])
scores = cross_val_score(model, X_train, y_train, cv=5, scoring="roc_auc")
```

- The whole pipeline is fit inside each CV fold, so preprocessing never sees validation data.
- `set_output(transform="pandas")` keeps column names for inspection.
- Persist the fitted pipeline (not just the model) so serving applies identical transforms.

## Evaluating Features

- Compare models with and without a feature group under the same CV splits.
- Permutation importance on validation data shows which features the model relies on.
- Sanity-check suspiciously strong features for leakage (does the value exist at prediction time?).

## Pitfalls

| Pitfall | Effect |
|---------|--------|
| Fitting scalers/imputers on all data | Optimistic validation scores |
| Using future information in aggregates | Leakage; model fails in production |
| One-hot encoding high-cardinality IDs | Huge sparse matrices, overfitting |
| Different transforms in training and serving code | Training-serving skew |
| Dropping rows with missing values by default | Biased samples |

## Checklist

- [ ] Feature types identified and handled per model family
- [ ] Imputation with missing indicators where informative
- [ ] Skewed features transformed; outliers handled with train-fitted bounds
- [ ] Datetime converted to meaningful components and elapsed times
- [ ] All preprocessing inside a `Pipeline`/`ColumnTransformer`, evaluated with CV
- [ ] Fitted pipeline persisted and reused for serving
