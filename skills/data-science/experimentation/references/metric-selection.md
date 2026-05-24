# Metric Selection Reference

## Metric Taxonomy

### North Star Metrics
Single metric that captures the core value the product delivers. Drives long-term growth.

```yaml
Examples:
  Airbnb:      Nights booked
  Spotify:     Time spent listening
  Facebook:    Daily active users
  Uber:        Rides completed per week
  Slack:       Messages sent
  E-commerce:  Gross Merchandise Value (GMV)

Criteria:
  - Leading indicator of long-term value
  - Actionable (team can influence)
  - Understandable (everyone gets it)
  - Measurable with low latency
  - Resistant to gaming
```

### Success Metrics (Primary)
Metrics directly tied to the experiment hypothesis. The main decision metric.

```yaml
Criteria:
  - Sensitive to the specific change being tested
  - Aligned with the north star
  - Reliable (low variance, stable measurement)
  - Measurable within experiment duration

Examples:
  Feature adoption:   Click-through rate, feature activation rate
  Engagement:         Sessions per user, time per session
  Revenue:            Revenue per user, conversion to paid
  Retention:          D7 retention rate, churn probability
```

### Guardrail Metrics
Metrics that should NOT regress. Monitor for negative side effects.

```yaml
Categories:
  Performance:
    - P50/P95/P99 page load time
    - API latency
    - Error rate
    - Crash rate

  User Experience:
    - Bounce rate
    - Customer support tickets
    - Unsubscribe rate
    - Negative feedback

  Business Health:
    - Revenue (guardrail against revenue loss)
    - Active users (guardrail against churn)
    - Cost metrics

  Trust & Safety:
    - Spam reports
    - Fraud rate
    - Policy violation rate
```

```python
def guardrail_check(treatment, control, metrics, alpha=0.05):
    """Check all guardrail metrics for significant degradation."""
    violations = []
    for metric in metrics:
        _, p = stats.ttest_ind(treatment[metric], control[metric])
        mean_diff = np.mean(treatment[metric]) - np.mean(control[metric])
        if p < alpha and mean_diff > 0:  # Significant increase is bad
            violations.append({"metric": metric, "p": p, "diff": mean_diff})
    return {"violations": violations, "pass": len(violations) == 0}
```

### Proxy Metrics
Measurable metrics that correlate with a hard-to-measure long-term outcome.

```yaml
Goal: Increase customer lifetime value (LTV)
Proxy metrics:
  - D7 retention (strongly correlated with LTV)
  - Purchase frequency in first 30 days
  - Feature adoption count
  - Net Promoter Score

Validation:
  - Historical correlation ≥ 0.5 with target
  - Causal link (proxy is on the causal path)
  - Short measurement window
  - High sensitivity (detects changes quickly)
```

### Diagnostic Metrics
Help understand WHY a success metric changed. Not for decision-making.

```yaml
Types:
  Engagement decomposition:
    - Unique visitors per day
    - Sessions per visitor
    - Actions per session

  Funnel metrics:
    - Impressions → clicks → conversions
    - Page load → interaction → purchase

  Segment breakdowns:
    - New vs returning users
    - Mobile vs desktop
    - Geographic regions
    - Traffic source

  User journey:
    - Time to first key action
    - Drop-off points in flow
```

## Metric Sensitivity

### Sensitivity Definition
Ability to detect a given effect size with reasonable sample size.

```python
def metric_sensitivity(baseline_mean, baseline_std, mde_pct, alpha=0.05, power=0.8):
    """Sample size needed to detect MDE for a continuous metric."""
    mde_absolute = baseline_mean * mde_pct
    effect_size = mde_absolute / baseline_std
    z_alpha = stats.norm.ppf(1 - alpha/2)
    z_beta = stats.norm.ppf(power)
    n = 2 * (z_alpha + z_beta)**2 / effect_size**2
    return {"n": n, "effect_size": effect_size}
```

### Improving Sensitivity
- Reduce metric variance (CUPED, stratification)
- Increase metric scale (sum over longer window)
- Winsorize/trim extreme values
- Use ratio metrics carefully (can increase or decrease variance)
- Segment analysis for heterogeneous effects
- Transform metric (log, Box-Cox)

### Sensitivity Trade-offs
```
Lower variance → Higher sensitivity → Smaller samples needed
But:
  - Winsorization biases effect estimates
  - Aggregation masks heterogeneity
  - Log transforms change interpretation
```

## Ratio Metrics

### Common Ratio Metrics
```yaml
Revenue per user:         total_revenue / total_users
Click-through rate:       total_clicks / total_impressions
Conversion rate:          total_conversions / total_visitors
ARPU:                     total_revenue / total_active_users
Average order value:      total_revenue / total_orders
```

### Statistical Testing
Use delta method for ratio metrics (numerator and denominator correlated).

```python
def delta_method_ci(numerator_t, denominator_t, numerator_c, denominator_c):
    cov_t = np.cov(numerator_t, denominator_t, ddof=1)
    cov_c = np.cov(numerator_c, denominator_c, ddof=1)
    mean_nt, mean_nc = np.mean(numerator_t), np.mean(numerator_c)
    mean_dt, mean_dc = np.mean(denominator_t), np.mean(denominator_c)
    ratio_t = mean_nt / mean_dt
    ratio_c = mean_nc / mean_dc
    # Delta method variance
    var_t = (1/mean_dt**2)*cov_t[0,0] + (mean_nt**2/mean_dt**4)*cov_t[1,1] - 2*(mean_nt/mean_dt**3)*cov_t[0,1]
    var_c = (1/mean_dc**2)*cov_c[0,0] + (mean_nc**2/mean_dc**4)*cov_c[1,1] - 2*(mean_nc/mean_dc**3)*cov_c[0,1]
    se = np.sqrt(var_t/len(numerator_t) + var_c/len(numerator_c))
    diff = ratio_t - ratio_c
    return diff - 1.96*se, diff + 1.96*se
```

## Metric Design Principles

### Good Metrics Are
```
Sensitive:     Detects real changes with feasible sample sizes
Timely:        Measurable within experiment duration
Reliable:      Low measurement noise, high test-retest correlation
Actionable:    Team can directly influence through product changes
Resistant:     Hard to game or artificially inflate
Interpretable: Stakeholders understand what it means
Complete:      Captures the full user experience, not a narrow slice
```

### Metric Design Template
```yaml
metric:
  name: "D7 Retention Rate"
  definition: >
    Proportion of users who return to the product within 7 days
    of their first visit
  numerator: >
    COUNT(DISTINCT user_id) WHERE event = 'active'
    AND days_since_first_visit >= 6 AND days_since_first_visit <= 8
  denominator: >
    COUNT(DISTINCT user_id) WHERE first_visit_date IN (date - 7 days)
  aggregation: proportion
  sensitivity: "0.5pp change detectable with 50k users per variant"
  caveats:
    - Doesn't measure usage depth (1 second counts as retained)
    - App install attribution delay may bias
    - Weekday vs weekend effects for first visit
```

## Metric Evaluation Framework

### Segmented Analysis
```python
def segment_analysis(data, segments, metric):
    """Analyze metric by segment to check consistency."""
    results = {}
    for segment, mask in segments.items():
        seg_data = data[mask]
        if len(seg_data) < 100:
            continue
        trt = seg_data[seg_data["variant"] == "treatment"][metric]
        ctrl = seg_data[seg_data["variant"] == "control"][metric]
        _, p = stats.ttest_ind(trt, ctrl)
        results[segment] = {
            "lift": np.mean(trt) / np.mean(ctrl) - 1,
            "p": p, "n_treatment": len(trt), "n_control": len(ctrl)
        }
    return results
```

### Metric Sensitivity Analysis
```python
def sensitivity_simulation(baseline, n_per_variant, effect_sizes, metric_type="proportion"):
    """Calculate power across range of effect sizes."""
    from scipy.stats import norm
    results = []
    for effect in effect_sizes:
        if metric_type == "proportion":
            p1 = baseline
            p2 = baseline * (1 + effect)
            se = np.sqrt(2 * ((p1+p2)/2) * (1 - (p1+p2)/2) / n_per_variant)
            z = (p2 - p1) / se
        else:
            z = effect * np.sqrt(n_per_variant / 2)  # Assumes known variance
        power = 1 - norm.cdf(1.96 - z) + norm.cdf(-1.96 - z)
        results.append({"effect": effect, "power": power})
    return results
```

## Metric Health Monitoring

### Tracking Over Time
```
Things to watch:
  - Metric drift (gradual change over time)
  - Day-of-week patterns
  - Seasonality (holidays, events)
  - System changes (app updates, infrastructure)
  - Data pipeline changes

Tools:
  - Time series dashboard with expected range
  - Anomaly detection alerts
  - Weekly metric health report
  - Data quality checks on metric pipeline
```

### Metric Deprecation
Remove metrics that:
- Never move (insensitive to all changes)
- Always move the same direction (not independent)
- Are replaced by better proxies
- Correlate too highly with other metrics (.99+)
- Cost too much to compute
