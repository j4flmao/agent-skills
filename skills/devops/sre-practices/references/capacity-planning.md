# SRE Capacity Planning

## Demand Forecasting
Trend analysis: monthly growth rate of requests, users, data volume. Seasonal patterns: daily (peak hours), weekly (weekday vs weekend), yearly (holiday). Leading indicators: marketing campaigns, product launches, user growth. Predictive modeling: linear regression, exponential smoothing. Upper bound: forecast at p95 for capacity planning.

## Resource Modeling
CPU: requests/sec per core for the application pattern. Memory: per-replica memory usage, headroom for spikes. Storage: data growth rate + retention period + replica factor. Network: bandwidth per request, peak concurrent users. Database: queries per second, connection pool sizing, storage IOPS.

## Utilization Targets
Compute: 60-80% CPU utilization for steady state. Memory: max 80% to leave headroom for GC/allocations. Storage: warn at 70%, critical at 85%, full at 95%. Network: 50% link capacity for burst headroom. Database: 70% max connections, 50% storage, 60% IOPS.

## Scaling Strategies
Vertical: increase resource size, simple, has limits. Horizontal: add replicas, complex, near-limitless. Predictive: scale ahead of known traffic patterns. Reactive: scale on metric threshold, lag behind demand. Event-driven: scale on external event (campaign start, batch job).

## Cost-Aware Capacity
Cost per unit: $/request, $/user, $/GB stored. Capacity vs cost trade-off: over-provision for safety vs under-provision for cost. Hedging: mix of reserved (base load) and on-demand (burst). Rightsizing: right-size existing resources before adding more. Waste reduction: remove unused, downsize over-provisioned.

## Review Process
Weekly: utilization dashboards, anomaly detection. Monthly: growth trends, forecast vs actual. Quarterly: budget planning, hardware procurement. Annual: major capacity review, data center planning. Post-incident: capacity-related incident root cause analysis.

## References
- sre-practices-fundamentals.md -- Fundamentals
- sli-slo-guide.md -- SLOs
- error-budget-policy.md -- Error Budgets
- toil-automation.md -- Toil Automation
- incident-analysis.md -- Incident Analysis
