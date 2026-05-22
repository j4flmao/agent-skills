# Schema Registry Setup

## Confluent Schema Registry

### Docker Deployment

```yaml
version: "3"
services:
  schema-registry:
    image: confluentinc/cp-schema-registry:7.6.0
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: "kafka1:9092,kafka2:9092"
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_LISTENERS: "http://0.0.0.0:8081"
      SCHEMA_REGISTRY_KAFKASTORE_TOPIC: "_schemas"
      SCHEMA_REGISTRY_KAFKASTORE_TOPIC_REPLICATION_FACTOR: 3
      SCHEMA_REGISTRY_COMPATIBILITY_GROUP: "backward-compatibility-group"
      SCHEMA_REGISTRY_INTER_INSTANCE_PROTOCOL: "kafka"
      SCHEMA_REGISTRY_ACCESS_CONTROL_ALLOW_METHODS: "GET,POST,PUT,DELETE"
      SCHEMA_REGISTRY_ACCESS_CONTROL_ALLOW_ORIGIN: "*"
```

### REST API

```bash
# Register schema
POST /subjects/orders-value/versions
{
  "schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"order_id\",\"type\":\"string\"}]}"
}
# Response: {"id": 1, "version": 1}

# List subjects
GET /subjects
# Response: ["orders-value", "orders-key", "customer-value"]

# Check compatibility
POST /compatibility/subjects/orders-value/versions
{
  "schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"order_id\",\"type\":\"string\"},{\"name\":\"currency\",\"type\":\"string\",\"default\":\"USD\"}]}"
}
# Response: {"is_compatible": true}

# Get schema by ID
GET /schemas/ids/1
# Response: {"schema": "{\"type\":\"record\",...}"}

# Update compatibility level
PUT /config/orders-value
{
  "compatibility": "FULL"
}
```

### Kafka SerDe Configuration

```java
// Producer with schema registry
Properties props = new Properties();
props.put("bootstrap.servers", "kafka:9092");
props.put("key.serializer", "io.confluent.kafka.serializers.KafkaAvroSerializer");
props.put("value.serializer", "io.confluent.kafka.serializers.KafkaAvroSerializer");
props.put("schema.registry.url", "http://schema-registry:8081");
props.put("auto.register.schemas", "false");
props.put("use.latest.version", "true");
// auto.register.schemas=false — schema must be pre-registered via CI/CD
// use.latest.version=true — auto-resolve to latest compatible version

// Consumer
props.put("key.deserializer", "io.confluent.kafka.serializers.KafkaAvroDeserializer");
props.put("value.deserializer", "io.confluent.kafka.serializers.KafkaAvroDeserializer");
props.put("schema.registry.url", "http://schema-registry:8081");
props.put("specific.avro.reader", "true");
```

## Apicurio Registry

### Docker Deployment

```yaml
services:
  apicurio-registry:
    image: apicurio/apicurio-registry-sql:3.0.0
    ports:
      - "8081:8080"
    environment:
      REGISTRY_DATASOURCE_URL: jdbc:postgresql://postgres:5432/apicurio
      REGISTRY_DATASOURCE_USERNAME: apicurio
      REGISTRY_DATASOURCE_PASSWORD: ${APICURIO_PASSWORD}
      REGISTRY_AUTH_ENABLED: "true"
      REGISTRY_AUTH_SERVER_URL: "http://keycloak:8080/auth/realms/apicurio"
      REGISTRY_AUTH_CLIENT_ID: "apicurio-registry"
```

### Multi-Format Support

```bash
# Avro
POST /api/artifacts
Content-Type: application/vnd.avro+json
{ "schema": "{\"type\":\"record\",\"name\":\"Order\",...}" }

# Protobuf
POST /api/artifacts
Content-Type: application/x-protobuf
{ "schema": "syntax = \"proto3\"; message Order { string order_id = 1; }" }

# JSON Schema
POST /api/artifacts
Content-Type: application/schema+json
{ "schema": "{ \"type\": \"object\", \"properties\": { \"order_id\": { \"type\": \"string\" } } }" }
```

## CI/CD Integration

```yaml
# .github/workflows/schema-governance.yml
name: Schema Governance
on:
  pull_request:
    paths:
      - 'schemas/**/*.avsc'

jobs:
  validate:
    runs-on: ubuntu-latest
    services:
      schema-registry:
        image: confluentinc/cp-schema-registry:7.6.0
        ports:
          - 8081:8081
        env:
          SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: localhost:9092
          SCHEMA_REGISTRY_HOST_NAME: localhost
        options: >-
          --health-cmd "curl -f http://localhost:8081/ || exit 1"
          --health-interval 10s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install requests avro

      - name: Validate All Schemas
        run: |
          python scripts/validate_avro_schemas.py schemas/

      - name: Register Base Schemas
        run: |
          python scripts/register_schemas.py \
            --registry http://localhost:8081 \
            --schemas schemas/

      - name: Check Compatibility
        run: |
          python scripts/check_compatibility.py \
            --registry http://localhost:8081 \
            --schemas schemas/ \
            --mode BACKWARD

      - name: Notify Breaking Changes
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: '{"channel":"#schema-alerts","text":":alert: Breaking schema change in ${{ github.ref_name }}"}'
```

## Security

```properties
# Schema Registry SSL
SCHEMA_REGISTRY_LISTENERS=https://0.0.0.0:8081
SCHEMA_REGISTRY_SSL_KEYSTORE_LOCATION=/etc/schema-registry/keystore.jks
SCHEMA_REGISTRY_SSL_KEYSTORE_PASSWORD=${SSL_PASSWORD}
SCHEMA_REGISTRY_SSL_KEY_PASSWORD=${SSL_PASSWORD}
SCHEMA_REGISTRY_SSL_TRUSTSTORE_LOCATION=/etc/schema-registry/truststore.jks

# Schema Registry Basic Auth
SCHEMA_REGISTRY_AUTHENTICATION_ENABLED=true
SCHEMA_REGISTRY_AUTHENTICATION_REALM=schema-registry
# JAAS config for user auth
```
