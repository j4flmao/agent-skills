# Forecasting — Models, Fit, Confidence Intervals

## Choose Your Model

```
Pattern                    Model                          Tool
Steady linear growth       Linear regression              Excel, statsmodels
Compound growth            Exponential / log-linear       Prophet, ARIMA
Daily/weekly seasonality   SARIMA, Prophet, ETS           Prophet, statsmodels
Yearly seasonality (Q4)    Prophet, Holt-Winters          Prophet
Multiple regressors        Prophet w/ regressors, XGBoost Prophet, sklearn
Step changes (launches)    Manual + Prophet changepoints  Prophet
```

## Linear Regression (simplest, good for B2B)

```python
import numpy as np
from scipy.stats import linregress

# x = month index, y = peak_rps
x = np.arange(12)
y = np.array([1200, 1350, 1480, 1620, 1810, 2000, 2200, 2400, 2680, 2900, 3150, 3400])

slope, intercept, r, p, stderr = linregress(x, y)
# y = intercept + slope * t
# r² = quality of fit; want > 0.9
print(f"forecast Q+1 (t=15): {intercept + slope*15}")
print(f"forecast Q+4 (t=24): {intercept + slope*24}")
```

## Exponential (high-growth)

```python
import numpy as np
# Log-linear fit
y_log = np.log(y)
slope, intercept, *_ = linregress(x, y_log)
# y(t) = exp(intercept + slope*t)
forecast = np.exp(intercept + slope * np.arange(24, 36))
```

Monthly growth rate = `exp(slope) - 1`. A 5% monthly rate = 1.8× per year.

## Prophet (production-grade)

```python
from prophet import Prophet
import pandas as pd

df = pd.DataFrame({'ds': dates, 'y': peak_rps})
m = Prophet(
    growth='linear',
    yearly_seasonality=True,
    weekly_seasonality=True,
    changepoint_prior_scale=0.05,
    interval_width=0.95,
)
# Add known business events
m.add_country_holidays(country_name='US')
m.add_seasonality(name='quarterly', period=91.25, fourier_order=8)

m.fit(df)
future = m.make_future_dataframe(periods=120, freq='D')
forecast = m.predict(future)
# yhat (point), yhat_lower / yhat_upper (95% CI)
```

## Confidence Intervals

Always plan to **upper bound** of CI for Tier-1, **point estimate** for Tier-3.
- Tier-1: use 95% upper bound (yhat_upper)
- Tier-2: use 80% upper bound
- Tier-3: use point estimate (yhat)

## Validating the Model

```
Walk-forward back-test:
  - Train on months 1–9, predict month 10 → compare to actual
  - Train on 1–10, predict 11 → compare
  - Train on 1–11, predict 12 → compare
  MAPE (Mean Abs % Error) should be < 15% for usable model
```

## Required Signals to Forecast

| Signal              | Source                  | Granularity |
|---------------------|-------------------------|-------------|
| RPS per service     | LB logs / Prometheus    | per minute  |
| DB connections      | DB stats                | per minute  |
| Storage (GB)        | object store / DB       | per day     |
| Network egress      | flow logs / CDN reports | per hour    |
| Active users        | product analytics       | per day     |
| Transactions        | business DB             | per hour    |

## Re-Forecast Triggers

- Any quarter where actual exceeds upper-bound forecast
- Major product launch / marketing push announced
- Acquisition closed (sudden user influx)
- Significant churn event (sudden user loss)
- New geography launch
- Pricing change > 20%

## Common Mistakes

- Fitting a year of data with no seasonality term
- Using point estimate for Tier-1 sizing (no buffer for upside)
- Ignoring step changes (launch days, sale events)
- Linear fit on exponential growth (under-forecasts by huge margin)
- Forecasting average instead of peak (capacity is sized to peak)
- Single-metric forecast (forecast each resource: CPU, IOPS, network separately)
