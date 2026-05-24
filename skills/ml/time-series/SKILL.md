---
name: ml-time-series
description: >
  Use this skill when forecasting time series data, modeling trend/seasonality, applying ARIMA/SARIMA/Prophet/LSTM/TFT, or performing temporal cross-validation.
  This skill enforces: decomposition analysis (trend/seasonality/residual), stationarity testing, model selection by data characteristics, temporal cross-validation, forecast evaluation with MASE/sMAPE.
  Do NOT use for: generic regression on non-temporal data, anomaly detection in time series (use ml-anomaly-detection), causal inference with time series, or real-time streaming (use data-streaming skill).
version: "1.0.0"
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

## Agent Protocol

### Trigger
User request includes: time series, forecasting, Prophet, ARIMA, SARIMA, LSTM, TFT, Temporal Fusion Transformer, seasonality, trend, stationarity, differencing, autocorrelation, ACF, PACF, forecast horizon, backtesting, walk-forward validation.

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
Frequency: {hourly/daily/weekly/monthly/quarterly}
Length: {N} | Seasonality: {daily/weekly/yearly}
Trend: {linear/nonlinear/none} | Stationary: {true/false}

### Model Selection
Primary: {ARIMA/SARIMA/Prophet/LSTM/TFT/Ensemble}
Parameters: {p,d,q,P,D,Q,s} or {config}
Baseline: {naive/seasonal_naive/mean}

### Feature Engineering
Lags: [{1, 7, 14, 28}] | Window: [{7, 30}]
Calendar: {day_of_week/month/quarter/holiday}
Exogenous: [{regressor1, regressor2}]

### Evaluation
CV: {expanding/sliding} | Gap: {N}
Metrics: {MASE / sMAPE / RMSE / Pinball Loss}

### Forecast
Horizon: {N steps} | Interval: {80% / 95%}
Output: {point / quantile / distributional}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Time series characteristics documented: frequency, length, seasonality, trend.
- [ ] Stationarity test performed (ADF + KPSS) and differencing applied if needed.
- [ ] Model selected based on data characteristics and forecast horizon.
- [ ] Features engineered including lags, windows, and calendar features.
- [ ] Temporal cross-validation configured respecting time order with gap.
- [ ] Baseline model established for comparison (naive, seasonal naive).
- [ ] Forecast generated with prediction intervals.
- [ ] Residuals validated (white noise, no autocorrelation).

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Exploratory Analysis
Plot the series: identify level, trend, seasonal pattern, cyclical behavior, and residuals. Use STL decomposition (robust = True for outlier-resistant) to separate components. Check for missing values — handle via interpolation (linear for short gaps) or forward fill. Detect outliers and decide whether to treat (cap, winsorize) or leave for model to handle. Analyze autocorrelation (ACF): identify MA terms (cutoff point) and seasonality (spikes at seasonal lags). Analyze partial autocorrelation (PACF): identify AR terms (cutoff point). Test stationarity with Augmented Dickey-Fuller test: H0 = non-stationary. If p > 0.05, series is non-stationary → apply differencing. Complement with KPSS test: H0 = stationary. Both tests together confirm: one stationary, both non-stationary, trend-stationary, or difference stationary.

### Step 2: Model Selection
ARIMA: for univariate series without strong seasonality, 100-1000 observations. Parameters identified from ACF/PACF patterns. SARIMA: for series with clear seasonal pattern, minimum 2 full seasonal cycles needed. Prophet: for series with multiple seasonalities (daily + weekly + yearly), holiday effects, trend changepoints, missing data. Robust to outliers and missing dates. No stationarity requirement. LSTM: for long sequences (>10000 steps) with complex non-linear patterns. Requires sufficient data. Feature engineering critical. TFT: for interpretable deep learning with attention, variable selection, quantile outputs. Best for multi-series forecasting with exogenous features. Gradient boosting (LightGBM/XGBoost): best for tabular time series with rich features, static metadata, and multiple series. Create features from lags, windows, calendar. Ensembles: average of classical + ML models often beats any single model. Use simple average or stack with meta-learner.

### Step 3: Feature Engineering
Lags: y_{t-1}, y_{t-2}, ..., y_{t-season} for autoregressive behavior. Include critical seasonal lags (t-7 for daily data, t-12 for monthly). Rolling statistics: mean, std, min, max, slope, and quantiles over windows of various sizes (7, 14, 30, 90). Calendar features: day of week (0-6), month (1-12), quarter (1-4), day of year, week of year, weekend flag, hour of day. Holiday indicators: binary flags for known holidays plus N days before/after for pre/post effects. Fourier terms: sin/cos pairs at seasonal periods for capturing smooth seasonality. Order 1-3 for weekly, 3-10 for yearly. Exogenous regressors: promotions, pricing, weather, economic indicators, web traffic. Target encoding: mean encoding of target by category for categorical features. Time since event: days since last promotion, last holiday, last changepoint. Difference features: y_t - y_{t-1} (momentum), y_t - y_{t-season} (year-over-year change).

### Step 4: Temporal Cross-Validation
Expanding window: train on all past data, test on next block. Increasing training size, constant test size. Best for short series. Sliding window: fixed training window size, slides forward. Best for long series where old data may be irrelevant. Gap: introduce gap between train and test to prevent autocorrelation leakage from recent observations. Minimum gap = 0 for daily, 7 for weekly data. Number of folds: 5-10 depending on series length. Minimum training size: at least 2x seasonal period. Purge: remove overlapping observations between train and test sets for clean evaluation.

### Step 5: Evaluation Metrics
MASE (Mean Absolute Scaled Error): scale-independent, compares to naive forecast (random walk). MASE < 1 means model beats naive. Best for comparing across different time series. sMAPE (symmetric MAPE): relative error, bounded [0%, 200%]. Easier to interpret than MAPE. Undefined when actual = 0 but handles by adding epsilon. RMSE: same-scale metric, sensitive to large errors. Good for financial applications where large errors have quadratic cost. Pinball loss: asymmetric loss for quantile forecasts. Higher penalty on one side depending on quantile. CRPS (Continuous Ranked Probability Score): evaluates full predictive distribution. Proper scoring rule — cannot be cheated. Compare against naive, seasonal naive, and historical mean baselines. If model doesn't beat naive, it is not useful.

### Step 6: Prediction Intervals
ARIMA/SARIMA: built-in normal-based confidence intervals. Assumes normally distributed residuals — check residual normality. Prophet: uncertainty from trend (future changepoints) and seasonality (seasonal uncertainty via MCMC sampling). Wider intervals for longer horizons. LSTM: quantile regression with pinball loss for each percentile. Train separate model per quantile or use simultaneous quantile output. TFT: built-in quantile output — no extra work. Conformal prediction: distribution-free prediction intervals with finite-sample coverage guarantee. Works with any model, any forecast. Ensembles: variance across ensemble members as uncertainty proxy. Bayesian methods: Monte Carlo dropout for NNs, Gaussian processes for non-parametric uncertainty.

### Integration with Forecasting Pipeline
Integrate forecasting with feature store for real-time feature computation.
Schedule model retraining on cadence matching data frequency (daily for daily data, weekly for weekly data).
Monitor forecast accuracy drift over time — if MASE increases >20%, trigger retraining.
Store forecast results with prediction intervals for downstream consumption.
Implement backtesting pipeline that replays historical predictions against actuals.
Combine point forecasts with uncertainty for decision-support systems.
Automate model selection: run auto-ARIMA + Prophet + LightGBM, pick best based on validation MASE.

### Step 7: Residual Diagnostics
Check residuals: they should be white noise (no autocorrelation, zero mean, constant variance). Ljung-Box test: H0 = residuals are independently distributed. p > 0.05 = good (no remaining autocorrelation). ACF of residuals: no significant spikes at any lag (especially seasonal lags). If spikes remain → model is missing structure. Residual distribution: should be approximately normal (check Q-Q plot, histogram). Non-normal residuals mean prediction intervals may be inaccurate. Residual vs fitted plot: no pattern (funnel, curve) indicates good fit. If pattern exists → model is misspecified. Deseasonalize residuals: check if seasonal pattern remains — indicates missing seasonal terms.

### Common Pitfalls
Using standard k-fold CV on time series — always use temporal CV with expanding or sliding window.
Failing to test stationarity before fitting ARIMA — non-stationary data invalidates ARIMA assumptions.
Over-differencing — applying too many differences removes signal, adds noise.
Including future information in lag features — data leakage inflates performance metrics.
Setting minimum training size too small — need at least 2x the seasonal period.
Ignoring multiple seasonalities — daily data has both weekly and yearly patterns.
Using RMSE alone without scale-independent metrics like MASE — can't compare across series.
Not evaluating on multiple forecast horizons — model good at 1-step but poor at 12-step.

## Rules
- Never use standard k-fold CV on time series — always use temporal CV.
- Always test stationarity (ADF + KPSS) before fitting ARIMA/SARIMA.
- ACF tailing off + PACF cutting off at lag p AR(p). ACF cutting off at lag q + PACF tailing MA(q).
- MASE is the preferred metric for comparing across different time series.
- Prophet handles missing dates and outliers better than SARIMA.
- Feature engineering matters more than model choice for time series — invest in features first.
- Never include future information in training features (data leakage).
- Set minimum training size >= 2x seasonal period for reliable estimation.
- Backtest against a naive baseline — if you can't beat naive, the model is useless.
- Evaluate on multiple forecast horizons, not just the first step ahead.
- Always plot residuals after fitting — statistical tests can miss patterns the eye sees.
- Feature lag order should match seasonality: lags 1, 7, 14 for daily data; 1, 12 for monthly.
- For hierarchical time series, use reconciliation methods (bottom-up, top-down, optimal).

### Production Monitoring
Track forecast error (MASE, sMAPE) over time — alert if error increases beyond acceptable threshold.
Monitor residual autocorrelation — if Ljung-Box test becomes significant, model is missing structure.
Track prediction interval coverage — if actuals fall outside intervals more than expected, recalibrate.
Detect concept drift in time series — distribution of residuals should remain stable over time.
Monitor forecast bias — systematic over- or under-prediction indicates model degradation.
Set up retraining triggers: error threshold breach, residual autocorrelation, seasonal pattern changes.
Log forecast metadata: model parameters, feature values, prediction intervals, actuals when available.

### Troubleshooting Guide
Model consistently underpredicting → check for trend changes, add changepoint detection, retrain with recent data.
Residuals show autocorrelation at seasonal lags → add missing seasonal component, increase Fourier order.
Prophet forecast too flat → increase changepoint_prior_scale, check for missing changepoints.
LSTM training loss not decreasing → reduce learning rate, check sequence length, normalize features.
Forecast errors increase at longer horizons → expected but if excessive, model may be overfitted to short horizon.
SARIMA fitting taking too long → reduce p,d,q,P,D,Q ranges, use stepwise auto-ARIMA, speed up with approximation.
Multiple seasonalities not captured → use Prophet or add Fourier features for each seasonal period.
Missing dates causing model errors → Prophet handles missing dates natively; for SARIMA interpolate first.

### Deployment Checklist
Set minimum training size: at least 2x full seasonal cycle for SARIMA, 10K steps for LSTM.
Validate against naive and seasonal naive baselines before deployment.
Store model parameters and training end date for traceability.
Implement backtesting pipeline that replays historical performance before each deploy.
Set prediction interval confidence level based on business risk tolerance.
Document forecast horizon assumptions and expected accuracy degradation over time.
Pin random seed for reproducibility of forecasting runs.
Version the training data by date range to enable exact reproduction.

## References
- references/classical-forecasting.md — Decomposition, stationarity, ARIMA/SARIMA, auto-ARIMA, Prophet, Fourier terms, holidays, changepoints
- references/deep-learning-ts.md — LSTM, TFT, attention, feature engineering, temporal CV, backtesting, metrics
- references/forecast-deep-learning.md — TFT, N-BEATS, DeepAR, Informer, data preparation, multi-horizon forecasting, backtesting for DL models
- references/time-series-feature-store.md — tsfresh extraction, Feast integration, point-in-time correctness, online serving, feature freshness monitoring

### Edge Cases and Special Patterns
Intermittent demand (sporadic sales): use Croston's method, TSB (Teunter-Syntetos-Babai), or ADIDA.
Count data (integer values): use Poisson or negative binomial models, or round forecasts after prediction.
Multiple seasonalities (hourly + daily + weekly): use Prophet, Fourier features at each period, or TFT.
Hierarchical forecasts (geo, product hierarchy): use reconciliation (bottom-up, top-down, optimal combination).
Long-range dependence: use ARFIMA or fractional differencing for slowly decaying autocorrelation.
Regime changes (sudden shifts): use regime-switching models, Prophet with changepoint detection, or sliding window.
Zero-inflated series (many periods with zero demand): use two-stage model (occurrence + magnitude) or hurdle models.

### Framework Integration
Statsmodels: ARIMA, SARIMA, VAR, ExponentialSmoothing, STL decomposition, ACF/PACF plotting.
Prophet: additive model with changepoints, holidays, seasonality; handles missing data natively.
sktime: unified API for forecasting, time series classification, regression, and decomposition.
PyTorch Forecasting: TemporalFusionTransformer, NBeats, DeepAR with PyTorch Lightning integration.
Darts: simple API for ARIMA, Prophet, N-Beats, TFT, BlockRNN with backtesting and gridsearch.
NeuralProphet: hybrid of Prophet and PyTorch for deep learning forecasting with changepoints.
GluonTS: deep learning toolkit for time series with multiple probabilistic models.

### Advanced Forecasting Tips
For hierarchical time series (product categories -> products -> SKUs), use reconciliation methods to ensure forecast consistency.
Use ensemble stacking: train meta-model on predictions from ARIMA + Prophet + LSTM for improved accuracy.
Implement direct multi-step forecasting (separate model per horizon) instead of recursive for long horizons.
For intermittent demand (sporadic sales), use Croston's method or TSB (Teunter-Syntetos-Babai) method.
Use Fourier features to encode multiple seasonalities for any model (linear regression, gradient boosting).
For very long time series, use random sampling of time windows for training instead of full sequence.
Implement prediction interval evaluation using pinball loss at multiple quantiles.
For causal forecasting (what-if scenarios), use structural time series models or difference-in-differences.

## Handoff
Hand off to ml-feature-engineering for advanced feature creation. For anomaly detection on residuals, hand off to ml-anomaly-detection.
