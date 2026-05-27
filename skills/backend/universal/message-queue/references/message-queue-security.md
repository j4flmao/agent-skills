# Message Queue Security

## Overview
Secure message queues: authentication, authorization, encryption, network isolation, audit logging, and compliance.

## Authentication Configuration

```typescript
// Kafka SASL/SCRAM authentication
class KafkaAuthConfig {
  configureSASL(): KafkaConfig {
    return {
      clientId: 'order-service',
      brokers: ['kafka-1:9093', 'kafka-2:9093', 'kafka-3:9093'],
      ssl: {
        rejectUnauthorized: true,
        ca: [fs.readFileSync('/etc/kafka/ca.pem')],
        cert: fs.readFileSync('/etc/kafka/client.pem'),
        key: fs.readFileSync('/etc/kafka/client.key'),
      },
      sasl: {
        mechanism: 'scram-sha-512',
        username: process.env.KAFKA_USERNAME!,
        password: process.env.KAFKA_PASSWORD!,
      },
    };
  }
}
```

```typescript
// RabbitMQ TLS + credentials
class RabbitMQAuthConfig {
  configureTLS(): AmqpConnectionOptions {
    return {
      protocol: 'amqps',
      hostname: 'rabbitmq.example.com',
      port: 5671,
      username: process.env.RABBITMQ_USERNAME!,
      password: process.env.RABBITMQ_PASSWORD!,
      ca: [fs.readFileSync('/etc/rabbitmq/ca.pem')],
      cert: fs.readFileSync('/etc/rabbitmq/client.pem'),
      key: fs.readFileSync('/etc/rabbitmq/client.key'),
      vhost: 'production',
    };
  }
}
```

```typescript
// SQS IAM-based authentication
const sqs = new SQSClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```

## Authorization and ACLs

```bash
# Kafka ACLs — granular topic permissions
# Producer: can write to specific topics
kafka-acls.sh --add \
  --allow-principal User:order-service \
  --operation Write \
  --operation Describe \
  --topic order.created.v1

# Consumer: can read from specific consumer group
kafka-acls.sh --add \
  --allow-principal User:payment-service \
  --operation Read \
  --operation Describe \
  --consumer \
  --group payment-processor \
  --topic order.created.v1

# Admin: restricted operations
kafka-acls.sh --add \
  --allow-principal User:kafka-admin \
  --operation All \
  --topic '*'
```

```typescript
// RabbitMQ permissions via management API
class RabbitMQPermissionManager {
  async grantProducerPermission(username: string, exchange: string): Promise<void> {
    await this.managementAPI.setPermissions(username, {
      configure: '',
      write: exchange,
      read: '',
    });
  }

  async grantConsumerPermission(username: string, queue: string): Promise<void> {
    await this.managementAPI.setPermissions(username, {
      configure: '',
      write: '',
      read: queue,
    });
  }
}
```

## Encryption Configuration

```typescript
class MessageQueueEncryption {
  // TLS in transit (mandatory)
  configureTLS(): void {
    // Kafka: ssl.keystore/truststore
    // RabbitMQ: amqps protocol
    // SQS: HTTPS enforced by default
  }

  // End-to-end encryption for sensitive payloads
  async encryptPayload(payload: Buffer, encryptionKey: Buffer): Promise<Buffer> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  async decryptPayload(encrypted: Buffer, encryptionKey: Buffer): Promise<Buffer> {
    const iv = encrypted.subarray(0, 12);
    const authTag = encrypted.subarray(12, 28);
    const data = encrypted.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }
}
```

## Network Isolation

```yaml
# Network security architecture
networks:
  message-bus-internal:
    driver: overlay
    internal: true  # No external access
    ipam:
      config:
        - subnet: 10.10.0.0/16

  application-internal:
    driver: overlay
    ipam:
      config:
        - subnet: 10.20.0.0/16

services:
  kafka:
    networks:
      - message-bus-internal
    ports:
      - "9092:9092"  # Internal only, not exposed to internet

  order-service:
    networks:
      - application-internal
      - message-bus-internal

  # Only services that need message bus access are on this network
  payment-service:
    networks:
      - application-internal
      - message-bus-internal
```

## Audit Logging

```typescript
interface MessageAuditEvent {
  timestamp: Date;
  principal: string;
  action: 'PRODUCE' | 'CONSUME' | 'CREATE_TOPIC' | 'DELETE_TOPIC' | 'ALTER_CONFIG';
  resource: string;
  messageId?: string;
  result: 'SUCCESS' | 'DENIED' | 'ERROR';
  details?: Record<string, unknown>;
}

class MessageQueueAuditor {
  async log(event: MessageAuditEvent): Promise<void> {
    await AuditLog.create(event);

    if (event.result === 'DENIED') {
      await AlertService.alert({
        severity: 'HIGH',
        title: `Unauthorized message bus access`,
        message: `${event.principal} ${event.action} on ${event.resource}`,
      });
    }
  }

  async getProducerReport(producer: string, days: number): Promise<ProducerReport> {
    const since = new Date(Date.now() - days * 86400000);
    const events = await AuditLog.find({
      principal: producer,
      action: 'PRODUCE',
      timestamp: { $gte: since },
    }).lean();

    return {
      producer,
      period: `${days} days`,
      totalMessages: events.length,
      topicsProduced: [...new Set(events.map(e => e.resource))],
      errorCount: events.filter(e => e.result === 'ERROR').length,
    };
  }
}
```

## Compliance Validation

```typescript
class MessageQueueCompliance {
  async validatePCICompliance(): Promise<ComplianceResult> {
    const issues: ComplianceIssue[] = [];

    // Check encryption in transit
    const brokers = await this.getBrokerConfig();
    for (const broker of brokers) {
      if (!broker.sslEnabled) {
        issues.push({
          framework: 'PCI DSS',
          requirement: '4.1',
          message: `Broker ${broker.id} does not have TLS enabled`,
          severity: 'CRITICAL',
        });
      }
    }

    // Check authentication
    if (!brokers.every(b => b.saslEnabled)) {
      issues.push({
        framework: 'PCI DSS',
        requirement: '7.1',
        message: 'Not all brokers have authentication enabled',
        severity: 'CRITICAL',
      });
    }

    // Check audit logging
    if (!this.auditLoggingEnabled) {
      issues.push({
        framework: 'PCI DSS',
        requirement: '10.1',
        message: 'Message bus audit logging is not enabled',
        severity: 'HIGH',
      });
    }

    return { compliant: issues.length === 0, issues };
  }
}
```

## Key Points
- Use TLS for all message broker connections (SASL_SSL for Kafka, AMQPS for RabbitMQ)
- Implement ACL-based authorization: granular topic/queue permissions per principal
- Use end-to-end encryption for sensitive message payloads (AES-256-GCM)
- Isolate message bus on internal network, no direct internet exposure
- Audit all produce/consume/admin actions with principal, resource, and result
- Use IAM roles for AWS SQS (never hardcode credentials)
- Rotate broker credentials regularly using secrets manager
- Validate compliance with PCI DSS (encryption, auth, audit logging)
