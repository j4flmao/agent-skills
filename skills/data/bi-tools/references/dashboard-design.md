# Dashboard Design

## KPI Selection

### Heirarchy
Executive: top 5-7 company-level KPIs (revenue, active users, churn rate, gross margin, NPS). Operational: team-level metrics (conversion rate, support tickets, deployment frequency). Tactical: granular data for investigation (funnel steps, cohort breakdowns, geographic analysis).

### KPI Criteria
SMART: Specific, Measurable, Actionable, Relevant, Time-bound. Each KPI has: numerator/denominator formula, target value, benchmark, owner. KPI examples: Monthly Recurring Revenue (MRR), Customer Acquisition Cost (CAC), Net Revenue Retention (NRR), Daily Active Users (DAU), Order Fulfillment Rate.

### Leading vs Lagging Indicators
Leading indicators: predict future performance (signups, site traffic, demo requests). Lagging indicators: historical performance (revenue, churn, profit). Balance: 3-4 leading + 3-4 lagging per dashboard.

## Layout Patterns

### Executive Dashboard
```
+------------------+-------------------+------------------+
| Revenue (KPI)    | Active Users (KPI)| Churn Rate (KPI) |
| $12.4M (+8.2%)   | 248K (+3.1%)      | 4.2% (-0.3%)     |
+------------------+-------------------+------------------+
| Revenue Trend (Area chart, 12 months)                     |
+-----------------------------------------------------------+
| Active Users by Segment (Stacked bar, 6 months)           |
| [Segment A ████████████████]                              |
| [Segment B ██████████]                                    |
+-----------------------------------------------------------+
| Top 10 Customers (Table)    | Regional Breakdown (Map)    |
+-----------------------------+-----------------------------+
```

### Operational Dashboard
```
+------------------+------------------+-------------------+
| Orders Today     | Avg Order Value  | Fulfillment Rate  |
| 1,284            | $64.50           | 97.3%             |
+------------------+------------------+-------------------+
| Orders by Hour (Bar chart, today vs yesterday)           |
+-----------------------------------------------------------+
| Order Status Breakdown (Donut chart)                      |
| [Pending] [Processing] [Shipped] [Delivered]              |
+-----------------------------------------------------------+
| Recent Orders (Table, auto-refresh 30s)                   |
+-----------------------------------------------------------+
```

### Design Rules
- KPI cards on top row, always visible
- Trend charts below KPIs (time series)
- Detail tables at bottom (scrollable)
- Max 10 visualizations per dashboard
- Consistent color scheme (one accent color for CTAs)
- Mobile-friendly layout (responsive or dedicated mobile view)
- Filters: date range picker, top 3 dimension filters

## Embedding

### Metabase Embedding
```typescript
// Backend: generate signed token
const payload = {
  resource: { dashboard: 42 },
  params: { region: 'US' },
  exp: Math.round(Date.now() / 1000) + (60 * 60)  // 1 hour
};
const token = jwt.sign(payload, METABASE_SECRET_KEY);

// Frontend: render iframe
<iframe
  src={`${METABASE_URL}/embed/dashboard/${token}#bordered=false&titled=false`}
  width="100%"
  height="800px"
/>
```

### Superset Embedding
```python
# Backend: generate guest token
from superset.security import guest_token
token = guest_token.create_token(
    user={"username": "guest@example.com", "first_name": "Guest"},
    resources=[{"type": "dashboard", "id": "dashboard-uuid"}],
    rls_rules=[{"clause": "region = 'US'"}]
)
```

### Security Considerations
Token expiry: 1 hour (short-lived). Row-level security embedded in token. CORS: restrict to allowed origins. Content Security Policy: restrict iframe source.

## Permissions

### Role Model
Admin: manage users, connections, settings. Developer: create/edit dashboards, semantic models. Viewer: view dashboards only, no edit. Restricted: specific dashboards or data sources.

### Row-Level Security
Data source filter: `WHERE region = current_user_region()`. Attribute-based: map JWT claim to data column. Implementation: superset data source filters, Looker access grants, Metabase data sandboxing (enterprise).

### Audit Trail
Track: dashboard views, query executions, data exports, user logins. Store in: BI tool audit logs + database query log. Review: monthly access review, quarterly permission audit.

## Performance

### Optimization Checklist
- [ ] Materialized views for all dashboard source tables
- [ ] BI tool caching enabled (1 hour dashboards, 24 hour reference)
- [ ] Query limits: 10K rows return, 60s timeout
- [ ] Dashboard refresh: exec 4h, ops 1h, tactical on-demand
- [ ] Avoid: cross-join filters, unaggregated raw queries, excessive filters
- [ ] Cache warming: scheduled refresh before business hours
- [ ] Monitor: dashboard load time, query duration, cache hit rate

### Caching Strategy
- Dashboard cache: store rendered dashboard for N minutes
- Query cache: store query results for N minutes (faster for repeated queries)
- Context cache: store metadata (table schemas, field lists)
- Invalidation: cache cleared on data refresh or manual action
