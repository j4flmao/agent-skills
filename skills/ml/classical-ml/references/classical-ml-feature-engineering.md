# Classical ML Feature Engineering

## Overview

Feature engineering is the process of transforming raw data into features that better represent the underlying problem to predictive models. This reference covers feature construction, transformation, encoding, selection, extraction, and validation techniques for classical ML workflows.

## Feature Construction

### Numeric Features

```python
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler

# Ratios and proportions
df['debt_to_income'] = df['total_debt'] / df['annual_income']
df['profit_margin'] = (df['revenue'] - df['cost']) / df['revenue']

# Differences and deltas
df['revenue_delta'] = df.groupby('customer_id')['revenue'].diff()
df['days_since_last_purchase'] = (
    reference_date - df.groupby('customer_id')['last_purchase'].transform('max')
).dt.days

# Aggregations per group
df['avg_order_value'] = df.groupby('customer_id')['order_amount'].transform('mean')
df['order_frequency'] = df.groupby('customer_id')['order_id'].transform('count')
df['recency'] = df.groupby('customer_id')['order_date'].transform('max')
```

### Categorical Features

```python
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder
from category_encoders import TargetEncoder

# One-hot encoding (low cardinality)
encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
encoded = encoder.fit_transform(df[['region', 'tier']])

# Ordinal encoding (ordered categories)
encoder = OrdinalEncoder(categories=[
    ['HS', 'BS', 'MS', 'PhD']  # education level order
])
df['education_encoded'] = encoder.fit_transform(df[['education']])

# Target encoding (high cardinality)
encoder = TargetEncoder(cols=['zip_code', 'customer_segment'])
df_encoded = encoder.fit_transform(df, df['target'])

# Count encoding
df['city_count'] = df.groupby('city')['customer_id'].transform('count')
df['city_ratio'] = df['city_count'] / len(df)
```

### DateTime Features

```python
# Extract components
df['year'] = df['date'].dt.year
df['month'] = df['date'].dt.month
df['day'] = df['date'].dt.day
df['dayofweek'] = df['date'].dt.dayofweek  # 0=Monday
df['quarter'] = df['date'].dt.quarter
df['is_weekend'] = df['dayofweek'].isin([5, 6]).astype(int)
df['is_month_start'] = df['date'].dt.is_month_start.astype(int)
df['is_month_end'] = df['date'].dt.is_month_end.astype(int)

# Cyclical encoding
df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)

# Time since event
df['days_since_2019'] = (df['date'] - pd.Timestamp('2019-01-01')).dt.days

# Rolling statistics
df['revenue_7d_avg'] = df.groupby('customer_id')['revenue'] \
    .transform(lambda x: x.rolling(7, min_periods=1).mean())
df['revenue_30d_std'] = df.groupby('customer_id')['revenue'] \
    .transform(lambda x: x.rolling(30, min_periods=1).std())
```

### Text Features

```python
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

# Bag of words
vectorizer = CountVectorizer(max_features=1000, stop_words='english')
bow = vectorizer.fit_transform(df['description'])

# TF-IDF
vectorizer = TfidfVectorizer(
    max_features=5000, ngram_range=(1, 3),
    max_df=0.95, min_df=2, sublinear_tf=True
)
tfidf = vectorizer.fit_transform(df['description'])

# Text statistics
df['text_length'] = df['description'].str.len()
df['word_count'] = df['description'].str.split().str.len()
df['avg_word_length'] = df['text_length'] / df['word_count']
df['capital_ratio'] = df['description'].str.findall(r'[A-Z]').str.len() / df['text_length']
df['num_exclamation'] = df['description'].str.count('!')
df['num_question'] = df['description'].str.count('\?')
```

## Feature Transformations

### Scaling Methods

| Method | Range | Robust to Outliers | Preserves Distribution | Use Case |
|---|---|---|---|---|
| StandardScaler | Mean=0, Std=1 | No | No | Normally distributed data |
| MinMaxScaler | [0, 1] | No | No | Bounded features, neural nets |
| RobustScaler | Centered by median | Yes | No | Data with outliers |
| MaxAbsScaler | [-1, 1] | No | No | Sparse data |
| PowerTransformer | Varies | Yes | Yes (makes Gaussian) | Skewed data |
| QuantileTransformer | [0, 1] | Yes | Yes (uniform) | Non-linear relationships |
| Normalizer | Unit norm | N/A | No | Text data, cosine similarity |

```python
from sklearn.preprocessing import PowerTransformer, QuantileTransformer

# Handle skewed distributions
pt = PowerTransformer(method='yeo-johnson')  # or 'box-cox' (positive only)
df['revenue_transformed'] = pt.fit_transform(df[['revenue']])

# Quantile transformation
qt = QuantileTransformer(n_quantiles=1000, output_distribution='normal')
df['feature_normalized'] = qt.fit_transform(df[['skewed_feature']])
```

### Mathematical Transformations

```python
# Log transform (handle positive skew)
df['log_revenue'] = np.log1p(df['revenue'])

# Box-Cox (automatic lambda selection)
from scipy.stats import boxcox
df['boxcox_revenue'], lambda_opt = boxcox(df['revenue'] + 1)

# Square/cube for capturing non-linear relationships
df['age_squared'] = df['age'] ** 2
df['income_cubed'] = df['income'] ** 3

# Rank transformation
df['income_rank'] = df['income'].rank(pct=True)

# Binning
df['age_group'] = pd.cut(df['age'], bins=[0, 18, 30, 45, 60, 100],
                         labels=['child', 'young', 'adult', 'middle', 'senior'])
df['income_binned'] = pd.qcut(df['income'], q=10, labels=False)
```

### Interaction Features

```python
from sklearn.preprocessing import PolynomialFeatures

# Pairwise interactions
poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
interactions = poly.fit_transform(df[['age', 'income', 'credit_score']])
interaction_names = poly.get_feature_names_out(['age', 'income', 'credit_score'])

# Manual interactions
df['age_income_interaction'] = df['age'] * df['income']
df['risk_score'] = df['credit_score'] / (df['debt_to_income'] + 1)
df['density'] = df['population'] / df['area_sqkm']
```

## Feature Selection

### Filter Methods

```python
from sklearn.feature_selection import (
    SelectKBest, f_classif, mutual_info_classif,
    VarianceThreshold, chi2
)

# Variance threshold (remove near-constant features)
selector = VarianceThreshold(threshold=0.01)
df_filtered = selector.fit_transform(df)

# ANOVA F-test (classification)
selector = SelectKBest(score_func=f_classif, k=20)
X_selected = selector.fit_transform(X, y)
selected_features = X.columns[selector.get_support()]

# Mutual information (captures non-linear relationships)
mi_scores = mutual_info_classif(X, y, random_state=42)
mi_scores = pd.Series(mi_scores, index=X.columns).sort_values(ascending=False)

# Chi-square test (categorical features)
selector = SelectKBest(score_func=chi2, k=20)
```

### Wrapper Methods

```python
from sklearn.feature_selection import RFE, RFECV
from sklearn.ensemble import RandomForestClassifier

# Recursive Feature Elimination
estimator = RandomForestClassifier(n_estimators=100, random_state=42)
selector = RFE(estimator, n_features_to_select=20, step=5)
selector.fit(X, y)
selected_features = X.columns[selector.support_]

# RFE with Cross-Validation (automatic selection)
selector = RFECV(
    estimator, step=5, cv=5,
    scoring='roc_auc', n_jobs=-1,
)
selector.fit(X, y)
optimal_features = X.columns[selector.support_]
```

### Embedded Methods

```python
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import SelectFromModel

# L1 regularization (Lasso)
selector = SelectFromModel(
    LogisticRegression(penalty='l1', C=0.1, solver='saga', max_iter=1000),
    threshold='median',
)
selector.fit(X, y)
selected_features = X.columns[selector.get_support()]

# Tree-based importance
selector = SelectFromModel(
    RandomForestClassifier(n_estimators=200, random_state=42),
    threshold='0.5*mean',
)
selector.fit(X, y)

# Permutation importance for any model
from sklearn.inspection import permutation_importance
result = permutation_importance(
    model, X_val, y_val,
    n_repeats=10, random_state=42, n_jobs=-1
)
importance_df = pd.DataFrame({
    'feature': X.columns,
    'importance': result.importances_mean,
    'std': result.importances_std,
}).sort_values('importance', ascending=False)
```

## Handling Missing Values

```python
from sklearn.impute import SimpleImputer, KNNImputer

# Mean/median imputation (numeric)
imputer = SimpleImputer(strategy='median')
df_imputed = imputer.fit_transform(df[['age', 'income']])

# Mode imputation (categorical)
imputer = SimpleImputer(strategy='most_frequent')
df_imputed = imputer.fit_transform(df[['region', 'gender']])

# KNN imputation (captures feature relationships)
imputer = KNNImputer(n_neighbors=5, weights='distance')
df_imputed = imputer.fit_transform(df)

# Missing indicator
df['income_missing'] = df['income'].isna().astype(int)
df['income_imputed'] = df['income'].fillna(df['income'].median())

# Model-based imputation
from sklearn.ensemble import RandomForestRegressor

def rf_impute(data, target_col):
    missing = data[data[target_col].isna()]
    complete = data[data[target_col].notna()]
    X_train = complete.drop(columns=[target_col])
    y_train = complete[target_col]
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    X_missing = missing.drop(columns=[target_col])
    data.loc[data[target_col].isna(), target_col] = model.predict(X_missing)
    return data
```

## Feature Encoding for Categorical Variables

### High-Cardinality Encoding

| Encoding Method | Memory | Cardinality Limit | Performance | Preserves Order |
|---|---|---|---|---|
| One-hot | High | < 50 categories | Good | No |
| Ordinal | Low | Any | Good | Yes (explicit) |
| Target | Low | Any | Medium | No |
| Count/Frequency | Low | Any | Good | No |
| Label | Low | Any | Good | No |
| Weight of Evidence | Low | Any | Medium | Yes |
| Hashing | Medium | Any | Good | No |
| Binary | Low | Any | Good | No |
| CatBoost | Low | Any | Best | No |

```python
# WoE encoding for binary classification
def woe_encoding(X, y, feature):
    df = pd.DataFrame({feature: X[feature], 'target': y})
    grouped = df.groupby(feature)['target'].agg(['count', 'sum'])
    grouped['event_rate'] = (grouped['sum'] + 0.5) / (grouped['sum'].sum() + 0.5)
    grouped['non_event_rate'] = (
        (grouped['count'] - grouped['sum']) + 0.5
    ) / ((grouped['count'].sum() - grouped['sum'].sum()) + 0.5)
    grouped['woe'] = np.log(grouped['event_rate'] / grouped['non_event_rate'])
    return X[feature].map(grouped['woe']).fillna(0)

# Feature hashing
from sklearn.feature_extraction import FeatureHasher
hasher = FeatureHasher(n_features=128, input_type='string')
hashed = hasher.transform(df['high_card_feature'].astype(str))
```

## Temporal Feature Engineering

### Lag Features

```python
# Create lag features
for lag in [1, 7, 14, 30]:
    df[f'sales_lag_{lag}d'] = df.groupby('product_id')['sales'].shift(lag)

# Rolling window features
for window in [7, 14, 30]:
    df[f'sales_rolling_mean_{window}d'] = df.groupby('product_id')['sales'] \
        .transform(lambda x: x.rolling(window, min_periods=1).mean())
    df[f'sales_rolling_std_{window}d'] = df.groupby('product_id')['sales'] \
        .transform(lambda x: x.rolling(window, min_periods=1).std())

# Expanding window (cumulative)
df['sales_cumulative'] = df.groupby('product_id')['sales'].cumsum()
df['sales_cumulative_mean'] = df.groupby('product_id')['sales'] \
    .expanding(min_periods=1).mean()
```

### Difference Features

```python
# Period-over-period changes
df['sales_dod_change'] = df.groupby('product_id')['sales'].diff(1)
df['sales_wow_change'] = df.groupby('product_id')['sales'].diff(7)
df['sales_mom_change'] = df.groupby('product_id')['sales'].diff(30)

# Percentage change
df['sales_dod_pct'] = df.groupby('product_id')['sales'].pct_change(1)
df['sales_yoy_pct'] = df.groupby('product_id')['sales'].pct_change(365)
```

## Feature Pipelines with scikit-learn

```python
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer

numeric_features = ['age', 'income', 'credit_score']
categorical_features = ['region', 'education', 'gender']
ordinal_features = ['tier']
text_features = ['description']

numeric_transformer = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler()),
])

categorical_transformer = Pipeline([
    ('imputer', SimpleImputer(strategy='constant', fill_value='MISSING')),
    ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False)),
])

preprocessor = ColumnTransformer(transformers=[
    ('num', numeric_transformer, numeric_features),
    ('cat', categorical_transformer, categorical_features),
], remainder='drop')

pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', RandomForestClassifier(n_estimators=200)),
])
```

## Automated Feature Engineering

```python
# Featuretools for automated feature engineering
import featuretools as ft

es = ft.EntitySet(id='customer_data')
es.add_dataframe(
    dataframe_name='customers',
    dataframe=customers_df,
    index='customer_id',
)
es.add_dataframe(
    dataframe_name='orders',
    dataframe=orders_df,
    index='order_id',
)
es.add_relationship(
    parent_dataframe_name='customers',
    parent_column='customer_id',
    child_dataframe_name='orders',
    child_column='customer_id',
)

feature_matrix, feature_defs = ft.dfs(
    entityset=es,
    target_dataframe_name='customers',
    max_depth=2,
    agg_primitives=['sum', 'mean', 'count', 'std', 'max', 'min'],
    trans_primitives=['day', 'month', 'year', 'weekday'],
    max_features=50,
)
```

## Feature Validation

### Drift Detection

```python
from scipy.stats import ks_2samp, chi2_contingency
from sklearn.metrics import mutual_info_score

def detect_drift(reference, current, threshold=0.05):
    drift_report = {}
    for col in reference.columns:
        if reference[col].dtype in ['float64', 'int64']:
            stat, p_value = ks_2samp(reference[col], current[col])
            drift_report[col] = {
                'test': 'KS',
                'statistic': stat,
                'p_value': p_value,
                'drift': p_value < threshold,
            }
        else:
            contingency = pd.crosstab(reference[col], current[col])
            stat, p_value, _, _ = chi2_contingency(contingency)
            drift_report[col] = {
                'test': 'Chi2',
                'statistic': stat,
                'p_value': p_value,
                'drift': p_value < threshold,
            }
    return drift_report
```

### Importance Stability

```python
# Monitor feature importance stability over time
def feature_importance_stability(model, X_train, y_train, X_new, y_new):
    importance_old = pd.Series(
        model.feature_importances_, index=X_train.columns
    )
    model.fit(X_new, y_new)
    importance_new = pd.Series(
        model.feature_importances_, index=X_new.columns
    )
    stability = importance_old.corr(importance_new)
    top_features_old = set(importance_old.nlargest(10).index)
    top_features_new = set(importance_new.nlargest(10).index)
    overlap = len(top_features_old & top_features_new) / 10
    return {
        'correlation': stability,
        'top_10_overlap': overlap,
        'importance_change': (importance_new - importance_old).abs().max(),
    }
```

## Feature Store Integration

```python
# Feature store pattern for production
class FeatureStore:
    def __init__(self, connection_string):
        self.conn = create_connection(connection_string)

    def get_features(self, entity_ids, feature_names, timestamp):
        query = """
            SELECT entity_id, {features}, timestamp
            FROM feature_table
            WHERE entity_id IN ({ids})
            AND timestamp <= '{ts}'
            QUALIFY ROW_NUMBER() OVER (
                PARTITION BY entity_id ORDER BY timestamp DESC
            ) = 1
        """
        return pd.read_sql(query, self.conn)

    def register_feature(self, name, definition, owner):
        query = """
            INSERT INTO feature_registry (name, definition, owner, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """
        self.conn.execute(query, (name, definition, owner))
```

## Feature Selection Best Practices

1. **Start with simple filters** (variance, correlation) to remove noise before applying complex methods.
2. **Use domain knowledge** to create features before relying on automated methods.
3. **Validate features with domain experts**: not all statistically significant features make business sense.
4. **Monitor feature distributions** in production for concept drift.
5. **Remove highly correlated features** (r > 0.95) to reduce multicollinearity.
6. **Use feature importance from simple models** (Random Forest) for initial filtering.
7. **Create interaction features** sparingly — they multiply feature count quickly.
8. **Test features in isolation**: does the feature improve model performance when added alone?
9. **Avoid target leakage**: don't use features that won't be available at prediction time.
10. **Document feature semantics**: what does this feature represent and how was it created?

## References
- Zheng and Casari. "Feature Engineering for Machine Learning" (O'Reilly, 2018)
- Kuhn and Johnson. "Feature Engineering and Selection" (CRC Press, 2019)
- scikit-learn Feature Selection: https://scikit-learn.org/stable/modules/feature_selection.html
- Featuretools Documentation: https://featuretools.alteryx.com/
- category_encoders Documentation: https://contrib.scikit-learn.org/category_encoders/
