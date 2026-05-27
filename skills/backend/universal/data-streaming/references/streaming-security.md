# Streaming Security

## Overview
Secure Kafka and streaming infrastructure: authentication, authorization, encryption, audit logging, schema validation, and compliance.

## SASL Authentication

```properties
# Kafka server.properties
listeners=SASL_SSL://0.0.0.0:9093
advertised.listeners=SASL_SSL://kafka.example.com:9093
security.inter.broker.protocol=SASL_SSL
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512
sasl.enabled.mechanisms=SCRAM-SHA-512
ssl.keystore.location=/var/private/ssl/kafka.keystore.jks
ssl.keystore.password=${KEYSTORE_PASSWORD}
ssl.truststore.location=/var/private/ssl/kafka.truststore.jks
ssl.truststore.password=${TRUSTSTORE_PASSWORD}
ssl.client.auth=required
```

```typescript
// Producer with SASL_SSL
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka.example.com:9093'],
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync('/etc/ssl/certs/kafka-ca.crt', 'utf-8')],
    key: fs.readFileSync('/etc/ssl/certs/client.key', 'utf-8'),
    cert: fs.readFileSync('/etc/ssl/certs/client.crt', 'utf-8'),
  },
  sasl: {
    mechanism: 'scram-sha-512',
    username: process.env.KAFKA_USERNAME!,
    password: process.env.KAFKA_PASSWORD!,
  },
});
```

## ACL-Based Authorization

```bash
# Define ACLs for producer role
kafka-acls.sh --authorizer-properties \
  zookeeper.connect=zookeeper:2181 \
  --add \
  --allow-principal User:order-service \
  --operation Write \
  --operation Describe \
  --topic order.created.v1

# Define ACLs for consumer role
kafka-acls.sh --authorizer-properties \
  zookeeper.connect=zookeeper:2181 \
  --add \
  --allow-principal User:payment-service \
  --operation Read \
  --operation Describe \
  --consumer \
  --group payment-processor \
  --topic order.created.v1

# Restrict consumer group access
kafka-acls.sh --authorizer-properties \
  zookeeper.connect=zookeeper:2181 \
  --add \
  --allow-principal User:order-processor \
  --operation Read \
  --operation Describe \
  --consumer \
  --group order-processor-* \
  --topic order.created.v1
```

## Topic-Level Encryption

```typescript
import { createCipheriv, randomBytes } from 'crypto';

class TopicEncryption {
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly key: Buffer) {}

  encrypt(value: Buffer): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  decrypt(data: Buffer): Buffer {
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
```

## Schema Validation

```typescript
class SchemaValidationInterceptor {
  private schemas: Map<string, object> = new Map();

  registerSchema(topic: string, schema: object): void {
    this.schemas.set(topic, schema);
  }

  validateMessage(topic: string, message: unknown): boolean {
    const schema = this.schemas.get(topic);
    if (!schema) return false;

    // Validate required fields
    const required = (schema as any).required ?? [];
    for (const field of required) {
      if ((message as any)[field] === undefined) {
        return false;
      }
    }

    // Validate field types
    const properties = (schema as any).properties ?? {};
    for (const [field, value] of Object.entries(message as object)) {
      const typeDef = properties[field];
      if (!typeDef) return false;

      if (typeDef.type === 'string' && typeof value !== 'string') return false;
      if (typeDef.type === 'number' && typeof value !== 'number') return false;
      if (typeDef.type === 'array' && !Array.isArray(value)) return false;
    }

    return true;
  }
}
```

## Audit Logging

```typescript
interface AuditEvent {
  timestamp: Date;
  principal: string;
  action: 'PRODUCE' | 'CONSUME' | 'CREATE_TOPIC' | 'DELETE_TOPIC' | 'ALTER_CONFIG';
  resource: string;
  result: 'SUCCESS' | 'DENIED' | 'ERROR';
  details?: Record<string, unknown>;
}

class StreamAuditLogger {
  async log(event: AuditEvent): Promise<void> {
    await AuditLog.create({
      ...event,
      timestamp: event.timestamp ?? new Date(),
    });

    if (event.result === 'DENIED') {
      await AlertService.send({
        type: 'UNAUTHORIZED_STREAM_ACCESS',
        severity: 'high',
        principal: event.principal,
        action: event.action,
        resource: event.resource,
        timestamp: event.timestamp,
      });
    }
  }

  async getAccessReport(principal: string, days: number): Promise<AuditReport> {
    const since = new Date(Date.now() - days * 86400000);
    const events = await AuditLog.find({
      principal,
      timestamp: { $gte: since },
    }).lean();

    return {
      principal,
      days,
      totalEvents: events.length,
      deniedEvents: events.filter(e => e.result === 'DENIED').length,
      eventsByAction: this.groupBy(events, 'action'),
      eventsByResource: this.groupBy(events, 'resource'),
    };
  }
}
```

## Network Segmentation

```yaml
# Docker Compose with secure network zones
networks:
  streaming-internal:
    driver: overlay
    internal: true  # No external access
    ipam:
      config:
        - subnet: 10.30.0.0/16
  streaming-client:
    driver: overlay
    ipam:
      config:
        - subnet: 10.31.0.0/16

services:
  kafka:
    image: confluentinc/cp-kafka:latest
    networks:
      - streaming-internal
    environment:
      KAFKA_LISTENERS: |
        SASL_SSL://0.0.0.0:9093,
        INTERNAL://0.0.0.0:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: |
        SASL_SSL:SASL_SSL,
        INTERNAL:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: |
        SASL_SSL://kafka.example.com:9093,
        INTERNAL://kafka:9092

  schema-registry:
    image: confluentinc/cp-schema-registry
    networks:
      - streaming-internal
    environment:
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: PLAINTEXT://kafka:9092
      SCHEMA_REGISTRY_AUTHENTICATION: BASIC
      SCHEMA_REGISTRY_AUTHENTICATION_REALM: SchemaRegistry

  app:
    networks:
      - streaming-client
    depends_on:
      - kafka
```

## Compliance Checks

```typescript
class StreamComplianceChecker {
  async checkPCICompliance(): Promise<ComplianceResult> {
    const topics = await this.admin.listTopics();
    const issues: ComplianceIssue[] = [];

    for (const topic of topics) {
      const config = await this.admin.fetchTopicMetadata({ topics: [topic] });
      const hasEncryption = config.topics[0]?.configEntries?.some(
        (e) => e.name === 'encryption.type' && e.value === 'AES-256-GCM'
      );

      if (!hasEncryption) {
        issues.push({
          topic,
          severity: 'CRITICAL',
          message: 'Topic does not have encryption enabled (PCI Req 3.4)',
        });
      }

      // Check ACLs are defined
      const acls = await this.aclProvider.getACLs(topic);
      if (acls.length === 0) {
        issues.push({
          topic,
          severity: 'HIGH',
          message: 'No ACLs defined for topic (PCI Req 7)',
        });
      }
    }

    return { compliant: issues.length === 0, issues };
  }

  async checkGDPRCompliance(): Promise<ComplianceResult> {
    const issues: ComplianceIssue[] = [];

    // Check that consumer groups have offset retention for right to erasure
    const groups = await this.admin.listGroups();
    for (const group of groups.groups) {
      const description = await this.admin.describeGroups([group.groupId]);
      const hasOffsetRetention = description.groups[0]?.protocol === 'consumer';

      if (!hasOffsetRetention) {
        issues.push({
          topic: group.groupId,
          severity: 'MEDIUM',
          message: 'Consumer group offset retention not configured (GDPR Art 17)',
        });
      }
    }

    return { compliant: issues.length === 0, issues };
  }
}
```

## Key Points
- Use SASL_SSL with SCRAM-SHA-512 for authentication and TLS for encryption in transit
- Apply ACL-based authorization for granular topic-level access control
- Implement topic-level encryption for sensitive data at rest
- Validate all messages against schema registry before production
- Audit all streaming operations (produce, consume, admin)
- Segment networks to isolate internal streaming infrastructure
- Validate compliance with PCI DSS and GDPR requirements
