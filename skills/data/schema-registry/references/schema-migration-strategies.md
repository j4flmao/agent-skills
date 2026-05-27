# Schema Migration Strategies

## Schema Evolution in Event-Driven Systems
Schema migrations in streaming systems require careful planning because multiple producers and consumers operate independently. Breaking changes can cause cascading failures.

## Compatibility Modes

### Backward Compatibility
New schema can read data produced with the old schema. Consumers can be upgraded before producers.

```avro
{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "total_amount", "type": "double"},
    {"name": "discount_amount", "type": ["null", "double"], "default": null}
  ]
}
```

### Forward Compatibility
Old schema can read data produced with the new schema. Producers can be upgraded before consumers.

```avro
{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "total_amount", "type": "double"}
  ]
}
```

### Full Compatibility
Both forward and backward compatibility. Schema can evolve in either direction.

## Versioning Strategies

### Linear Versioning
```
v1.0.0 -> v1.1.0 -> v2.0.0
  (add fields)  (remove fields)
```

### Compatible Schema Registry Rules
```python
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer

class SchemaMigrationManager:
    def __init__(self, registry_url, subject):
        self.client = SchemaRegistryClient({"url": registry_url})
        self.subject = subject

    def register_new_version(self, schema_str, compatibility="BACKWARD"):
        """Register a new schema version with compatibility check."""
        self.client.set_compatibility(self.subject, compatibility)
        schema_id = self.client.register_schema(self.subject, schema_str)
        return schema_id

    def check_compatibility(self, new_schema_str, latest_version=-1):
        """Check if a new schema is compatible with existing versions."""
        compatible = self.client.test_compatibility(
            self.subject, new_schema_str, latest_version
        )
        return compatible

    def get_schema_diff(self, version_a, version_b):
        """Compare two schema versions."""
        schema_a = self.client.get_latest_version(self.subject) \
            if version_a == -1 else self.client.get_version(self.subject, version_a)
        schema_b = self.client.get_latest_version(self.subject) \
            if version_b == -1 else self.client.get_version(self.subject, version_b)
        return self._diff_schemas(schema_a.schema.schema_str, schema_b.schema.schema_str)
```

## Rolling Upgrade Patterns

### Blue-Green Producer Migration
```python
class RollingSchemaUpgrade:
    def __init__(self, schema_registry, kafka_producer, topic):
        self.registry = schema_registry
        self.producer = kafka_producer
        self.topic = topic

    def dual_write_phase(self, old_schema, new_schema, old_topic, new_topic):
        """Write to both old and new topics during migration."""
        def produce_dual_message(key, data):
            old_data = old_schema.convert_to_old(data)
            new_data = new_schema.convert_to_new(data)
            self.producer.produce(old_topic, key=key, value=old_data)
            self.producer.produce(new_topic, key=key, value=new_data)
        return produce_dual_message

    def migrate_consumers(self, old_topic, new_topic, consumer_group):
        """Migrate consumers from old to new topic."""
        return {
            "old_topic": old_topic,
            "new_topic": new_topic,
            "consumer_group": consumer_group,
            "strategy": "read_new_first",
            "verification": "compare_record_counts"
        }
```

## Key Points
- Always test schema compatibility before deploying changes
- Prefer additive changes (new optional fields) over breaking changes
- Use dual-write patterns for zero-downtime migrations
- Coordinate producer/consumer upgrade order based on compatibility mode
- Monitor schema registry for unexpected registrations
- Document schema evolution with metadata annotations
- Use schema versioning in data contracts for governance
- Automate compatibility checks in CI/CD pipelines
- Implement rollback procedures for failed migrations
- Keep schema history for audit and debugging
