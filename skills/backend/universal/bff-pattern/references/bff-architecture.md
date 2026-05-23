# BFF Architecture

## Pattern Overview

Backend-for-Frontend (BFF) — a dedicated backend per client type (web, mobile, IoT). Each BFF owns the API contract for its client.

```
[Mobile App] ──→ [Mobile BFF] ──→ [Microservices]
[Web App]    ──→ [Web BFF]    ──→ [Microservices]
[IoT Device] ──→ [IoT BFF]    ──→ [Microservices]
```

## Aggregation

BFF aggregates responses from multiple downstream services into one client-friendly payload.

```python
async def get_order_summary(order_id: str):
    order = await orders_service.get(order_id)
    user = await users_service.get(order["user_id"])
    items = await inventory_service.get_items(order["item_ids"])
    return {
        "order": order,
        "user": {"name": user["name"], "email": user["email"]},
        "items": items,
        "total": order["total"],
    }
```

## Device-Specific APIs

Each BFF tailors responses to device capabilities:

- **Mobile BFF**: Smaller payloads, paginated lists, optimized images.
- **Web BFF**: Richer responses, includes metadata for SEO.
- **IoT BFF**: Minimal JSON, binary protocols (Protocol Buffers).

## Gateway Composition

Route all client traffic through a single gateway that dispatches to the correct BFF:

```yaml
routes:
- match: { header: { "x-client-type": "mobile" } }
  route: { cluster: mobile_bff }
- match: { header: { "x-client-type": "web" } }
  route: { cluster: web_bff }
```

## Benefits & Drawbacks

| Pro | Con |
|-----|-----|
| Optimized per-client payloads | Code duplication across BFFs |
| Client-specific logic isolated | More services to deploy |
| Easier iteration per platform | Shared service contract coordination |
