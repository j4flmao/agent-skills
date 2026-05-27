---
name: ml-feature-engineering
description: >
  Use this skill when asked about feature engineering, featuretools, tsfresh, feature selection, feature extraction, encoding, scaling, one-hot encoding, target encoding, feature interaction, datetime features, text features, or feature importance. This skill enforces: categorical encoding strategies (one-hot, label, target, ordinal), numerical scaling methods (standard, min-max, robust), datetime feature extraction (year, month, day, dayofweek, cyclical encoding), text feature extraction (TF-IDF, count vectorizer, word embeddings), feature interaction generation, feature selection techniques (filter, wrapper, embedded), and automated feature engineering with Featuretools deep feature synthesis and tsfresh for time-series. Do NOT use for: model training, deep learning architecture, or experiment tracking.
version: "1.0.0"
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
300 lines of code and configuration.

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
            # Highly skewed: PowerTransformer or RobustScaler
            pt = PowerTransformer(method="yeo-johnson")
            scaled[f"{col}_power"] = pt.fit_transform(df[[col]])
        elif df[col].std() > 10 * abs(df[col].median()):
            # Outlier-prone: RobustScaler
            rs = RobustScaler()
            scaled[f"{col}_robust"] = rs.fit_transform(df[[col]])
        else:
            # Default: StandardScaler
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

    # Components
    features["year"] = dates.dt.year
    features["month"] = dates.dt.month
    features["day"] = dates.dt.day
    features["dayofweek"] = dates.dt.dayofweek
    features["quarter"] = dates.dt.quarter
    features["hour"] = dates.dt.hour
    features["is_weekend"] = (dates.dt.dayofweek >= 5).astype(int)
    features["dayofyear"] = dates.dt.dayofyear

    # Cyclical encoding for month and dayofweek
    features["month_sin"] = np.sin(2 * np.pi * features["month"] / 12)
    features["month_cos"] = np.cos(2 * np.pi * features["month"] / 12)
    features["dow_sin"] = np.sin(2 * np.pi * features["dayofweek"] / 7)
    features["dow_cos"] = np.cos(2 * np.pi * features["dayofweek"] / 7)

    # Difference from reference date
    reference = pd.Timestamp("2025-01-01")
    features["days_since_ref"] = (dates - reference).dt.days

    return features


def create_lag_features(df, group_col, value_col, lags=[1, 7, 30]):
    features = pd.DataFrame(index=df.index)
    for lag in lags:
        features[f"{value_col}_lag_{lag}"] = (
            df.groupby(group_col)[value_col].shift(lag)
        )
    # Rolling features
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
import re

def extract_text_features(texts, max_features=10000):
    # TF-IDF with n-grams
    tfidf = TfidfVectorizer(
        max_features=max_features,
        stop_words="english",
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=5,
        max_df=0.8,
    )
    tfidf_matrix = tfidf.fit_transform(texts)

    # Additional text features
    text_df = pd.DataFrame(index=range(len(texts)))
    text_df["char_count"] = texts.str.len()
    text_df["word_count"] = texts.str.split().str.len()
    text_df["avg_word_length"] = text_df["char_count"] / (text_df["word_count"] + 1)
    text_df["capital_ratio"] = texts.str.findall(r"[A-Z]").str.len() / (text_df["char_count"] + 1)
    text_df["digit_count"] = texts.str.findall(r"\d").str.len()

    return tfidf_matrix, text_df


# Word embeddings (using pretrained GloVe)
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

    # Polynomial interactions (degree 2)
    poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
    poly_features = poly.fit_transform(df[num_cols])
    poly_names = poly.get_feature_names_out(num_cols)
    for name, vals in zip(poly_names, poly_features.T):
        features[name] = vals

    # Category-numeric cross features
    for cat in cat_cols[:10]:
        if df[cat].nunique() < 20:
            for num in num_cols[:5]:
                group_means = df.groupby(cat)[num].transform("mean")
                features[f"{cat}_{num}_ratio"] = df[num] / (group_means + 1e-10)
                features[f"{cat}_{num}_diff"] = df[num] - group_means

    # Ratio features
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
        # Mutual information
        selector = SelectKBest(mutual_info_classif, k=n_features)
        X_selected = selector.fit_transform(X, y)

    elif method == "wrapper":
        # RFE with logistic regression
        estimator = LogisticRegression(max_iter=1000, penalty="l1", solver="saga")
        selector = RFE(estimator, n_features_to_select=n_features, step=10)
        X_selected = selector.fit_transform(X, y)

    elif method == "embedded":
        # L1 regularization
        selector = SelectFromModel(
            LogisticRegression(C=0.1, penalty="l1", solver="saga", max_iter=1000),
            prefit=False, threshold="median",
        )
        X_selected = selector.fit_transform(X, y)

    # Variance threshold (remove near-constant features)
    vt = VarianceThreshold(threshold=0.01)
    X_selected = vt.fit_transform(X) if method == "none" else X_selected

    return X_selected, selector


# Tree-based importance
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


# Example: customers -> orders -> products
entities = {
    "customers": (customers_df, "customer_id"),
    "orders": (orders_df, "order_id"),
    "products": (products_df, "product_id"),
}
relationships = [
    ("customers", "customer_id", "orders", "customer_id"),
    ("orders", "product_id", "products", "product_id"),
]
feature_matrix, features = automated_feature_engineering(entities, relationships, "customers")
```

## Rules
- Fit encoders/scalers on training data only, transform validation/test
- One-hot encoding for < 15 categories, target encoding for high cardinality
- Cyclical encoding for circular datetime features (hour, month, dayofweek)
- TF-IDF with sublinear_tf=True and ngram_range=(1,2)
- Feature interactions limited to degree 2 to control explosion
- Filter methods for quick initial screening, embedded for final selection
- Mutual information captures non-linear relationships better than correlation
- Featuretools max_depth=2 for most projects, max_depth=3 for large datasets
- Validate features for target leakage (no future information)
- Drop near-zero variance features before model training

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
