# Warehouse Activation Reference

## Architecture

Reverse ETL extracts data from the warehouse and activates it in operational tools.

```
Warehouse (source)                 Reverse ETL                     SaaS Destinations
+------------------+              +------------------+             +------------------+
| Snowflake        |              | Census           |             | Salesforce        |
| BigQuery         | --source---> | Hightouch        | ---sync-->  | HubSpot           |
| Redshift         |   query      | Grouparoo        |             | Marketo           |
| Postgres         |              | Custom (Python)  |             | Braze             |
+------------------+              +------------------+             | Google Ads        |
                                                                    | Facebook Audiences|
                                                                    +------------------+
```

### Component Layer

1. **Source Connector** — connects to warehouse, executes SQL queries, streams results
2. **Identity Layer** — maps warehouse keys to destination object IDs
3. **Sync Engine** — orchestrates batch/streaming syncs with rate limit awareness
4. **Destination Connector** — calls SaaS API to upsert/merge/append records

## Census Architecture

### Sync Configuration

```yaml
# Census sync: Customer attributes to Salesforce
sync:
  name: "Customer Lifetime Value to Salesforce"
  source:
    connection: snowflake_prod
    model:
      type: sql
      sql: >
        SELECT
          customer_id AS external_id,
          email,
          full_name,
          lifetime_value,
          customer_tier,
          last_order_date,
          health_score
        FROM analytics.customer_360
        WHERE updated_at > {{ last_synced_at }}
      incremental: true
      incremental_key: updated_at
  destination:
    connection: salesforce_prod
    object: Contact
    operation: upsert
    external_id: external_id__c
    mappings:
      - from: external_id
        to: external_id__c
      - from: email
        to: Email
      - from: full_name
        to: Name
      - from: lifetime_value
        to: Lifetime_Value__c
      - from: customer_tier
        to: Customer_Tier__c
      - from: health_score
        to: Health_Score__c
  schedule:
    frequency: hourly
    retries: 3
    retry_interval: 60
```

### Census API

```python
import requests

CENSUS_API = "https://app.getcensus.com/api/v1"
API_KEY = os.environ["CENSUS_API_KEY"]

def trigger_sync(sync_id: str) -> dict:
    """Trigger a Census sync run."""
    resp = requests.post(
        f"{CENSUS_API}/syncs/{sync_id}/trigger",
        headers={"Authorization": f"Bearer {API_KEY}"}
    )
    return resp.json()

def get_sync_run(run_id: str) -> dict:
    """Check sync run status."""
    resp = requests.get(
        f"{CENSUS_API}/sync_runs/{run_id}",
        headers={"Authorization": f"Bearer {API_KEY}"}
    )
    return {
        "status": resp.json()["data"]["status"],
        "rows_processed": resp.json()["data"]["rows_processed"],
        "rows_failed": resp.json()["data"]["rows_failed"],
        "completed_at": resp.json()["data"]["completed_at"]
    }
```

## Hightouch Architecture

### Sync Configuration

```yaml
# Hightouch sync: Audience to Braze
sync:
  name: "High-Value Customers to Braze"
  model:
    connection: bigquery_prod
    table: analytics.high_value_customers
    primary_key: user_id
    query: >
      SELECT
        user_id,
        email,
        full_name,
        lifetime_value,
        segments
      FROM analytics.high_value_customers
      WHERE last_updated >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  destination:
    type: braze
    object: user
    operation: merge
    mappings:
      - from: user_id
        to: external_id
      - from: email
        to: email
      - from: full_name
        to: first_name
      - from: segments
        to: custom_attributes.segments
  schedule:
    type: interval
    interval: 3600  # every hour
    start: "2026-01-01T00:00:00Z"
```

### Hightouch Webhook

```python
import hmac, hashlib

WEBHOOK_SECRET = os.environ["HIGHTOUCH_WEBHOOK_SECRET"]

def verify_webhook(payload: bytes, signature: str) -> bool:
    """Verify Hightouch webhook signature."""
    expected = hmac.new(
        WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# handle_sync_completion(request):
#   if verify_webhook(request.body, request.headers["X-Hightouch-Signature"]):
#       notify_slack(f"Sync completed: {request.json['sync_name']}")
```

## Audience Segmentation

### SQL-Based Segmentation

```sql
-- BigQuery: High-value audience for Braze activation
CREATE OR REPLACE TABLE activation.high_value_customers AS
SELECT
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.lifetime_value,
    CASE
        WHEN u.lifetime_value > 10000 THEN 'platinum'
        WHEN u.lifetime_value > 5000 THEN 'gold'
        WHEN u.lifetime_value > 1000 THEN 'silver'
        ELSE 'bronze'
    END AS tier,
    ARRAY(
        SELECT DISTINCT p.category
        FROM analytics.purchases p
        WHERE p.user_id = u.user_id
    ) AS purchased_categories,
    DATE_DIFF(CURRENT_DATE(), MAX(o.order_date), DAY) AS days_since_last_order
FROM analytics.users u
LEFT JOIN analytics.orders o ON u.user_id = o.user_id
WHERE u.is_active = TRUE
  AND u.opted_in_marketing = TRUE
  AND u.email IS NOT NULL
GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.lifetime_value
HAVING u.lifetime_value > 1000;
```

### Dynamic Audience Refresh

```yaml
# Activation pipeline in Airflow
dag:
  schedule: "0 6 * * *"  # Daily at 6 AM
  tasks:
    - id: refresh_audience
      type: bigquery_operator
      sql: activation.high_value_customers.sql
    - id: sync_to_braze
      type: hightouch_sync
      sync_id: braze_high_value
    - id: sync_to_google_ads
      type: census_sync
      sync_id: google_ads_high_value
    - id: notify_completion
      type: slack_notifier
      message: "Daily audience activation completed"
```

## Sync Strategies

| Strategy | Latency | Volume | Cost | Use Case |
|---|---|---|---|---|
| Batch (hourly) | 1 hour | Unlimited | Low | Customer profiles |
| Batch (daily) | 24 hours | Unlimited | Lowest | Reference data |
| Incremental | < 5 min | High | Medium | Event data |
| Streaming | < 30 sec | Medium | High | Real-time activation |

## Error Handling

```python
def retry_with_backoff(func, max_retries=3, base_delay=10):
    """Retry sync with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return func()
        except RateLimitError as e:
            wait = base_delay * (2 ** attempt)
            logger.warning(f"Rate limited, retrying in {wait}s ({attempt+1}/{max_retries})")
            time.sleep(wait)
        except APIError as e:
            if e.status_code >= 500:
                wait = base_delay * (2 ** attempt)
                time.sleep(wait)
            else:
                raise
    raise MaxRetriesExceeded(f"Failed after {max_retries} attempts")
```

## Rules
- Use incremental syncs for tables over 10K rows
- Full refresh only for reference/code tables under 10K rows
- Always define a dedup key (external ID or email)
- Test syncs on 100-row samples before production
- Monitor sync failure rate; alert over 5%
- Log every sync run with row counts and duration
- Use platform webhooks for real-time sync monitoring
- Set watermark columns with TIMESTAMP for precision
- Hash PII before syncing to ad platforms (SHA-256)
- Schedule syncs during off-peak hours for large full refreshes
