# Schema Registry Ecosystem Tools

## AsyncAPI for Event-Driven Documentation

### Spec Structure
AsyncAPI documents describe event-driven APIs — the event-streaming equivalent of OpenAPI:

```yaml
asyncapi: 3.0.0
info:
  title: Order Events API
  version: 1.0.0
  description: Event-driven API for order lifecycle

channels:
  orders:
    address: orders
    messages:
      orderCreated:
        $ref: '#/components/messages/OrderCreated'
      orderUpdated:
        $ref: '#/components/messages/OrderUpdated'

operations:
  publishOrder:
    action: publish
    channel:
      $ref: '#/channels/orders'
    messages:
      - $ref: '#/channels/orders/messages/orderCreated'

components:
  messages:
    OrderCreated:
      payload:
        schemaFormat: application/vnd.apache.avro+json;version=1.9.0
        schema:
          type: record
          name: OrderCreated
          fields:
            - name: order_id
              type: string
            - name: customer_id
              type: string
            - name: total_amount
              type: double
      headers:
        type: object
        properties:
          correlationId:
            type: string
      bindings:
        kafka:
          bindingVersion: '0.5.0'
          consumerGroup: order-processors
```

### Integration with Schema Registry
Use AsyncAPI as the contract layer above Schema Registry. The AsyncAPI spec references the exact schema from Schema Registry (by subject + version). Generate documentation, client code, and validation from the spec.

### Code Generation
```bash
# Generate documentation
npx @asyncapi/generator asyncapi.yaml @asyncapi/html-template -o docs/

# Generate Kafka client
npx @asyncapi/generator asyncapi.yaml @asyncapi/java-spring-template -o src/generated/
```

---

## JSON Schema (Deep)

### Conditional Validation
```json
{
  "type": "object",
  "properties": {
    "order_type": { "type": "string", "enum": ["physical", "digital"] },
    "weight_kg": { "type": "number" },
    "download_url": { "type": "string", "format": "uri" }
  },
  "if": {
    "properties": { "order_type": { "const": "physical" } }
  },
  "then": {
    "required": ["weight_kg"],
    "properties": { "weight_kg": { "minimum": 0.001, "maximum": 1000 } }
  },
  "else": {
    "required": ["download_url"]
  }
}
```

### Schema Composition
```json
{
  "$defs": {
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" },
        "country": { "type": "string" },
        "postal_code": { "type": "string" }
      },
      "required": ["street", "city", "country"]
    }
  },
  "allOf": [
    { "$ref": "#/$defs/address" },
    { "properties": {
        "shipping_address": { "$ref": "#/$defs/address" }
      }
    }
  ]
}
```

### JSON Schema with Schema Registry (Confluent)
```properties
# Configure Kafka producer for JSON Schema
value.serializer=io.confluent.kafka.serializers.json.KafkaJsonSchemaSerializer
json.schema.enable=true
json.fail.invalid.schema=true
json.oneof.for.nullables=true
auto.register.schemas=false
```

---

## Buf for Protobuf Governance

### Config Structure
```yaml
# buf.yaml
version: v2
modules:
  - path: proto
    lint:
      use:
        - STANDARD        # 100+ default lint rules
        - COMMENTS        # Require comments on all public RPCs/fields
      except:
        - PACKAGE_DIRECTORY_MATCH
    breaking:
      use:
        - FILE            # Detect breaking changes at file level
        - WIRE_JSON       # Also check JSON wire compatibility
deps:
  - buf.build/googleapis/googleapis
```

### CI/CD Integration
```bash
# Check for breaking changes against main branch
buf breaking --against '.git#branch=main'

# Lint all proto files
buf lint

# Generate code for all languages
buf generate

# Push to Buf Schema Registry
buf push
```

### Buf Schema Registry (BSR)
BSR acts as a hosted Protobuf registry:
```yaml
# buf.gen.yaml — code generation config
version: v2
managed:
  enabled: true
plugins:
  - plugin: buf.build/protocolbuffers/go:v1.32.0
    out: gen/go
  - plugin: buf.build/grpc/go:v1.3.0
    out: gen/go
  - plugin: buf.build/protocolbuffers/python:v25.0
    out: gen/python
```

BSR features:
- Schema registry for Protobuf (like Confluent SR for Avro)
- Dependency management (import other teams' protos via `buf deps`)
- Generated SDK repositories (auto-publish client libraries)
- Breaking change detection in CI/CD gate

## Tool Integration Summary

| Tool | Role | Schema Format | Integration |
|------|------|--------------|-------------|
| **AsyncAPI** | Event API documentation | Avro/Protobuf/JSON Schema | References SR schemas |
| **JSON Schema** | Payload validation | JSON | Confluent SR, Apicurio |
| **Buf** | Protobuf governance | Protobuf | BSR, CI/CD gates |
| **Confluent SR** | Schema registry | Avro/Protobuf/JSON Schema | Kafka ecosystem |
| **Apicurio** | Open-source SR | Avro/Protobuf/JSON/OpenAPI | Multi-format |
