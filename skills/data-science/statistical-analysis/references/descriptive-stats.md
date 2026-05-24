# Descriptive Statistics Reference

## Measures of Central Tendency

### Mean (Arithmetic Average)
```python
import numpy as np

data = [12, 15, 14, 10, 18, 20, 22, 17, 19, 15]
mean = np.mean(data)  # 16.2

# Weighted mean
weights = [1, 1, 1, 1, 2, 2, 2, 1, 1, 1]
weighted_mean = np.average(data, weights=weights)  # 16.7

# Trimmed mean (remove top/bottom 10%)
from scipy import stats
trimmed_mean = stats.trim_mean(data, 0.1)  # 16.125
```

Properties: sensitive to outliers, sum of deviations = 0, unique. Use for symmetric distributions without extreme values.

### Median
```python
median = np.median(data)  # 16.0

# For even-length, average of two middle values
even_data = [12, 14, 15, 18]
median_even = np.median(even_data)  # 14.5
```

Robust to outliers. Use for skewed distributions or ordinal data. 50th percentile.

### Mode
```python
from scipy import stats

data_with_mode = [12, 15, 14, 15, 18, 15, 20, 15, 22]
mode_result = stats.mode(data_with_mode, keepdims=True)
mode_value = mode_result.mode[0]     # 15
mode_count = mode_result.count[0]    # 4

# Multiple modes
from collections import Counter
counts = Counter(data_with_mode)
max_count = max(counts.values())
modes = [k for k, v in counts.items() if v == max_count]
```

Only measure of central tendency for nominal (categorical) data. Not typically reported for continuous variables.

### Relationship
For unimodal distributions: mean - mode ≈ 3(mean - median). In normal distribution, all three are equal.

## Measures of Dispersion

### Variance and Standard Deviation
```python
# Population variance (ddof=0)
pop_var = np.var(data, ddof=0)

# Sample variance (ddof=1)
sample_var = np.var(data, ddof=1)
sample_std = np.std(data, ddof=1)

# Manual calculation
def sample_variance(x):
    x_bar = np.mean(x)
    return sum((xi - x_bar) ** 2 for xi in x) / (len(x) - 1)

# Coefficient of variation
cv = sample_std / mean  # relative dispersion, unitless
```

SD in same units as data. Variance in squared units. CV useful for comparing dispersion across different scales.

### Range and IQR
```python
data_range = np.max(data) - np.min(data)  # 12

q1 = np.percentile(data, 25)  # 14.0
q3 = np.percentile(data, 75)  # 18.5
iqr = q3 - q1                  # 4.5

# Five-number summary
min_val = np.min(data)         # 10
median = np.median(data)       # 16.0
max_val = np.max(data)         # 22

# Percentile calculation methods
# Type 7 (default R, NumPy)
np.percentile(data, 25, interpolation='linear')
```

IQR robust to outliers. Used for box plots. Five-number summary: min, Q1, median, Q3, max.

### Mean Absolute Deviation
```python
mad = np.mean(np.abs(data - np.mean(data)))
# More robust: median absolute deviation
from scipy.stats import median_abs_deviation
mad_robust = median_abs_deviation(data)  # 3.0
```

## Distribution Shapes

### Skewness
```python
from scipy import stats

skew = stats.skew(data)                # ≈ 0.2 (slightly right-skewed)

# Positive (right): tail on right, mean > median
# Negative (left): tail on left, mean < median
# Zero: symmetric, mean ≈ median

# Interpretation
def skew_category(s):
    if abs(s) < 0.5: return "approximately symmetric"
    if abs(s) < 1.0: return "moderately skewed"
    return "highly skewed"
```

### Kurtosis
```python
kurt = stats.kurtosis(data, fisher=True)
# Fisher: normal = 0, excess kurtosis
# Pearson: normal = 3

def kurt_category(k):
    if k > 1: return "leptokurtic (heavy tails, peaked)"
    if k < -1: return "platykurtic (light tails, flat)"
    return "mesokurtic (normal-like tails)"
```

High kurtosis → more extreme outliers. Important for risk analysis and financial modeling.

### Quantile-Quantile Plot
```python
import matplotlib.pyplot as plt

stats.probplot(data, dist="norm", plot=plt)
# Points follow diagonal line → normal distribution
# S-curve → light/heavy tails
# Curved away from line → skewed

# Theoretical quantiles vs sample quantiles
z_scores = stats.zscore(data)
ordered = np.sort(data)
theoretical = stats.norm.ppf((np.arange(1, len(data)+1) - 0.5) / len(data))
```

## Outlier Detection

### Z-Score Method
```python
from scipy import stats

z_scores = np.abs(stats.zscore(data))
outliers = np.where(z_scores > 3)[0]  # Common threshold

# Modified Z-score (more robust, uses MAD)
median = np.median(data)
mad = np.median(np.abs(data - median))
modified_z = 0.6745 * (data - median) / mad
outliers_mz = np.where(np.abs(modified_z) > 3.5)[0]

# Z-score threshold depends on sample size
# For n=100, expect 1-2 |z|>3 values by chance
# Bonferroni-adjusted threshold: z = norm.ppf(1 - 0.05/(2*n))
adjusted_threshold = stats.norm.ppf(1 - 0.05/(2*len(data)))
```

### IQR Method
```python
q1, q3 = np.percentile(data, [25, 75])
iqr = q3 - q1
lower_fence = q1 - 1.5 * iqr
upper_fence = q3 + 1.5 * iqr
outliers_iqr = [x for x in data if x < lower_fence or x > upper_fence]

# Extreme outliers (3*IQR)
extreme_lower = q1 - 3 * iqr
extreme_upper = q3 + 3 * iqr
```

Tukey's fences: 1.5*IQR for "outliers", 3*IQR for "far outliers". Assumes approximately symmetric distribution.

### Mahalanobis Distance (Multivariate)
```python
from scipy.spatial.distance import mahalanobis

def mahalanobis_outliers(df, threshold=None):
    cov = np.cov(df, rowvar=False)
    inv_cov = np.linalg.inv(cov)
    mean = np.mean(df, axis=0)
    distances = []
    for i, row in enumerate(df):
        d = mahalanobis(row, mean, inv_cov)
        distances.append(d)
    # Chi-square threshold with df = n_features
    if threshold is None:
        from scipy.stats import chi2
        threshold = chi2.ppf(0.975, df.shape[1])
    return np.array(distances), threshold
```

## Visualization

### Histogram and KDE
```python
import seaborn as sns

sns.histplot(data, kde=True, bins=10)
sns.kdeplot(data, bw_method=0.5, fill=True)

# Optimal bin width: Freedman-Diaconis rule
bin_width = 2 * iqr / (len(data) ** (1/3))
n_bins = int((max(data) - min(data)) / bin_width)

# Scott's rule
n_bins_scott = int((max(data) - min(data)) / (3.5 * sample_std / len(data)**(1/3)))
```

### Box Plot
```python
import matplotlib.pyplot as plt

plt.boxplot(data, vert=False)
plt.xlabel("Value")
# Elements: min (lower whisker), Q1, median, Q3, max (upper whisker)
# Whiskers extend to most extreme point within 1.5*IQR
# Points beyond are shown individually as outliers

# Violin plot: box plot + KDE
sns.violinplot(data=data, inner="quartile")
```

## Summary Statistics by Group
```python
import pandas as pd

df = pd.DataFrame({"group": ["A"]*5 + ["B"]*5, "value": data})

summary = df.groupby("group")["value"].agg([
    "count", "mean", "std", "min",
    lambda x: x.quantile(0.25),
    "median",
    lambda x: x.quantile(0.75),
    "max"
])
summary.columns = ["n", "mean", "std", "min", "q1", "median", "q3", "max"]
```

## Correlation and Covariance
```python
# Pearson correlation (linear relationship)
r, p = stats.pearsonr(x, y)

# Spearman rank correlation (monotonic)
rho, p = stats.spearmanr(x, y)

# Kendall tau (ordinal association)
tau, p = stats.kendalltau(x, y)

# Covariance matrix
cov_matrix = np.cov(data_matrix, rowvar=False)

# Correlation matrix
corr_matrix = np.corrcoef(data_matrix, rowvar=False)
```

## Key Formulas
```
Mean: μ = (1/n) Σ xi
Sample Variance: s² = 1/(n-1) Σ (xi - x̄)²
Sample SD: s = √s²
Z-score: z = (x - μ) / σ
IQR = Q3 - Q1
Pearson r = Σ((xi-x̄)(yi-ȳ)) / √(Σ(xi-x̄)² Σ(yi-ȳ)²)
Skewness = (1/n) Σ ((xi - x̄)/σ)³
Kurtosis = (1/n) Σ ((xi - x̄)/σ)⁴ - 3
CV = σ/μ (unitless, for ratio scales)
```
