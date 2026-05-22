# Automated Feature Engineering

## Featuretools Deep Feature Synthesis

### Entity Setup
```python
import featuretools as ft

customers = pd.DataFrame({
    "customer_id": [1, 2, 3],
    "signup_date": pd.to_datetime(["2024-01-01", "2024-02-15", "2024-03-10"]),
    "region": ["US", "EU", "APAC"],
})
orders = pd.DataFrame({
    "order_id": [101, 102, 103, 104],
    "customer_id": [1, 1, 2, 3],
    "order_date": pd.to_datetime(["2025-01-15", "2025-02-20", "2025-03-05", "2025-03-25"]),
    "total": [100.0, 250.0, 75.0, 300.0],
})
products = pd.DataFrame({
    "product_id": ["P1", "P2", "P3"],
    "name": ["Widget", "Gadget", "Doohickey"],
    "category": ["A", "B", "A"],
})
order_items = pd.DataFrame({
    "order_id": [101, 101, 102, 103, 104],
    "product_id": ["P1", "P2", "P1", "P3", "P2"],
    "quantity": [2, 1, 3, 1, 2],
})

es = ft.EntitySet(id="ecommerce")
es = es.add_dataframe(dataframe_name="customers", dataframe=customers, index="customer_id")
es = es.add_dataframe(dataframe_name="orders", dataframe=orders, index="order_id")
es = es.add_dataframe(dataframe_name="products", dataframe=products, index="product_id")
es = es.add_dataframe(dataframe_name="order_items", dataframe=order_items, index="order_id_product_id", make_index=True)
es = es.add_relationship("customers", "customer_id", "orders", "customer_id")
es = es.add_relationship("orders", "order_id", "order_items", "order_id")
es = es.add_relationship("products", "product_id", "order_items", "product_id")
```

### Deep Feature Synthesis
```python
feature_matrix, feature_defs = ft.dfs(
    entityset=es,
    target_dataframe_name="customers",
    max_depth=2,
    agg_primitives=["count", "sum", "max", "min", "mean", "std", "trend", "mode", "num_unique", "entropy"],
    trans_primitives=["day", "month", "year", "weekday", "hour", "time_since_previous"],
    where_primitives=["mean", "sum", "count"],
    max_features=200,
)
print(f"Generated {len(feature_defs)} features")
```

### Custom Primitives
```python
from featuretools.primitives import make_agg_primitive
import numpy as np

def range_func(values):
    return np.max(values) - np.min(values)

Range = make_agg_primitive(range_func,
    input_types=[ft.feature_base.ColumnSchema(ft.variable_types.Numeric)],
    return_type=ft.variable_types.Numeric, name="range")
```

## tsfresh for Time-Series

```python
from tsfresh import extract_features, select_features
from tsfresh.feature_extraction import ComprehensiveFCParameters
from tsfresh.utilities.dataframe_functions import impute

time_series = pd.DataFrame({
    "id": [1, 1, 1, 2, 2, 2],
    "time": [0, 1, 2, 0, 1, 2],
    "sensor_a": [10.1, 10.5, 10.3, 20.1, 20.5, 20.3],
})

fc_parameters = {
    "mean": None, "std": None, "variance": None,
    "minimum": None, "maximum": None, "sum_values": None,
    "trend": [{"attr": "slope"}],
    "fft_coefficient": [{"coeff": 0, "attr": "real"}],
    "autocorrelation": [{"lag": 1}],
    "quantile": [{"q": 0.25}, {"q": 0.75}],
}

features = extract_features(time_series, column_id="id", column_sort="time",
    default_fc_parameters=fc_parameters, impute_function=impute)
```

## Feature Selection

### Filter Methods
```python
from sklearn.feature_selection import SelectKBest, mutual_info_classif, VarianceThreshold
from scipy.stats import pearsonr

# Variance threshold (remove constants)
selector = VarianceThreshold(threshold=0.01)
X_high_var = selector.fit_transform(X)

# Mutual information (non-linear)
selector = SelectKBest(mutual_info_classif, k=50)
X_selected = selector.fit_transform(X, y)

# Correlation with target
correlations = pd.DataFrame({
    "feature": X.columns,
    "pearson": [abs(pearsonr(X[col], y)[0]) for col in X.columns],
})
```

### Wrapper Methods
```python
from sklearn.feature_selection import RFE, RFECV
from sklearn.ensemble import RandomForestClassifier

# Recursive Feature Elimination
selector = RFE(RandomForestClassifier(n_estimators=100), n_features_to_select=50, step=10)
selector.fit(X, y)

# RFE with CV (automatic k)
selector = RFECV(RandomForestClassifier(n_estimators=100), step=10, cv=5, scoring="roc_auc")
selector.fit(X, y)
print(f"Optimal features: {selector.n_features_}")
```

### Embedded Methods
```python
from sklearn.feature_selection import SelectFromModel
from sklearn.linear_model import LogisticRegression

# L1 regularization
selector = SelectFromModel(
    LogisticRegression(C=0.1, penalty="l1", solver="saga", max_iter=1000),
    threshold="median",
)
X_selected = selector.fit_transform(X, y)

# Tree-based importance
model = RandomForestClassifier(n_estimators=200).fit(X, y)
importance = pd.DataFrame({
    "feature": X.columns,
    "importance": model.feature_importances_,
}).sort_values("importance", ascending=False)

# Keep top features by cumulative 95% importance
importance["cumsum"] = importance["importance"].cumsum()
selected = importance[importance["cumsum"] <= 0.95]["feature"].tolist()
```

### Leakage Check
```python
from scipy.stats import pearsonr, ks_2samp

def check_leakage(X_train, y_train, threshold=0.95):
    for col in X_train.columns:
        corr = abs(pearsonr(X_train[col], y_train)[0])
        if corr > threshold:
            print(f"LEAKAGE: {col} correlation={corr:.3f}")

def check_distribution_shift(train_df, test_df):
    for col in train_df.columns:
        _, pval = ks_2samp(train_df[col], test_df[col])
        if pval < 0.05:
            print(f"SHIFT: {col} p={pval:.4f}")
```

## References
- Featuretools: https://featuretools.alteryx.com/
- tsfresh: https://tsfresh.readthedocs.io/
- Feature selection: https://scikit-learn.org/stable/modules/feature_selection.html
