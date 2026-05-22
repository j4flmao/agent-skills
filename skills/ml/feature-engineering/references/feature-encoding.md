# Feature Encoding Reference

## Categorical Encoding

### One-Hot Encoding
```python
from sklearn.preprocessing import OneHotEncoder

encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False, min_frequency=5)
encoded = encoder.fit_transform(df[["category", "region"]])
feature_names = encoder.get_feature_names_out(["category", "region"])
```

### Target Encoding
```python
from category_encoders import TargetEncoder
from sklearn.model_selection import KFold

te = TargetEncoder(cols=["category", "region"], smoothing=10, min_samples_leaf=5)
encoded = te.fit_transform(df[["category", "region"]], y)

# K-fold target encoding (no leakage)
def target_encode_kfold(df, col, target, n_folds=5):
    df[f"{col}_te"] = np.nan
    kf = KFold(n_splits=n_folds, shuffle=True, random_state=42)
    global_mean = target.mean()
    for train_idx, val_idx in kf.split(df):
        means = df.iloc[train_idx].groupby(col)[target.name].mean()
        df.loc[val_idx, f"{col}_te"] = df.iloc[val_idx][col].map(means).fillna(global_mean)
    return df
```

### Ordinal Encoding
```python
from sklearn.preprocessing import OrdinalEncoder
ordinal = OrdinalEncoder(categories=[["HS", "Associate", "Bachelor", "Master", "PhD"]])
df["education_ord"] = ordinal.fit_transform(df[["education"]])
```

### Count Encoding
```python
df["category_count"] = df["category"].map(df["category"].value_counts())
```

## Numerical Scaling

```python
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, PowerTransformer
from scipy.stats import skew

# StandardScaler: zero mean, unit variance (default)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# MinMaxScaler: [0,1] for neural networks
scaler = MinMaxScaler()

# RobustScaler: median + IQR (outlier robust)
scaler = RobustScaler(quantile_range=(25, 75))

# PowerTransformer: fix skew
scaler = PowerTransformer(method="yeo-johnson")  # handles negative

# Auto-select scaler by distribution
def choose_scaler(series):
    s = skew(series.dropna())
    if abs(s) > 1.5: return PowerTransformer(method="yeo-johnson")
    if series.std() > 10 * abs(series.median()): return RobustScaler()
    return StandardScaler()
```

## Datetime Features

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
    # Cyclical encoding
    for col, period in [("month", 12), ("dayofweek", 7), ("hour", 24)]:
        features[f"{col}_sin"] = np.sin(2 * np.pi * features[col] / period)
        features[f"{col}_cos"] = np.cos(2 * np.pi * features[col] / period)
    features["days_since_ref"] = (dates - pd.Timestamp("2025-01-01")).dt.days
    return features

# Lag features
def create_lag_features(df, group_col, value_col, lags=[1, 7, 30]):
    features = pd.DataFrame(index=df.index)
    for lag in lags:
        features[f"{value_col}_lag_{lag}"] = df.groupby(group_col)[value_col].shift(lag)
    for window in [7, 30]:
        features[f"{value_col}_roll_mean_{window}"] = df.groupby(group_col)[value_col].transform(
            lambda x: x.rolling(window, min_periods=1).mean())
    return features
```

## Text Features

```python
from sklearn.feature_extraction.text import TfidfVectorizer

tfidf = TfidfVectorizer(
    max_features=10000, stop_words="english", ngram_range=(1, 2),
    sublinear_tf=True, min_df=5, max_df=0.8,
)
X_tfidf = tfidf.fit_transform(texts)

# Word-level features
text_df = pd.DataFrame(index=range(len(texts)))
text_df["char_count"] = texts.str.len()
text_df["word_count"] = texts.str.split().str.len()
text_df["avg_word_len"] = text_df["char_count"] / (text_df["word_count"] + 1)
text_df["capital_ratio"] = texts.str.findall(r"[A-Z]").str.len() / (text_df["char_count"] + 1)
```

## Feature Interaction

```python
from sklearn.preprocessing import PolynomialFeatures

poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
X_inter = poly.fit_transform(X[numeric_cols])

# Domain-specific cross features
def create_cross_features(df, cat_cols, num_cols):
    features = pd.DataFrame(index=df.index)
    for cat in cat_cols[:5]:
        for num in num_cols[:5]:
            means = df.groupby(cat)[num].transform("mean")
            features[f"{cat}_{num}_ratio"] = df[num] / (means + 1e-10)
            features[f"{cat}_{num}_diff"] = df[num] - means
    return features
```

## References
- scikit-learn preprocessing: https://scikit-learn.org/stable/modules/preprocessing.html
- Category encoders: https://contrib.scikit-learn.org/category_encoders/
