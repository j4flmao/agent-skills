# DynamoDB and Couchbase Reference

## Single-Table Design

### Composite Key Patterns
| Entity | PK | SK |
|---------|-----|-----|
| Customer | `CUST#<id>` | `META` |
| Order | `ORD#<id>` | `META` |
| Order Items | `ORD#<id>` | `ITEM#<sku>` |
| Customer Orders | `CUST#<id>` | `ORD#<date>#<id>` |
| Product | `PROD#<sku>` | `META` |

```javascript
// Query customer orders sorted by date
const params = {
    TableName: "shop",
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
    ExpressionAttributeValues: {
        ":pk": "CUST#123",
        ":sk_prefix": "ORD#",
    },
    ScanIndexForward: false,
    Limit: 10,
};
```

## GSI and LSI Design

```javascript
const params = {
    TableName: "shop",
    KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [{
        IndexName: "GSI-Status-Date",
        KeySchema: [
            { AttributeName: "GSI1PK", KeyType: "HASH" },
            { AttributeName: "GSI1SK", KeyType: "RANGE" },
        ],
        Projection: {
            ProjectionType: "INCLUDE",
            NonKeyAttributes: ["customer_id", "total"],
        },
    }],
    LocalSecondaryIndexes: [{
        IndexName: "LSI-Customer-Name",
        KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "customer_name", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
    }],
};
```

### GSI Overloading
```javascript
// Single GSI for multiple access patterns
// Order: GSI1PK = "STATUS#shipped", GSI1SK = "2025-03-15#ORD-001"
// Customer: GSI1PK = "TIER#premium", GSI1SK = "CUST#123"
// Product: GSI1PK = "CAT#electronics", GSI1SK = "PROD#SKU-001"

const params = {
    TableName: "shop", IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end",
};
```

## DAX

```javascript
const dax = new AmazonDaxClient({ endpoints: ["my-dax.cluster:8111"] });
const docClient = new AWS.DynamoDB.DocumentClient({ service: dax });
// Use for: read-heavy, hot keys. Avoid: strong consistency.
```

## Couchbase N1QL

```sql
CREATE PRIMARY INDEX ON `shop`;
CREATE INDEX idx_orders_customer ON `shop`(customer_id, status) WHERE type = "order";

SELECT o.*, c.name FROM `shop` o
JOIN `shop` c ON KEYS o.customer_id
WHERE o.type = "order" AND o.status = "shipped" AND o.total > 100
ORDER BY o.created_at DESC LIMIT 20;
```

## Denormalization Patterns

| Pattern | When to Use |
|---------|-------------|
| Embedding | Accessed together, one-to-few |
| Duplication | Read performance > write cost |
| Computed fields | Frequent reads of aggregates |
| Pre-joined tables | Multiple query patterns needed |

```javascript
{
  "PK": "ORD#001", "SK": "META",
  "customer_name": "Acme Corp",
  "shipping_address": "123 Main St, City, State 12345",
  "items": [{ "sku": "PROD-A", "name": "Widget", "qty": 2, "price": 50.00 }],
  "total": 100.00
}
```

## Consistency Models

| Level | DynamoDB | Cassandra | MongoDB |
|-------|----------|-----------|---------|
| Strong | Yes (1 RCU) | ALL | majority w, primary r |
| Eventual | Default reads | ONE | secondary read |
| Quorum | No | LOCAL_QUORUM | majority w+r |

```javascript
// DynamoDB strongly consistent
const params = { TableName: "shop", Key: { PK: "ORD#001", SK: "META" }, ConsistentRead: true };
```

```cql
SELECT * FROM orders WHERE customer_id = '123' USING CONSISTENCY LOCAL_QUORUM;
```

## References
- DynamoDB docs: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/
- Couchbase docs: https://docs.couchbase.com/
