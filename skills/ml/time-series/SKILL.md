---
name: ml-time-series
description: >
  Use this skill when forecasting time series data, modeling trend/seasonality, applying ARIMA/SARIMA/Prophet/LSTM/TFT, or performing temporal cross-validation.
  This skill enforces: decomposition analysis (trend/seasonality/residual), stationarity testing, model selection by data characteristics, temporal cross-validation, forecast evaluation with MASE/sMAPE.
  Do NOT use for: generic regression on non-temporal data, anomaly detection in time series (use ml-anomaly-detection), causal inference with time series, or real-time streaming (use data-streaming skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, time-series, forecasting, phase-11]
---

# ML Time Series Forecasting

## Purpose
Design time series forecasting architectures with appropriate model selection, feature design, temporal cross-validation, and evaluation protocols.

## Architecture/Decision Trees

### Model Selection Decision Tree
```
Series characteristics
  ├── No strong seasonality, <1000 obs
  │   └── ARIMA (identified from ACF/PACF)
  ├── Clear seasonality, >= 2 full cycles
  │   ├── Single seasonality → SARIMA
  │   └── Multiple seasonalities → Prophet or TBATS
  ├── Rich exogenous features, multiple series
  │   ├── Tabular features → LightGBM/XGBoost with lags and windows
  │   ├── Interpretability needed → TFT (Temporal Fusion Transformer)
  │   └── Static metadata per series → Gradient boosting with entity encoding
  ├── Long sequences (>10K steps), complex non-linear
  │   ├── LSTM/GRU (needs >10K steps, careful feature engineering)
  │   ├── PatchTST (transformer for time series, SOTA)
  │   └── TFT (attention + interpretable)
  └── Baseline (always compute first)
      ├── Naive: y_{t+1} = y_t (random walk)
      ├── Seasonal naive: y_{t+1} = y_{t+1-season}
      └── Mean: y_{t+1} = mean of historical values
```

### Forecast Horizon Decision Tree
```
How far ahead do you need to forecast?
  ├── Short-term (1-3 steps)
  │   ├── ARIMA/SARIMA (simple, interpretable, good short-term)
  │   └── LSTM (if complex patterns, sufficient data)
  ├── Medium-term (4-24 steps)
  │   ├── Prophet (handles holidays, changepoints, missing data)
  │   ├── LightGBM with features (best with rich exogenous data)
  │   └── TFT (when interpretability needed)
  └── Long-term (>24 steps)
      ├── Direct multi-step (train separate model per horizon)
      ├── Recursive (iteratively feed predictions as inputs)
      ├── Seq2Seq LSTM (encoder-decoder for multi-step)
      └── TFT (native multi-horizon with quantiles)
```

### Temporal CV Strategy
```
Series length
  ├── <500 observations → Expanding window (maximize training data)
  │   Train size increases, test size fixed. 5-8 folds.
  ├── 500-5000 observations → Expanding or sliding
  │   Sliding window when old data is irrelevant. Gap=0 to 7.
  └── >5000 observations → Sliding window (fixed train size)
      Window size = 2-3x seasonal period. 5-10 folds.
```

### Frequency-Specific Guidance
```
Data frequency → key considerations
  ├── Hourly → 24-hour + 168-hour (weekly) seasonality, Fourier terms
  ├── Daily → 7-day + 365-day seasonality, holiday effects
  ├── Weekly → 52-week seasonality, look at monthly patterns
  ├── Monthly → 12-month seasonality, quarterly effects
  └── Quarterly → 4-quarter seasonality, annual cycle
```

## Agent Protocol

### Trigger
User request includes: time series, forecasting, Prophet, ARIMA, SARIMA, LSTM, TFT, Temporal Fusion Transformer, seasonality, trend, stationarity, differencing, autocorrelation, forecast horizon, backtesting.

### Input Context
Before activating, verify:
- Series frequency (hourly, daily, weekly, monthly, quarterly, yearly).
- Series length in number of observations.
- Seasonality periods (daily, weekly, yearly, multiple seasonalities).
- Forecast horizon required (short-term, medium-term, long-term).
- Available features (exogenous regressors, calendar data, holidays).
- Business requirement: point forecast vs prediction intervals vs quantiles.

### Output Artifact
Time series forecasting architecture with model selection, feature design, evaluation protocol.

### Response Format
```
## Forecasting Framework
### Series Characteristics
Frequency: {hourly/daily/weekly/monthly} | Seasonality: {daily/weekly/yearly}
Trend: {linear/nonlinear/none} | Stationary: {true/false}

### Model Selection
Primary: {ARIMA/SARIMA/Prophet/LSTM/TFT/Ensemble}
Baseline: {naive/seasonal_naive/mean}

### Feature Engineering
Lags: [{1, 7, 14, 28}] | Window: [{7, 30}]
Calendar: {day_of_week/month/quarter/holiday}

### Evaluation
CV: {expanding/sliding} | Metrics: {MASE / sMAPE / RMSE}
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Time series characteristics documented.
- [ ] Stationarity test performed (ADF + KPSS) and differencing applied if needed.
- [ ] Model selected based on data characteristics and forecast horizon.
- [ ] Features engineered including lags, windows, and calendar features.
- [ ] Temporal cross-validation configured with gap.
- [ ] Baseline model established for comparison.
- [ ] Forecast generated with prediction intervals.
- [ ] Residuals validated (white noise, no autocorrelation).

## Workflow

### Step 1: Exploratory Analysis
Plot the series: identify level, trend, seasonal pattern. STL decomposition (robust=True). Check missing values (interpolate or forward fill). Analyze ACF (MA terms, seasonality) and PACF (AR terms). Stationarity: ADF test (H0=non-stationary) + KPSS test (H0=stationary).

```python
import pandas as pd
import numpy as np
from statsmodels.tsa.stattools import adfuller, kpss
from statsmodels.tsa.seasonal import STL

def analyze_time_series(y):
    """Comprehensive time series analysis."""
    results = {}

    # Stationarity tests
    adf_stat, adf_pval, *_ = adfuller(y.dropna())
    kpss_stat, kpss_pval, *_ = kpss(y.dropna())

    results["adf_pvalue"] = adf_pval
    results["kpss_pvalue"] = kpss_pval
    results["is_stationary"] = adf_pval < 0.05 and kpss_pval > 0.05

    if adf_pval < 0.05 and kpss_pval < 0.05:
        results["interpretation"] = "Difference stationary (needs differencing)"
    elif adf_pval > 0.05 and kpss_pval > 0.05:
        results["interpretation"] = "Not enough data to conclude"
    elif adf_pval > 0.05 and kpss_pval < 0.05:
        results["interpretation"] = "Non-stationary (needs differencing)"
    else:
        results["interpretation"] = "Stationary"

    # STL Decomposition
    stl = STL(y.dropna(), robust=True)
    result = stl.fit()
    results["trend"] = result.trend
    results["seasonal"] = result.seasonal
    results["residual"] = result.resid

    return results

def detect_seasonality(y, freq):
    """Detect strong seasonal periods using ACF."""
    from statsmodels.graphics.tsaplots import plot_acf
    from statsmodels.tsa.stattools import acf
    acf_values = acf(y.dropna(), nlags=min(2*freq, len(y)//2))
    seasonal_lags = [freq, 2*freq, 3*freq]
    peak = max(abs(acf_values[l]) for l in seasonal_lags if l < len(acf_values))
    return peak > 0.3  # strong seasonality if ACF at seasonal lag > 0.3
```

### Step 2: Model Selection and Implementation
ARIMA: univariate, no strong seasonality, 100-1000 obs. SARIMA: clear seasonal pattern, ≥2 cycles. Prophet: multiple seasonalities, holidays, missing data, outliers. LSTM: long sequences (>10K), complex patterns. TFT: interpretable deep learning with attention. Gradient boosting (LightGBM): tabular time series with rich features.

```python
# ARIMA auto-selection
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
import pmdarima as pm

def auto_arima(y, seasonal=True, m=12):
    """Auto-select ARIMA/SARIMA parameters."""
    model = pm.auto_arima(
        y, seasonal=seasonal, m=m,
        start_p=0, max_p=5,
        start_q=0, max_q=5,
        start_P=0, max_P=2,
        start_Q=0, max_Q=2,
        information_criterion="aic",
        stepwise=True,
        trace=False,
        error_action="ignore",
        suppress_warnings=True,
        random_state=42,
    )
    return model

# Prophet
from prophet import Prophet

def prophet_forecast(df, periods=30, changepoint_prior_scale=0.05):
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=changepoint_prior_scale,
        seasonality_prior_scale=10.0,
    )
    model.add_country_holidays(country_name="US")
    model.fit(df)
    future = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)
    return forecast, model

# LightGBM with features
import lightgbm as lgb

def train_ts_gbdt(train_df, val_df, feature_cols, target_col):
    train_data = lgb.Dataset(train_df[feature_cols], label=train_df[target_col])
    val_data = lgb.Dataset(val_df[feature_cols], label=val_df[target_col], reference=train_data)

    params = {
        "objective": "regression",
        "metric": "mae",
        "boosting_type": "gbdt",
        "num_leaves": 31,
        "learning_rate": 0.05,
        "feature_fraction": 0.8,
    }

    model = lgb.train(
        params, train_data,
        valid_sets=[val_data],
        num_boost_round=500,
        callbacks=[lgb.early_stopping(50)],
    )
    return model
```

### Step 3: Feature Engineering
Lags: y_{t-1}, y_{t-2}, y_{t-season} for autoregressive behavior. Rolling statistics: mean, std, min, max, slope over windows. Calendar: dayofweek, month, quarter, holiday, hour. Fourier terms: sin/cos at seasonal periods. Exogenous regressors: promotions, pricing, weather.

```python
def create_ts_features(df, date_col, target_col, freq="D"):
    """Create comprehensive time series features."""
    features = df.copy()
    dates = pd.to_datetime(df[date_col])

    # Calendar features
    features["dayofweek"] = dates.dt.dayofweek
    features["month"] = dates.dt.month
    features["quarter"] = dates.dt.quarter
    features["dayofyear"] = dates.dt.dayofyear
    features["weekofyear"] = dates.dt.isocalendar().week.astype(int)
    features["is_weekend"] = (dates.dt.dayofweek >= 5).astype(int)

    # Cyclical encoding
    features["month_sin"] = np.sin(2 * np.pi * features["month"] / 12)
    features["month_cos"] = np.cos(2 * np.pi * features["month"] / 12)

    # Lag features
    seasonal_lag = 7 if freq == "D" else 12 if freq == "M" else 4
    for lag in [1, 2, seasonal_lag, 2*seasonal_lag]:
        features[f"lag_{lag}"] = features[target_col].shift(lag)

    # Rolling statistics
    for window in [7, 14, 30]:
        if freq == "D":
            features[f"rolling_mean_{window}"] = features[target_col].rolling(window).mean()
            features[f"rolling_std_{window}"] = features[target_col].rolling(window).std()

    # Difference features
    features["diff_1"] = features[target_col].diff(1)
    features[f"diff_{seasonal_lag}"] = features[target_col].diff(seasonal_lag)

    # Fourier terms for seasonality
    for order in range(1, 4):
        features[f"fourier_sin_{order}_{seasonal_lag}"] = np.sin(
            2 * np.pi * order * np.arange(len(features)) / seasonal_lag
        )
        features[f"fourier_cos_{order}_{seasonal_lag}"] = np.cos(
            2 * np.pi * order * np.arange(len(features)) / seasonal_lag
        )

    return features.dropna()
```

### Step 4: Temporal Cross-Validation
Expanding window: train on past, test on next block. Sliding window: fixed train size, slides forward. Gap between train and test to prevent autocorrelation leakage.

```python
from sklearn.model_selection import TimeSeriesSplit

def temporal_cv(X, y, n_splits=5, gap=0, test_size=None):
    """Custom temporal cross-validation."""
    tscv = TimeSeriesSplit(n_splits=n_splits, gap=gap, test_size=test_size)
    cv_scores = []

    for train_idx, val_idx in tscv.split(X):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = lgb.train(params, lgb.Dataset(X_train, label=y_train))
        y_pred = model.predict(X_val)
        cv_scores.append(mean_absolute_error(y_val, y_pred))

    return {
        "scores": cv_scores,
        "mean": np.mean(cv_scores),
        "std": np.std(cv_scores),
    }
```

### Step 5: Evaluation Metrics
MASE: scale-independent, compares to naive forecast. MASE < 1 means model beats naive. sMAPE: symmetric relative error. RMSE: sensitive to large errors. CRPS: full distribution evaluation.

```python
def mase(y_true, y_pred, y_train, seasonality=1):
    """Mean Absolute Scaled Error."""
    naive_error = np.mean(np.abs(np.diff(y_train, n=seasonality)))
    if naive_error == 0:
        return np.nan
    return np.mean(np.abs(y_true - y_pred)) / naive_error

def smape(y_true, y_pred):
    """Symmetric Mean Absolute Percentage Error."""
    denominator = np.abs(y_true) + np.abs(y_pred)
    return 200 * np.mean(np.abs(y_true - y_pred) / (denominator + 1e-10))
```

### Step 6: Prediction Intervals
ARIMA/SARIMA: built-in normal-based CI. Prophet: uncertainty from MCMC. LSTM: quantile regression with pinball loss. TFT: built-in quantile output. Conformal prediction: distribution-free intervals.

```python
def conformal_prediction(model, X_train, y_train, X_test, alpha=0.1):
    """Conformal prediction for distribution-free intervals."""
    y_train_pred = model.predict(X_train)
    residuals = np.abs(y_train - y_train_pred)
    n = len(residuals)
    q = np.quantile(residuals, (n + 1) * (1 - alpha) / n)

    y_test_pred = model.predict(X_test)
    lower = y_test_pred - q
    upper = y_test_pred + q
    return y_test_pred, lower, upper
```

## Anti-Patterns

- **Standard k-fold CV on time series**: Always use temporal CV.
- **Failing to test stationarity**: Non-stationary data invalidates ARIMA assumptions.
- **Over-differencing**: Too many differences removes signal, adds noise.
- **Future information in features**: Data leakage inflates performance.
- **Minimum training size too small**: Need at least 2x seasonal period.
- **Ignoring multiple seasonalities**: Daily data has weekly AND yearly patterns.
- **RMSE alone**: Need MASE for scale-independent comparison.
- **One-step evaluation only**: Good at 1-step but poor at 12-step.

## Production Considerations

### Monitoring
- Track MASE/sMAPE over time, alert if >20% increase.
- Monitor residual autocorrelation (Ljung-Box test).
- Track prediction interval coverage.
- Detect concept drift in residual distribution.
- Monitor forecast bias (systematic over/under-prediction).

### Deployment
- Set minimum training size: ≥2x full seasonal cycle.
- Validate against naive/seasonal naive baselines.
- Store model parameters and training end date.
- Implement backtesting pipeline.
- Version training data by date range.
- Pin random seed for reproducibility.

## Rules
- Never use standard k-fold CV on time series.
- Always test stationarity (ADF + KPSS) before ARIMA/SARIMA.
- ACF tailing + PACF cutoff → AR(p). ACF cutoff + PACF tailing → MA(q).
- MASE preferred for comparing across series.
- Prophet handles missing dates and outliers better than SARIMA.
- Feature engineering matters more than model choice.
- Never include future information in features.
- Minimum training size ≥2x seasonal period.
- Backtest against naive baseline.
- Evaluate on multiple forecast horizons.
- Always plot residuals after fitting.

## References
  - references/classical-forecasting.md — Classical Forecasting
  - references/deep-learning-ts.md — Deep Learning for Time Series
  - references/feature-engineering.md — Time Series Feature Engineering
  - references/forecast-deep-learning.md — Deep Learning Forecasting
  - references/forecasting-methods.md — Time Series Forecasting
  - references/time-series-advanced.md — Time Series Advanced Topics
  - references/time-series-feature-store.md — Time Series Feature Store
  - references/time-series-fundamentals.md — Time Series Fundamentals
## Handoff
Hand off to ml-feature-engineering for advanced feature creation. For anomaly detection on residuals, hand off to ml-anomaly-detection.
## Architecture Decision Trees

### Forecasting Method Selection
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Forecast horizon | Short (< 30 days) → ARIMA/Prophet | Long (> 90 days) → Deep learning | Uncertainty accumulation, data availability |
| Seasonality type | Single season → SARIMA/ETS | Multiple season → TBATS/MSTL | Seasonality detection, decomposition needs |
| Covariates needed | Univariate → Prophet/ARIMA | Multivariate → LSTM/Transformer | Feature availability, causal inference |
| Data frequency | High (minute/hourly) → M5/MCS | Low (weekly/monthly) → Prophet/ETS | Sparsity, computation budget |

### Decomposition Strategy
- Additive decomposition → When seasonal amplitude is constant
- Multiplicative decomposition → When seasonal amplitude scales with trend
- STL decomposition → When seasonality changes over time
- MSTL decomposition → When multiple seasonal periods exist

## Implementation Patterns

### Prophet Forecasting Pipeline
`python
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics
import pandas as pd

df = pd.DataFrame({
    'ds': pd.date_range('2023-01-01', periods=730, freq='D'),
    'y': values
})

model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    changepoint_prior_scale=0.05,
    seasonality_prior_scale=10.0,
    seasonality_mode='multiplicative'
)

model.add_regressor('holiday_indicator')
model.add_seasonality(name='monthly', period=30.5, fourier_order=5)

model.fit(df)

future = model.make_future_dataframe(periods=90)
future['holiday_indicator'] = holiday_forecast
forecast = model.predict(future)

# Cross-validation
df_cv = cross_validation(
    model, initial='365 days',
    period='30 days', horizon='90 days'
)
metrics = performance_metrics(df_cv, metrics=['mse', 'mae', 'mape'])
print(metrics[['horizon', 'mse', 'mae', 'mape']].mean())
`

### LSTM Time Series Model
`python
import torch
import torch.nn as nn

class TimeSeriesLSTM(nn.Module):
    def __init__(self, input_size=1, hidden_size=64, num_layers=2, output_size=1):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2
        )
        self.regressor = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        lstm_out, (hidden, cell) = self.lstm(x)
        return self.regressor(lstm_out[:, -1, :])

def create_sequences(data, seq_length=30):
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i + seq_length])
        y.append(data[i + seq_length])
    return torch.tensor(X, dtype=torch.float32), torch.tensor(y, dtype=torch.float32)
`

## Performance Optimization

### Training Speed
- **Direct forecasting**: For long horizons, predict all steps directly. Avoid iterative multi-step which compounds error.
- **Truncated BPTT**: Limit backpropagation through time to reduce memory. Use gradient checkpointing for very long sequences.
- **Fast Fourier features**: Use FFT to quickly identify dominant seasonalities. Pre-compute seasonal features for non-deep learning models.

### Inference Speed
- **Model quantization**: Quantize LSTM/Transformer to int8 for edge deployment. Can achieve 3-4x speedup with hardware acceleration.
- **Recursive vs direct**: Use direct multi-step for short horizons (faster). Use recursive for any horizon (slower but one model).
- **Batch forecasting**: Forecast multiple time series in batch. Use same model for parallel inference across series.

## Security Considerations

### Data Security
- **PII in time series**: Ensure timestamps don't encode user activity patterns indirectly. Aggregate or sample for privacy.
- **Forecast opacity**: Forecasts may reveal business-sensitive patterns (revenue trends). Restrict access to model outputs.
- **Anomaly leakage**: Anomaly flags in time series can leak when incidents occurred. Anonymize timestamps in shared reports.

### Model Security
- **Adversarial time series**: Crafted inputs can manipulate forecast output. Validate input range and detect adversarial patterns.
- **Poisoning**: Anomalous historical data poisons forecast model. Use robust statistics for changepoint detection.
- **Causality violation**: Ensure no future data leaks into training. Enforce strict temporal split in evaluation pipeline.
