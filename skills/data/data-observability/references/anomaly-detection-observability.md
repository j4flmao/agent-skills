# Anomaly Detection for Data Observability

## Statistical Anomaly Detection
Anomaly detection identifies data points that deviate significantly from expected patterns. In data observability, this applies to metrics like row counts, data freshness, and distribution statistics.

## Univariate Methods

### Z-Score Method
```python
import numpy as np
from scipy import stats

def zscore_anomaly(values, threshold=3):
    arr = np.array(values)
    z_scores = np.abs(stats.zscore(arr))
    return np.where(z_scores > threshold)[0].tolist()

def modified_zscore(values, threshold=3.5):
    arr = np.array(values)
    median = np.median(arr)
    mad = np.median(np.abs(arr - median))
    modified_scores = 0.6745 * (arr - median) / mad
    return np.where(np.abs(modified_scores) > threshold)[0].tolist()
```

### IQR Method
```python
def iqr_anomaly(values, multiplier=1.5):
    arr = sorted(values)
    q1, q3 = np.percentile(arr, [25, 75])
    iqr = q3 - q1
    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr
    anomalies = []
    for i, v in enumerate(values):
        if v < lower or v > upper:
            anomalies.append(i)
    return anomalies
```

## Seasonal Decomposition

### STL Decomposition
```python
from statsmodels.tsa.seasonal import STL
import pandas as pd

class SeasonalAnomalyDetector:
    def __init__(self, period=7, seasonal=13):
        self.period = period
        self.seasonal = seasonal

    def fit(self, series: pd.Series):
        self.stl = STL(series, period=self.period, seasonal=self.seasonal)
        self.result = self.stl.fit()
        self.residual_std = self.result.resid.std()
        return self

    def detect(self, series: pd.Series):
        residuals = self.result.resid
        threshold = 3 * self.residual_std
        anomalies = np.abs(residuals) > threshold
        return pd.DataFrame({
            "value": series.values,
            "trend": self.result.trend,
            "seasonal": self.result.seasonal,
            "residual": residuals,
            "is_anomaly": anomalies,
            "deviation": residuals / self.residual_std
        })
```

## Machine Learning Methods

### Isolation Forest
```python
from sklearn.ensemble import IsolationForest

class MLAnomalyDetector:
    def __init__(self, contamination=0.01):
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )

    def detect(self, features):
        predictions = self.model.fit_predict(features)
        scores = self.model.score_samples(features)
        anomalies = predictions == -1
        return anomalies, scores
```

## Alert Fatigue Reduction

### Dynamic Thresholds
```python
class DynamicThresholdManager:
    def __init__(self, base_threshold=3.0, adaptation_rate=0.1):
        self.base_threshold = base_threshold
        self.adaptation_rate = adaptation_rate

    def calculate_threshold(self, data, false_positive_rate=None):
        if false_positive_rate is not None:
            if false_positive_rate > 0.1:
                return self.base_threshold * (1 + self.adaptation_rate)
            elif false_positive_rate < 0.01:
                return self.base_threshold * (1 - self.adaptation_rate)
        return self.base_threshold
```

## Key Points
- Use appropriate statistical methods based on data characteristics
- Apply seasonal decomposition for time-series metrics
- Combine multiple detection methods for robust results
- Implement dynamic thresholds to reduce alert fatigue
- Validate anomalies with root cause analysis
