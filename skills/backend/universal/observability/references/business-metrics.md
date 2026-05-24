# Business Metrics Reference

## Domain Events as Metrics

Treat significant business events as observability metrics. Each domain event is a measurement point.

### Event-to-Metric Mapping

| Domain Event | Metric Name | Attributes |
|-------------|-------------|------------|
| Order placed | `orders.created` | plan, region, channel, customer_tier |
| Order completed | `orders.completed` | plan, region, fulfillment_time |
| Payment succeeded | `payments.succeeded` | method, amount_bucket |
| Payment failed | `payments.failed` | method, error_code |
| User registered | `users.registered` | source, plan |
| Subscription upgraded | `subscriptions.upgraded` | from_plan, to_plan |
| Support ticket created | `tickets.created` | category, priority |

### Implementation

```javascript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('business-events');

// Counter for domain events
const orderCounter = meter.createCounter('orders.created', {
  description: 'Count of orders placed'
});

function onOrderPlaced(order: Order) {
  orderCounter.add(1, {
    plan: order.plan,
    region: order.region,
    channel: order.channel,
    customer_tier: order.customer.tier,
    amount_bucket: bucketAmount(order.total),
  });
}

// Histogram for business durations
const fulfillmentHistogram = meter.createHistogram('orders.fulfillment_time', {
  description: 'Time from order to fulfillment in seconds',
  unit: 's'
});

function onOrderFulfilled(order: Order, createdTime: number) {
  fulfillmentHistogram.record(
    (Date.now() - createdTime) / 1000,
    { plan: order.plan, region: order.region }
  );
}
```

## Business KPI Dashboards

### KPI Categories

```yaml
kpi_dashboard:
  acquisition:
    - users.registration_count          # New users per day
    - users.acquisition_channel          # Source breakdown
    - users.cac                         # Customer acquisition cost
  activation:
    - users.first_value_event           # Users reached "aha moment"
    - users.activation_rate             # % of signups activated
    - users.time_to_activation          # Days to first value
  retention:
    - users.d1_retention                # Day 1 retention
    - users.d7_retention                # Day 7 retention
    - users.d30_retention               # Day 30 retention
    - users.churn_rate                  # Monthly churn
  revenue:
    - revenue.mrr                       # Monthly recurring revenue
    - revenue.arr                       # Annual run rate
    - revenue.arpu                      # Avg revenue per user
    - revenue.ltv                       # Lifetime value
  referral:
    - referrals.sent                    # Invites sent
    - referrals.conversion_rate         # Invite → signup
    - virality.coefficient              # K-factor
```

### Dashboard Query (PromQL style)
```promql
# Daily active users
sum(increase(users.active{env="production"}[1d]))

# Revenue per user segment
sum by (plan) (rate(revenue.total{env="production"}[30d])) / sum by (plan) (rate(users.active[30d]))

# Conversion funnel
# Step 1: Visit site
sum(rate(page_views{page="/pricing"}[1d]))
# Step 2: Start signup
sum(rate(events{name="signup.started"}[1d]))
# Step 3: Complete signup  
sum(rate(events{name="signup.completed"}[1d]))
# Step 4: First payment
sum(rate(events{name="payments.first"}[1d]))
```

## Revenue-Impact Correlation

### Metric Linking
```javascript
// Track features alongside business metrics
async function trackFeatureImpact(featureName: string, userId: string) {
  // Emit feature usage event (correlated with user's subscription)
  metricsCounter.add(1, {
    feature: featureName,
    plan: user.plan,
    mrr_segment: bucketMRR(user.mrr),
    region: user.region,
  });
  
  // Track in a span for deeper analysis
  const span = tracer.startSpan(`feature.${featureName}`, {
    attributes: {
      'feature.name': featureName,
      'business.plan': user.plan,
      'business.mrr': user.mrr,
      'business.cohort_month': user.cohortMonth,
    }
  });
  span.end();
}
```

### Correlation Analysis
```
Find: Features used by highest-value customers (by MRR)

SELECT
  feature_usage.feature,
  customers.mrr_bucket,
  COUNT(DISTINCT customers.id) as user_count,
  SUM(customers.mrr) as total_mrr
FROM feature_usage
JOIN customers ON feature_usage.customer_id = customers.id
WHERE customers.active = true AND customers.plan != 'free'
GROUP BY feature, mrr_bucket
ORDER BY total_mrr DESC
```

## Customer-Facing Observability

### Status Page Metrics
```yaml
customer_observability:
  uptime:
    metric: "service.uptime_30d"
    target: "99.9%"
    display: "percentage"
  latency:
    metric: "http.server.duration_p95"
    target: "< 500ms"
    display: "ms"
  errors:
    metric: "http.server.error_rate"
    target: "< 0.1%"
    display: "percentage"
  throughput:
    metric: "http.server.request_count"
    display: "rpm (requests per minute)"
```

### SLA Reporting
```javascript
// Calculate SLA attainment per customer
function calculateSLABuckets(customerId: string, month: string) {
  const metrics = queryMetrics(`
    SELECT
      sum(error_requests) / sum(total_requests) as error_rate,
      p95(request_duration) as p95_latency
    FROM http_requests
    WHERE customer_id = '${customerId}'
      AND month = '${month}'
  `);

  return {
    uptime_sla_met: metrics.error_rate < 0.001,      // 99.9% uptime
    latency_sla_met: metrics.p95_latency < 500,       // 500ms P95
    overall_sla_met: metrics.error_rate < 0.001 && metrics.p95_latency < 500,
    credit_due: metrics.error_rate >= 0.001 ? calculateCredit(customerId) : 0
  };
}
```

## Business Metrics Best Practices

- **Align metrics to outcomes**: Each metric should tie to a business goal, not just system health
- **Define segments**: Always break metrics by meaningful dimensions (plan, region, channel)
- **Cohort analysis**: Track metrics by user cohort (signup month) to measure retention properly
- **Set targets**: Every business metric needs a target value and an alert threshold
- **Tier dashboards**: Executive summary (top 5 metrics) → Team KPIs (10-20) → Deep dive (50+)
- **Avoid vanity metrics**: Total registered users means little without active/retained breakdown
