# Sync Configuration Examples

## Census: Salesforce Contact Sync

```yaml
sync_name: "Salesforce Contact Sync"
source:
  type: snowflake
  connection: "analytics_warehouse"
  object: analytics.marts.active_customers
  incremental: true
  incremental_key: updated_at
  query: >
    SELECT
        customer_id,
        email,
        first_name,
        last_name,
        phone,
        company_name,
        lifetime_value,
        customer_tier,
        last_order_date
    FROM analytics.marts.active_customers
    QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) = 1
destination:
  type: salesforce
  object: Contact
  operation: upsert
  external_id: Customer_ID__c
  field_mapping:
    - from: customer_id
      to: Customer_ID__c
    - from: email
      to: Email
    - from: first_name
      to: FirstName
    - from: last_name
      to: LastName
    - from: phone
      to: Phone
    - from: company_name
      to: Account.Name
    - from: lifetime_value
      to: Lifetime_Value__c
    - from: customer_tier
      to: Customer_Tier__c
    - from: last_order_date
      to: Last_Order_Date__c
schedule:
  frequency: interval
  interval_minutes: 60
  trigger_on_start: true
```

## Hightouch: HubSpot Deal Sync from Revenue Pipeline

```yaml
model:
  name: "HubSpot Deal Sync"
  source:
    type: snowflake
    table: analytics.marts.pipeline_deals
    primary_key: deal_id
  destination:
    type: hubspot
    resource: deal
    operation: upsert
    match_key: dealname
    custom_object_id: false
  mapping:
    - from: deal_name
      to: dealname
    - from: pipeline_stage
      to: dealstage
    - from: amount
      to: amount
    - from: close_date
      to: closedate
    - from: owner_email
      to: hubspot_owner_id
      lookup: email
    - from: company_id
      to: associated_company
      lookup: external_id
    - from: forecast_category
      to: forecast_category
  schedule:
    type: interval
    value: 30
    unit: minutes
  behavior:
    on_match: update
    on_no_match: create
    on_record_deleted: archive
```

## Census: Braze User Attributes Sync

```yaml
sync_name: "Braze User Attributes"
source:
  type: redshift
  object: analytics.user_profiles
  incremental: true
  incremental_key: updated_at
  query: >
    SELECT
        user_id AS external_id,
        email,
        first_name,
        last_name,
        date_of_birth,
        country,
        preferred_language,
        push_opt_in,
        email_opt_in,
        total_orders::INT AS total_orders,
        lifetime_value::FLOAT AS lifetime_value,
        last_activity_date,
        segment_tags
    FROM analytics.user_profiles
    WHERE is_active = TRUE
      AND updated_at > '{{ last_synced_at }}'
destination:
  type: braze
  object: user
  operation: merge
  external_id: external_id
  field_mapping:
    - from: external_id
      to: external_id
    - from: email
      to: email
    - from: first_name
      to: first_name
    - from: last_name
      to: last_name
    - from: date_of_birth
      to: date_of_birth
      type: date
    - from: country
      to: home_country
    - from: preferred_language
      to: language
    - from: push_opt_in
      to: push_subscribed
      type: boolean
    - from: email_opt_in
      to: email_subscribe
      type: boolean
    - from: total_orders
      to: total_orders
    - from: lifetime_value
      to: lifetime_value
    - from: last_activity_date
      to: last_activity_date
    - from: segment_tags
      to: segment_tags
      type: array
schedule:
  frequency: interval
  interval_minutes: 30
```

## Grouparoo: Marketo Lead Import

```javascript
// Grouparoo config for Marketo lead import
module.exports = {
  name: "Marketo Lead Sync",
  type: "schedule",
  options: {
    recurring: true,
    recurringFrequency: 1000 * 60 * 60,  // hourly
  },
  source: {
    type: "postgres-table-import",
    connection: "analytics_db",
    table: "marketing_leads",
    primaryKey: "lead_id",
    highWatermarkColumn: "updated_at",
  },
  destination: {
    type: "marketo-export",
    connection: "marketo_instance",
  },
  mapping: {
    lead_id: { to: "externalCompanyId" },
    email: { to: "email" },
    first_name: { to: "firstName" },
    last_name: { to: "lastName" },
    company: { to: "company" },
    title: { to: "title" },
    lead_source: { to: "leadSource" },
    score: { to: "score", type: "integer" },
  },
  filters: [
    { key: "is_active", op: "eq", match: true },
    { key: "lead_source", op: "neq", match: "spam" },
  ],
};
```

## Hightouch: Google Ads Customer Match

```yaml
model:
  name: "Google Ads Customer Match"
  source:
    type: bigquery
    table: analytics.audiences.high_value_customers
  destination:
    type: google_ads
    resource: customer_match
    operation: upload
    match_type: CONTACT_INFO
    customer_id: "123-456-7890"
  mapping:
    - from: hashed_email
      to: email
      transform: lowercase_and_sha256
    - from: hashed_phone
      to: phone
      transform: sha256
    - from: first_name
      to: firstName
    - from: last_name
      to: lastName
    - from: zip_code
      to: zipCode
    - from: country_code
      to: countryCode
  schedule:
    type: interval
    value: 24
    unit: hours
```

## Census: Facebook Custom Audiences

```yaml
sync_name: "Facebook Retargeting Audience"
source:
  type: snowflake
  object: analytics.audiences.last_30_day_visitors
  incremental: false  # full refresh daily
  query: >
    SELECT DISTINCT
        LOWER(TRIM(email)) AS email,
        LOWER(TRIM(phone)) AS phone,
        INITCAP(TRIM(first_name)) AS fn,
        INITCAP(TRIM(last_name)) AS ln,
        UPPER(TRIM(country)) AS country,
        zip AS zc
    FROM analytics.audiences.site_visitors
    WHERE last_visit >= DATEADD('day', -30, CURRENT_DATE)
      AND (email IS NOT NULL OR phone IS NOT NULL)
destination:
  type: facebook_ads
  object: custom_audience
  audience_id: "123456789"
  operation: add
  schema:
    - email_sha256
    - phone_sha256
    - fn_sha256
    - ln_sha256
    - country
    - zip
  field_mapping:
    - from: email
      to: email_sha256
      hash: sha256
    - from: phone
      to: phone_sha256
      hash: sha256
    - from: fn
      to: fn_sha256
      hash: sha256
    - from: ln
      to: ln_sha256
      hash: sha256
    - from: country
      to: country
    - from: zc
      to: zip
schedule:
  frequency: daily
  time: "03:00"
  timezone: America/New_York
```

## Error Response Handing Pattern

```python
import json
import time
import logging
from typing import Any

def sync_with_error_handling(sync_config: dict, batch: list[dict]) -> dict:
    """Execute a sync batch with per-record error handling."""
    results = {"succeeded": 0, "failed": 0, "errors": [], "skipped": []}
    destination = sync_config["destination"]

    for record in batch:
        try:
            response = destination_api.upsert(
                object_type=destination["object"],
                external_id=destination.get("external_id"),
                data=record,
            )
            if response.status_code == 201:
                results["succeeded"] += 1
            elif response.status_code in (429, 500):
                time.sleep(5)
                retry = destination_api.upsert(
                    object_type=destination["object"],
                    external_id=destination.get("external_id"),
                    data=record,
                )
                if retry.status_code == 201:
                    results["succeeded"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append({
                        "record_id": record.get("id"),
                        "error": f"Retry failed: {retry.text}",
                    })
            else:
                results["failed"] += 1
                results["errors"].append({
                    "record_id": record.get("id"),
                    "error": response.text,
                })
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({
                "record_id": record.get("id"),
                "error": str(e),
            })

    logging.info(
        "Sync %s complete: %d succeeded, %d failed",
        sync_config["name"],
        results["succeeded"],
        results["failed"],
    )
    return results
```
