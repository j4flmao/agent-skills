# Schema Registry Operations Reference

## Confluent Schema Registry API

```bash
# Register schema version
curl -X POST http://sr:8081/subjects/orders-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"}]}"}'

# Get versions
curl http://sr:8081/subjects/orders-value/versions

# Check compatibility
curl -X POST http://sr:8081/compatibility/subjects/orders-value/versions/latest \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"total\",\"type\":\"double\",\"default\":0.0}]}"}'

# List/delete subjects
curl http://sr:8081/subjects
curl -X DELETE http://sr:8081/subjects/orders-value
curl -X DELETE http://sr:8081/subjects/orders-value?permanent=true
```

## Apicurio Registry

Standalone (no Kafka dependency), stores schemas in a database. Supports Avro/Protobuf/JSON Schema plus GraphQL/OpenAPI/AsyncAPI. Uses rule policies: **VALIDITY** (syntax check), **COMPATIBILITY** (same modes as Confluent), **INTEGRITY** (reference validation).

## Schema Evolution Rules

| Mode | Add Field | Remove Field | Change Type | Safe For |
|------|-----------|-------------|-------------|----------|
| **BACKWARD** | Yes (with default) | Yes | No | New consumers reading old data |
| **FORWARD** | Yes | Yes (with default) | No | Old consumers reading new data |
| **FULL** | Yes (with default) | No | No | Both directions |
| **NONE** | Any | Any | Any | Dev/test |

Transitive variants (BACKWARD_TRANSITIVE, etc.) enforce against all earlier versions.

### Avro Evolution Rules

```avro
// v1 — original
{"name": "Order", "type": "record", "fields": [
  {"name": "id", "type": "string"},
  {"name": "amount", "type": "double"}
]}

// v2 — backward compatible (default on new field)
{"name": "Order", "type": "record", "fields": [
  {"name": "id", "type": "string"},
  {"name": "amount", "type": "double"},
  {"name": "currency", "type": "string", "default": "USD"}
]}

// Changing "amount" from "double" to "string" is NEVER compatible
```

## CI/CD Schema Governance

```yaml
jobs:
  schema-check:
    steps:
      - uses: actions/checkout@v4
      - name: Validate syntax
        run: |
          for s in schemas/**/*.avsc; do
            python -c "import fastavro,json; fastavro.parse_schema(json.load(open('$s')))"
          done
      - name: Check compatibility
        run: |
          for s in schemas/**/*.avsc; do
            subject=$(basename $s .avsc)-value
            curl -s -X POST "$SR/compatibility/subjects/$subject/versions/latest" \
              -H "Content-Type: application/vnd.schemaregistry.v1+json" \
              -d "{\"schema\": $(cat $s | jq -Rs)}" | jq -e '.is_compatible == true'
          done
      - name: Register (main only)
        if: github.ref == 'refs/heads/main'
        run: |
          for s in schemas/**/*.avsc; do
            subject=$(basename $s .avsc)-value
            curl -X POST "$SR/subjects/$subject/versions" \
              -H "Content-Type: application/vnd.schemaregistry.v1+json" \
              -d "{\"schema\": $(cat $s | jq -Rs)}"
          done
```

## Serialization Patterns

```python
sr = SchemaRegistryClient({"url": "http://schema-registry:8081"})
ser = AvroSerializer(sr, schema_str, lambda obj, ctx: obj)
producer.produce(topic="orders", value={"id": "123", "amount": 99.99},
                 value_serializer=ser)
```

```java
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class.getName());
props.put(KafkaAvroSerializerConfig.SCHEMA_REGISTRY_URL_CONFIG, "http://schema-registry:8081");
props.put(KafkaAvroSerializerConfig.AUTO_REGISTER_SCHEMAS, "false");
```

## Production Rules

- Every Kafka topic has key + value schema registered
- Production topics enforce BACKWARD or FULL compatibility
- `auto.register.schemas = false` in production producers
- Schema changes reviewed via PR before registration
- Enum symbols never removed once data exists in topics
