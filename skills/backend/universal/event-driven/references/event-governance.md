# Event Governance

## Overview
Governing events across the organization: event catalog, ownership, schema registry governance, compatibility policies, deprecation, and change management.

## Event Catalog

```typescript
interface EventCatalogEntry {
  eventName: string;
  version: number;
  owner: string; // Team name
  domain: string;
  description: string;
  producedBy: string; // Service name
  consumers: string[]; // Service names
  schema: object;
  status: 'active' | 'deprecated' | 'sunset';
  deprecationDate?: Date;
  sunsetDate?: Date;
  changelog: Array<{
    version: number;
    date: Date;
    change: string;
    compatibility: 'backward' | 'forward' | 'none';
  }>;
}

class EventCatalog {
  private events: Map<string, EventCatalogEntry> = new Map();

  register(event: EventCatalogEntry): void {
    const key = `${event.eventName}:v${event.version}`;
    if (this.events.has(key)) {
      throw new Error(`Event ${key} already registered`);
    }
    this.events.set(key, event);
  }

  getConsumers(eventName: string, version: number): string[] {
    const key = `${eventName}:v${version}`;
    return this.events.get(key)?.consumers ?? [];
  }

  getDependents(eventName: string): Array<{ service: string; version: number }> {
    const dependents: Array<{ service: string; version: number }> = [];
    for (const [, entry] of this.events) {
      if (entry.producedBy !== eventName.split('.')[0]) continue;
      if (entry.consumers.includes(eventName)) {
        dependents.push({ service: entry.producedBy, version: entry.version });
      }
    }
    return dependents;
  }
}
```

## Schema Compatibility Policy

```typescript
enum CompatibilityLevel {
  BACKWARD = 'BACKWARD',     // New consumers can read old data (add optional fields)
  FORWARD = 'FORWARD',       // Old consumers can read new data (add default values)
  FULL = 'FULL',             // Both directions
  NONE = 'NONE',             // No compatibility guarantees
  BACKWARD_TRANSITIVE = 'BACKWARD_TRANSITIVE',
  FORWARD_TRANSITIVE = 'FORWARD_TRANSITIVE',
  FULL_TRANSITIVE = 'FULL_TRANSITIVE',
}

class SchemaCompatibilityChecker {
  check(
    oldSchema: object,
    newSchema: object,
    level: CompatibilityLevel
  ): CompatibilityResult {
    switch (level) {
      case CompatibilityLevel.BACKWARD:
        return this.checkBackward(oldSchema, newSchema);
      case CompatibilityLevel.FORWARD:
        return this.checkForward(oldSchema, newSchema);
      case CompatibilityLevel.FULL:
        return this.checkFull(oldSchema, newSchema);
      default:
        return { compatible: true };
    }
  }

  private checkBackward(oldSchema: any, newSchema: any): CompatibilityResult {
    // Backward: new schema can read old data
    // Rule: can only add optional fields, never remove or make required
    const oldFields = new Map(oldSchema.fields.map((f: any) => [f.name, f]));
    const newFields = new Map(newSchema.fields.map((f: any) => [f.name, f]));

    for (const [name, oldField] of oldFields) {
      const newField = newFields.get(name);
      if (!newField) {
        return { compatible: false, reason: `Field '${name}' was removed` };
      }
      if (oldField.type !== newField.type) {
        return { compatible: false, reason: `Field '${name}' type changed from ${oldField.type} to ${newField.type}` };
      }
    }

    return { compatible: true };
  }
}
```

## Event Ownership Contracts

```typescript
interface EventContract {
  producer: {
    service: string;
    team: string;
    sla: {
      delivery: 'at-least-once' | 'exactly-once' | 'at-most-once';
      latencyP99: number; // ms
      throughputMax: number; // events/second
    };
  };
  consumer: {
    service: string;
    team: string;
    required: boolean; // If true, consumer must keep up
    maxLag: number; // messages
  };
  schema: {
    registry: string;
    subject: string;
    compatibility: CompatibilityLevel;
  };
}

class EventContractValidator {
  async validateContract(contract: EventContract): Promise<ContractValidation> {
    const issues: ContractIssue[] = [];

    // Check producer meets SLA
    const producerMetrics = await this.getProducerMetrics(contract.producer.service);
    if (producerMetrics.p99Latency > contract.producer.sla.latencyP99) {
      issues.push({
        type: 'PRODUCER_LATENCY',
        severity: 'high',
        message: `Producer latency ${producerMetrics.p99Latency}ms exceeds SLA ${contract.producer.sla.latencyP99}ms`,
      });
    }

    // Check consumer lag
    const consumerLag = await this.getConsumerLag(contract.consumer.service);
    if (consumerLag > contract.consumer.maxLag) {
      issues.push({
        type: 'CONSUMER_LAG',
        severity: 'medium',
        message: `Consumer lag ${consumerLag} messages exceeds max ${contract.consumer.maxLag}`,
      });
    }

    return { contract, valid: issues.length === 0, issues };
  }
}
```

## Deprecation Workflow

```typescript
class EventDeprecationManager {
  async deprecate(eventName: string, version: number): Promise<void> {
    const entry = catalog.get(eventName, version);
    if (!entry) throw new Error(`Event ${eventName} v${version} not found`);

    const consumers = entry.consumers;

    // Phase 1: Notify all consumers
    await this.notifyConsumers(consumers, {
      event: eventName,
      version,
      deprecationDate: new Date(),
      sunsetDate: this.addMonths(new Date(), 6),
      migrationGuide: this.generateMigrationGuide(eventName, version),
    });

    // Phase 2: Mark as deprecated in catalog
    entry.status = 'deprecated';
    entry.deprecationDate = new Date();
    catalog.update(entry);

    // Phase 3: Monitor for stale consumers
    await this.monitorStaleConsumers(eventName, version, 6); // 6 months
  }

  async sunset(eventName: string, version: number): Promise<void> {
    const entry = catalog.get(eventName, version);
    if (!entry) throw new Error(`Event ${eventName} v${version} not found`);

    // Verify no active consumers
    const activeConsumers = await this.findActiveConsumers(eventName, version);
    if (activeConsumers.length > 0) {
      throw new Error(
        `Cannot sunset: ${activeConsumers.length} consumers still active: ${activeConsumers.join(', ')}`
      );
    }

    // Block new production
    await this.blockProduction(eventName, version);

    // Mark as sunset in catalog
    entry.status = 'sunset';
    entry.sunsetDate = new Date();
    catalog.update(entry);
  }
}
```

## Key Points
- Maintain a central event catalog with owner, producer, consumers, and schema
- Enforce schema compatibility policies (backward by default)
- Define producer/consumer SLAs in event contracts
- Implement structured deprecation with consumer notification and sunset window
- Monitor for stale consumers before full event removal
- Require team ownership for every event
