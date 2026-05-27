# Idempotency Storage Backends

## Redis Storage

### Key Design
```
idempotency:{key} → { status, response_body, status_code, created_at }
TTL: 24-168 hours (configurable per endpoint)
```

### Implementation
```typescript
import Redis from 'ioredis';

class RedisIdempotencyStore {
  private redis: Redis;
  private ttl: number;

  constructor(redis: Redis, ttlSeconds = 86400) {
    this.redis = redis;
    this.ttl = ttlSeconds;
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    const data = await this.redis.get(`idempotency:${key}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async set(key: string, record: IdempotencyRecord): Promise<void> {
    await this.redis.setex(
      `idempotency:${key}`,
      this.ttl,
      JSON.stringify(record)
    );
  }

  async lock(key: string, ttlMs = 5000): Promise<boolean> {
    const result = await this.redis.set(
      `idempotency:lock:${key}`,
      'locked',
      'PX',
      ttlMs,
      'NX'
    );
    return result === 'OK';
  }

  async unlock(key: string): Promise<void> {
    await this.redis.del(`idempotency:lock:${key}`);
  }
}
```

## PostgreSQL Storage

### Schema Design
```sql
CREATE TABLE idempotency_keys (
    id BIGSERIAL PRIMARY KEY,
    key_value UUID NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_status INTEGER,
    response_body JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(key_value)
);

CREATE INDEX idx_idempotency_keys_created_at
    ON idempotency_keys(created_at)
    WHERE status = 'completed';

CREATE INDEX idx_idempotency_keys_pending
    ON idempotency_keys(created_at)
    WHERE status = 'pending';
```

### Implementation
```typescript
import { Pool } from 'pg';

class PostgresIdempotencyStore {
  private pool: Pool;
  private ttl: number;

  constructor(pool: Pool, ttlHours = 24) {
    this.pool = pool;
    this.ttl = ttlHours;
  }

  async tryAcquire(key: string, requestHash: string): Promise<{
    acquired: boolean;
    existing?: IdempotencyRecord;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT * FROM idempotency_keys WHERE key_value = $1`,
        [key]
      );

      if (existing.rows.length > 0) {
        const record = existing.rows[0];
        if (record.request_hash !== requestHash) {
          await client.query('ROLLBACK');
          return { acquired: false, existing: {
            status: 'conflict',
            error: 'Key reused with different request body'
          }};
        }
        await client.query('ROLLBACK');
        return { acquired: false, existing: record };
      }

      await client.query(
        `INSERT INTO idempotency_keys (key_value, endpoint, request_hash, status)
         VALUES ($1, $2, $3, 'pending')`,
        [key, '', requestHash]
      );

      await client.query('COMMIT');
      return { acquired: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async complete(key: string, status: number, body: any): Promise<void> {
    await this.pool.query(
      `UPDATE idempotency_keys
       SET status = 'completed', response_status = $2,
           response_body = $3, completed_at = NOW()
       WHERE key_value = $1`,
      [key, status, JSON.stringify(body)]
    );
  }

  async cleanup(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM idempotency_keys
       WHERE created_at < NOW() - INTERVAL '1 hour' * $1
       AND status = 'completed'`,
      [this.ttl]
    );
    return result.rowCount;
  }
}
```

## DynamoDB Storage

### Table Design
```
Table: IdempotencyKeys
  Key: key_value (String, partition key)
  TTL: expires_at (Number, epoch seconds)

Attributes:
  - request_hash (String)
  - response_status (Number)
  - response_body (String - JSON)
  - status (String: pending/completed)
  - created_at (Number - epoch ms)
  - version (Number - optimistic locking)
```

### Implementation
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';

class DynamoDBIdempotencyStore {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private ttl: number;

  constructor(client: DynamoDBClient, tableName: string, ttlSeconds = 86400) {
    this.client = DynamoDBDocumentClient.from(client);
    this.tableName = tableName;
    this.ttl = ttlSeconds;
  }

  async tryAcquire(key: string, requestHash: string): Promise<{
    acquired: boolean;
    existing?: IdempotencyRecord;
  }> {
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          key_value: key,
          request_hash: requestHash,
          status: 'pending',
          created_at: Date.now(),
          expires_at: Math.floor(Date.now() / 1000) + this.ttl,
          version: 1,
        },
        ConditionExpression: 'attribute_not_exists(key_value)',
      }));
      return { acquired: true };
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        const existing = await this.client.send(new GetCommand({
          TableName: this.tableName,
          Key: { key_value: key },
        }));

        if (existing.Item?.request_hash !== requestHash) {
          return { acquired: false, existing: {
            status: 'conflict',
            error: 'Key reused with different request body'
          }};
        }

        return { acquired: false, existing: existing.Item };
      }
      throw error;
    }
  }

  async complete(key: string, status: number, body: any): Promise<void> {
    await this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { key_value: key },
      UpdateExpression: 'SET #status = :status, response_status = :res_status, response_body = :body, completed_at = :completed',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'completed',
        ':res_status': status,
        ':body': JSON.stringify(body),
        ':completed': Date.now(),
      },
      ConditionExpression: 'attribute_exists(key_value) AND #status = :pending',
      ExpressionAttributeValues: {
        ':pending': 'pending',
        ':status': 'completed',
        ':res_status': status,
        ':body': JSON.stringify(body),
        ':completed': Date.now(),
      },
    }));
  }
}
```

## Key Points
- Redis is fastest for idempotency storage but lacks built-in query capabilities
- PostgreSQL offers transactional guarantees with unique constraints
- DynamoDB provides managed scalability with TTL-based expiration
- Always use atomic operations (INSERT ON CONFLICT, conditional Put) for concurrent safety
- Set appropriate TTLs to auto-cleanup expired records
- Store request hash to prevent key reuse with different request bodies
- Use a locking mechanism for long-running operations to prevent duplicate processing
- Index by created_at for efficient cleanup jobs
- Monitor idempotency store latency as it adds to every request
- Implement proper error handling for store unavailability
