# Statistical Anomaly Detection

## Z-Score Method

```python
import numpy as np
from typing import List, Tuple

def detect_anomalies_zscore(
    data: np.ndarray,
    threshold: float = 3.0
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Detect anomalies using z-score method.
    Points with |z-score| > threshold are anomalies.
    """
    mean = np.mean(data)
    std = np.std(data)

    if std == 0:
        return np.array([]), data

    z_scores = np.abs((data - mean) / std)
    anomalies = data[z_scores > threshold]
    normal = data[z_scores <= threshold]

    return anomalies, normal

def detect_anomalies_mad(
    data: np.ndarray,
    threshold: float = 3.5
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Detect anomalies using Median Absolute Deviation.
    More robust to outliers than z-score.
    """
    median = np.median(data)
    mad = np.median(np.abs(data - median))

    if mad == 0:
        return np.array([]), data

    modified_z_scores = 0.6745 * (data - median) / mad
    anomalies = data[np.abs(modified_z_scores) > threshold]
    normal = data[np.abs(modified_z_scores) <= threshold]

    return anomalies, normal
```

## IQR Method

```python
def detect_anomalies_iqr(
    data: np.ndarray,
    multiplier: float = 1.5
) -> Tuple[np.ndarray, np.ndarray, float, float, float, float]:
    """
    Detect anomalies using Interquartile Range method.
    Returns anomalies, normal data, Q1, Q3, IQR, and bounds.
    """
    q1 = np.percentile(data, 25)
    q3 = np.percentile(data, 75)
    iqr = q3 - q1

    lower_bound = q1 - multiplier * iqr
    upper_bound = q3 + multiplier * iqr

    anomalies = data[(data < lower_bound) | (data > upper_bound)]
    normal = data[(data >= lower_bound) & (data <= upper_bound)]

    return anomalies, normal, q1, q3, iqr, lower_bound, upper_bound

def seasonal_iqr_detection(
    data: np.ndarray,
    period: int = 24,
    multiplier: float = 2.0
) -> np.ndarray:
    """
    Detect anomalies with seasonal adjustment.
    Handles time series with daily/weekly patterns.
    """
    n_periods = len(data) // period
    anomalies = np.zeros(len(data), dtype=bool)

    for i in range(period):
        period_data = data[i::period]

        q1 = np.percentile(period_data, 25)
        q3 = np.percentile(period_data, 75)
        iqr = q3 - q1

        lower = q1 - multiplier * iqr
        upper = q3 + multiplier * iqr

        for j, val in enumerate(period_data):
            idx = j * period + i
            if idx < len(data):
                anomalies[idx] = val < lower or val > upper

    return anomalies
```

## Grubbs' Test

```python
from scipy import stats

def grubbs_test(
    data: np.ndarray,
    alpha: float = 0.05
) -> Tuple[bool, float, int]:
    """
    Grubbs' test for a single outlier.
    Tests if the maximum deviation from the mean is significant.
    """
    n = len(data)
    if n < 3:
        return False, 0.0, -1

    mean = np.mean(data)
    std = np.std(data, ddof=1)

    deviations = np.abs(data - mean)
    max_dev = np.max(deviations)
    max_idx = np.argmax(deviations)

    g_stat = max_dev / std

    t_crit = stats.t.ppf(1 - alpha / (2 * n), n - 2)
    g_crit = ((n - 1) / np.sqrt(n)) * np.sqrt(
        t_crit**2 / (n - 2 + t_crit**2)
    )

    is_outlier = g_stat > g_crit
    return is_outlier, g_stat, max_idx

def iterative_grubbs(
    data: np.ndarray,
    alpha: float = 0.05,
    max_outliers: int = None
) -> List[int]:
    """Iteratively apply Grubbs' test to find all outliers."""
    outliers = []
    current = data.copy()
    max_outliers = max_outliers or len(data) // 10

    for _ in range(max_outliers):
        is_outlier, _, idx = grubbs_test(current, alpha)
        if not is_outlier:
            break
        outliers.append(idx)
        current = np.delete(current, idx)

    return outliers
```

## Key Points

- Use z-score for normally distributed data
- Use MAD for robust outlier detection
- Use IQR method for non-parametric detection
- Apply seasonal adjustment for time series data
- Use Grubbs' test for single outlier detection
- Iterate statistical tests for multiple outliers
- Adjust thresholds based on domain knowledge
- Combine multiple methods for better detection
- Handle edge cases like zero standard deviation
- Visualize results with box plots and histograms
- Validate detection on known anomaly datasets
- Monitor false positive rates over time
