# Analytics Dashboards and Reporting

## Key Metrics Dashboard

```sql
-- Daily Active Users
SELECT
    DATE(timestamp) as day,
    COUNT(DISTINCT user_id) as dau,
    COUNT(DISTINCT CASE WHEN platform = 'ios' THEN user_id END) as ios_dau,
    COUNT(DISTINCT CASE WHEN platform = 'android' THEN user_id END) as android_dau
FROM analytics_events
WHERE event_name = 'app_open'
    AND timestamp >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(timestamp)
ORDER BY day DESC;

-- Retention Cohort
WITH cohorts AS (
    SELECT
        user_id,
        DATE(MIN(timestamp)) as cohort_date
    FROM analytics_events
    WHERE event_name = 'signup_completed'
    GROUP BY user_id
)
SELECT
    cohort_date,
    COUNT(DISTINCT c.user_id) as cohort_size,
    COUNT(DISTINCT CASE WHEN DATEDIFF(e.timestamp, c.cohort_date) = 1 THEN c.user_id END) as day_1,
    COUNT(DISTINCT CASE WHEN DATEDIFF(e.timestamp, c.cohort_date) = 7 THEN c.user_id END) as day_7,
    COUNT(DISTINCT CASE WHEN DATEDIFF(e.timestamp, c.cohort_date) = 30 THEN c.user_id END) as day_30
FROM cohorts c
LEFT JOIN analytics_events e
    ON c.user_id = e.user_id
    AND e.event_name = 'app_open'
WHERE c.cohort_date >= DATE_SUB(CURRENT_DATE, INTERVAL 60 DAY)
GROUP BY cohort_date;
```

## Funnel Analysis

```swift
struct FunnelStep {
    let name: String
    let eventName: String
    let order: Int
}

class FunnelAnalyzer {
    func analyzeFunnel(
        funnel: [FunnelStep],
        startDate: Date,
        endDate: Date,
        segmentBy: String? = nil
    ) -> FunnelReport {
        var report = FunnelReport(name: funnel.map(\.name).joined(separator: " > "))
        var previousUsers: Set<String> = []

        for step in funnel {
            let users = queryUsers(eventName: step.eventName, startDate: startDate, endDate: endDate)
            let totalUsers = users.count

            if previousUsers.isEmpty {
                report.steps.append(StepData(name: step.name, users: totalUsers))
            } else {
                let converted = users.intersection(previousUsers).count
                report.steps.append(StepData(name: step.name, users: converted))
            }

            previousUsers = users
        }

        report.calculateConversionRates()
        return report
    }

    private func queryUsers(eventName: String, startDate: Date, endDate: Date) -> Set<String> {
        return analyticsProvider.queryDistinctUsers(event: eventName, start: startDate, end: endDate)
    }
}
```

## Key Points

- Build real-time dashboards for key metrics
- Track DAU/MAU for user engagement
- Use cohort analysis for retention tracking
- Implement funnel analysis for conversion optimization
- Segment metrics by platform, country, and user properties
- Track revenue metrics (ARPU, ARPPU, LTV)
- Monitor crash-free rate and app performance
- Use attribution tracking for marketing ROI
- Implement custom event properties for granularity
- Set up alerts for metric anomalies
- Export data to data warehouse for deeper analysis
- Use data sampling for high-volume events
