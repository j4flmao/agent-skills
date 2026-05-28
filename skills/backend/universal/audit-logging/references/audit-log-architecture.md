# Audit Log Architecture

## Overview

Audit logging architecture encompasses the storage backend, data model, tamper evidence mechanisms, query capabilities, and integration patterns that collectively form a production-grade audit trail system. This reference covers architectural decisions, implementation patterns, and operational considerations for building audit systems that satisfy regulatory compliance requirements.

## Core Architectural Patterns

### Pattern A: Embedded Database Table

The simplest architecture. Audit events are stored in the application's primary database as an append-only table.

```
Application → Audit Middleware → Primary DB (audit_log table)
```

Advantages: simple to implement, no additional infrastructure, transactional consistency with application data.
Disadvantages: couples audit storage to application database, can impact application performance, limited scalability for high-volume audit events.

```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(100) NOT NULL,
    actor_type VARCHAR(20) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    action VARCHAR(10) NOT NULL,
    changes JSONB,
    metadata JSONB,
    correlation_id VARCHAR(64),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64),
    tenant_id VARCHAR(50),
    event_version INT DEFAULT 1
);

-- Partition by month for performance
CREATE TABLE audit_log_2025_01 PARTITION OF audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit_log_2025_02 PARTITION OF audit_log
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### Pattern B: Dedicated Audit Database

A separate database instance dedicated to audit events. The application writes audit events via a simple API or message queue.

```
Application → Audit API / Message Queue → Dedicated Audit DB
```

Advantages: isolates audit storage from application database, independent scaling, can optimize storage for append-heavy workload.
Disadvantages: additional infrastructure to manage, eventual consistency between application and audit data, cross-database queries not possible.

```yaml
# Dedicated audit DB configuration
audit_database:
  host: audit-db.internal
  port: 5432
  database: audit_store
  pool_size: 10
  ssl: true
  settings:
    wal_level: minimal       # reduce WAL overhead for append-only
    synchronous_commit: off  # increase write throughput
    autovacuum: off          # no updates/deletes to clean
    checkpoint_timeout: 1h   # reduce checkpoint frequency
```

### Pattern C: Event Sourcing / Event Store

Audit events are stored in an event store (EventStoreDB, Kafka with compacted topics). This is the most scalable and auditable architecture.

```
Application → Event Store ← Audit Query Service → Reports
           → kafka/eventstore
```

Advantages: native immutability, replay capability, high throughput, decoupled from application storage.
Disadvantages: operational complexity, specialized query patterns, eventual consistency.

```javascript
// Writing audit events to Kafka
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'audit-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
});

const producer = kafka.producer();

async function writeAuditEvent(event) {
  await producer.connect();
  await producer.send({
    topic: 'audit-events',
    messages: [{
      key: `${event.eventType}:${event.correlationId}`,
      value: JSON.stringify(event),
      headers: {
        'event-type': event.eventType,
        'actor-id': event.actorId,
        'occurred-at': event.occurredAt
      }
    }]
  });
}
```

### Pattern D: Hybrid (Hot + Cold Storage)

Recent audit data is stored in a fast queryable store (Elasticsearch, ClickHouse). Older data is archived to cheap object storage (S3, Glacier).

```
Application → Message Queue → Hot Store (Elasticsearch, 30 days)
                             → Warm Store (S3 Parquet, 1 year)
                             → Cold Store (Glacier, 7 years)
```

Advantages: cost-effective for long retention, fast queries for recent data, scalable.
Disadvantages: complex data pipeline, query latency varies by data tier, multiple storage systems to manage.

```javascript
// Hybrid audit storage
class HybridAuditStore {
  constructor() {
    this.hot = new ElasticsearchStore({ retention: '30d' });
    this.warm = new S3ParquetStore({ retention: '1y', bucket: 'audit-warm' });
    this.cold = new GlacierStore({ retention: '7y', vault: 'audit-cold' });
  }

  async write(event) {
    // Always write to hot store
    await this.hot.write(event);
    
    // Forward to warm store via queue for batch processing
    await this.writeQueue.send(event);
  }

  async query({ actorId, from, to, page, limit }) {
    const timeRange = to.getTime() - from.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (timeRange < thirtyDays) {
      // Query hot store (Elasticsearch)
      return this.hot.query({ actorId, from, to, page, limit });
    } else if (timeRange < 365 * 24 * 60 * 60 * 1000) {
      // Query warm store (S3 Parquet via Athena)
      return this.warm.query({ actorId, from, to, page, limit });
    } else {
      // Query cold store (Glacier — slow, requires restore first)
      return this.cold.query({ actorId, from, to });
    }
  }
}
```

## Tamper Evidence Mechanisms

### Hash Chain (Linked List)

Each audit record contains the hash of the previous record, forming a cryptographic chain.

```
[Record 1]               [Record 2]               [Record 3]
hash=SHA256(prev="" + data)  hash=SHA256(prev=hash1 + data)  hash=SHA256(prev=hash2 + data)
previous_hash=""             previous_hash=hash1             previous_hash=hash2
```

Implementation:

```javascript
const crypto = require('crypto');

class HashChain {
  constructor(storage) {
    this.storage = storage;
  }

  async append(event) {
    const lastEntry = await this.storage.getLastEntry();
    const previousHash = lastEntry ? lastEntry.hash : '';
    
    const entry = {
      ...event,
      previousHash,
      timestamp: new Date().toISOString()
    };

    const canonicalData = this.canonicalize(entry);
    entry.hash = crypto
      .createHash('sha256')
      .update(previousHash + canonicalData)
      .digest('hex');

    await this.storage.append(entry);
    return entry;
  }

  canonicalize(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  async verifyChain() {
    const entries = await this.storage.getAll();
    let previousHash = '';
    let brokenLinks = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const canonicalData = this.canonicalize({ ...entry, hash: undefined, previousHash: undefined });
      const expectedHash = crypto
        .createHash('sha256')
        .update(previousHash + canonicalData)
        .digest('hex');

      if (entry.hash !== expectedHash) {
        brokenLinks.push({ index: i, id: entry.id, expectedHash, actualHash: entry.hash });
      }
      if (entry.previousHash !== previousHash) {
        brokenLinks.push({ index: i, id: entry.id, type: 'previous_hash_mismatch' });
      }

      previousHash = entry.hash;
    }

    return {
      chainIntact: brokenLinks.length === 0,
      entriesVerified: entries.length,
      brokenLinks
    };
  }
}
```

### Merkle Tree (Tree Hash)

For batch-level tamper evidence, group entries into Merkle trees. Each batch produces a root hash that can be published (e.g., to a blockchain or public transparency log).

```
        Root Hash
       /          \
  Hash A          Hash B
  /    \          /    \
H(E1) H(E2)   H(E3) H(E4)

E1    E2       E3    E4
```

Implementation:

```javascript
class MerkleAuditTree {
  constructor(batchSize = 1000) {
    this.batchSize = batchSize;
  }

  async appendBatch(entries) {
    const leaves = entries.map(e => 
      crypto.createHash('sha256').update(this.canonicalize(e)).digest('hex')
    );
    
    const tree = this.buildMerkleTree(leaves);
    const rootHash = tree[tree.length - 1][0];

    const batch = {
      startId: entries[0].id,
      endId: entries[entries.length - 1].id,
      entryCount: entries.length,
      rootHash,
      timestamp: new Date().toISOString(),
      tree
    };

    // Publish root hash to public transparency log
    await this.publishRootHash(rootHash, batch);

    return batch;
  }

  buildMerkleTree(leaves) {
    const tree = [leaves];
    let currentLevel = leaves;

    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(
            crypto.createHash('sha256')
              .update(currentLevel[i] + currentLevel[i + 1])
              .digest('hex')
          );
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return tree;
  }

  async verifyEntry(entryId, entryData) {
    // Find which batch contains this entry
    const batch = await this.storage.getBatchByEntryId(entryId);
    if (!batch) throw new Error('Entry not found in any batch');

    // Recompute the Merkle path for this entry
    const leaf = crypto.createHash('sha256')
      .update(this.canonicalize(entryData))
      .digest('hex');

    // Verify leaf is in the tree and compute root
    // Compare with stored root hash
    const computedRoot = this.computeRootFromPath(leaf, batch.proofs[entryId]);
    return computedRoot === batch.rootHash;
  }
}
```

### Digital Signatures per Entry

Each entry is signed with a private key. Verification uses the corresponding public key.

```javascript
const crypto = require('crypto');

class SignedAuditEntry {
  constructor(privateKey) {
    this.privateKey = privateKey;
  }

  async sign(entry) {
    const canonicalData = JSON.stringify(entry, Object.keys(entry).sort());
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(canonicalData);
    const signature = sign.sign(this.privateKey, 'base64');
    return { ...entry, signature };
  }

  verify(entry, publicKey) {
    const signature = entry.signature;
    const entryWithoutSig = { ...entry };
    delete entryWithoutSig.signature;
    
    const canonicalData = JSON.stringify(entryWithoutSig, Object.keys(entryWithoutSig).sort());
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(canonicalData);
    return verify.verify(publicKey, signature, 'base64');
  }
}
```

### Blockchain Anchor

For maximum tamper evidence, periodically anchor audit log hashes to a public blockchain (Bitcoin OP_RETURN, Ethereum).

```javascript
class BlockchainAnchor {
  constructor(web3Provider) {
    this.web3 = new Web3(web3Provider);
  }

  async anchorHash(rootHash, batchInfo) {
    const data = web3.utils.asciiToHex(
      `AUDIT:${batchInfo.startId}-${batchInfo.endId}:${rootHash}`
    );

    const tx = await this.web3.eth.accounts.signTransaction({
      to: null, // contract creation (or use existing contract)
      data: data,
      gas: 50000
    }, process.env.ETH_PRIVATE_KEY);

    const receipt = await this.web3.eth.sendSignedTransaction(tx.rawTransaction);
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      timestamp: new Date().toISOString()
    };
  }

  async verifyAnchor(batchInfo) {
    // Retrieve the blockchain transaction
    const tx = await this.web3.eth.getTransaction(batchInfo.transactionHash);
    const storedHash = web3.utils.hexToAscii(tx.input).split(':')[2];

    return storedHash === batchInfo.rootHash;
  }
}
```

## Data Model Design

### Canonical Audit Event

```json
{
  "event_version": 2,
  "event_type": "user.profile.updated",
  "occurred_at": "2025-06-15T14:30:00.000Z",
  "actor": {
    "id": "user_abc123",
    "type": "user",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "resource": {
    "type": "user_profile",
    "id": "profile_xyz789",
    "name": "John Doe's Profile"
  },
  "action": "update",
  "changes": {
    "before": {
      "email": "john.old@example.com",
      "phone": "+1234567890"
    },
    "after": {
      "email": "john.new@example.com",
      "phone": "+1234567890"
    }
  },
  "context": {
    "source_ip": "203.0.113.42",
    "user_agent": "Mozilla/5.0...",
    "session_id": "sess_456",
    "request_id": "req_789",
    "correlation_id": "corr_012"
  },
  "tenant_id": "tenant_acme",
  "hash_chain": {
    "previous_hash": "abc123...",
    "hash": "def456..."
  }
}
```

### Schema Versioning

Audit event schemas evolve over time. Use versioning to maintain backward compatibility.

```javascript
const eventSchemas = {
  1: {
    required: ['event_type', 'actor_id', 'resource_type', 'action', 'occurred_at'],
    optional: ['resource_id', 'changes', 'metadata']
  },
  2: {
    required: ['event_type', 'actor', 'resource', 'action', 'occurred_at'],
    optional: ['changes', 'context', 'tenant_id'],
    changes: [
      'actor_id/actor_type → actor object (id/type/name/email)',
      'resource_type/resource_id → resource object (type/id/name)',
      'metadata → context object with additional fields'
    ]
  }
};

function migrateEvent(event, targetVersion) {
  let current = event.event_version || 1;
  while (current < targetVersion) {
    current++;
    event = migrations[current](event);
  }
  event.event_version = targetVersion;
  return event;
}

const migrations = {
  2: (v1Event) => ({
    event_version: 2,
    event_type: v1Event.event_type,
    occurred_at: v1Event.occurred_at,
    actor: {
      id: v1Event.actor_id,
      type: v1Event.actor_type || 'user',
      name: v1Event.actor_name || '',
      email: v1Event.actor_email || ''
    },
    resource: {
      type: v1Event.resource_type,
      id: v1Event.resource_id,
      name: v1Event.resource_name || ''
    },
    action: v1Event.action,
    changes: v1Event.changes || {},
    context: v1Event.metadata || {}
  })
};
```

## Storage-Specific Implementations

### PostgreSQL with Hash Chain

```sql
-- Full implementation
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    actor JSONB NOT NULL,
    resource JSONB NOT NULL,
    action VARCHAR(20) NOT NULL,
    changes JSONB,
    context JSONB,
    tenant_id VARCHAR(50),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_version INT DEFAULT 2,
    previous_hash VARCHAR(64) DEFAULT '',
    hash VARCHAR(64) NOT NULL,
    signature TEXT,

    CONSTRAINT valid_action CHECK (action IN ('create', 'read', 'update', 'delete')),
    CONSTRAINT unique_hash UNIQUE (hash)
);

-- Prevent UPDATE/DELETE via trigger
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log is append-only. UPDATE and DELETE are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER prevent_audit_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- Auto-validate hash chain on insert
CREATE OR REPLACE FUNCTION validate_hash_chain()
RETURNS TRIGGER AS $$
DECLARE
    last_hash VARCHAR(64);
BEGIN
    SELECT hash INTO last_hash FROM audit_log
    ORDER BY id DESC LIMIT 1 FOR UPDATE;

    IF NEW.previous_hash != COALESCE(last_hash, '') THEN
        RAISE EXCEPTION 'Hash chain broken: previous_hash does not match last entry';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER validate_hash_chain_insert
    AFTER INSERT ON audit_log
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION validate_hash_chain();
```

### Elasticsearch Audit Store

```javascript
class ElasticsearchAuditStore {
  constructor(client, indexPrefix = 'audit-log') {
    this.client = client;
    this.indexPrefix = indexPrefix;
  }

  getIndex(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${this.indexPrefix}-${year}.${month}`;
  }

  async write(event) {
    await this.client.index({
      index: this.getIndex(new Date(event.occurred_at)),
      body: event,
      op_type: 'create' // prevent overwrites
    });
  }

  async search({ actorId, resourceType, eventType, from, to, page = 1, limit = 50 }) {
    const must = [];

    if (actorId) must.push({ term: { 'actor.id': actorId } });
    if (resourceType) must.push({ term: { 'resource.type': resourceType } });
    if (eventType) must.push({ term: { 'event_type': eventType } });

    must.push({
      range: {
        'occurred_at': {
          gte: from.toISOString(),
          lte: to.toISOString()
        }
      }
    });

    const result = await this.client.search({
      index: `${this.indexPrefix}-*`,
      body: {
        query: { bool: { must } },
        sort: [{ 'occurred_at': { order: 'desc' } }],
        from: (page - 1) * limit,
        size: limit
      }
    });

    return {
      rows: result.hits.hits.map(h => h._source),
      total: result.hits.total.value,
      page,
      limit
    };
  }
}
```

### ClickHouse for High-Volume Audit

```sql
CREATE TABLE audit_log (
    event_type String,
    actor_id String,
    actor_type String,
    resource_type String,
    resource_id String,
    action String,
    changes String, -- JSON string
    metadata String, -- JSON string
    correlation_id String,
    tenant_id String,
    occurred_at DateTime('UTC'),
    event_version UInt8,
    hash String,
    previous_hash String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (occurred_at, event_type, actor_id)
TTL occurred_at + INTERVAL 7 YEAR DELETE;

-- Materialized view for common queries
CREATE MATERIALIZED VIEW audit_by_actor
ENGINE = SummingMergeTree()
ORDER BY (actor_id, occurred_at)
AS SELECT
    actor_id,
    count() AS event_count,
    occurred_at
FROM audit_log
GROUP BY actor_id, occurred_at;
```

```javascript
// ClickHouse audit writer
class ClickHouseAuditStore {
  constructor(client) {
    this.client = client;
  }

  async writeBatch(events) {
    // ClickHouse batch insert
    await this.client.insert({
      table: 'audit_log',
      values: events.map(e => [
        e.event_type,
        e.actor?.id || e.actor_id,
        e.actor?.type || e.actor_type,
        e.resource?.type || e.resource_type,
        e.resource?.id || e.resource_id,
        e.action,
        JSON.stringify(e.changes || {}),
        JSON.stringify(e.context || e.metadata || {}),
        e.context?.correlation_id || e.correlation_id || '',
        e.tenant_id || '',
        new Date(e.occurred_at),
        e.event_version || 1,
        e.hash || '',
        e.previous_hash || ''
      ]),
      format: 'TabSeparated'
    });
  }
}
```

## Query Patterns and Optimization

### Common Query Patterns

```sql
-- 1. All events for a specific user (audit trail)
SELECT * FROM audit_log
WHERE actor_id = 'user_123'
ORDER BY occurred_at DESC;

-- 2. All changes to a specific resource
SELECT * FROM audit_log
WHERE resource_type = 'order'
  AND resource_id = 'order_456'
ORDER BY occurred_at ASC;

-- 3. Events within a time range by type
SELECT * FROM audit_log
WHERE occurred_at BETWEEN '2025-01-01' AND '2025-06-30'
  AND event_type = 'payment.process'
ORDER BY occurred_at DESC;

-- 4. Aggregate: count by event type per day
SELECT
    DATE(occurred_at) AS day,
    event_type,
    COUNT(*) AS count
FROM audit_log
GROUP BY day, event_type
ORDER BY day DESC;

-- 5. Find all actions by a user within a specific time window
SELECT * FROM audit_log
WHERE actor_id = 'user_123'
  AND occurred_at BETWEEN '2025-06-01' AND '2025-06-15'
  AND action = 'delete'
ORDER BY occurred_at DESC;
```

### Pagination Patterns

```javascript
// Keyset pagination for large result sets
class AuditPaginator {
  async queryPage({ actorId, from, to, limit = 100, cursor }) {
    let query = knex('audit_log')
      .where('occurred_at', '>=', from)
      .where('occurred_at', '<=', to);

    if (actorId) query = query.where('actor_id', actorId);
    if (cursor) {
      // Keyset pagination using the last seen id
      query = query.where('id', '<', cursor);
    }

    const rows = await query
      .orderBy('id', 'desc')
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    return {
      rows,
      nextCursor: hasMore ? rows[rows.length - 1].id : null,
      hasMore
    };
  }
}
```

## Security Architecture

### Access Control Model

```javascript
class AuditAccessControl {
  constructor() {
    this.permissions = {
      admin: { read: ['*'], export: true, delete: false },
      auditor: { read: ['*'], export: true, delete: false },
      security: { read: ['user.*', 'auth.*'], export: false, delete: false },
      developer: { read: ['system.*'], export: false, delete: false },
      compliance: { read: ['payment.*', 'data.*'], export: true, delete: false }
    };
  }

  authorize(user, action, resource) {
    const userRole = user.role;
    const permissions = this.permissions[userRole];
    if (!permissions) return false;

    if (action === 'read') {
      return permissions.read.some(pattern => this.matchPattern(pattern, resource));
    }
    if (action === 'export') return permissions.export;
    if (action === 'delete') return permissions.delete;

    return false;
  }

  matchPattern(pattern, resource) {
    if (pattern === '*') return true;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(resource);
  }
}
```

### Encryption at Rest

```sql
-- Using pgcrypto for column-level encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE audit_log_encrypted (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(100) NOT NULL,
    -- Encrypted sensitive fields
    sensitive_data BYTEA,
    -- Non-sensitive metadata
    resource_type VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64)
);

-- Encrypt on insert
INSERT INTO audit_log_encrypted (
    event_type, actor_id, sensitive_data, resource_type, occurred_at, hash, previous_hash
) VALUES (
    'payment.process',
    'user_123',
    pgp_sym_encrypt(
        '{"card_last4": "4242", "amount": 250.00}',
        'encryption-key-here'
    ),
    'payment',
    NOW(),
    'computed_hash',
    'previous_hash'
);

-- Decrypt on read (requires permission)
SELECT
    event_type,
    actor_id,
    pgp_sym_decrypt(sensitive_data, 'encryption-key-here') AS decrypted,
    resource_type,
    occurred_at
FROM audit_log_encrypted
WHERE id = 123;
```

## Deployment and Operations

### Docker Compose for Development

```yaml
version: '3.8'
services:
  postgres-audit:
    image: postgres:16
    environment:
      POSTGRES_DB: audit_store
      POSTGRES_USER: audit
      POSTGRES_PASSWORD: ${AUDIT_DB_PASSWORD}
    volumes:
      - audit-data:/var/lib/postgresql/data
      - ./init-audit.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5433:5432"

  elasticsearch-audit:
    image: elasticsearch:8.12
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms4g -Xmx4g
    volumes:
      - es-audit-data:/usr/share/elasticsearch/data
    ports:
      - "9201:9200"

  audit-service:
    build: ./audit-service
    environment:
      AUDIT_DB_URL: postgresql://audit:password@postgres-audit:5432/audit_store
      AUDIT_ES_URL: http://elasticsearch-audit:9200
      AUDIT_QUEUE_URL: amqp://rabbitmq:5672
    depends_on:
      - postgres-audit
      - elasticsearch-audit

volumes:
  audit-data:
  es-audit-data:
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: audit-store
  namespace: audit-system
spec:
  serviceName: audit-store
  replicas: 3
  selector:
    matchLabels:
      app: audit-store
  template:
    metadata:
      labels:
        app: audit-store
    spec:
      containers:
      - name: timescaledb
        image: timescale/timescaledb:2.15-pg16
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: audit_store
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: audit-db-credentials
              key: password
        volumeMounts:
        - name: audit-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "8Gi"
            cpu: "4"
          limits:
            memory: "16Gi"
            cpu: "8"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: audit-writer
  namespace: audit-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: audit-writer
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: audit_queue_depth
      target:
        type: AverageValue
        averageValue: 1000
```

## Monitoring and Alerting

### Health Checks

```javascript
class AuditHealthCheck {
  constructor(stores) {
    this.stores = stores; // array of storage backends
  }

  async check() {
    const results = await Promise.allSettled(
      this.stores.map(store => this.checkStore(store))
    );

    return {
      healthy: results.every(r => r.status === 'fulfilled' && r.value.healthy),
      stores: results.map((r, i) => ({
        name: this.stores[i].constructor.name,
        healthy: r.status === 'fulfilled' && r.value.healthy,
        details: r.status === 'fulfilled' ? r.value : r.reason
      })),
      checkedAt: new Date().toISOString()
    };
  }

  async checkStore(store) {
    const start = Date.now();
    await store.ping();
    return {
      healthy: true,
      latency: Date.now() - start
    };
  }
}
```

### Prometheus Metrics

```javascript
const prometheus = require('prom-client');

const auditEventsWritten = new prometheus.Counter({
  name: 'audit_events_written_total',
  help: 'Total audit events written',
  labelNames: ['event_type', 'status']
});

const auditWriteDuration = new prometheus.Histogram({
  name: 'audit_write_duration_seconds',
  help: 'Audit write operation duration',
  labelNames: ['store_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const auditQueueDepth = new prometheus.Gauge({
  name: 'audit_queue_depth',
  help: 'Current audit event queue depth'
});

const auditStoreLag = new prometheus.Gauge({
  name: 'audit_store_lag_seconds',
  help: 'Lag between event occurrence and store write',
  labelNames: ['store_type']
});

const auditChainVerification = new prometheus.Gauge({
  name: 'audit_chain_verification_result',
  help: 'Hash chain verification result (1=pass, 0=fail)'
});
```

## Scaling Considerations

### Write Scaling

- **Single DB (100-1000 events/sec)**: Simple PostgreSQL/MySQL with hash chain.
- **Read replicas (1000-10000 events/sec)**: Write to primary, read from replicas. Accept eventual consistency for reads.
- **Message queue + batch writes (10000-100000 events/sec)**: Kafka → batch processor → ClickHouse. Batching amortizes write overhead.
- **Sharded writes (>100000 events/sec)**: Partition by tenant_id or event_type hash. Each shard is independent.

### Read Scaling

- **Hot path queries (real-time)**: Use Elasticsearch or ClickHouse with indexing optimized for common query patterns.
- **Compliance reports (daily/weekly)**: Run as batch jobs against Parquet files in S3 using Athena or Spark.
- **Full chain verification (monthly)**: Background job that iterates the chain and reports broken links.

## Cost Optimization

- **Data tiering**: Hot (SSD, 7 days), Warm (HDD/Standard S3, 1 year), Cold (Glacier/Deep Archive, 7 years).
- **Compression**: Audit data compresses well (5:1 to 10:1 ratio in columnar storage).
- **Partition pruning**: Partition by time so queries scan only relevant partitions.
- **Sampling for non-critical events**: Log high-frequency events at 1:100 sampling rate for analytics but keep full for compliance-critical event types.
- **Retention policies**: Set different retention for different event types. `auth.failed` can be 90 days, `payment.process` must be 7 years.
