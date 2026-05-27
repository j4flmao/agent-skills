# Connection Pooling

## Purpose

Connection pooling manages a cache of database connections to reduce the overhead of establishing new connections. Pooling is essential for any server application that interacts with a database — it improves performance, controls resource usage, and provides resilience against database outages. This reference covers pool configuration patterns, sizing formulas, leak detection, multi-tenant pools, read replicas, and production monitoring.

## Connection Pool Patterns

### How Connection Pooling Works

```
Application Thread → Borrow connection → Execute query → Return connection → Pool
                          ↓                                                ↓
                     Pool checks:                                  Mark as available
                     - Alive? → if not, replace                     Reset transaction state
                     - Max age? → if exceeded, replace              Clear session context
                     - Leaked? → if timeout, close
```

### Pool Implementation Examples

#### HikariCP (Java / Spring Boot)

```java
@Configuration
public class DatabaseConfig {
    @Bean
    public HikariDataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
        config.setUsername("app_user");
        config.setPassword("secret");
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(5000);      // 5s to get a connection from pool
        config.setIdleTimeout(300000);          // 5min idle connection may be retired
        config.setMaxLifetime(1800000);         // 30min max connection lifetime
        config.setConnectionTestQuery("SELECT 1");
        config.setPoolName("AppPool");
        config.addDataSourceProperty("ApplicationName", "my-service");
        config.addDataSourceProperty("socketTimeout", "30");
        config.addDataSourceProperty("connectTimeout", "5");
        return new HikariDataSource(config);
    }
}
```

#### pg-pool (Node.js / PostgreSQL)

```typescript
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: 'mydb',
  user: 'app_user',
  password: process.env.DB_PASSWORD,
  max: 20,              // Maximum connections in pool
  idleTimeoutMillis: 300000,  // Close idle connections after 5min
  connectionTimeoutMillis: 5000,  // Fail if can't connect within 5s
  maxUses: 7500,        // Reconnect after 7500 queries (memory leak prevention)
  allowExitOnIdle: false,  // Keep pool alive
})

// Query helper with automatic release
async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

// Pool event handlers
pool.on('error', (err) => {
  console.error('Unexpected pool error', err)
})

pool.on('connect', () => {
  console.log('New client connected to pool')
})

pool.on('remove', () => {
  console.log('Client removed from pool')
})
```

#### Prisma (Node.js ORM with built-in pooling)

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Uses pgBouncer or direct pool
    },
  },
  // Connection pool is managed internally by Prisma's query engine
  // Configure via DATABASE_URL connection parameters
  log: ['query', 'info', 'warn', 'error'],
})

// For serverless with connection pooling, use Prisma Accelerate
// DATABASE_URL="prisma://accelerate.prisma.io/?api_key=..."
```

#### SQLAlchemy (Python)

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    "postgresql://app_user:secret@localhost:5432/mydb",
    poolclass=QueuePool,
    pool_size=10,           # Maximum connections
    max_overflow=5,         # Additional connections allowed beyond pool_size
    pool_timeout=5,         # Seconds to wait for a connection
    pool_recycle=3600,      # Recycle connections after 1 hour
    pool_pre_ping=True,     # Verify connection before using
    connect_args={
        "connect_timeout": 5,
        "application_name": "my-service",
    }
)
```

#### Go (database/sql + pgx)

```go
import (
    "database/sql"
    _ "github.com/jackc/pgx/v5/stdlib"
)

func newPool(dsn string) (*sql.DB, error) {
    db, err := sql.Open("pgx", dsn)
    if err != nil {
        return nil, err
    }
    db.SetMaxOpenConns(20)          // Max open connections
    db.SetMaxIdleConns(5)           // Max idle connections
    db.SetConnMaxLifetime(30 * time.Minute)  // Max connection age
    db.SetConnMaxIdleTime(5 * time.Minute)   // Max idle time before close

    if err := db.Ping(); err != nil {
        return nil, err
    }
    return db, nil
}
```

## Pool Sizing

### The Sizing Formula

The optimal pool size depends on the ratio of CPU time to I/O wait time. A widely used formula:

```
pool_size = Tn * (C + 1)
```

Where:
- `Tn` = number of cores (threads)
- `C` = ratio of I/O wait time to CPU time

For a standard web application with PostgreSQL:
- Small service (2 cores): pool_size = 10-15
- Medium service (4 cores): pool_size = 15-25
- Large service (8 cores): pool_size = 25-40
- Heavy I/O service (image processing, reports): pool_size = 40-60

### The Pool Size Paradox

Smaller pools often perform better than larger ones. Oversized pools create contention:
- More connections competing for CPU
- More context switching at the OS level
- More connections competing for database locks
- PostgreSQL has one process per connection — memory overhead

### PostgreSQL-Specific Sizing

PostgreSQL's `max_connections` limits total connections across all services.

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check max_connections
SHOW max_connections;

-- Available connections per pool
-- max_connections - superuser_reserved_connections - bg_worker_connections
```

### Connection Budget Per Service

```yaml
services:
  web-api:
    pool_size: 20
    min_idle: 5
  worker-queue:
    pool_size: 10
    min_idle: 2
  cron-jobs:
    pool_size: 5
    min_idle: 1
  admin-tool:
    pool_size: 3
    min_idle: 0

database:
  max_connections: 100
  reserved_for_superuser: 3
  bg_workers: 5
  # Total: 38 < 92 (100 - 3 - 5) OK
```

## Connection Timeout

### Timeout Configuration

| Timeout | Purpose | Recommended Value |
|---------|---------|-------------------|
| `connectionTimeout` | Time to wait for a new connection from pool | 5 seconds |
| `socketTimeout` | Time to wait for a query response | 30 seconds |
| `idleTimeout` | Max time a connection stays idle before close | 5-10 minutes |
| `maxLifetime` | Max total lifetime of a connection | 30-60 minutes |
| `validationTimeout` | Interval for connection health checks | 5 seconds |

### Handling Timeout Errors

```typescript
async function queryWithTimeout(queryText: string, params?: any[]): Promise<QueryResult> {
  const client = await pool.connect() // Throws if no connection available within connectionTimeout
  try {
    // Use AbortController for query-level timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const result = await client.query(queryText, params)
    clearTimeout(timeoutId)
    return result
  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      console.error('Query timeout after 30s')
      // The connection might be in a bad state — close it
      await client.release(true) // true = destroy the client
      throw new Error('Database query timed out')
    }
    throw err
  } finally {
    if (!client.released) {
      client.release()
    }
  }
}
```

## Leak Detection

### What is a Connection Leak

A connection leak occurs when code borrows a connection from the pool but never returns it. The pool eventually exhausts all connections and becomes unable to serve requests.

### Detection Techniques

```typescript
// Pool-level leak detection
class LeakDetectingPool {
  private borrowed = new Map<string, { timestamp: Date; stack: string }>()
  private pool: Pool

  constructor() {
    this.pool = new Pool({ max: 20 })
    this.pool.on('connect', (client) => {
      const originalRelease = client.release.bind(client)
      client.release = (destroy?: boolean) => {
        this.borrowed.delete(process.pid + ':' + (client as any).processID)
        return originalRelease(destroy)
      }
    })
  }

  async connect(): Promise<PoolClient> {
    const client = await this.pool.connect()
    const key = process.pid + ':' + (client as any).processID
    this.borrowed.set(key, {
      timestamp: new Date(),
      stack: new Error().stack!.split('\n').slice(2, 6).join('\n'),
    })
    return client
  }

  detectLeaks(): void {
    const now = Date.now()
    for (const [key, info] of this.borrowed) {
      if (now - info.timestamp.getTime() > 60_000) {
        console.warn(`Potential connection leak: ${key}`)
        console.warn(`Borrowed at: ${info.timestamp.toISOString()}`)
        console.warn(`Stack: ${info.stack}`)
      }
    }
  }
}
```

### Pool Monitoring

```typescript
// Log pool metrics every 30 seconds
setInterval(() => {
  const metrics = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxConnections: pool.max,
  }
  console.log('Pool metrics:', metrics)

  // Alert on pool exhaustion
  if (pool.waitingCount > pool.max * 0.5) {
    console.error('Pool near exhaustion!', metrics)
  }
}, 30_000)
```

### HikariCP Leak Detection

```xml
<!-- logback.xml — HikariCP leak detection -->
<logger name="com.zaxxer.hikari.pool.ProxyLeakTask" level="WARN"/>

<!-- spring.datasource.hikari.leak-detection-threshold=60000 -->
<!-- Logs a stack trace if a connection is not returned within 60s -->
```

## Read Replicas

### Pool Configuration with Replicas

```typescript
interface DbPools {
  writer: Pool     // Primary — handles writes
  reader: Pool     // Replica(s) — handles reads
}

function createDbPools(): DbPools {
  return {
    writer: new Pool({
      host: process.env.DB_WRITER_HOST,
      database: 'mydb',
      max: 20,
    }),
    reader: new Pool({
      host: process.env.DB_READER_HOST,  // Could be a load balancer for multiple replicas
      database: 'mydb',
      max: 50,  // Read replicas can handle more connections
    }),
  }
}

// Route queries to the correct pool
class DatabaseRouter {
  constructor(private pools: DbPools) {}

  async write(query: string, params?: any[]) {
    return this.pools.writer.query(query, params)
  }

  async read(query: string, params?: any[]) {
    return this.pools.reader.query(query, params)  // Eventually consistent
  }

  // Strict reads — must see latest write
  async readAfterWrite(query: string, params?: any[], writeTimestamp?: Date) {
    // Use writer for immediate consistency, or wait for replica catch-up
    const lag = await this.getReplicaLag()
    if (lag > 1000 && writeTimestamp && Date.now() - writeTimestamp.getTime() < 1000) {
      return this.pools.writer.query(query, params)
    }
    return this.pools.reader.query(query, params)
  }
}
```

### Spring Boot Read/Write Splitting

```java
@Configuration
public class DataSourceConfig {
    @Bean
    @Primary
    public DataSource dataSource() {
        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put("writer", writerDataSource());
        targetDataSources.put("reader", readerDataSource());

        RoutingDataSource routing = new RoutingDataSource();
        routing.setDefaultTargetDataSource(writerDataSource());
        routing.setTargetDataSources(targetDataSources);
        return routing;
    }
}
```

## Multi-Tenant Pools

### Pool-Per-Tenant

```typescript
class MultiTenantPoolManager {
  private pools = new Map<string, Pool>()

  getPool(tenantId: string): Pool {
    if (!this.pools.has(tenantId)) {
      this.pools.set(tenantId, new Pool({
        host: this.getTenantHost(tenantId),
        database: `tenant_${tenantId}`,
        max: 10,  // Per-tenant limit
      }))
    }
    return this.pools.get(tenantId)!
  }

  async query(tenantId: string, text: string, params?: any[]) {
    return this.getPool(tenantId).query(text, params)
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}
    for (const [tenantId, pool] of this.pools) {
      try {
        await pool.query('SELECT 1')
        results[tenantId] = true
      } catch {
        results[tenantId] = false
      }
    }
    return results
  }
}
```

### Single Pool with Tenant Isolation

```typescript
// For shared-database multi-tenant, use a single pool with tenant_id filtering
const pool = new Pool({ max: 50 })

// RLS ensures tenant isolation at the database level
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Set tenant context per connection
SET app.tenant_id = 'tenant-123';
```

## Pooling Metrics

### Key Metrics to Monitor

```
- active_connections    // Currently borrowed from pool
- idle_connections      // Available for use
- pending_requests      // Waiting for a connection   
- connection_creates    // New connections created
- connection_timeouts   // Waited too long for a connection
- connection_errors     // Failed to create connection
- pool_utilization      // active / max
- wait_time_avg         // Average time to get a connection
- query_latency_p50     // Query response time
- query_latency_p99     // Slow query threshold
```

### Prometheus Integration

```typescript
import prometheus from 'prom-client'

const poolMetrics = {
  activeConnections: new prometheus.Gauge({ name: 'db_pool_active', help: 'Active connections' }),
  idleConnections: new prometheus.Gauge({ name: 'db_pool_idle', help: 'Idle connections' }),
  pendingRequests: new prometheus.Gauge({ name: 'db_pool_pending', help: 'Pending connection requests' }),
  connectionTimeouts: new prometheus.Counter({ name: 'db_pool_timeouts_total', help: 'Connection timeouts' }),
  queryDuration: new prometheus.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Query duration',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  }),
}

// Collect metrics every 15 seconds
setInterval(() => {
  poolMetrics.activeConnections.set(pool.totalCount - pool.idleCount)
  poolMetrics.idleConnections.set(pool.idleCount)
  poolMetrics.pendingRequests.set(pool.waitingCount)
}, 15_000)
```

## Pool Testing

### Integration Tests with Testcontainers

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql'

describe('Database Pool', () => {
  let container: PostgreSqlContainer
  let pool: Pool

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
      max: 5,
    })
  }, 60_000)

  afterAll(async () => {
    await pool.end()
    await container.stop()
  })

  it('handles concurrent queries within pool limits', async () => {
    const queries = Array.from({ length: 10 }, (_, i) =>
      pool.query(`SELECT ${i} as num`)
    )
    const results = await Promise.all(queries)
    expect(results).toHaveLength(10)
    expect(results[0].rows[0].num).toBe(0)
  })

  it('rejects connection when pool is exhausted', async () => {
    const leakyPool = new Pool({ max: 2, connectionTimeoutMillis: 1000 })
    const clients = await Promise.all([
      leakyPool.connect(),
      leakyPool.connect(),
    ])
    // Third connection should timeout
    await expect(leakyPool.connect()).rejects.toThrow()
    clients.forEach(c => c.release())
    await leakyPool.end()
  })

  it('recovers from connection failures', async () => {
    const recoveryPool = new Pool({
      host: 'localhost',
      port: 5432,
      max: 1,
      connectionTimeoutMillis: 1000,
    })
    // Connection will fail
    await expect(recoveryPool.query('SELECT 1')).rejects.toThrow()
    // Pool should still be usable for the next attempt
    await recoveryPool.end()
  })
})
```

### Chaos Testing

```typescript
describe('Pool resilience', () => {
  it('reconnects after database restart', async () => {
    const pool = new Pool({
      host: process.env.DB_HOST,
      max: 5,
      connectionTimeoutMillis: 5000,
    })

    // Simulate DB restart
    await restartDatabase()

    // Pool should recover once DB is back
    await retry(() => pool.query('SELECT 1'), {
      maxRetries: 5,
      intervalMs: 2000,
    })

    await pool.end()
  })

  it('survives connection burst', async () => {
    const pool = new Pool({ max: 20 })
    const burst = Array.from({ length: 100 }, () =>
      pool.query('SELECT pg_sleep(0.01)')
    )
    const results = await Promise.allSettled(burst)
    const fulfilled = results.filter(r => r.status === 'fulfilled')
    // Most queries should succeed (some may queue)
    expect(fulfilled.length).toBeGreaterThan(50)
    await pool.end()
  })
})
```

## Key Points

- Pool size = Tn * (C + 1) where Tn = cores and C = I/O wait/CPU ratio.
- Smaller pools often outperform larger ones due to reduced contention.
- Always set connectionTimeout, idleTimeout, and maxLifetime.
- Connection leaks exhaust the pool — use leak detection thresholds and monitoring.
- Read replicas get separate pools with higher max connections.
- Multi-tenant pools can be per-tenant or shared with RLS.
- Monitor active/idle/pending counts, wait times, and timeouts.
- Test pools with Testcontainers under concurrent load.
- Use `pool_pre_ping` or `connectionTestQuery` to verify connection health before use.
- Never hold connections during external API calls or file I/O.
