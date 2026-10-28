# Time Series Fundamentals: Data Preparation, Baselines, and Evaluation

The groundwork that determines whether any forecasting model can be trusted: time series data hygiene, baseline models, time-respecting validation, and choosing error metrics. Specific model families are in `classical-forecasting.md`, `forecasting-methods.md`, and `deep-learning-ts.md`; feature construction in `feature-engineering.md`.

## Characteristics to Inspect First

| Property | Question | Tool |
|----------|----------|------|
| Frequency and regularity | Is there one observation per period? Gaps? Duplicates? | `df.index.to_series().diff().value_counts()` |
| Trend | Long-term level change? | Plot, rolling mean, STL decomposition |
| Seasonality | Repeating patterns (daily, weekly, yearly), possibly multiple | Seasonal plots, ACF peaks, STL/MSTL |
| Intermittency | Many zeros (spare parts, slow movers)? | Share of zeros, average demand interval |
| Structural breaks | Regime changes (pricing, COVID, product launches)? | Plots, change-point detection |
| Outliers | One-off spikes (promotions, outages)? | Robust z-scores, domain calendars |
| Exogenous drivers | Prices, promotions, holidays, weather? | Domain knowledge |

## Data Hygiene

```python
import pandas as pd

df = (raw.assign(ts=pd.to_datetime(raw["ts"], utc=True))
         .drop_duplicates(subset=["series_id", "ts"])
         .set_index("ts"))

# Regularize to daily frequency per series; make missing periods explicit
daily = (df.groupby("series_id")["y"]
           .resample("D").sum(min_count=1)     # NaN where no data, 0 only where data says 0
           .reset_index())
```

- Distinguish **missing** (unknown) from **zero** (known no demand). Filling missing with zero biases forecasts downward.
- Fix time zones and daylight-saving transitions for sub-daily data (store UTC, convert for seasonality features).
- Record known events (holidays, promotions, outages) as explicit regressors or flags instead of deleting them.
- Align aggregation with the decision: forecast at the granularity where actions happen (store × SKU × week, region × hour).

## Baselines (Always Compute These)

| Baseline | Forecast | Good for |
|----------|----------|---------|
| Naive | Last observed value | Random-walk-like series |
| Seasonal naive | Value from one season ago | Strong seasonality |
| Mean / median of window | Average of recent values | Stable noisy series |
| Drift | Last value + average historical change | Trending series |
| Croston / TSB | Separate demand size and interval | Intermittent demand |

```python
from statsforecast import StatsForecast
from statsforecast.models import Naive, SeasonalNaive, AutoETS

sf = StatsForecast(models=[Naive(), SeasonalNaive(season_length=7), AutoETS(season_length=7)], freq="D")
fc = sf.forecast(df=train, h=28)          # train columns: unique_id, ds, y
```

A complex model that cannot beat seasonal naive on backtests is not worth deploying.

## Time-Respecting Validation

Never shuffle time series data into random folds: future information leaks into training.

### Rolling-origin backtesting

```
fold 1: train [────────────]  test [■■■■]
fold 2: train [────────────────]  test [■■■■]
fold 3: train [────────────────────]  test [■■■■]
```

```python
cv = sf.cross_validation(df=df, h=28, step_size=28, n_windows=4)
# columns: unique_id, ds, cutoff, y, <model columns>
```

- Horizon `h` equals the production forecast horizon.
- Use multiple cutoffs covering different seasons and events.
- Include a **gap** between train end and test start if, in production, data arrives with delay.
- Features must only use information available at each cutoff (lags beyond the horizon, known-future regressors only if truly known).

## Error Metrics

| Metric | Formula idea | Notes |
|--------|-------------|-------|
| MAE | mean(abs(y − ŷ)) | Scale-dependent; optimal forecast is the median |
| RMSE | sqrt(mean((y − ŷ)²)) | Penalizes large errors; optimal is the mean |
| MAPE | mean(abs((y − ŷ)/y)) | Undefined at y=0, explodes near zero, asymmetric; avoid for low/intermittent volumes |
| sMAPE | Symmetric variant | Still unstable near zero; multiple definitions exist |
| WAPE (wMAPE) | sum(abs(y − ŷ)) / sum(abs(y)) | Robust aggregate for retail/demand; weights by volume |
| MASE | MAE / in-sample MAE of (seasonal) naive | Scale-free, comparable across series; < 1 beats naive |
| Bias | sum(ŷ − y) / sum(y) | Systematic over/under-forecasting |
| Pinball (quantile) loss | Asymmetric penalty per quantile | Evaluates probabilistic forecasts |
| CRPS | Integrated quantile loss | Whole predictive distribution |

Choose metrics that reflect the business cost: under-forecasting may cost lost sales while over-forecasting costs inventory, which is a quantile problem, not an RMSE problem.

```python
import numpy as np

def wape(y, yhat):
    return np.abs(y - yhat).sum() / np.abs(y).sum()

def mase(y, yhat, y_train, m=7):
    scale = np.mean(np.abs(y_train[m:] - y_train[:-m]))
    return np.mean(np.abs(y - yhat)) / scale
```

## Stationarity and Transformations

- Many classical models (ARIMA) assume stationarity after differencing; check with ADF (null: unit root) and KPSS (null: stationary) together.
- Log or Box-Cox transforms stabilize variance for multiplicative series; back-transform forecasts carefully (median vs mean bias).
- Tree-based and deep models do not require stationarity but still benefit from detrending or target scaling per series.

## Forecast Granularity and Aggregation

- Forecasting at aggregate levels is usually more accurate; disaggregate with proportions or use hierarchical reconciliation (see `time-series-advanced.md`).
- Temporal aggregation (daily → weekly) reduces noise and intermittency.

## Pitfalls

- Random train/test splits or k-fold CV without time ordering.
- Using features computed with future data (rolling means centered on the target, full-period normalization).
- Reporting MAPE on series with zeros.
- Comparing models on a single test window that happens to contain an anomaly.
- No baseline comparison.

## Checklist

- [ ] Regular frequency, explicit missing vs zero, UTC timestamps
- [ ] Events and breaks documented as regressors or flags
- [ ] Naive and seasonal-naive baselines computed
- [ ] Rolling-origin backtests with production horizon and data delays
- [ ] Metrics chosen for business cost (WAPE/MASE/quantile loss), plus bias
- [ ] No leakage in features at each cutoff
