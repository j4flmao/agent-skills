# Capacity Planning Models and Math

## Overview

This reference provides comprehensive coverage of mathematical models, statistical methods, and analytical techniques used in capacity planning. It covers time-series forecasting, growth modeling, queuing theory, simulation, and confidence interval computation for infrastructure capacity decisions.

## Time-Series Forecasting Models

### Linear Regression

The simplest and most widely used forecasting model. Appropriate for mature products with stable, predictable growth patterns.

```
Model:       f(t) = a + b*t + epsilon
Parameters:  a = intercept (baseline usage)
             b = slope (growth rate per time period)
             t = time period (weeks, months, quarters)
```

Parameter estimation via Ordinary Least Squares (OLS):
```
b = sum((Ti - T_mean) * (Yi - Y_mean)) / sum((Ti - T_mean)^2)
a = Y_mean - b * T_mean
```

Goodness of fit:
- R-squared > 0.9: strong linear relationship
- R-squared 0.7-0.9: moderate, may need transformation
- R-squared < 0.7: linear model may not be appropriate

Limitations: sensitive to outliers, assumes constant growth rate, does not capture seasonality or trend changes.

### Exponential Growth

Appropriate for high-growth products, viral adoption, or compound growth scenarios.

```
Model:       f(t) = a * e^(r*t)
             or equivalently: f(t) = a * (1 + g)^t
Parameters:  a = initial value
             r = continuous growth rate
             g = periodic growth rate (e.g., 15% per month)
```

Linearization via log transformation:
```
log(f(t)) = log(a) + r*t
```

Apply OLS to the transformed data to estimate parameters.

Doubling time: t_double = ln(2) / r = 70 / (g * 100) (Rule of 70)
Four example: 5% monthly growth doubles in 14 months. 10% doubles in 7 months.

Caveats: exponential models explode quickly. Validate that the business can sustain exponential growth. Apply a ceiling or logistic growth for long-range forecasts.

### Seasonal Models

Appropriate when usage follows predictable seasonal patterns: daily, weekly, monthly, or quarterly cycles.

Additive model: f(t) = trend(t) + seasonality(t) + residual(t)
Multiplicative model: f(t) = trend(t) * seasonality(t) * residual(t)

Use multiplicative when seasonality amplitude grows with the trend. Use additive when amplitude is constant.

Seasonal decomposition (STL - Seasonal and Trend decomposition using Loess):
```
Step 1: Estimate trend using moving average
Step 2: Detrend: series - trend (additive) or series / trend (multiplicative)
Step 3: Average detrended values for each seasonal period
Step 4: Compute residual: original - trend - seasonal
```

For e-commerce: compute weekly seasonality factors for each month of the year. Q4 factors may be 3x-5x baseline. Black Friday week may be 10x.

### ARIMA (Autoregressive Integrated Moving Average)

ARIMA(p,d,q) models capture autocorrelation in time-series data:
- p: autoregressive order (how many lag values predict next value)
- d: differencing order (how many times to difference to achieve stationarity)
- q: moving average order (how many lag forecast errors to include)

Model form (non-seasonal): f(t) = c + phi_1*f(t-1) + ... + phi_p*f(t-p) + theta_1*e(t-1) + ... + theta_q*e(t-q) + e(t)

Auto-ARIMA: Use AIC or BIC to select optimal (p,d,q). Most capacity planning tools (Prophet, statsmodels) include auto-ARIMA.

Seasonal ARIMA (SARIMA): Adds seasonal terms P,D,Q,m where m = seasonal period. Example: SARIMA(1,1,1)(1,1,1,12) for monthly data with annual seasonality.

### Prophet (Facebook/Meta)

Designed for business time-series forecasting with strong seasonal patterns and holiday effects.

Components: f(t) = trend(t) + seasonality(t) + holidays(t) + regressors(t) + error(t)

Key features:
- Automatic changepoint detection (trend changes)
- Multiple seasonality periods (daily, weekly, yearly)
- Holiday effects with user-specified dates
- Uncertainty intervals via Monte Carlo simulation
- Robust to missing data and outliers

Usage in capacity planning:
- Daily/weekly CPU/memory/storage metrics
- Account for holiday traffic drops (Christmas, New Year)
- Detect trend changepoints after product launches

### Growth Curves for Adoption Modeling

Logistic (S-curve): f(t) = K / (1 + e^(-r*(t - t0)))
- K: carrying capacity (maximum adoption)
- r: growth rate
- t0: midpoint of adoption

Gompertz: f(t) = K * e^(-e^(-r*(t - t0)))
- Similar to logistic but asymmetric (slower start, faster saturation)

Bass Diffusion: f(t) = (p + q*(F(t)/m)) * (m - F(t))
- p: innovation coefficient (external influence)
- q: imitation coefficient (word of mouth)
- m: market potential

Use these for forecasting user adoption of new features or platforms. Combined with per-user resource consumption to forecast infrastructure needs.

## Queuing Theory Models

### Single-Server Queue (M/M/1)

Assumptions: Poisson arrival, exponential service time, single server, infinite queue, FIFO discipline.

```
Utilization:     rho = lambda / mu
  lambda = arrival rate (requests/second)
  mu = service rate (requests/second)

Average queue length: Lq = rho^2 / (1 - rho)
Average requests in system: L = rho / (1 - rho)
Average wait time in queue: Wq = rho / (mu * (1 - rho))
Average time in system: W = 1 / (mu * (1 - rho))
P(n requests in system): Pn = (1 - rho) * rho^n
```

Key insight: as utilization approaches 100%, queue length and wait time approach infinity.
- At 50% utilization: Wq = 1/mu (wait equals service time)
- At 80% utilization: Wq = 4/mu (wait is 4x service time)
- At 90% utilization: Wq = 9/mu (wait is 9x service time)
- At 95% utilization: Wq = 19/mu

Capacity planning rule: Keep utilization below 60-70% for latency-sensitive services. Below 80-90% for throughput-oriented batch processing.

### Multi-Server Queue (M/M/c)

For systems with multiple identical servers (load-balanced web servers, database read replicas).

```
rho = lambda / (c * mu)   where c = number of servers

Probability all servers busy (Erlang C):
Pq = ((c*rho)^c / (c! * (1 - rho))) / (sum_{k=0}^{c-1} (c*rho)^k / k! + (c*rho)^c / (c! * (1 - rho)))

Average wait time:
Wq = Pq * (1 / (c*mu - lambda))

Average queue length:
Lq = lambda * Wq
```

Practical application: given request rate, per-server capacity, and latency target, compute minimum number of servers.

Example:
- 1000 requests/second arrival rate
- 200 requests/second per server capacity
- c_min = 1000/200 = 5 servers (rho = 1.0, unstable)
- Target: rho = 0.6 -> c = 1000/(0.6 * 200) = 8.3 -> 9 servers
- At 9 servers: rho = 0.56, wait time close to zero
- At 6 servers: rho = 0.83, significant queuing

### Network Capacity (M/G/1 - Processor Sharing)

For network links and CPU scheduling.

F(service time distribution) can be general, not just exponential.

Mean response time: E[T] = E[S] / (1 - rho)
Mean number in system: E[N] = rho / (1 - rho)

For network links: Queueing delay increases as 1/(1 - utilization). At 50% utilization, delay is 2x base. At 80%, 5x. At 90%, 10x.

### Little's Law

Universal law applicable to any stable system:

L = lambda * W
- L = average number of requests in system
- lambda = average arrival rate
- W = average time in system

Usage: if you know any two of (concurrent connections, throughput, latency), compute the third.

## Confidence Intervals and Forecast Uncertainty

### Prediction Intervals

A point forecast is always wrong. Provide prediction intervals to communicate uncertainty.

For linear regression:
```
Prediction interval at confidence level (1-alpha):
f(t) +- t_(alpha/2, n-2) * s * sqrt(1 + 1/n + (t - t_mean)^2 / sum(t_i - t_mean)^2)

Where:
s = standard error of the regression
```

For 95% prediction interval:
- More data points = narrower intervals
- Forecasts farther from training data = wider intervals
- Higher variance in historical data = wider intervals

### Monte Carlo Simulation for Uncertainty

Generate thousands of possible futures by sampling from distributions:

1. Model parameter distributions: sample from parameter uncertainty distributions
2. Business assumption distributions: sample from growth rate, adoption rate distributions
3. Random noise: add residual noise from historical fit

For each simulation run, compute capacity requirement. The result is a distribution of future capacity needs. Use percentiles for decision-making:
- P50: expected case
- P90: conservative case (used for Tier-1 capacity)
- P99: extreme case (used for safety limits, rarely for procurement)

### Bootstrap Confidence Intervals

Non-parametric method that does not assume normal distribution:

1. Resample historical data with replacement (1000+ iterations)
2. Fit model to each resample
3. Compute forecast for each fit
4. Take percentiles of forecast distribution

Advantages: works with any model, captures non-normal error distributions, easy to implement.

## Growth Rate Analysis

### Compound Monthly Growth Rate (CMGR)

CMGR = (current_value / base_value)^(1/months) - 1

Example: 100 -> 200 over 6 months
CMGR = (200/100)^(1/6) - 1 = 0.122 = 12.2% per month

Project forward: value_at_T = current * (1 + CMGR)^T

Caveats: CMGR assumes constant growth. For high-growth products, growth rate may decay over time (law of large numbers).

### Growth Rate Decay Modeling

Growth rates typically decay as the base grows. Model as:
```
g(t) = g0 * e^(-d*t)
Where:
g0 = initial growth rate
d = decay rate
```

Integrated form:
```
f(t) = f(0) * (1 + g0) * e^((g0/d) * (1 - e^(-d*t)))
```

This is the "S-curve" effect in growth: fast initial growth, slowing as market saturates.

### Event-Driven Growth

For product launches, marketing campaigns, or acquisition migrations:

```
f(t) = base(t) + event_impact * e^(-decay * (t - launch_date))
```

Parameters:
- event_impact: immediate traffic increase at launch
- decay: how quickly the spike fades to baseline
- permanent_impact: retained traffic after spike decays (typically 20-50% of initial spike)

## Resource Composition Models

### CPU Capacity Model

CPU capacity depends on workload characteristics, instruction mix, and concurrency:

```
Effective capacity = core_count * clock_speed * IPC * hyperthread_factor * turbo_factor * workload_efficiency

Where:
- IPC: instructions per cycle (workload dependent, 0.5-3.0)
- hyperthread_factor: 1.2-1.7 (workload dependent)
- turbo_factor: 1.0-1.3 (thermal/power dependent)
- workload_efficiency: 0.7-0.95 (scaling efficiency, lock contention, cache misses)
```

Container overhead: Kubernetes adds 5-10% CPU overhead for kubelet, kube-proxy, container runtime.

### Memory Capacity Model

```
Effective memory = installed - OS_overhead - container_runtime - buffer_cache - page_cache_expected

Per-container overhead:
- OS overhead: 1-2 GB per node
- Container runtime: 0.5-1 GB per node
- Desired buffer cache: 10-20% of total memory
- OOM safety margin: 10-15% (to avoid OOM-killer under load spikes)
```

### Storage Capacity Model

```
Raw storage required = logical_data * replication_factor * (1 + overhead_pct)
Where:
- replication_factor: 3 (HDFS/Ceph), 2 (RAID-10), 1 (EBS gp3 single copy)
- overhead_pct: 20-50% (filesystem overhead, snapshots, compaction headroom, reserved capacity)

Growth-adjusted: storage_at_T = current_storage * (1 + g)^T + base_backup * (1 + retention_months)

Backup storage = logical_data * backup_factor * retention_backups
Where:
- backup_factor: 1 for full backup, 0.1-0.5 for incremental
- retention_backups: number of backup generations retained
```

### Network Capacity Model

```
Bandwidth required = (peak_rps * avg_response_size * (1 + protocol_overhead)) / efficiency

Where:
- protocol_overhead: 10-30% (TCP/IP headers, TLS handshake, retransmissions)
- efficiency: 0.7-0.9 (link utilization target, avoid congestion)

Scale per link:
- Per-server: 1-10 Gbps
- Per-rack: 10-100 Gbps (oversubscription ratio 3:1 to 10:1)
- Per-cluster: 100 Gbps - 10 Tbps (depends on cluster size)
- Internet transit: 1-100 Gbps

Burst allowance: provision for p95 bandwidth with P95-to-mean ratio of 2-5x.
```

## Statistical Techniques for Anomaly Detection

### Seasonal Decomposition Residual Analysis

1. Decompose time-series into trend, seasonal, residual
2. Model residual distribution (mean, standard deviation)
3. Flag points where |residual| > 3*sigma (or other threshold)

Adaptive thresholds: use rolling window (7-day, 30-day) to compute mean and sigma. Update daily.

### Holt-Winters Exponential Smoothing

Triple exponential smoothing with level, trend, and seasonal components:

```
Level:     L_t = alpha * (Y_t - S_{t-m}) + (1-alpha) * (L_{t-1} + b_{t-1})
Trend:     b_t = beta * (L_t - L_{t-1}) + (1-beta) * b_{t-1}
Seasonal:  S_t = gamma * (Y_t - L_t) + (1-gamma) * S_{t-m}
Forecast:  F_{t+h} = L_t + h*b_t + S_{t+h-m}
```

Parameters alpha, beta, gamma in [0,1]. Optimize via minimizing SSE.

Good for automatic detection of level shifts, trend changes, and seasonal pattern breaks.

### Change Point Detection

Detect points where the statistical properties of the series change:

CUSUM (Cumulative Sum): S_n = max(0, S_{n-1} + (X_n - mu_0 - k))
- mu_0: target mean
- k: allowable slack
- When S_n > h (threshold), change detected

Bayesian Change Point: Use P(there is a change point at time t | data). Compute via dynamic programming or MCMC.

Use case: detecting when a service started growing faster (or slower) than the forecast model expected.

## Practical Implementation

### Model Selection Decision Tree

1. Do you have >12 months of historical data?
   - No -> Use top-down modeling from business assumptions
   - Yes -> Continue

2. Is the data stationary (variance constant over time)?
   - No -> Apply differencing or log transformation
   - Yes -> Continue

3. Is there clear seasonality?
   - No -> Use ARIMA or linear/exponential
   - Yes -> Use SARIMA, Prophet, or seasonal decomposition

4. Are there known event dates (launches, campaigns)?
   - No -> Base model is sufficient
   - Yes -> Add event regressors

5. What is the forecast horizon?
   - < 3 months: ARIMA or exponential smoothing
   - 3-12 months: ARIMA with seasonality
   - > 12 months: Prophet or business-driver model

### Model Accuracy Measurement

Mean Absolute Percentage Error (MAPE):
```
MAPE = (100/n) * sum(|actual - forecast| / |actual|)
```
Target: < 10% for short-term, < 20% for long-term. MAPE is undefined when actual is zero.

Mean Absolute Scaled Error (MASE):
```
MASE = sum(|actual - forecast|) / sum(|actual - naive_forecast|)
```
Naive forecast = previous period value. MASE < 1 means model beats naive. Better metric for intermittent series.

Root Mean Squared Error (RMSE):
```
RMSE = sqrt(sum((actual - forecast)^2) / n)
```
In same units as the data. Penalizes large errors more than small errors.

### Implementing Forecast Validation

1. Holdout validation: train on months 1-12, validate on months 13-15
2. Rolling window validation: train on months 1-12, test on month 13; train on 1-13, test on 14; etc.
3. Track error metrics over time. If error increases, model degradation may be occurring.
4. Re-fit model quarterly with latest data.
5. Maintain model versioning for reproducibility.

### Multi-Model Ensemble

Combine multiple models for more robust forecasts:

```
f_ensemble(t) = w1*f1(t) + w2*f2(t) + ... + wn*fn(t)
```

Weight selection:
- Equal weights: simple, works well
- Performance-weighted: wi = 1/MAPE_i, normalized to sum to 1
- Bayesian averaging: weights proportional to model posterior probability

Ensemble forecast intervals: Combine prediction intervals from all models (min, max) or compute weighted variance.

## Decision Framework Under Uncertainty

### Expected Value vs. Robust Decisions

Expected value: Minimize expected cost under all scenarios
- Simple, intuitive, may fail in extreme cases

Robust optimization: Ensure feasibility under worst-case scenario
- More expensive but safer for Tier-1 services

Minimax regret: Select option that minimizes maximum regret across scenarios
- Good balance for medium-criticality decisions

### Capacity Sizing with Risk Tolerance

```
Provisioning target = Forecast_P50 + z * sigma_forecast
Where:
- z = 0 for P50 (expected case, 50th percentile)
- z = 1.28 for P90 (conservative, 90th percentile)
- z = 2.33 for P99 (highly conservative, 99th percentile)
- sigma_forecast = standard deviation of the forecast distribution
```

Tier-1: z = 2.33 (99th percentile)
Tier-2: z = 1.28 (90th percentile)
Tier-3: z = 0 (50th percentile)

### Cost of Uncertainty

Under-provisioning cost = outage_cost * P(capacity < demand) * expected_shortfall
Over-provisioning cost = excess_capacity * unit_cost

Optimal capacity minimizes total cost: total_cost = over_cost + under_cost

Compute optimal safety factor:
```
F^* = (1 / (2*under_cost)) * (over_cost / under_cost)^...
```

In practice: set safety stock (headroom) for Tier-1 services high enough that under-provisioning is extremely unlikely. Accept over-provisioning as the cost of reliability.
