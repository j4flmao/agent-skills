# Classical Forecasting

## Time Series Decomposition
```
import statsmodels.api as sm
dec = sm.tsa.STL(series, period=12, robust=True).fit()
# Components: observed, trend, seasonal, residual
```

Additive: y = T + S + R (constant seasonal amplitude). Multiplicative: y = T * S * R (amplitude grows with trend). Log transform converts multiplicative to additive.

## Stationarity Testing
```
from statsmodels.tsa.stattools import adfuller, kpss

adf_stat, adf_p, _, _, _, _ = adfuller(series)
kpss_stat, kpss_p, _, _ = kpss(series)
```

ADF H0: non-stationary (p<0.05 = stationary). KPSS H0: stationary (p<0.05 = non-stationary). Use both for confirmation. Cases: both stationary (good), both non-stationary (difference once), ADF stationary + KPSS non-stationary (trend stationary — detrend).

## Differencing
```
diff1 = series.diff().dropna()
diff_seasonal = series.diff(12).dropna()  # monthly with yearly seasonality
```

First difference removes linear trend. Seasonal difference removes seasonal pattern. Over-differencing introduces noise.

## ARIMA
```
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf

# Identify p,d,q from ACF/PACF patterns
model = ARIMA(series, order=(p, d, q))
result = model.fit()
print(result.summary())
result.plot_diagnostics()  # residuals, Q-Q, correlogram
```

d = differences applied. p = AR order (PACF cutoff). q = MA order (ACF cutoff). ACF tailing + PACF cutting at p = AR(p). ACF cutting at q + PACF tailing = MA(q). Ljung-Box on residuals: p>0.05 = white noise (good fit). AIC/BIC for model comparison.

## SARIMA
```
from statsmodels.tsa.statespace.sarimax import SARIMAX

model = SARIMAX(series, order=(1,1,1), seasonal_order=(1,1,1,12),
                enforce_stationarity=False, enforce_invertibility=False)
result = model.fit(disp=False)
forecast = result.get_forecast(steps=12)
pred_ci = forecast.conf_int(alpha=0.05)
```

s = periods per season (12 for monthly, 4 for quarterly, 7 for daily-weekly). SARIMA captures seasonal pattern: (P,D,Q,s). D=1 removes seasonal non-stationarity.

## Auto-ARIMA
```
import pmdarima as pm
model = pm.auto_arima(series, seasonal=True, m=12, start_p=0, max_p=5,
    start_q=0, max_q=5, d=None, D=None, trace=True, stepwise=True,
    information_criterion="aic")
```

Stepwise search over p,d,q,P,D,Q. Use seasonal_test=ocsb for seasonal stationarity detection. Set max_order to limit complexity.

## Prophet
```
from prophet import Prophet

df = pd.DataFrame({"ds": dates, "y": values})
model = Prophet(yearly_seasonality=True, weekly_seasonality=True,
    changepoint_prior_scale=0.05, seasonality_prior_scale=10.0)
model.add_country_holidays(country_name="US")
model.fit(df)
future = model.make_future_dataframe(periods=30)
forecast = model.predict(future)
model.plot_components(forecast)  # trend, weekly, yearly
```

Changepoints: trend slope changes. Lower changepoint_prior_scale (0.001-0.05) = less flexible trend. Seasonality via Fourier series — fourier_order controls flexibility. Handles missing data and outliers naturally.

## Fourier Features
```
def add_fourier_features(df, period, order, col_name):
    for i in range(1, order+1):
        df[f"{col_name}_sin_{i}"] = np.sin(2*np.pi*df["t"]*i/period)
        df[f"{col_name}_cos_{i}"] = np.cos(2*np.pi*df["t"]*i/period)
    return df
```

Order 3-5 for weekly, 5-10 for yearly seasonality. Works with any model (linear regression, gradient boosting).

## Changepoint Detection
```
import ruptures as rpt
algo = rpt.Pelt(model="rbf").fit(series.values)
changepoints = algo.predict(penalty=10)
```

PELT: optimal detection with penalty for number of changepoints. Binary segmentation: fast approximate method.

## Best Practices
- Always visualize: plot series, ACF, PACF, decomposition before modeling.
- Hold out last 10-20% as test set before analysis.
- Transform: Box-Cox for variance stabilization, log for multiplicative patterns.
- Baseline: naive (y_{t-1}), seasonal naive (y_{t-s}), drift (linear extrapolation).
- Ensemble: combination of classical + ML often beats single model.
