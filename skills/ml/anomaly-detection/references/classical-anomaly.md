# Classical Anomaly Detection

## Statistical Methods

### Z-Score
```
import numpy as np
from scipy import stats

def zscore_detection(data, threshold=3):
    return np.abs(stats.zscore(data)) > threshold

def modified_zscore(data, threshold=3.5):
    median = np.median(data)
    mad = np.median(np.abs(data - median))
    if mad == 0: return np.zeros_like(data, dtype=bool)
    return np.abs(0.6745 * (data - median) / mad) > threshold

data = np.random.normal(0, 1, 1000); data[500] = 10
anomalies = modified_zscore(data)
```

Modified Z-score uses median and MAD — robust to extreme outliers. Threshold 3.5 is standard. Assumes normality, univariate only.

### IQR
```
def iqr_detection(data, multiplier=1.5):
    q1, q3 = np.percentile(data, [25, 75])
    iqr = q3 - q1
    return (data < q1 - multiplier*iqr) | (data > q3 + multiplier*iqr)
```

Non-parametric, distribution-free. Multiplier 1.5 flags ~0.7% of normal data. 3.0 for extreme outliers (<0.01%).

### Grubbs' Test
```
def grubbs_test(data, alpha=0.05):
    n = len(data); mean, std = np.mean(data), np.std(data, ddof=1)
    z = np.abs(data - mean) / std; max_idx = np.argmax(z)
    t_crit = stats.t.ppf(1 - alpha/(2*n), n-2)
    g_crit = ((n-1)/np.sqrt(n)) * np.sqrt(t_crit**2 / (n-2 + t_crit**2))
    return max_idx, z[max_idx] > g_crit
```

Detects one outlier at a time. Generalize with Generalized ESD for sequential detection. Better than Z-score for small samples.

## Proximity-Based

### LOF (Local Outlier Factor)
```
from sklearn.neighbors import LocalOutlierFactor

lof = LocalOutlierFactor(n_neighbors=20, contamination=0.05, novelty=True)
y_pred = lof.fit_predict(X)  # 1=normal, -1=anomaly
scores = -lof.negative_outlier_factor_  # higher = more anomalous
```

LOF compares local density to neighbors. ~1 = normal, >1 = anomaly. n_neighbors: higher = more global. Limitations: expensive for large datasets, fails with high dimensions.

### kNN Distance
```
from sklearn.neighbors import NearestNeighbors

nn = NearestNeighbors(n_neighbors=5).fit(X)
distances, _ = nn.kneighbors(X)
mean_dist = distances.mean(axis=1)
anomalies = mean_dist > np.percentile(mean_dist, 95)
```

Simple and interpretable. Choose k based on minimum cluster size.

## Ensemble Methods

### Isolation Forest
```
from sklearn.ensemble import IsolationForest

model = IsolationForest(n_estimators=100, max_samples="auto",
    contamination=0.05, random_state=42)
model.fit(X)
scores = model.decision_function(X)  # lower = more anomalous
anomaly_scores = model.score_samples(X)  # negative: lower = more anomalous
```

Anomalies require fewer random partitions → shorter path length. Fast O(n log n), handles high dimensions, minimal tuning. Best default for tabular anomaly detection.

### HBOS
```
from pyod.models.hbos import HBOS
hbos = HBOS(n_bins=10, alpha=0.1, tol=0.5).fit(X)
scores = hbos.decision_scores_
```

Assumes feature independence. Histogram per feature, score = sum of log(1/height). Very fast, interpretable (which bins are anomalous).

### One-Class SVM
```
from sklearn.svm import OneClassSVM
svm = OneClassSVM(kernel="rbf", nu=0.05, gamma="auto").fit(X)
y_pred = svm.predict(X)  # 1=normal, -1=anomaly
```

Finds max-margin boundary around normal data. nu ~ contamination. Sensitive to kernel and nu. Slow for n>10000.

## Evaluation
```
from sklearn.metrics import precision_recall_curve, roc_curve, auc

# Labeled
precision, recall, _ = precision_recall_curve(y_true, anomaly_scores)
fpr, tpr, _ = roc_curve(y_true, anomaly_scores)
auc_score = auc(fpr, tpr)

# Unlabeled: precision at k
def precision_at_k(scores, k=100):
    return np.argsort(scores)[-k:]  # manual inspection needed

# Stability: Jaccard overlap across runs
def run_stability(data, model_fn, n_runs=10, top_k=100):
    sets = [set(np.argsort(model_fn(data))[-top_k:]) for _ in range(n_runs)]
    return [len(s1 & s2)/len(s1 | s2) for s1 in sets for s2 in sets if s1 is not s2]
```

## Best Practices
- Start with Z-score/IQR before complex models.
- Isolation Forest is the best default — minimal tuning, robust.
- For high-dimensional sparse data use HBOS or feature selection first.
- Precision at k (inspect top-k) when labels missing.
- Set contamination conservatively — better 10 likely detections than 100 FPs.
- Ensemble voting across multiple detectors reduces FPs.
