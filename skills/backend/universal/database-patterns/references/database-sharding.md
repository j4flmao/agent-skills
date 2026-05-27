# Database Sharding

## Overview
Design and implement database sharding strategies: horizontal partitioning, shard key selection, routing, rebalancing, and cross-shard queries.

## Shard Key Selection

```typescript
interface ShardKeyStrategy {
  name: string;
  hashFunction: (key: string) => number;
  validate: (key: unknown) => boolean;
}

const SHARD_STRATEGIES: Record<string, ShardKeyStrategy> = {
  userId: {
    name: 'User ID Hash',
    hashFunction: (key: string) => {
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    },
    validate: (key) => typeof key === 'string' && key.length > 0,
  },
  tenantId: {
    name: 'Tenant ID Range',
    hashFunction: (key: string) => {
      // Use CRC32 for deterministic distribution
      const crc = crc32(key);
      return Math.abs(crc);
    },
    validate: (key) => typeof key === 'string',
  },
};

class ShardRouter {
  private shards: Shard[];
  private strategy: ShardKeyStrategy;

  getShard(shardKey: string): Shard {
    const hash = this.strategy.hashFunction(shardKey);
    const shardIndex = hash % this.shards.length;
    return this.shards[shardIndex];
  }

  getShardIndex(shardKey: string): number {
    const hash = this.strategy.hashFunction(shardKey);
    return hash % this.shards.length;
  }
}
```

## Shard-Aware Repository

```typescript
class ShardedUserRepository {
  constructor(
    private router: ShardRouter,
    private shards: DatabaseShard[]
  ) {}

  async findById(userId: string): Promise<User | null> {
    const shardIndex = this.router.getShardIndex(userId);
    const shard = this.shards[shardIndex];

    const result = await shard.query(
      'SELECT id, email, name, shard_key FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0] ? this.toUser(result.rows[0]) : null;
  }

  async save(user: User): Promise<void> {
    const shardKey = this.getShardKey(user);
    const shardIndex = this.router.getShardIndex(shardKey);
    const shard = this.shards[shardIndex];

    await shard.query(
      `INSERT INTO users (id, email, name, shard_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET email = $2, name = $3`,
      [user.id, user.email, user.name, shardKey]
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    // Email is NOT the shard key, so query ALL shards
    const results = await Promise.all(
      this.shards.map(shard =>
        shard.query(
          'SELECT id, email, name, shard_key FROM users WHERE email = $1',
          [email]
        )
      )
    );

    const user = results.flatMap(r => r.rows).find(r => r.email === email);
    return user ? this.toUser(user) : null;
  }
}
```

## Consistent Hashing for Rebalancing

```typescript
class ConsistentHashRing {
  private ring: Map<number, Shard> = new Map();
  private sortedKeys: number[] = [];
  private virtualNodes = 150;

  constructor(shards: Shard[]) {
    for (const shard of shards) {
      for (let i = 0; i < this.virtualNodes; i++) {
        const hash = this.hash(`${shard.id}:${i}`);
        this.ring.set(hash, shard);
      }
    }
    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  getShard(key: string): Shard {
    const hash = this.hash(key);
    const idx = this.findNearestNode(hash);
    return this.ring.get(this.sortedKeys[idx])!;
  }

  addShard(shard: Shard): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const hash = this.hash(`${shard.id}:${i}`);
      this.ring.set(hash, shard);
    }
    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  removeShard(shardId: string): void {
    for (const [hash, shard] of this.ring) {
      if (shard.id === shardId) {
        this.ring.delete(hash);
      }
    }
    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }
}
```

## Cross-Shard Queries

```typescript
class CrossShardQueryExecutor {
  async queryAllShards<R>(query: string, params: unknown[]): Promise<R[]> {
    const results = await Promise.all(
      this.shards.map(shard => shard.query<R>(query, params))
    );

    return results.flatMap(r => r.rows);
  }

  async paginateCrossShard<R>(
    query: string,
    params: unknown[],
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<R>> {
    // Query all shards with limit + offset to cover the page
    const adjustedLimit = pageSize * this.shards.length;
    const adjustedOffset = 0; // Gather from all shards then paginate

    const results = await Promise.all(
      this.shards.map(shard =>
        shard.query<R>(`${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [
          ...params,
          adjustedLimit,
          adjustedOffset,
        ])
      )
    );

    // Merge and sort across shards
    const allRows = results.flatMap(r => r.rows);
    const sorted = allRows.sort((a, b) => (b as any).created_at - (a as any).created_at);
    const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

    // Estimate total (expensive in sharded setup)
    const total = await this.estimateTotalCount(query, params);

    return {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async distributedTransaction<R>(
    operations: Map<number, (shard: DatabaseShard) => Promise<R>>
  ): Promise<Map<number, R>> {
    const results = new Map<number, R>();

    for (const [shardIndex, operation] of operations) {
      const shard = this.shards[shardIndex];
      const client = await shard.getClient();

      try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');
        results.set(shardIndex, result);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        // Note: distributed transactions across shards are best-effort
        // Consider saga pattern for consistency
        throw error;
      } finally {
        client.release();
      }
    }

    return results;
  }
}
```

## Shard Rebalancing

```typescript
class ShardRebalancer {
  async rebalance(targetShardCount: number): Promise<RebalancePlan> {
    const currentShards = await this.getShards();
    const rebalanceOps: RebalanceOperation[] = [];

    if (targetShardCount > currentShards.length) {
      // Scale out: add new shard
      const newShard = await this.addShard();
      rebalanceOps.push({ type: 'ADD_SHARD', shardId: newShard.id });

      // Move some ranges to the new shard
      const movePlan = this.calculateRangeMoves(currentShards, newShard);
      for (const move of movePlan) {
        rebalanceOps.push({
          type: 'MOVE_RANGE',
          sourceShard: move.sourceShard,
          destShard: newShard.id,
          range: move.range,
          estimatedRows: move.rowCount,
        });
      }
    }

    return {
      operations: rebalanceOps,
      estimatedDuration: rebalanceOps.length * 60000, // ~1 min per operation
      readOnly: true, // Must switch to read-only during rebalance
    };
  }

  async executeRebalance(plan: RebalancePlan): Promise<void> {
    for (const op of plan.operations) {
      if (op.type === 'MOVE_RANGE') {
        await this.moveDataRange(op.sourceShard, op.destShard, op.range);
        await this.updateRoutingTable(op);
      }
    }

    await this.updateShardRegistry();
  }
}
```

## Key Points
- Choose shard key based on access patterns (most common query path)
- Use consistent hashing with virtual nodes for minimal reshuffling on rebalance
- Shard-aware repositories route queries to correct shard
- Cross-shard queries are expensive: prefer shard-local queries
- Implement distributed transactions with saga pattern (not 2PC)
- Plan rebalancing during maintenance windows; estimate time per operation
- Monitor shard imbalance: data size, query load, connection count
