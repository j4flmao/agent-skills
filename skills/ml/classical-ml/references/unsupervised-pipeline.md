# Unsupervised Learning and Pipelines

## Clustering

### K-Means
```python
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

K_range = range(2, 15)
silhouettes = []
for k in K_range:
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)
    silhouettes.append(silhouette_score(X_scaled, labels))

optimal_k = K_range[np.argmax(silhouettes)]
kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
clusters = kmeans.fit_predict(X_scaled)
```

### DBSCAN
```python
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors

# Find eps via k-distance plot
neighbors = NearestNeighbors(n_neighbors=5).fit(X_scaled)
distances = np.sort(neighbors.kneighbors(X_scaled)[0][:, -1])

dbscan = DBSCAN(eps=0.5, min_samples=5, n_jobs=-1)
clusters = dbscan.fit_predict(X_scaled)
n_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
```

### HDBSCAN
```python
import hdbscan
clusterer = hdbscan.HDBSCAN(min_cluster_size=10, min_samples=5, metric="euclidean")
clusters = clusterer.fit_predict(X_scaled)
outlier_scores = clusterer.outlier_scores_
```

## Dimensionality Reduction

### PCA
```python
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

X_scaled = StandardScaler().fit_transform(X)
pca = PCA(n_components=0.95)
X_pca = pca.fit_transform(X_scaled)

cumulative_variance = np.cumsum(pca.explained_variance_ratio_)
print(f"Components: {np.argmax(cumulative_variance >= 0.95) + 1}")

loadings = pd.DataFrame(pca.components_.T,
    columns=[f"PC{i+1}" for i in range(pca.n_components_)],
    index=feature_names)
```

### UMAP
```python
import umap
reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, n_components=2, random_state=42)
X_umap = reducer.fit_transform(X_scaled)
```

### t-SNE
```python
from sklearn.manifold import TSNE
tsne = TSNE(n_components=2, perplexity=30, learning_rate=200, n_iter=1000, random_state=42)
X_tsne = tsne.fit_transform(X_scaled)
# Note: t-SNE cannot transform new data — use UMAP for production
```

## Scikit-learn Pipeline

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier

numeric_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])
categorical_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
    ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
])

preprocessor = ColumnTransformer([
    ("num", numeric_transformer, numeric_features),
    ("cat", categorical_transformer, categorical_features),
])

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("pca", PCA(n_components=0.95)),
    ("classifier", RandomForestClassifier(n_estimators=200, max_depth=8)),
])
pipeline.fit(X_train, y_train)
y_pred = pipeline.predict(X_test)
```

### Advanced ColumnTransformer
```python
from sklearn.preprocessing import FunctionTransformer
import numpy as np

preprocessor = ColumnTransformer([
    ("standard_scale", StandardScaler(), ["age", "income"]),
    ("log_scale", FunctionTransformer(np.log1p), ["revenue"]),
    ("onehot", OneHotEncoder(), ["category", "region"]),
    ("ordinal", OrdinalEncoder(categories=[["bronze", "silver", "gold"]]), ["tier"]),
])
```

## Cross-Validation

```python
from sklearn.model_selection import (
    StratifiedKFold, GroupKFold, TimeSeriesSplit, RepeatedKFold
)

# Stratified (classification default)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# Group (no leakage)
cv = GroupKFold(n_splits=5)

# Time series (temporal order)
cv = TimeSeriesSplit(n_splits=5, gap=24)

# Repeated (lower variance)
cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=42)

scores = cross_val_score(pipeline, X, y, cv=cv, scoring="roc_auc")
print(f"AUC: {scores.mean():.4f} (+/- {scores.std() * 2:.4f})")
```

## References
- scikit-learn clustering: https://scikit-learn.org/stable/modules/clustering.html
- UMAP docs: https://umap-learn.readthedocs.io/
- HDBSCAN: https://hdbscan.readthedocs.io/
