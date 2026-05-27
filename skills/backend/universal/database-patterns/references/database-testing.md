# Database Testing

## Overview
Test database interactions: repository unit tests, integration tests with test containers, migration testing, query performance tests, and data integrity validation.

## Repository Unit Tests

```typescript
// Mock-based repository test
describe('UserRepository', () => {
  let mockDb: jest.Mocked<Database>;
  let repo: UserRepository;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      execute: jest.fn(),
    } as any;
    repo = new PostgresUserRepository(mockDb);
  });

  it('finds user by id', async () => {
    const user = { id: '123', email: 'test@example.com' };
    mockDb.query.mockResolvedValue({ rows: [user] });

    const result = await repo.findById('123');

    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT id, email FROM users WHERE id = $1',
      ['123']
    );
    expect(result).toEqual(user);
  });

  it('returns null when user not found', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    const result = await repo.findById('nonexistent');

    expect(result).toBeNull();
  });

  it('saves a new user', async () => {
    const user = new User({ email: 'new@example.com' });
    mockDb.execute.mockResolvedValue({ rowCount: 1 });

    await repo.save(user);

    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining([user.email])
    );
  });
});
```

## Integration Tests with Testcontainers

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

describe('Database Integration', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('testdb')
      .start();

    client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    await client.connect();
    await runMigrations(client);
  }, 60000);

  afterAll(async () => {
    await client?.end();
    await container?.stop();
  });

  it('inserts and retrieves user', async () => {
    await client.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)`,
      ['abc-123', 'test@test.com', 'Test User']
    );

    const result = await client.query(
      `SELECT * FROM users WHERE id = $1`,
      ['abc-123']
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe('test@test.com');
  });

  it('enforces unique email constraint', async () => {
    await client.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)`,
      ['abc-123', 'test@test.com', 'User A']
    );

    await expect(client.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)`,
      ['xyz-789', 'test@test.com', 'User B']
    )).rejects.toThrow();
  });
});
```

## Migration Testing

```typescript
describe('Migrations', () => {
  let client: Client;

  beforeAll(async () => { /* setup testcontainer */ });
  afterAll(async () => { /* cleanup */ });

  it('applies migration 003_add_orders_table', async () => {
    await applyMigration(client, '003_add_orders_table.up.sql');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `);

    expect(result.rows).toEqual([
      { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
      { column_name: 'user_id', data_type: 'uuid', is_nullable: 'NO' },
      { column_name: 'amount', data_type: 'numeric', is_nullable: 'NO' },
      { column_name: 'status', data_type: 'USER-DEFINED', is_nullable: 'NO' },
      { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
    ]);
  });

  it('rolls back migration 003 correctly', async () => {
    await applyMigration(client, '003_add_orders_table.down.sql');
    const exists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'orders'
      )
    `);

    expect(exists.rows[0].exists).toBe(false);
  });
});
```

## Query Performance Tests

```typescript
describe('Query Performance', () => {
  it('looks up user by email in under 5ms (indexed)', async () => {
    const email = 'perf-test@example.com';
    await seedTestData(client, { email });

    // Warm cache
    await client.query('SELECT * FROM users WHERE email = $1', [email]);

    const iterations = 100;
    const timings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await client.query('SELECT * FROM users WHERE email = $1', [email]);
      timings.push(Date.now() - start);
    }

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    expect(avg).toBeLessThan(5); // Average under 5ms
  });

  it('runs under 100ms with 10K users', async () => {
    await seedUsers(client, 10000);

    const start = Date.now();
    const result = await client.query(`
      SELECT u.*, COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.status = 'active'
      GROUP BY u.id
      ORDER BY order_count DESC
      LIMIT 50
    `);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
    expect(result.rows.length).toBeLessThanOrEqual(50);
  });
});
```

## Data Integrity Tests

```typescript
describe('Data Integrity', () => {
  it('enforces foreign key constraint', async () => {
    await expect(client.query(
      `INSERT INTO orders (id, user_id, amount) VALUES ($1, $2, $3)`,
      ['order-1', 'nonexistent-user', 50.00]
    )).rejects.toThrow('violates foreign key constraint');
  });

  it('prevents negative amounts', async () => {
    const userId = 'user-1';
    await client.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [userId, 'u@t.com']);

    await expect(client.query(
      `INSERT INTO orders (id, user_id, amount) VALUES ($1, $2, $3)`,
      ['order-1', userId, -50.00]
    )).rejects.toThrow('CHECK constraint');
  });

  it('cascades deletion correctly', async () => {
    const userId = 'user-cascade-test';
    await client.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [userId, 'cascade@t.com']);
    await client.query(
      `INSERT INTO orders (id, user_id, amount) VALUES ($1, $2, $3)`,
      ['order-cascade', userId, 100.00]
    );

    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

    const orders = await client.query(
      `SELECT * FROM orders WHERE user_id = $1`,
      [userId]
    );
    expect(orders.rows).toHaveLength(0);
  });
});
```

## Key Points
- Unit test repositories with mocked database clients
- Use Testcontainers for reproducible integration tests
- Test both migration application and rollback
- Verify query performance with EXPLAIN ANALYZE and timing assertions
- Validate data integrity: constraints, foreign keys, cascades
- Test with realistic data volumes (1000+ records) for performance
