# Time Series Feature Store

## Feature Store for Time Series

| Component | Purpose | Example |
|-----------|---------|---------|
| Feature computation | Generate features on schedule | Daily rolling means at midnight |
| Feature registry | Document feature definitions | Lag 7, rolling_mean 30, holiday flag |
| Online serving | Low-latency feature retrieval | Redis lookup by entity + timestamp |
| Point-in-time join | Correct historical features | Join by entity + valid_at timestamp |
| Freshness monitoring | Feature staleness detection | Last updated > 1 hour ago alert |

## tsfresh Feature Extraction

```
from tsfresh import extract_features
from tsfresh.feature_extraction import ComprehensiveFCParameters

# Automatic extraction of hundreds of features
extraction_settings = ComprehensiveFCParameters()
features = extract_features(
    time_series_data,
    column_id="series_id",
    column_sort="timestamp",
    default_fc_parameters=extraction_settings,
)

# Filter relevant features (built-in hypothesis testing)
from tsfresh import select_features
relevant_features = select_features(features, target, ml_task="regression")
```

| Feature Category | Examples | Count |
|-----------------|----------|-------|
| Statistical | mean, std, variance, skewness, kurtosis | 10 |
| Autocorrelation | acf_1, acf_2, partial_autocorrelation | 15 |
| Entropy | sample_entropy, approximate_entropy | 5 |
| Peak detection | number_peaks, peak_distance | 5 |
| FFT | fft_coefficient, spectral_energy | 20 |
| Change points | c3, cid_ce, symmetry_looking | 10 |
| Value distribution | quantiles, count_above_mean, ratio_beyond_r_sigma | 15 |

## Feast for Time Series Features

```
# feature_view.py
from feast import FeatureView, Feature, Field
from feast.types import Float32, Int64, String
from datetime import timedelta

ts_features = FeatureView(
    name="time_series_features",
    entities=["series_id"],
    ttl=timedelta(days=30),
    features=[
        Feature(name="lag_1", dtype=Float32),
        Feature(name="lag_7", dtype=Float32),
        Feature(name="rolling_mean_7d", dtype=Float32),
        Feature(name="rolling_std_7d", dtype=Float32),
        Feature(name="rolling_mean_30d", dtype=Float32),
        Feature(name="rolling_std_30d", dtype=Float32),
        Feature(name="hour_sin", dtype=Float32),
        Feature(name="hour_cos", dtype=Float32),
        Feature(name="dow_sin", dtype=Float32),
        Feature(name="dow_cos", dtype=Float32),
        Feature(name="is_holiday", dtype=Int64),
        Feature(name="days_since_last_holiday", dtype=Float32),
    ],
    online=True,
    source=ts_batch_source,
)
```

## Point-in-Time Correctness

```
# Always join by valid_at timestamp, not latest value
# CORRECT: point-in-time join
entity_df = pd.DataFrame({
    "series_id": ["series_A", "series_B"],
    "valid_at": ["2025-03-15 10:00:00", "2025-03-16 14:00:00"],
})

training_features = fs.get_historical_features(
    entity_df=entity_df,
    features=["time_series_features:lag_7", "time_series_features:rolling_mean_7d"],
).to_df()

# WRONG: using latest value
# feature_value_at_prediction_time != latest_available_value
```

## Online Serving

```
# Real-time feature computation for streaming inference
import redis

# Feature computation function
def compute_online_features(series_id, current_value, timestamp):
    # Fetch recent values from online store
    recent_values = redis_client.lrange(f"ts:{series_id}:values", 0, 30)

    # Compute features on the fly
    features = {
        "lag_1": recent_values[0] if len(recent_values) > 0 else None,
        "lag_7": recent_values[6] if len(recent_values) > 6 else None,
        "rolling_mean_7d": np.mean(recent_values[:7]) if len(recent_values) >= 7 else None,
        "hour_sin": np.sin(2 * np.pi * timestamp.hour / 24),
        "hour_cos": np.cos(2 * np.pi * timestamp.hour / 24),
    }
    return features
```

## Feature Pipeline Architecture

```
# Time series feature computation pipeline
# ┌──────────────────────────────────────────────┐
# │  Data Sources                                │
# │  ┌────────┐  ┌──────────┐  ┌───────────┐    │
# │  │ Batch  │  │ Streaming│  │ Calendar  │    │
# │  └───┬────┘  └────┬─────┘  └─────┬─────┘    │
# └──────┼────────────┼──────────────┼──────────┘
#        ▼            ▼              ▼
# ┌──────────────────────────────────────────────┐
# │  Feature Computation (Airflow/Dagster)        │
# │  - Lag computation: daily at midnight         │
# │  - Rolling stats: hourly                     │
# │  - Calendar features: continuous              │
# │  - tsfresh extraction: weekly                 │
# └──────────────────────┬───────────────────────┘
#                        ▼
# ┌──────────────────────────────────────────────┐
# │  Feature Store (Feast/Tecton)                │
# │  ┌────────────┐  ┌──────────────────────┐    │
# │  │ Offline    │  │ Online (Redis/DD)    │    │
# │  │ (Parquet)  │  │ (<10ms latency)      │    │
# │  └────────────┘  └──────────────────────┘    │
# └──────────────────────┬───────────────────────┘
#                        ▼
# ┌──────────────────────────────────────────────┐
# │  Consumers                                    │
# │  ┌──────────┐  ┌───────────┐  ┌────────────┐ │
# │  │Training  │  │Inference  │  │Monitoring  │ │
# │  └──────────┘  └───────────┘  └────────────┘ │
# └──────────────────────────────────────────────┘
```

## Feature Freshness Monitoring

| Feature | Expected Freshness | Alert If |
|---------|-------------------|----------|
| Lag features | < 1 hour stale | > 2 hours |
| Rolling statistics | < 1 hour stale | > 2 hours |
| Calendar features | Real-time | > 5 min |
| Exogenous variables | < 1 hour stale | > 3 hours |
| Entity metadata | Daily | > 2 days |

## Best Practices

- Pre-compute lag and rolling features on a schedule — never compute on the fly for batch training
- Store recent N values in online store for real-time feature computation
- Use point-in-time joins for all training data — never use latest-available values
- Version feature computation code alongside model code for reproducibility
- Monitor feature freshness — stale features silently degrade model performance
- Cache slow features (tsfresh) and compute fast features (lags, calendar) in real-time
- Split features by computation cost: cheap features online, expensive features pre-computed
- Document feature definitions with clear description, computation formula, and update frequency
- Set up data drift detection on feature distributions — not just on raw time series
- Backfill features when adding new ones — ensure consistency across all training windows
- Use feature store as single source of truth for both training and inference features
