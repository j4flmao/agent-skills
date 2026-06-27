---
name: ml-feature-engineering
description: >
  Use this skill when asked about feature engineering, featuretools, tsfresh, feature selection, feature extraction, encoding, scaling, one-hot encoding, target encoding, feature interaction, datetime features, text features, or feature importance. This skill enforces: categorical encoding strategies (one-hot, label, target, ordinal), numerical scaling methods (standard, min-max, robust), datetime feature extraction (year, month, day, dayofweek, cyclical encoding), text feature extraction (TF-IDF, count vectorizer, word embeddings), feature interaction generation, feature selection techniques (filter, wrapper, embedded), and automated feature engineering with Featuretools deep feature synthesis and tsfresh for time-series. Do NOT use for: model training, deep learning architecture, or experiment tracking.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, features, engineering, phase-11]
---

# ML Feature Engineering

## Purpose
Transform raw data into effective ML features through encoding, scaling, extraction, interaction, and selection. Use automated feature engineering for relational and time-series data.

## Agent Protocol

### Trigger
Exact user phrases: "feature engineering", "featuretools", "tsfresh", "feature selection", "feature extraction", "encoding", "scaling", "one-hot encoding", "target encoding", "feature interaction", "datetime features", "text features", "feature importance", "categorical encoding", "TF-IDF", "count vectorizer".

### Input Context
Before activating, verify:
- Data sources (relational tables, CSV, time-series, text, images)
- Feature types (numeric, categorical, datetime, text, geospatial)
- Target variable (regression, classification, time-series forecasting)
- Dataset size (rows, columns, total memory usage)
- ML model type (linear models, tree-based, neural networks)
- Domain knowledge (business rules, known interactions, feature semantics)
- Infrastructure (Python environment, memory constraints, compute budget)

### Output Artifact
Feature engineering pipeline with encoding, scaling, extraction, interaction, and selection as Python.

### Response Format
```python
# Feature engineering pipeline
# Encoding and scaling transforms
# Feature selection implementation
```
```yaml
# Feature definitions
# Automated FE configuration
# Feature importance ranking
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Categorical features encoded appropriately (one-hot, target, ordinal)
- [ ] Numerical features scaled (standard, min-max, robust by distribution)
- [ ] Datetime features extracted (components, cyclical encoding, lags)
- [ ] Text features extracted (TF-IDF, count vectorizer, embeddings)
- [ ] Feature interactions generated (polynomial, cross, domain-specific)
- [ ] Feature selection applied (filter, wrapper, embedded method)
- [ ] Automated feature engineering configured (Featuretools, tsfresh)
- [ ] Feature validation (no leakage, cardinality handling, missing values)

### Max Response Length
400 lines of code and configuration.

## Decision Trees

### Encoding Strategy Selection
```
Categorical feature cardinality
  ├── < 15 unique values → OneHotEncoder (handle_unknown="ignore")
  │   For linear models: drop first category to avoid multicollinearity
  │   For tree models: keep all categories
  ├── 15-100 unique values
  │   ├── Ordered → OrdinalEncoder with explicit mapping
  │   └── Unordered → BinaryEncoder or TargetEncoder with smoothing
  ├── 100-10000 unique values
  │   ├── TargetEncoder (smoothing=10, min_samples_leaf=5)
  │   ├── CatBoostEncoder (ordered target encoding, reduces leakage)
  │   └── LeaveOneOutEncoder (if enough samples per category)
  └── > 10000 unique values
      ├── CountEncoder (frequency as feature)
      ├── Hashing trick (n_components=2^16, signed=True)
      └── Entity embeddings via neural network
```

### Feature Scaling Selection
```
Numerical feature distribution
  ├── Approximately normal → StandardScaler (zero mean, unit var)
  ├── Uniform distribution → MinMaxScaler (bounded [0,1])
  ├── Heavy outliers or skewed
  │   ├── RobustScaler (median, IQR) — preserves outliers
  │   └── Winsorize then StandardScaler — caps outliers
  ├── Highly skewed (> 1 skew)
  │   ├── PowerTransformer (Yeo-Johnson) — handles negative
  │   ├── QuantileTransformer (normal output) — ranks
  │   └── Log-transform (for strictly positive)
  └── Sparse data → StandardScaler(with_mean=False) or MaxAbsScaler
```

### Feature Selection Method Selection
```
Data size and characteristic
  ├── Quick initial screening
  │   ├── VarianceThreshold (remove constant/near-constant)
  │   └── Correlation filter (remove >0.95 pairwise)
  ├── < 50K samples, < 500 features
  │   ├── Mutual information (non-linear, captures any relationship)
  │   ├── SelectKBest with f_classif (linear only)
  │   └── RFE with LogisticRegression (wrapper, slow but accurate)
  ├── 50K-500K samples, 500-5000 features
  │   ├── SelectFromModel with Lasso (L1 regularization)
  │   ├── Permutation importance (model-agnostic)
  │   └── LightGBM built-in importance (fast)
  ├── > 500K samples or > 5000 features
  │   ├── L1-regularized linear model (fast feature elimination)
  │   ├── RandomForest feature importance (parallel)
  │   └── Boruta (shadow features, robust but slow)
  └── High cardinality categorical
      └── Target encoding → group rare categories → encode → select
```

## Workflow

### Step 1: Categorical Encoding
One-hot encoding: nominal categories with < 50 unique values. Target encoding: high-cardinality categories, use smoothing to prevent overfitting. Ordinal encoding: ordered categories (education level, satisfaction). Binary encoding: high cardinality (hash categories to binary columns). Count encoding: frequency of each category. Leave-one-out encoding: target encoding without current row.

```python
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, LabelEncoder
from category_encoders import TargetEncoder, BinaryEncoder, CatBoostEncoder
import pandas as pd
import numpy as np

def encode_categorical(df, cat_cols, target=None):
    # One-hot for low cardinality
    low_card = [c for c in cat_cols if df[c].nunique() < 15]
    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    onehot_encoded = encoder.fit_transform(df[low_card])

    # Target encoding for high cardinality
    high_card = [c for c in cat_cols if df[c].nunique() >= 15]
    if high_card and target is not None:
        te = TargetEncoder(cols=high_card, smoothing=10, min_samples_leaf=5)
        target_encoded = te.fit_transform(df[high_card], target)

    # Ordinal for ordered categories
    ordinal_map = {"education_level": {
        "High School": 0, "Bachelor": 1, "Master": 2, "PhD": 3
    }}
    for col, mapping in ordinal_map.items():
        if col in df.columns:
            df[f"{col}_ordinal"] = df[col].map(mapping)

    return onehot_encoded
```

### Step 2: Numerical Scaling
StandardScaler: zero mean, unit variance (default for most models). MinMaxScaler: bounded [0, 1] (neural networks, distance-based models). RobustScaler: median and IQR (outlier-robust). PowerTransformer: make data more Gaussian (Yeo-Johnson for positive and negative, Box-Cox for strictly positive). QuantileTransformer: uniform or normal distribution output. Fit on training data only, transform train and test.

```python
from sklearn.preprocessing import StandardScaler, RobustScaler, MinMaxScaler, PowerTransformer
from scipy.stats import skew

def scale_numerical(df, num_cols):
    scaled = pd.DataFrame(index=df.index)
    for col in num_cols:
        col_skew = skew(df[col].dropna())
        if abs(col_skew) > 1:
            pt = PowerTransformer(method="yeo-johnson")
            scaled[f"{col}_power"] = pt.fit_transform(df[[col]])
        elif df[col].std() > 10 * abs(df[col].median()):
            rs = RobustScaler()
            scaled[f"{col}_robust"] = rs.fit_transform(df[[col]])
        else:
            ss = StandardScaler()
            scaled[f"{col}_standard"] = ss.fit_transform(df[[col]])
    return scaled
```

### Step 3: Datetime Features
Extract components: year, month, day, dayofweek, quarter, hour, minute, is_weekend, is_holiday, dayofyear, weekofyear. Cyclical encoding: sin/cos transform for cyclical features (month, dayofweek, hour). Difference features: days since last event, time between events. Lag features: previous values at t-1, t-7, t-30. Rolling window: rolling mean, std, min, max over window.

```python
def extract_datetime_features(df, date_col):
    dates = pd.to_datetime(df[date_col])
    features = pd.DataFrame(index=df.index)
    features["year"] = dates.dt.year
    features["month"] = dates.dt.month
    features["day"] = dates.dt.day
    features["dayofweek"] = dates.dt.dayofweek
    features["quarter"] = dates.dt.quarter
    features["hour"] = dates.dt.hour
    features["is_weekend"] = (dates.dt.dayofweek >= 5).astype(int)
    features["month_sin"] = np.sin(2 * np.pi * features["month"] / 12)
    features["month_cos"] = np.cos(2 * np.pi * features["month"] / 12)
    features["dow_sin"] = np.sin(2 * np.pi * features["dayofweek"] / 7)
    features["dow_cos"] = np.cos(2 * np.pi * features["dayofweek"] / 7)
    reference = pd.Timestamp("2025-01-01")
    features["days_since_ref"] = (dates - reference).dt.days
    return features

def create_lag_features(df, group_col, value_col, lags=[1, 7, 30]):
    features = pd.DataFrame(index=df.index)
    for lag in lags:
        features[f"{value_col}_lag_{lag}"] = (
            df.groupby(group_col)[value_col].shift(lag)
        )
    for window in [7, 14, 30]:
        rolling = df.groupby(group_col)[value_col].transform(
            lambda x: x.rolling(window, min_periods=1).mean()
        )
        features[f"{value_col}_rolling_mean_{window}"] = rolling
    return features
```

### Step 4: Text Features
TF-IDF: term frequency-inverse document frequency, best for medium-length documents. CountVectorizer: simple word/phrase counts. N-grams: unigrams + bigrams typically sufficient. Sublinear TF: use sublinear_tf=True for dampened frequency. Vocabulary size: limit to 5000-50000 most frequent terms. Min/max document frequency: filter rare and ubiquitous terms. Word embeddings: pretrained Word2Vec/GloVe/FastText for dense representations.

```python
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer

def extract_text_features(texts, max_features=10000):
    tfidf = TfidfVectorizer(
        max_features=max_features,
        stop_words="english",
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=5,
        max_df=0.8,
    )
    tfidf_matrix = tfidf.fit_transform(texts)
    text_df = pd.DataFrame(index=range(len(texts)))
    text_df["char_count"] = texts.str.len()
    text_df["word_count"] = texts.str.split().str.len()
    text_df["avg_word_length"] = text_df["char_count"] / (text_df["word_count"] + 1)
    text_df["capital_ratio"] = texts.str.findall(r"[A-Z]").str.len() / (text_df["char_count"] + 1)
    text_df["digit_count"] = texts.str.findall(r"\d").str.len()
    return tfidf_matrix, text_df

def text_to_avg_embeddings(texts, embedding_index, embed_dim=100):
    embeddings = np.zeros((len(texts), embed_dim))
    for i, text in enumerate(texts):
        words = text.lower().split()
        word_vectors = [embedding_index[w] for w in words if w in embedding_index]
        if word_vectors:
            embeddings[i] = np.mean(word_vectors, axis=0)
    return embeddings
```

### Step 5: Feature Interactions
Polynomial features: degree 2 (x1*x2, x1^2, x2^2) — sufficient for most cases. Cross features: domain-specific interactions (product_category * season, user_tier * purchase_value). Ratio features: a/b where denominator > 0. Difference features: a - b for comparable columns. Aggregated features: groupby means, max, min, count per category.

```python
from sklearn.preprocessing import PolynomialFeatures

def create_interactions(df, num_cols, cat_cols, target=None):
    features = pd.DataFrame(index=df.index)
    poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
    poly_features = poly.fit_transform(df[num_cols])
    poly_names = poly.get_feature_names_out(num_cols)
    for name, vals in zip(poly_names, poly_features.T):
        features[name] = vals
    for cat in cat_cols[:10]:
        if df[cat].nunique() < 20:
            for num in num_cols[:5]:
                group_means = df.groupby(cat)[num].transform("mean")
                features[f"{cat}_{num}_ratio"] = df[num] / (group_means + 1e-10)
                features[f"{cat}_{num}_diff"] = df[num] - group_means
    for i in range(len(num_cols)):
        for j in range(i+1, len(num_cols)):
            col_a, col_b = num_cols[i], num_cols[j]
            denominator = df[col_b].replace(0, np.nan)
            features[f"{col_a}_div_{col_b}"] = df[col_a] / denominator
    return features
```

### Step 6: Feature Selection
Filter methods: correlation (Pearson for linear, Spearman for monotonic), mutual information (non-linear relationships), variance threshold (remove constant features), chi-square (categorical-categorical). Wrapper methods: recursive feature elimination (RFE), forward/backward selection. Embedded methods: L1 regularization (Lasso), tree-based importance (Random Forest, XGBoost). SelectKBest: keep top k features by score.

```python
from sklearn.feature_selection import (
    SelectKBest, mutual_info_classif, f_classif, RFE,
    VarianceThreshold, SelectFromModel
)
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

def select_features(X, y, method="embedded", n_features=50):
    if method == "filter":
        selector = SelectKBest(mutual_info_classif, k=n_features)
        X_selected = selector.fit_transform(X, y)
    elif method == "wrapper":
        estimator = LogisticRegression(max_iter=1000, penalty="l1", solver="saga")
        selector = RFE(estimator, n_features_to_select=n_features, step=10)
        X_selected = selector.fit_transform(X, y)
    elif method == "embedded":
        selector = SelectFromModel(
            LogisticRegression(C=0.1, penalty="l1", solver="saga", max_iter=1000),
            prefit=False, threshold="median",
        )
        X_selected = selector.fit_transform(X, y)
    vt = VarianceThreshold(threshold=0.01)
    X_selected = vt.fit_transform(X) if method == "none" else X_selected
    return X_selected, selector

def get_feature_importance(X, y, feature_names):
    model = RandomForestClassifier(n_estimators=200, max_depth=8, n_jobs=-1)
    model.fit(X, y)
    importance = pd.DataFrame({
        "feature": feature_names,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)
    return importance
```

### Step 7: Automated Feature Engineering
Featuretools: deep feature synthesis on relational data. Define entities and relationships, stack transform primitives (day, month, hour, time_since_previous) and aggregation primitives (count, sum, mean, std, max, min, trend, mode). Max depth: 2-3 for most use cases; deeper features overfit. tsfresh: automatic time-series feature extraction (hundreds of features per series). Apply after Featuretools transformation.

```python
import featuretools as ft
from featuretools.primitives import (
    Count, Sum, Mean, Std, Max, Min, Trend, Mode, Day, Month, Hour,
    TimeSincePrevious, NumUnique, Entropy
)

def automated_feature_engineering(entities, relationships, target_entity, max_depth=2):
    feature_matrix, feature_defs = ft.dfs(
        entities=entities,
        relationships=relationships,
        target_entity=target_entity,
        max_depth=max_depth,
        agg_primitives=[Count, Sum, Mean, Std, Max, Min, Trend, Mode, NumUnique, Entropy],
        trans_primitives=[Day, Month, Hour, TimeSincePrevious],
        where_primitives=[Mean, Sum, Count],
        max_features=200,
        verbose=True,
    )
    return feature_matrix, feature_defs
```

### Step 8: Date-Only Features
For date columns without time component, extract: days since epoch, days until next event, relative to a reference date. Difference between multiple date columns yields duration features (e.g., order_to_shipping_days). For subscription/billing: days since last activity, days until renewal, account age.

```python
def date_difference_features(df, date_col_a, date_col_b):
    dates_a = pd.to_datetime(df[date_col_a])
    dates_b = pd.to_datetime(df[date_col_b])
    diff_days = (dates_b - dates_a).dt.days
    return pd.DataFrame({f"{date_col_a}_to_{date_col_b}_days": diff_days})
```

### Step 9: Target Encoding in Cross-Validation
Target encoding leaks target information if applied to full dataset before splitting. Always use within cross-validation:
```python
from sklearn.model_selection import KFold
import numpy as np

def target_encode_cv(df, cat_col, target, n_folds=5, smoothing=10):
    """Target encoding with cross-validation to prevent leakage."""
    encoded = np.zeros(len(df))
    kf = KFold(n_splits=n_folds, shuffle=True, random_state=42)
    for train_idx, val_idx in kf.split(df):
        train_targets = df.iloc[train_idx][target]
        global_mean = train_targets.mean()
        for cat in df[cat_col].unique():
            cat_mask = (df.iloc[train_idx][cat_col] == cat)
            cat_count = cat_mask.sum()
            cat_mean = train_targets[cat_mask].mean()
            smoothed = (cat_mean * cat_count + global_mean * smoothing) / (cat_count + smoothing)
            encoded[val_idx[df.iloc[val_idx][cat_col] == cat].index] = smoothed
    return encoded

# Stratified version for classification
from sklearn.model_selection import StratifiedKFold
def target_encode_cv_classification(df, cat_col, target, n_folds=5, smoothing=10):
    encoded = np.zeros(len(df))
    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
    for train_idx, val_idx in skf.split(df, df[target]):
        train_targets = df.iloc[train_idx][target]
        global_mean = train_targets.mean()
        for cat in df[cat_col].unique():
            cat_mask = (df.iloc[train_idx][cat_col] == cat)
            cat_count = cat_mask.sum()
            cat_mean = train_targets[cat_mask].mean()
            smoothed = (cat_mean * cat_count + global_mean * smoothing) / (cat_count + smoothing)
            encoded[val_idx[df.iloc[val_idx][cat_col] == cat].index] = smoothed
    return encoded
```

## Anti-Patterns

- **Data leakage via target encoding outside CV**: target encoding the entire dataset and then splitting causes the model to see the target during training. Always encode within cross-validation folds.
- **Applying scaling before splitting**: fit StandardScaler on entire dataset, then split — mean/var leak from test into train. Fit scaler on train only.
- **One-hot encoding high cardinality features directly**: 10,000 categories → 10,000 columns. Use target encoding, binary encoding, or hash encoding instead.
- **Creating features with future information**: lag features should only use past data. For time series, shifting must respect temporal order.
- **Over-aggressive feature interactions**: polynomial degree 3 on 100 features creates ~170K features. Limit to degree 2 and interaction_only=True.
- **Removing too many features with variance threshold**: near-zero variance features may still be predictive. Use variance threshold as first pass, then model-based selection.
- **Ignoring rare categories in target encoding**: categories with 1-2 samples will have extreme target means. Set min_samples_leaf=5-20 to smooth them toward global mean.
- **Using label encoding for unordered categories**: label encoding assigns arbitrary numbers (0, 1, 2...) → model interprets ordering. Only use for ordinal features or tree models.
- **Not handling unseen categories in production**: OneHotEncoder with handle_unknown="ignore", TargetEncoder with default value for unseen categories.
- **Creating redundant features**: correlation >0.95 between features adds noise and slows training. Remove redundant features after creation.

## Production Considerations

### Feature Store Integration
```python
# Feast feature view with engineered features
from feast import FeatureView, Feature, Field
from feast.types import Float32, Int64, String

user_features = FeatureView(
    name="user_engineered_features",
    entities=["user_id"],
    ttl=timedelta(days=1),
    features=[
        Field(name="user_total_purchases", dtype=Float32),
        Field(name="user_days_since_last_purchase", dtype=Float32),
        Field(name="user_avg_order_value", dtype=Float32),
        Field(name="user_purchase_frequency_7d", dtype=Float32),
    ],
    online=True,
    source=user_features_source,
)
```

### Pipeline Automation
```yaml
# feature_pipeline.yaml
feature_engineering:
  encoding:
    cat_low_cardinality_threshold: 15
    cat_high_cardinality_strategy: target_encoding
    smoothing: 10
    min_samples_leaf: 5
  scaling:
    default: standard
    outlier_strategy: robust
    skewed_strategy: yeo_johnson
  datetime:
    extract_components: [year, month, day, dayofweek, quarter, hour]
    cyclical_encode: [month, dayofweek, hour]
    lags: [1, 7, 30]
  interactions:
    max_degree: 2
    max_cat_num_interactions: 10
    max_num_num_ratios: 5
  validation:
    check_leakage: true
    check_future_info: true
    max_correlation: 0.95
```

### Performance Benchmarking
- Featuretools DFS: O(n × max_depth × n_primitives) where n = total rows across all entities
- tsfresh: ~100 features per input series, scales linearly with series count
- Memory: store engineered features in Parquet format (compression ratio ~5-10x vs CSV)
- Time budget: set max_features=200 for DFS to prevent explosion, limit depth to 2

### Monitoring
- Track feature distribution drift (PSI, KS test) per engineered feature
- Monitor null ratio per feature after engineering
- Log feature importance rankings per training run
- Alert on feature correlation spikes (indicating redundant feature creation)
- Cache frequently computed features in feature store

## Rules
- Fit encoders/scalers on training data only, transform validation/test
- One-hot encoding for < 15 categories, target encoding for high cardinality
- Cyclical encoding for circular datetime features (hour, month, dayofweek)
- TF-IDF with sublinear_tf=True and ngram_range=(1,2)
- Feature interactions limited to degree 2 to control explosion
- Filter methods for quick initial screening, embedded for final selection
- Mutual information captures non-linear relationships better than correlation
- Featuretools max_depth=2 for most projects
- Validate features for target leakage (no future information)
- Drop near-zero variance features before model training
- Always encode within CV folds for target encoding
- Log feature importance and distribution for every training run

## References
  - references/automated-fe.md — Automated Feature Engineering
  - references/feature-encoding.md — Feature Encoding Reference
  - references/feature-engineering-advanced.md — Feature Engineering Advanced Topics
  - references/feature-engineering-fundamentals.md — Feature Engineering Fundamentals
  - references/text-features.md — Text Feature Engineering
  - references/validation-leakage.md — Feature Engineering Validation
## Handoff
`ml-classical-ml` for model training with engineered features
`ml-deep-learning` for deep learning feature extraction (embeddings)

## Architecture Decision Trees

### Feature Encoding Selection
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Categorical cardinality | Low (< 10) → One-hot encode | High (> 50) → Target/embedding | Dimensionality constraints, tree vs linear model |
| Feature type | Numeric → Scale (Standard/MinMax) | Temporal → Cyclic encode (sin/cos) | Algorithm sensitivity, domain semantics |
| Missing values | Few (< 5%) → Impute (median) | Many (> 5%) → Flag + impute | Pattern in missingness, data volume |
| Feature interaction | Known interactions → Polynomial features | Unknown → Tree-based (handles automatically) | Model type, feature domain knowledge |

### Feature Selection Strategy
- Filter methods → Statistical tests (chi-square, mutual info). Fast, model-agnostic, good for high dimensions.
- Wrapper methods → RFE, forward selection. Model-specific, more accurate, computationally expensive.
- Embedded methods → L1 regularization, tree importance. Balance speed and accuracy, built into training.

## Implementation Patterns

### Feature Engineering Pipeline
`python
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import FunctionTransformer
import numpy as np
import pandas as pd

def cyclical_encode(df, col, period):
    df[f'{col}_sin'] = np.sin(2 * np.pi * df[col] / period)
    df[f'{col}_cos'] = np.cos(2 * np.pi * df[col] / period)
    return df.drop(columns=[col])

class AggregationFeatures(BaseEstimator, TransformerMixin):
    def __init__(self, group_col, agg_col, aggs=['mean', 'std', 'count']):
        self.group_col = group_col
        self.agg_col = agg_col
        self.aggs = aggs

    def fit(self, X, y=None):
        self.agg_map_ = X.groupby(self.group_col)[self.agg_col].agg(self.aggs)
        return self

    def transform(self, X):
        return X.join(self.agg_map_, on=self.group_col, rsuffix='_agg')

pipeline = Pipeline([
    ('cyclical', FunctionTransformer(
        lambda df: cyclical_encode(df, 'hour', 24),
        validate=False
    )),
    ('aggregations', AggregationFeatures('user_id', 'amount')),
    ('scaler', StandardScaler())
])
`

### Text Feature Extraction
`python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
import spacy

nlp = spacy.load('en_core_web_sm')

def extract_text_features(documents):
    tfidf = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        stop_words='english',
        sublinear_tf=True
    )
    tfidf_matrix = tfidf.fit_transform(documents)

    svd = TruncatedSVD(n_components=100, random_state=42)
    text_embeddings = svd.fit_transform(tfidf_matrix)

    pos_features = np.array([
        [token.pos_ for token in nlp(doc)].count('VERB')
        / max(len(doc), 1) for doc in documents
    ]).reshape(-1, 1)

    return np.hstack([text_embeddings, pos_features])
`

## Performance Optimization

### Computation Efficiency
- **Lazy evaluation**: Use Dask or Vaex for out-of-core feature engineering. Process datasets larger than RAM.
- **Parallelization**: Use swifter or pandarallel for parallel apply. Groupby aggregations in parallel with dask.
- **Caching**: Cache intermediate feature computations. Use joblib.Memory for deterministic pipeline caching.

### Storage Efficiency
- **Sparse matrices**: Use sparse representations for one-hot encoded features. Reduces memory 10-100x for high-cardinality categoricals.
- **Feature dtype optimization**: Downcast float64 to float32/int32. Use categorical dtype for string columns with few unique values.
- **Feature store**: Precompute and store features in feature store. Avoid recomputing features across training and inference.

## Security Considerations

### Feature Leakage
- **Time leakage**: Never use future information to compute past features. Use expanding window for time-based features.
- **Target leakage**: Avoid features that use target information indirectly. Validate with feature importance review.
- **Validation strategy**: Use time-based split for time-series features. Use stratified split for group-based aggregation features.

### Data Privacy
- **PII in features**: Remove direct identifiers before feature engineering. Anonymize or hash user/device IDs.
- **Aggregation privacy**: Ensure aggregate features don't reveal individual records. Apply k-anonymity to group features.
- **Feature encryption**: Encrypt sensitive features at rest in feature store. Use homomorphic encryption for privacy-preserving inference.