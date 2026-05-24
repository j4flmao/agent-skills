# Conflict Resolution Reference

## Last-Writer-Wins (LWW)

LWW is the simplest conflict resolution strategy: the write with the most recent timestamp wins.

### How LWW Works

```sql
-- Each write includes a timestamp
-- On conflict, the write with the highest timestamp wins
-- Older writes are discarded silently

-- Example: customer profile updates
-- Write 1: Region A at T1: {"name": "Alice", "email": "alice@old.com"}
-- Write 2: Region B at T2: {"name": "Alice", "email": "alice@new.com"}
-- If T2 > T1, Write 2 wins → email = "alice@new.com"

-- LWW implementation in Cassandra
CREATE TABLE customer_profile (
    customer_id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    updated_at TIMESTAMP
);
-- Cassandra uses the latest timestamp for each column by default
```

### LWW with Debezium

```json
{
  "op": "u",
  "after": {
    "customer_id": "CUST-001",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "updated_at": 1712345678000
  },
  "source": {
    "ts_ms": 1712345678000,
    "db": "sales",
    "table": "customers"
  }
}

// Debezium conflict resolution: LWW by source.ts_ms
// If two CDC events arrive for the same row:
// - Compare source.ts_ms
// - Higher timestamp = winner
// - Lower timestamp = ignore
```

### When to Use LWW

**Good for LWW:**
- Status updates (order status, user state)
- Simple field updates (name, description)
- Non-critical data where some loss is acceptable
- Counters and metrics

**Bad for LWW:**
- Financial transactions (data loss unacceptable)
- Shopping cart contents (item removal may be lost)
- Document editing (concurrent edits need merge)
- Any case where losing a write has significant business impact

## CRDTs (Conflict-Free Replicated Data Types)

CRDTs are data structures designed to be mergeable without conflicts, guaranteeing eventual consistency.

### CRDT Types

```python
class GCounter:
    """G-Counter (Grow-only Counter): increment-only counter."""
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.counts = {}  # node_id → count

    def increment(self):
        self.counts[self.node_id] = self.counts.get(self.node_id, 0) + 1

    def value(self) -> int:
        return sum(self.counts.values())

    def merge(self, other: 'GCounter'):
        for node, count in other.counts.items():
            self.counts[node] = max(self.counts.get(node, 0), count)


class PNCounter:
    """PN-Counter (Positive-Negative Counter): supports both increments and decrements."""
    def __init__(self, node_id: str):
        self.positive = GCounter(node_id)
        self.negative = GCounter(node_id)

    def increment(self):
        self.positive.increment()

    def decrement(self):
        self.negative.increment()

    def value(self) -> int:
        return self.positive.value() - self.negative.value()

    def merge(self, other: 'PNCounter'):
        self.positive.merge(other.positive)
        self.negative.merge(other.negative)


class ORSet:
    """OR-Set (Observed-Remove Set): supports add and remove operations."""
    def __init__(self):
        self.elements = {}  # element → {tag: tag_id}

    def add(self, element):
        tag = f"{element}_{id(self)}_{time.time()}"
        self.elements[element] = self.elements.get(element, set()) | {tag}

    def remove(self, element):
        self.elements[element] = set()  # Clear all tags

    def value(self) -> set:
        return {elem for elem, tags in self.elements.items() if tags}

    def merge(self, other: 'ORSet'):
        for element, tags in other.elements.items():
            if element in self.elements:
                self.elements[element] |= tags
            else:
                self.elements[element] = tags.copy()


class LWWRegister:
    """LWW-Register: Last-Writer-Wins register with timestamp."""
    def __init__(self):
        self.value = None
        self.timestamp = 0

    def set(self, value, timestamp=None):
        if timestamp is None:
            timestamp = time.time()
        if timestamp > self.timestamp:
            self.value = value
            self.timestamp = timestamp

    def get(self):
        return self.value

    def merge(self, other: 'LWWRegister'):
        if other.timestamp > self.timestamp:
            self.value = other.value
            self.timestamp = other.timestamp


class MVRegister:
    """MV-Register (Multi-Value Register): keeps all concurrent values."""
    def __init__(self):
        self.values = {}  # value → set of dots (version vectors)

    def set(self, value):
        # Create new dot based on current clock
        dot = self._next_dot()
        self.values = {value: {dot}}

    def value(self) -> set:
        return set(self.values.keys())

    def merge(self, other: 'MVRegister'):
        merged = {}
        for val, dots in list(self.values.items()) + list(other.values.items()):
            for dot in dots:
                if val not in merged:
                    merged[val] = set()
                merged[val].add(dot)
        # Remove values whose dots are superseded
        self.values = merged
```

### CRDT in Practice: Shopping Cart

```python
class ShoppingCartCRDT:
    """Shopping cart using OR-Set for conflict-free merging."""
    def __init__(self, cart_id: str):
        self.cart_id = cart_id
        self.items = ORSet()

    def add_item(self, product_id: str):
        self.items.add(f"product:{product_id}")

    def remove_item(self, product_id: str):
        self.items.remove(f"product:{product_id}")

    def get_items(self) -> list[str]:
        return [item.replace("product:", "") for item in self.items.value()]

    def merge(self, other: 'ShoppingCartCRDT'):
        self.items.merge(other.items)

# Example: concurrent editing of same cart
cart_a = ShoppingCartCRDT("cart-1")
cart_b = ShoppingCartCRDT("cart-1")

cart_a.add_item("item-1")
cart_a.add_item("item-2")

cart_b.add_item("item-2")
cart_b.remove_item("item-3")  # No conflict — item-3 wasn't there

# Merge carts from two regions
cart_a.merge(cart_b)
# Result: {"item-1", "item-2"} — correctly merged
```

## Merge Strategies

### Application-Level Merge

```python
def merge_customer_profiles(
    current: dict,
    incoming: dict,
    strategy: str = "field_level"
) -> dict:
    """Merge two versions of a customer profile."""
    merged = current.copy()

    if strategy == "field_level":
        # Per-field LWW: each field takes latest timestamp
        for field, value in incoming.items():
            if field.endswith("_ts"):
                continue
            ts_field = f"{field}_ts"
            if incoming.get(ts_field, 0) >= current.get(ts_field, 0):
                merged[field] = value
                merged[ts_field] = incoming[ts_field]

    elif strategy == "union":
        # Union: combine all values
        for field in set(list(current.keys()) + list(incoming.keys())):
            if field.endswith("_ts"):
                continue
            if isinstance(current.get(field), list) and isinstance(incoming.get(field), list):
                merged[field] = list(set(current[field] + incoming[field]))
            elif isinstance(current.get(field), dict) and isinstance(incoming.get(field), dict):
                merged[field] = {**current[field], **incoming[field]}
            else:
                merged[field] = incoming.get(field, current.get(field))

    return merged
```

### Custom Conflict Handlers

```sql
-- PostgreSQL: custom conflict resolution in MERGE
MERGE INTO customers c
USING (
    SELECT
        customer_id,
        name,
        email,
        updated_at,
        source_region
    FROM inbound_updates
) src ON c.customer_id = src.customer_id

WHEN MATCHED AND src.updated_at > c.updated_at THEN
    -- LWW: newer timestamp wins
    UPDATE SET
        name = src.name,
        email = src.email,
        updated_at = src.updated_at,
        last_updated_by_region = src.source_region

WHEN NOT MATCHED THEN
    INSERT (customer_id, name, email, updated_at, last_updated_by_region)
    VALUES (src.customer_id, src.name, src.email, src.updated_at, src.source_region);
```

## Conflict Detection

### Detecting Conflicts

```python
class ConflictDetector:
    """Detect replication conflicts based on version vectors."""

    def __init__(self):
        self.conflict_log = []

    def detect_conflict(self, doc_id: str, version_a: dict, version_b: dict) -> bool:
        """Check if two versions have conflicting changes."""
        # Simple detection: same field changed in both versions
        conflicting_fields = []
        for field in version_a.get('changes', {}):
            if field in version_b.get('changes', {}):
                if version_a['changes'][field] != version_b['changes'][field]:
                    conflicting_fields.append(field)

        if conflicting_fields:
            self.conflict_log.append({
                'doc_id': doc_id,
                'conflicting_fields': conflicting_fields,
                'version_a': version_a,
                'version_b': version_b,
                'detected_at': datetime.utcnow().isoformat()
            })
            return True
        return False

    def resolve_auto(self, doc_id: str) -> dict:
        """Attempt automatic resolution for known conflict patterns."""
        conflict = self._get_conflict(doc_id)
        if not conflict:
            return None

        resolution = None
        if self._is_add_only(conflict):
            resolution = self._union_merge(conflict)
        elif self._is_counter(conflict):
            resolution = self._sum_merge(conflict)
        else:
            resolution = self._lww_resolve(conflict)

        return resolution
```

## Geo-Distribution Conflict Patterns

### Common Patterns

| Pattern | Description | Resolution |
|---------|-------------|------------|
| Write-write conflict | Two regions update same record | LWW, CRDT, or custom merge |
| Write-delete conflict | One region updates, another deletes | LWW (delete wins if newer) |
| Add-add conflict | Both regions add item to set | OR-Set (both added) |
| Remove-remove conflict | Both remove same item | Idempotent (no effect) |
| Add-remove conflict | One adds, one removes | LWW or custom (last op wins) |

### Multi-Region Conflict Config

```yaml
conflict_resolution:
  default_strategy: lww
  strategies:
    customer_profile:
      strategy: field_level_lww
      timestamp_column: updated_at

    shopping_cart:
      strategy: crdt
      crdt_type: or_set
      id_field: cart_id

    inventory_count:
      strategy: crdt
      crdt_type: pn_counter
      id_field: product_id

    product_catalog:
      strategy: custom
      handler: merge_product_catalogs
      conflict_table: product_conflicts

  auto_resolve:
    - pattern: add_only
      strategy: union
    - pattern: counter
      strategy: sum
    - pattern: timestamp_based
      strategy: lww

  manual_resolve:
    - description: "High-value financial conflicts"
      criteria: "amount > 10000 AND conflicting_fields includes 'balance'"
      notification: "pagerduty"
      sla_hours: 4
```

## Rules
- LWW is the simplest strategy; use it when data loss is acceptable
- CRDTs for data structures where concurrent writes are common
- Application-level merge for complex business objects
- Detect conflicts by comparing version vectors or timestamps
- Document conflict resolution strategy per data type
- Log all conflicts for audit and analysis
- Auto-resolve known patterns; escalate complex conflicts to manual
- Test conflict resolution with concurrent write simulations
- CRDTs guarantee convergence but not always expected semantics
- Monitor conflict rate; high rates indicate design issues
