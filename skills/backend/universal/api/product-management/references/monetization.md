# API Monetization & Billing Architectures

Monetizing APIs requires integrating technical systems (gateways, logging, limiters) with commercial systems (billing platforms, usage aggregators). In production, this must run asynchronously to prevent adding latency to the critical path of API execution.

---

## Monetization Infrastructure Architecture

A production usage-based billing platform relies on a distributed log collector to record and aggregate usage events without blocking the API response.

```
                  ┌───────────────────────────────┐
                  │         API Gateway           │
                  │   - Verifies API keys         │
                  │   - Applies rate limits       │
                  └───────────────┬───────────────┘
                                  │
                                  │ Direct response (no sync block)
                                  ▼
                  ┌───────────────────────────────┐
                  │      Kafka Log Stream         │
                  │   - Collects usage payloads   │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │     Flink Usage Processor     │
                  │   - Aggregates metrics        │
                  │   - Computes usage windows    │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │    Database / ClickHouse      │
                  │   - Stores immutable logs     │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │     Billing Syncer Service    │
                  │   - Pushes usage to Stripe    │
                  └───────────────────────────────┘
```

### Component Details

| Module | Purpose | Scale Architecture |
| :--- | :--- | :--- |
| **Collector Stream** | Receives asynchronous log packets from the Gateway. | Apache Kafka, AWS Kinesis. |
| **Stream Aggregator** | Computes running counts per developer ID in hourly or daily windows. | Apache Flink, ClickHouse, Redis. |
| **Billing Syncer** | Performs daily sync runs pushing collected consumption stats into Stripe or Zuora. | Cron Job, Celery Task Worker. |

---

## Production Rate Limiter (Redis Sliding Window)

To prevent resource starvation and enforce tier limits, apply rate limiting at the gateway level. Below is a production Redis Lua script implementing a thread-safe sliding window rate limiter:

```lua
-- KEYS[1]: Rate limit Redis key (e.g., "ratelimit:user_123:minute")
-- ARGV[1]: Current Unix timestamp (seconds)
-- ARGV[2]: Window size (seconds, e.g., 60 for minute)
-- ARGV[3]: Max requests allowed in window

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local clear_before = now - window

-- Remove timestamps outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', clear_before)

-- Count current items in window
local current_requests = redis.call('ZCARD', key)

if current_requests < limit then
    -- Add current request timestamp
    redis.call('ZADD', key, now, now)
    -- Extend key life to ensure clean-up
    redis.call('EXPIRE', key, window + 5)
    return {1, limit - current_requests - 1} -- Allowed, remaining allowance
else
    return {0, 0} -- Blocked, remaining allowance is 0
end
```

---

## Stripe Usage-Based Billing Synchronization

In usage-based models, you must report developer usage statistics periodically to Stripe using Metered Billing.

```python
import stripe
import time
import logging
from typing import Dict, Any

stripe.api_key = "sk_live_..."

class StripeBillingSyncer:
    def __init__(self, usage_db_client):
        self.db = usage_db_client

    def sync_customer_usage(self, customer_id: str, subscription_item_id: str) -> Dict[str, Any]:
        """
        Queries ClickHouse for customer usage in the last 24 hours
        and reports the aggregated metric to Stripe.
        """
        # 1. Fetch usage from the internal metrics engine
        usage_qty = self.db.get_daily_requests_count(customer_id)
        
        timestamp = int(time.time())
        idempotency_key = f"sync_{customer_id}_{timestamp // 86400}"

        try:
            # 2. Record usage record in Stripe
            record = stripe.SubscriptionItem.create_usage_record(
                subscription_item_id,
                quantity=usage_qty,
                timestamp=timestamp,
                action="set", # Sets the usage quantity directly
                idempotency_key=idempotency_key
            )
            logging.info(f"Successfully synced usage for {customer_id}: {usage_qty} units.")
            return {"status": "success", "stripe_record_id": record.id}
        except stripe.error.StripeError as e:
            logging.error(f"Stripe sync failed for customer {customer_id}: {e}")
            raise RuntimeError("BillingSyncFailed")
```

---

## Service Level Agreements (SLA) & Credit Policy

Monetized APIs must publish clear SLAs. When performance falls below the agreed SLOs, customers receive billing credits.

### Standard SLA Tiers

| Tier | Target Uptime (SLO) | Downtime Limit (Monthly) | Credit Refund |
| :--- | :--- | :--- | :--- |
| **Pro** | 99.9% | < 43.8 minutes | 10% of monthly invoice value if breached |
| **Enterprise** | 99.99% | < 4.38 minutes | 20% of monthly invoice value if breached; scales to 100% on extended downtime |

### SLA Credit Calculation Model

```python
class SlaCreditCalculator:
    def calculate_credit(self, monthly_fee: float, actual_uptime_pct: float, tier: str) -> float:
        """
        Calculates credit refunds based on actual service availability.
        """
        if tier == "enterprise":
            if actual_uptime_pct < 99.0:
                return monthly_fee * 1.0 # 100% refund
            elif actual_uptime_pct < 99.9:
                return monthly_fee * 0.5 # 50% refund
            elif actual_uptime_pct < 99.99:
                return monthly_fee * 0.2 # 20% refund
        elif tier == "pro":
            if actual_uptime_pct < 99.9:
                return monthly_fee * 0.1 # 10% refund
        
        return 0.0
```

---

## Over-Limit Handling Policies

To protect your system while maximizing revenue, implement tiered limit responses:

*   **Soft Limits**: Developer receives email warnings and console alerts once usage hits 80% and 95% of quota. No throttling is applied.
*   **Hard Limits**: Developer requests return `HTTP 429 Too Many Requests` once they hit 100% of the quota.
*   **Auto-Scaling Overages**: Instead of blocking requests, automatically charge an overage rate per additional 1,000 requests (common in enterprise plans).

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with API monetization systems, Redis Lua rate limiters, Stripe syncing script models, and SLA calculators.
-->
