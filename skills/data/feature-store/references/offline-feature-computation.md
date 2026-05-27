# Offline Feature Computation

## Batch Feature Engineering
Offline feature computation is the foundation for training data generation and batch inference.

## Point-in-Time Correctness
- Ensure features use only data available at the prediction time
- Avoid data leakage from future events
- Use temporal joins for correct feature computation
- Validate point-in-time logic with test cases

## Historical Feature Retrieval
- Query feature store for historical data at specific timestamps
- Support time-travel queries for reproducible training datasets
- Implement efficient batch retrieval for large training sets
- Cache frequently accessed historical features

## Key Points
- Implement point-in-time correctness for all offline features
- Support historical feature retrieval with time-travel queries
- Optimize batch retrieval for large training datasets
- Validate feature pipelines against known baselines
- Maintain feature backfill capabilities for model retraining