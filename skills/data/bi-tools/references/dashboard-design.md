# Dashboard Design

## KPI Selection

### Hierarchy
Executive: top 5-7 company-level KPIs — revenue, active users, churn rate, gross margin, NPS, NRR, CAC. Operational: team-level metrics — conversion rate, support tickets resolved, deployment frequency, error budget. Tactical: granular data for investigation — funnel steps, cohort breakdowns, geographic analysis, transaction detail.

### KPI Criteria
SMART: Specific, Measurable, Actionable, Relevant, Time-bound. Each KPI has: numerator/denominator formula, target value, benchmark (industry or historical), owner (person accountable for the number). KPI examples: Monthly Recurring Revenue (MRR), Customer Acquisition Cost (CAC), Net Revenue Retention (NRR), Daily Active Users (DAU), Order Fulfillment Rate, Time to Value (TTV), First Response Time.

### Leading vs Lagging Indicators
Leading indicators: predict future performance — signups, site traffic, demo requests, feature adoption rate, support ticket volume. Lagging indicators: historical performance — revenue, churn, profit, customer lifetime value. Balance: 3-4 leading + 3-4 lagging per dashboard. Leading indicators for operational teams, lagging for executive reviews.

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
+-----------------------------------------------------------+
| Top 10 Customers (Table)    | Regional Map                |
+-----------------------------+-----------------------------+
```

### Operational Dashboard
```
+------------------+------------------+-------------------+
| Orders Today     | Avg Order Value  | Fulfillment Rate  |
| 1,284            | $64.50           | 97.3%             |
+------------------+------------------+-------------------+
| Orders by Hour (Bar chart, today vs yesterday)            |
+-----------------------------------------------------------+
| Order Status Breakdown (Donut chart)                       |
+-----------------------------------------------------------+
| Recent Orders (Table, auto-refresh 30s)                   |
+-----------------------------------------------------------+
```

### Tactical Dashboard
Funnel steps: lead → signup → activation → purchase → retention with drop-off percentages. Cohort analysis: retention by signup week (heatmap). Geographic breakdown: revenue by region (map + table). Drill-down: click region → see customers → see orders → see order detail.

### Design Rules
KPI cards on top row, always visible. Trend charts below KPIs (time series). Detail tables at bottom (scrollable, paginated). Max 10 visualizations per dashboard. Consistent color scheme — one accent color for CTAs, semantic colors for status (green=good, red=bad, yellow=warning). Filters: date range picker, top 3 dimension filters (region, team, product category). Mobile-friendly layout — responsive or dedicated mobile view.

## Embedding

### Metabase Embedding
```typescript
const payload = {
  resource: { dashboard: 42 },
  params: { region: 'US' },
  exp: Math.round(Date.now() / 1000) + (60 * 60)
};
const token = jwt.sign(payload, METABASE_SECRET_KEY);
```
```html
<iframe src="${METABASE_URL}/embed/dashboard/${token}#bordered=false&titled=false" width="100%" height="800px" />
```

### Superset Embedding
```python
from superset.security import guest_token
token = guest_token.create_token(
    user={"username": "guest", "first_name": "Guest"},
    resources=[{"type": "dashboard", "id": "dashboard-uuid"}],
    rls_rules=[{"clause": "region = 'US'"}]
)
```

### Security
Token expiry: 1 hour (short-lived). Row-level security embedded in token. CORS: restrict to allowed origins. CSP: restrict iframe sources. Rate-limit embed token generation. Audit embed access separately.

## Permissions

### Role Model
Admin: manage users, connections, settings. Developer: create/edit dashboards, semantic models, data sources. Viewer: view dashboards and explore, no edit or export. Restricted: specific dashboards or data sources only.

### Row-Level Security
Data source filter: `WHERE region = current_user_region()`. Attribute-based: map JWT claim (user.region) to data column (customer.region). Implementation: Superset data source filters, Looker access grants with user attributes, Metabase data sandboxing (Enterprise), Tableau row-level security, PowerBI RLS with DAX filters.

### Audit Trail
Track: dashboard views per user, query executions (SQL + user), data exports (format + row count), user logins with timestamp and IP. Store in BI tool audit logs + database query log. Monthly access review — verify each user's role is appropriate. Quarterly permission audit — remove unused accounts.

## Performance

### Optimization Checklist
- Materialized views for all dashboard source tables
- BI tool caching enabled: dashboard cache (1 hour), query cache (1 hour), context cache (24 hours)
- Query limits: 10K rows return max, 60s timeout max
- Dashboard refresh: executive 4h, operational 1h, tactical on-demand
- Avoid: cross-join filters, unaggregated raw queries, excessive filter options
- Cache warming: scheduled refresh before business hours
- Monitor: dashboard load time (<5s target), query duration, cache hit rate (>80% target)

### Caching Strategy
Dashboard cache: store rendered dashboard HTML for N minutes (fastest for repeated views). Query cache: store query results for N minutes (faster for repeated queries, less storage). Context cache: store metadata (table schemas, field lists). Invalidation: cache cleared on data refresh schedule or manual action. Warming: pre-load cache for high-priority dashboards before business hours.
