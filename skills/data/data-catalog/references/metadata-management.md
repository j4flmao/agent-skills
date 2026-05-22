# Metadata Management

## Business Glossary Structure

### Domain Hierarchy

```
Organization
├── Commerce Domain
│   ├── Customer (entity)
│   ├── Order (transaction)
│   ├── Product (entity)
│   └── Cart (transaction)
├── Finance Domain
│   ├── Revenue (metric)
│   ├── COGS (metric)
│   ├── Account (entity)
│   └── Invoice (transaction)
├── Marketing Domain
│   ├── Campaign (entity)
│   ├── Lead (entity)
│   ├── Attribution (process)
│   └── Channel (dimension)
└── Operations Domain
    ├── Inventory (entity)
    ├── Warehouse (entity)
    ├── Shipment (transaction)
    └── Supplier (entity)
```

### Term Definition Schema

```yaml
term:
  name: "Net Revenue"
  domain: "Finance"
  description: "Total revenue minus returns and discounts"
  synonyms: ["Net Sales", "Top Line After Returns"]
  related_terms: ["Gross Revenue", "Discounts", "Returns"]
  data_assets:
    - table: "analytics.fct_financials"
      column: "net_revenue"
    - table: "bi_dashboard.revenue_kpis"
      column: "net_revenue"
  steward: "finance-stewards@org.com"
  approved_by: "finance-governance-council"
  certification_status: "CERTIFIED"
  certification_date: "2026-01-15"
```

## Data Ownership & Stewardship

### Ownership Assignment Workflow

```
Dataset Created → Auto-assign to domain owner →
  Owner accepts/reassigns → Stewardship team assigned →
  Quarterly review → Recertification every 6 months
```

### Ownership Schema (DataHub format)

```json
{
  "urn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.fct_orders,PROD)",
  "ownership": {
    "owners": [
      {
        "owner": "urn:li:corpuser:jane.doe",
        "type": "DATA_OWNER"
      },
      {
        "owner": "urn:li:corpGroup:analytics-team",
        "type": "TECHNICAL_OWNER"
      },
      {
        "owner": "urn:li:corpuser:john.smith",
        "type": "DATA_STEWARD"
      }
    ],
    "lastModified": {
      "time": 1747891200000,
      "actor": "urn:li:corpuser:admin"
    }
  }
}
```

## Usage Analytics

### Query Patterns to Track

| Metric | SQL | Purpose |
|---|---|---|
| **Query frequency** | `SELECT COUNT(*) FROM query_history WHERE table_ref = 'fct_orders'` | Popularity ranking |
| **Active users** | `SELECT COUNT(DISTINCT user) FROM query_history WHERE table_ref = 'fct_orders'` | Adoption |
| **Last accessed** | `SELECT MAX(query_time) FROM query_history WHERE table_ref = 'fct_orders'` | Freshness |
| **Orphan tables** | Tables with zero queries in 90 days | Cleanup candidates |
| **Top users** | `SELECT user, COUNT(*) FROM query_history GROUP BY user ORDER BY COUNT(*) DESC` | Power users |

### Usage Analytics Schema

```yaml
usage_event:
  timestamp: 2026-05-22T10:00:00Z
  user: jane.doe@org.com
  dataset: urn:li:dataset:snowflake.analytics.fct_orders
  query_type: SELECT
  columns_accessed: ["order_id", "total_amount", "order_date"]
  duration_ms: 2340
  source: tableau_dashboard_id:d-123
```

## Certification & Freshness

| Certification Level | Meaning | Badge |
|---|---|---|
| **CERTIFIED** | Reviewed, documented, tested, owned | Green check |
| **DEPRECATED** | Replaced, read-only, will be removed | Red X |
| **UNREVIEWED** | Auto-ingested, not yet validated | Gray clock |
| **BROKEN** | Failed quality checks, known issues | Red exclamation |

Freshness rules: `UNREVIEWED` datasets flagged if no review in 30 days. `CERTIFIED` datasets recertified every 6 months. `DEPRECATED` datasets removed after 90-day notice period.
