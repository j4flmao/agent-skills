# Time Series Advanced: Global Models, Hierarchies, Probabilistic Forecasts, and Foundation Models

Techniques for forecasting at scale and under uncertainty: global models across many series, hierarchical reconciliation, probabilistic and quantile forecasting, conformal prediction intervals, pretrained time series foundation models, and production monitoring. Fundamentals (baselines, backtesting, metrics) are in `time-series-fundamentals.md`.

## Local vs Global Models

| Approach | Description | Strengths | Weaknesses |
|----------|-------------|-----------|-----------|
| Local | One model per series (ARIMA, ETS per SKU) | Interpretable, captures series-specific patterns | Weak for short/new series, many models to manage |
| Global | One model trained on many series (gradient boosting, N-BEATS/N-HiTS, TFT, DeepAR) | Shares patterns, handles cold starts with covariates, scales | Needs feature engineering and normalization; can underfit idiosyncratic series |

Global gradient-boosted models with lag/calendar features are strong, practical baselines for large retail/demand datasets.

```python
import lightgbm as lgb
from mlforecast import MLForecast
from mlforecast.lag_transforms import RollingMean

mlf = MLForecast(
    models=[lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, objective="tweedie")],
    freq="D",
    lags=[7, 14, 28],
    lag_transforms={7: [RollingMean(window_size=7)], 28: [RollingMean(window_size=28)]},
    date_features=["dayofweek", "month"],
)
mlf.fit(train_df, static_features=["store_type"])   # columns: unique_id, ds, y, exogenous...
preds = mlf.predict(h=28, X_df=future_exog)
```

- Tweedie or Poisson objectives suit non-negative, zero-inflated demand.
- Normalize targets per series (scaling by series mean) when magnitudes vary widely.
- Recursive multi-step forecasting compounds error; direct strategies (one model per horizon) or horizon-aware models avoid this at higher cost.

## Hierarchical and Grouped Forecasting

Forecasts often must be coherent across aggregation levels (SKU → category → total; store → region → country).

| Method | Idea |
|--------|------|
| Bottom-up | Forecast leaves, sum upward; noisy at the bottom |
| Top-down | Forecast total, split by historical or forecast proportions |
| Middle-out | Forecast a middle level, aggregate up and split down |
| Optimal reconciliation (MinT) | Forecast all levels independently, then reconcile using an estimate of the forecast error covariance |

```python
from hierarchicalforecast.core import HierarchicalReconciliation
from hierarchicalforecast.methods import BottomUp, MinTrace

hrec = HierarchicalReconciliation(reconcilers=[BottomUp(), MinTrace(method="mint_shrink")])
reconciled = hrec.reconcile(Y_hat_df=base_forecasts, Y_df=fitted_insample, S=S_df, tags=tags)
```

MinT-style reconciliation frequently improves accuracy at all levels compared with any single-level approach; validate on backtests for your hierarchy.

## Probabilistic Forecasting

Decisions (inventory, staffing, capacity) depend on uncertainty, not just point forecasts.

| Approach | Examples |
|----------|---------|
| Parametric distributions | DeepAR (negative binomial, Student-t outputs), ETS/ARIMA prediction intervals |
| Quantile regression | LightGBM `objective="quantile"`, quantile heads in neural models (TFT, MQ-CNN) |
| Sample paths | Monte Carlo simulation from fitted models for path-dependent decisions |
| Conformal prediction | Distribution-free intervals calibrated on backtest residuals |

```python
quantile_models = {
    q: lgb.LGBMRegressor(objective="quantile", alpha=q, n_estimators=500)
    for q in (0.1, 0.5, 0.9)
}
```

Evaluate with pinball loss per quantile and interval **coverage** (share of actuals inside the 80% interval should be close to 80%) plus interval width.

### Conformal Intervals for Time Series

Split/rolling conformal methods use residuals from rolling backtests to build intervals with approximate coverage guarantees, adapting over time (e.g. adaptive conformal inference) when the series is non-stationary.

```python
from statsforecast.utils import ConformalIntervals

sf = StatsForecast(models=[AutoETS(season_length=7)], freq="D")
fc = sf.forecast(df=train, h=28, level=[80, 95],
                 prediction_intervals=ConformalIntervals(h=28, n_windows=5))
```

Coverage guarantees assume exchangeability, which time series violate; treat conformal intervals as well-calibrated approximations and monitor realized coverage.

## Foundation Models for Time Series

Pretrained models forecast new series zero-shot or with light fine-tuning:

| Model family | Provider | Notes |
|--------------|----------|------|
| Chronos / Chronos-Bolt | Amazon | Tokenizes scaled values; probabilistic outputs |
| TimesFM | Google Research | Decoder-only, patch-based |
| Moirai | Salesforce | Any-variate, multiple frequencies |
| Lag-Llama, TimeGPT (API), others | Various | Varying licenses and access models |

```python
import torch
from chronos import BaseChronosPipeline

pipeline = BaseChronosPipeline.from_pretrained("amazon/chronos-bolt-small", device_map="cpu", dtype=torch.float32)
quantiles, mean = pipeline.predict_quantiles(context=torch.tensor(history), prediction_length=28,
                                             quantile_levels=[0.1, 0.5, 0.9])
```

Guidance:
- Benchmark against seasonal naive, ETS, and a tuned global GBM on your own rolling backtests; zero-shot performance varies widely by domain.
- They are most attractive for many short or new series and for quick baselines.
- Check licenses, model size and inference cost, and whether exogenous covariates are supported (support is limited or model-specific).
- API names change between package releases; pin versions.

## Exogenous Variables and Scenarios

- Separate **known-future** covariates (calendar, planned promotions, prices) from **unknown-future** ones (weather, competitor actions) that themselves need forecasts.
- Scenario forecasting: rerun with alternative covariate paths (price A vs B) to support decisions; validate that the model actually responds causally plausibly (elasticities), otherwise treat it as correlation only.

## Anomalies and Regime Changes

- Clean training targets of one-off anomalies or model them with flags; do not let a single outage distort seasonality estimates.
- Detect regime changes with change-point methods and retrain or reweight recent data.
- Forecast reconciliation with human overrides: log overrides and measure their value (forecast value added) against the statistical forecast.

## Production Monitoring

| Monitor | Purpose |
|---------|---------|
| Rolling WAPE/MASE vs baseline | Detect degradation |
| Bias over recent windows | Systematic drift |
| Interval coverage | Calibration of uncertainty |
| Input freshness and completeness | Data pipeline health |
| Share of series with fallback forecasts | Robustness |

Retrain on a schedule aligned with data drift (weekly/monthly) and on triggers (bias beyond threshold); keep a fallback (seasonal naive or last good model) for series where the main model fails.

## Pitfalls

- Global models leaking future information through target encoding or normalization computed on the full series.
- Reconciling with methods that assume unbiased base forecasts when they are biased.
- Reporting only point accuracy for decisions that depend on tails.
- Adopting foundation models without domain backtests.

## Checklist

- [ ] Local vs global approach chosen via backtests against baselines
- [ ] Hierarchy coherence handled with reconciliation where required
- [ ] Probabilistic forecasts evaluated with pinball loss and coverage
- [ ] Conformal or model-based intervals monitored for realized coverage
- [ ] Foundation models benchmarked, versions pinned, licenses checked
- [ ] Monitoring of accuracy, bias, coverage, and fallbacks in production
