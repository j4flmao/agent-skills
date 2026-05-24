# Experimentation Platform Architecture Reference

## Architecture Overview

```
User Request → Feature Flag System → Traffic Allocation → Assignment
                                                              ↓
User Event → Event Pipeline → Metric Computation → Statistical Engine → Results → Decision
   ↑              ↑                    ↑                    ↑
Data Sources    Processing           Aggregation          Analysis
```

### Core Components
1. Feature Flag System: runtime configuration, variant assignment
2. Traffic Allocation: percentage-based or targeted rollout
3. Assignment Log: record who got what variant
4. Event Pipeline: collect user interactions
5. Metric Computation: aggregate events into metrics
6. Statistical Engine: analyze metrics, compute significance
7. Results Delivery: dashboards, API, alerts

## Feature Flagging

### Requirements
```yaml
- Runtime evaluation (no deploy needed to change flag state)
- Consistent assignment (same user → same variant every time)
- Gradual rollout (percentage-based traffic allocation)
- Targeting rules (country, device, user segment)
- Kill switch (immediately disable for all users)
- Auditing (who changed what, when)
- A/A test validation mode
```

### Flag Evaluation Flow
```python
class FeatureFlag:
    def __init__(self, flag_key, variants, assignment_func=None):
        self.flag_key = flag_key
        self.variants = variants  # {"control": 0.5, "treatment": 0.5}
        self.assignment_func = assignment_func or self.default_assign

    def default_assign(self, user_id):
        hash_val = int(hashlib.md5(f"{self.flag_key}:{user_id}".encode()).hexdigest(), 16)
        normalized = hash_val / 2**128
        cumulative = 0
        for variant, weight in self.variants.items():
            cumulative += weight
            if normalized < cumulative:
                return variant
        return list(self.variants.keys())[-1]

    def evaluate(self, context):
        """Evaluate flag for a given context (user, device, etc.)."""
        if not self.enabled:
            return {"variant": "off", "reason": "flag_disabled"}
        if self.kill_switch:
            return {"variant": "control", "reason": "kill_switch"}
        # Check targeting rules
        if self.targeting_rules and not all(
            rule.match(context) for rule in self.targeting_rules
        ):
            return {"variant": "control", "reason": "targeting_mismatch"}
        # Sample rate check
        user_id = context.get("user_id")
        variant = self.assignment_func(user_id)
        return {"variant": variant, "reason": "assigned"}
```

## Traffic Allocation

### Percentage-Based
```python
def allocate_traffic(experiment_id, traffic_pct=0.10, split={"control": 0.5, "treatment": 0.5}):
    """Allocate traffic_pct of users to experiment, split between variants."""
    return {
        "experiment_traffic": traffic_pct,
        "control": traffic_pct * split.get("control", 0.5),
        "treatment": traffic_pct * split.get("treatment", 0.5),
        "holdout": 1 - traffic_pct
    }
```

### Ramp Plan
```yaml
ramp:
  phase_1: 1% traffic for 24h           # Safety check
  phase_2: 5% traffic for 48h           # Early signal
  phase_3: 25% traffic for 48h          # Medium signal
  phase_4: 50% traffic for remaining    # Full power
  ramp_duration: 5-7 days total

cooldown:
  between_ramp_steps: 24h minimum
  allows for novelty effect to stabilize
  guardrail metrics must pass at each step
```

### Traffic Allocation Algorithm
```python
def allocate_variant(user_id, experiment_config):
    hash_input = f"{experiment_config['experiment_id']}:{user_id}"
    hash_val = int(hashlib.md5(hash_input.encode()).hexdigest(), 16) / 2**128
    experiment_traffic = experiment_config["traffic_pct"]
    if hash_val >= experiment_traffic:
        return None  # Not in experiment
    # Among experiment population
    adjusted_hash = hash_val / experiment_traffic
    cumulative = 0
    for variant, split in experiment_config["splits"].items():
        cumulative += split
        if adjusted_hash < cumulative:
            return variant
    return list(experiment_config["splits"].keys())[-1]
```

## Metric Computation Pipeline

### Event Collection
```python
# Schema for experiment events
experiment_event = {
    "user_id": "string",
    "experiment_id": "string",
    "variant": "string",      # control / treatment
    "event_type": "string",   # impression / click / conversion / revenue
    "event_value": "float",   # Optional metric value
    "event_timestamp": "datetime",
    "context": {
        "device": "mobile",
        "country": "US",
        "session_id": "..."
    }
}

# Deduplication
def deduplicate_events(events, idempotency_key="user_id:experiment_id:event_type:session"):
    """Remove duplicate events from retries or reprocessing."""
    seen = set()
    unique = []
    for event in events:
        key = f"{event.get(k) for k in idempotency_key.split(':')}"
        if key not in seen:
            seen.add(key)
            unique.append(event)
    return unique
```

### Metric Computation
```python
class MetricComputer:
    def __init__(self, metric_definitions):
        self.metrics = metric_definitions

    def compute(self, events, experiment_start, experiment_end):
        users_in_experiment = self._get_assigned_users(experiment_start, experiment_end)
        results = {}
        for metric_name, definition in self.metrics.items():
            if definition["type"] == "proportion":
                results[metric_name] = self._compute_proportion(
                    events, users_in_experiment, definition)
            elif definition["type"] == "continuous":
                results[metric_name] = self._compute_continuous(
                    events, users_in_experiment, definition)
            elif definition["type"] == "ratio":
                results[metric_name] = self._compute_ratio(
                    events, users_in_experiment, definition)
        return results

    def _compute_proportion(self, events, users, definition):
        per_user = events.groupby("user_id").agg(
            has_event=("event_type", lambda x: definition["event_type"] in x.values)
        )
        return per_user["has_event"].mean()
```

### Time Window Handling
```python
def metric_window(events, assignment_time, window_hours=24):
    """Compute metric within a fixed window after assignment."""
    window_end = assignment_time + pd.Timedelta(hours=window_hours)
    return events[(events["timestamp"] >= assignment_time) &
                  (events["timestamp"] <= window_end)]

# Common windows:
# - 0-24h: immediate response
# - 0-7d: short-term engagement
# - 0-28d: medium-term retention
# - 0-90d: long-term impact
```

## Statistical Engine

### Architecture
```python
class StatisticalEngine:
    def __init__(self, method="frequentist", corrections=None):
        self.method = method
        self.corrections = corrections or []

    def analyze(self, experiment_id, metric_data):
        # Group by variant
        control = metric_data[metric_data["variant"] == "control"]
        treatment = metric_data[metric_data["variant"] == "treatment"]
        results = {}
        for metric_name in control.columns:
            if metric_name in ["variant", "user_id"]:
                continue
            c_data = control[metric_name].dropna()
            t_data = treatment[metric_name].dropna()
            if self.method == "frequentist":
                results[metric_name] = self._frequentist_test(t_data, c_data)
            elif self.method == "bayesian":
                results[metric_name] = self._bayesian_test(t_data, c_data)
        # Apply multiple testing corrections
        p_values = [r["p_value"] for r in results.values()]
        corrected = self._apply_corrections(p_values)
        for i, metric in enumerate(results):
            results[metric]["p_adjusted"] = corrected[i]
        return results
```

### Sequential Testing Integration
```python
class SequentialEngine(StatisticalEngine):
    def __init__(self, max_looks=5, alpha=0.05):
        super().__init__()
        self.max_looks = max_looks
        self.alpha = alpha
        self.boundaries = self._compute_boundaries()
        self.look_count = 0

    def analyze_at_look(self, treatment, control):
        self.look_count += 1
        z = self._compute_z(treatment, control)
        boundary = self.boundaries[self.look_count - 1]
        return {
            "z": z, "boundary": boundary,
            "can_stop": abs(z) > boundary,
            "look": self.look_count
        }
```

### CUPED Integration
```python
class CUPEDEngine(StatisticalEngine):
    """Variance reduction using pre-experiment data."""

    def cuped_adjust(self, post_data, pre_data):
        theta = np.cov(post_data, pre_data)[0, 1] / np.var(pre_data)
        return post_data - theta * (pre_data - np.mean(pre_data))

    def analyze(self, treatment_post, control_post, treatment_pre, control_pre):
        treatment_cuped = self.cuped_adjust(treatment_post, treatment_pre)
        control_cuped = self.cuped_adjust(control_post, control_pre)
        variance_reduction = 1 - np.var(treatment_cuped) / np.var(treatment_post)
        return super().analyze(treatment_cuped, control_cuped), variance_reduction
```

## Results Delivery

### Dashboard Schema
```yaml
experiment_result:
  experiment_id: signup_v2
  status: running  # running / stopped / launched / rolled_back
  duration_days: 14
  traffic_per_variant: 150000

  primary_metrics:
    - name: conversion_rate
      control_value: 0.032
      treatment_value: 0.035
      lift_pct: 9.4
      ci_95: [2.1, 16.7]
      p_value: 0.011
      significant: true
      powered: true

  guardrail_metrics:
    - name: p95_latency_ms
      control_value: 245
      treatment_value: 252
      lift_pct: 2.9
      ci_95: [-1.2, 7.0]
      p_value: 0.184
      significant: false
      violation: false

  decisions:
    primary_significant: true
    guardrails_pass: true
    recommendation: launch_with_monitoring
```

### Alerting
```python
def check_experiment_alerts(result):
    alerts = []
    for guardrail in result["guardrail_metrics"]:
        if guardrail["violation"]:
            alerts.append({
                "severity": "high",
                "message": f"Guardrail {guardrail['name']} regressed {guardrail['lift_pct']:.1f}%"
            })
    if result.get("srm_violation"):
        alerts.append({
            "severity": "critical",
            "message": "Sample Ratio Mismatch detected — possible assignment bug"
        })
    return alerts
```

## Self-Serve Experimentation

### User Flow
```
1. Define hypothesis
2. Select metrics (success + guardrails)
3. Configure experiment (variants, traffic, duration)
4. Pre-register analysis plan
5. A/A validation test
6. Launch with ramp schedule
7. Monitor results dashboard
8. Decision: launch / iterate / kill
```

### Guardrails for Self-Serve
```yaml
- Minimum sample size enforced
- Maximum experiment count per team
- A/A test validation required
- SRM check automated
- Guardrail metrics always included (can't remove)
- Overlapping experiment detection
- Peer review for high-risk experiments
```

## Observability

### Metrics to Monitor
```yaml
Platform Health:
  - Assignment latency (p99 < 10ms)
  - Event pipeline lag (max 5 min)
  - Metric computation time
  - SRM rate across all experiments
  - Guardrail violation rate

Experiment Health:
  - Active experiment count
  - Average experiment duration
  - Launch rate vs kill rate
  - Average lift magnitude
  - False positive rate (from A/A tests)
```

### Debugging Tools
```python
def debug_assignment(user_id, experiment_id):
    """Check what variant a specific user should get."""
    config = get_experiment_config(experiment_id)
    variant = allocate_variant(user_id, config)
    actual = get_assignment_log(user_id, experiment_id)
    return {
        "expected": variant,
        "actual": actual,
        "match": variant == actual,
        "config": config
    }
```
