# Audit Log Implementation

## Overview
Implement append-only audit log tables with tamper-evident hash chains, structured event schemas, and queryable storage backends.

## Audit Log Table Schema

```sql
-- PostgreSQL audit log table
CREATE TABLE audit_log (
    id BIGSERIAL,
    event_type VARCHAR(100) NOT NULL,       -- e.g., 'user.login', 'order.update'
    actor_type VARCHAR(50) NOT NULL,         -- 'user', 'system', 'api_key'
    actor_id VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,     -- e.g., 'order', 'user', 'payment'
    resource_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,            -- 'create', 'update', 'delete', 'read'
    changes JSONB,                           -- before/after diff for updates
    metadata JSONB,                          -- IP, user agent, request ID
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash VARCHAR(64) NOT NULL,              -- SHA-256 of current row
    previous_hash VARCHAR(64),              -- SHA-256 of previous row
    PRIMARY KEY (id)
);

CREATE INDEX idx_audit_actor ON audit_log(actor_type, actor_id, occurred_at);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id, occurred_at);
CREATE INDEX idx_audit_event_type ON audit_log(event_type, occurred_at);
CREATE INDEX idx_audit_occurred_at ON audit_log(occurred_at DESC);
```

## Tamper-Evident Hash Chain

```typescript
import crypto from 'crypto';

interface AuditEntry {
  id: number;
  eventType: string;
  actorType: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  previousHash: string | null;
  hash: string;
}

class AuditLogger {
  async append(entry: Omit<AuditEntry, 'id' | 'hash' | 'previousHash'>): Promise<void> {
    const lastEntry = await this.getLastEntry();
    const previousHash = lastEntry?.hash ?? null;

    const row = {
      ...entry,
      previousHash,
    };

    row.hash = this.computeHash(row);
    await this.insertEntry(row);
  }

  private computeHash(entry: Omit<AuditEntry, 'id' | 'hash'>): string {
    const serialized = JSON.stringify(entry, Object.keys(entry).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  async verifyIntegrity(): Promise<boolean> {
    const entries = await this.getAllEntriesOrdered();
    let previousHash: string | null = null;

    for (const entry of entries) {
      const { hash, ...rest } = entry;
      const computedHash = this.computeHash({ ...rest, previousHash });
      if (computedHash !== hash) return false;
      if (entry.previousHash !== previousHash) return false;
      previousHash = hash;
    }
    return true;
  }

  async query(options: {
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    eventType?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditEntry[]> {
    const query = AuditLog.createQueryBuilder('audit_log');
    if (options.actorId) query.andWhere('actor_id = :actorId', { actorId: options.actorId });
    if (options.resourceType) query.andWhere('resource_type = :resourceType', { resourceType: options.resourceType });
    if (options.resourceId) query.andWhere('resource_id = :resourceId', { resourceId: options.resourceId });
    if (options.eventType) query.andWhere('event_type = :eventType', { eventType: options.eventType });
    if (options.from) query.andWhere('occurred_at >= :from', { from: options.from });
    if (options.to) query.andWhere('occurred_at <= :to', { to: options.to });
    query.orderBy('id', 'DESC').skip(options.offset || 0).take(options.limit || 100);
    return query.getMany();
  }
}
```

## Diff Computation

```typescript
function computeDiff(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { from: before[key] ?? null, to: after[key] ?? null };
    }
  }
  return changes;
}

// Usage in application service
class OrderService {
  async updateOrder(id: string, updates: Partial<Order>, userId: string): Promise<Order> {
    const before = await this.orderRepo.findById(id);
    const after = await this.orderRepo.update(id, updates);

    await this.auditLogger.append({
      eventType: 'order.update',
      actorType: 'user',
      actorId: userId,
      resourceType: 'order',
      resourceId: id,
      action: 'update',
      changes: computeDiff(before, after),
      metadata: { ip: '127.0.0.1', requestId: 'req_abc' },
      occurredAt: new Date().toISOString(),
    });

    return after;
  }
}
```

## Audit Log Middleware

```typescript
// Express middleware for automatic audit logging
function auditLog(config: { resourceType: string; extractId: (req: Request) => string }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        auditLogger.append({
          eventType: `${config.resourceType}.${req.method.toLowerCase()}`,
          actorType: 'user',
          actorId: req.user?.id || 'anonymous',
          resourceType: config.resourceType,
          resourceId: config.extractId(req),
          action: req.method.toLowerCase(),
          changes: ['POST', 'PUT', 'PATCH'].includes(req.method) ? { body: req.body } : null,
          metadata: { ip: req.ip, userAgent: req.headers['user-agent'], requestId: req.id },
          occurredAt: new Date().toISOString(),
        }).catch(console.error);
      }
      return originalJson(body);
    };
    next();
  };
}
```

## Key Points
- Use append-only tables with SHA-256 hash chains for tamper evidence
- Index by actor, resource, event type, and timestamp for efficient queries
- Compute before/after diffs for update operations
- Implement integrity verification by replaying hash chains
- Use middleware for automatic audit logging with minimal code changes
