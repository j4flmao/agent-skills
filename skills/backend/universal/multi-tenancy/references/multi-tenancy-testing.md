# Multi-Tenancy Testing

## Overview
Test multi-tenant systems: data isolation verification, cross-tenant access prevention, tenant provisioning tests, migration tests, and performance isolation.

## Data Isolation Tests

```typescript
describe('Tenant Data Isolation', () => {
  it('prevents tenant A from accessing tenant B data', async () => {
    // Authenticate as tenant A
    const tokenA = await authenticate('tenant-a', 'user-a');
    const tokenB = await authenticate('tenant-b', 'user-b');

    // Tenant A creates a resource
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Order from A' });
    const orderId = created.body.id;

    // Tenant B tries to access it
    const response = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(404); // Should not find tenant A's resource
  });

  it('lists only current tenant resources', async () => {
    const tokenA = await authenticate('tenant-a', 'user-a');
    const tokenB = await authenticate('tenant-b', 'user-b');

    // Create resources for both tenants
    await request(app).post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({ name: 'A-1' });
    await request(app).post('/api/orders').set('Authorization', `Bearer ${tokenB}`).send({ name: 'B-1' });
    await request(app).post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({ name: 'A-2' });

    // Tenant A lists
    const responseA = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(responseA.body.data).toHaveLength(2);
    expect(responseA.body.data.every((o: any) => o.tenantId === 'tenant-a')).toBe(true);
  });
});
```

## Cross-Tenant Access Prevention

```typescript
describe('Cross-Tenant Security', () => {
  it('rejects direct tenant ID manipulation', async () => {
    const token = await authenticate('tenant-a', 'user-a');

    // Try to access tenant B's resource by manipulating ID
    const response = await request(app)
      .get('/api/orders/tenant-b-order-123')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it('ignores tenant ID from user input', async () => {
    const token = await authenticate('tenant-a', 'user-a');

    // Try to create a resource in tenant B's scope
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hack attempt', tenantId: 'tenant-b' });

    expect(response.status).toBe(201);

    // Verify it was created in tenant A's scope
    const created = response.body;
    expect(created.tenantId).toBe('tenant-a');
  });

  it('validates tenant context from auth token', async () => {
    const token = await authenticate('tenant-a', 'user-a');

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });

    expect(response.body.tenantId).toBe('tenant-a');
  });
});
```

## Tenant Provisioning Tests

```typescript
describe('Tenant Provisioning', () => {
  it('creates tenant with isolated schema', async () => {
    const tenant = await provisioningService.createTenant({
      name: 'Test Corp',
      plan: 'enterprise',
    });

    expect(tenant.id).toBeDefined();
    expect(tenant.schemaName).toBe(`tenant_${tenant.id}`);

    // Verify schema exists
    const schemaExists = await db.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [`tenant_${tenant.id}`]
    );
    expect(schemaExists.rows).toHaveLength(1);
  });

  it('runs migrations on new tenant schema', async () => {
    const tenant = await provisioningService.createTenant({
      name: 'Migrated Corp',
      plan: 'standard',
    });

    // Verify tables exist in tenant schema
    const tables = await db.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1`,
      [`tenant_${tenant.id}`]
    );

    expect(tables.rows.length).toBeGreaterThan(0);
    expect(tables.rows.map(r => r.table_name)).toContain('users');
    expect(tables.rows.map(r => r.table_name)).toContain('orders');
  });

  it('seeds default data for new tenant', async () => {
    const tenant = await provisioningService.createTenant({
      name: 'Seeded Corp',
      plan: 'pro',
    });

    // Verify default admin user
    const admin = await db.query(
      `SELECT * FROM "${tenant.schemaName}".users WHERE role = 'admin'`
    );
    expect(admin.rows).toHaveLength(1);
  });
});
```

## Migration Tests

```typescript
describe('Multi-Tenant Migrations', () => {
  let tenants: Tenant[];

  beforeAll(async () => {
    // Create test tenants
    tenants = await Promise.all([
      provisioningService.createTenant({ name: 'Tenant 1', plan: 'basic' }),
      provisioningService.createTenant({ name: 'Tenant 2', plan: 'pro' }),
      provisioningService.createTenant({ name: 'Tenant 3', plan: 'enterprise' }),
    ]);
  });

  it('applies migration to all tenant schemas', async () => {
    const migration = '004_add_phone_to_users';

    for (const tenant of tenants) {
      await migrationService.applyMigration(tenant.id, migration);

      const columnExists = await db.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'users' AND column_name = 'phone'`,
        [`tenant_${tenant.id}`]
      );

      expect(columnExists.rows).toHaveLength(1);
    }
  });

  it('allows per-tenant rollback', async () => {
    await migrationService.rollback(tenants[0].id, '004_add_phone_to_users');

    const columnExists = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'users' AND column_name = 'phone'`,
      [`tenant_${tenants[0].id}`]
    );

    expect(columnExists.rows).toHaveLength(0);
  });
});
```

## Performance Isolation Tests

```typescript
describe('Tenant Performance Isolation', () => {
  it('noisy tenant does not degrade others (row-level)', async () => {
    const tokenA = await authenticate('tenant-a-heavy', 'user-a');
    const tokenB = await authenticate('tenant-b-light', 'user-b');

    // Generate load from tenant A
    await Promise.all(
      Array.from({ length: 100 }, () =>
        request(app).post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Bulk' })
      )
    );

    // Measure tenant B latency
    const timings: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await request(app).get('/api/orders').set('Authorization', `Bearer ${tokenB}`);
      timings.push(Date.now() - start);
    }

    const avgLatency = timings.reduce((a, b) => a + b, 0) / timings.length;
    const baseline = 100; // ms — adjust based on your baseline

    expect(avgLatency).toBeLessThan(baseline * 3); // Should not degrade more than 3x
  });
});
```

## Key Points
- Verify tenant A cannot access tenant B's data (returns 404)
- Confirm list endpoints only return current tenant's resources
- Reject direct tenant ID manipulation from user input
- Ignore tenant ID from request body — use auth token only
- Test tenant provisioning creates schema, runs migrations, seeds data
- Test migrations apply to all tenant schemas correctly
- Test per-tenant rollback without affecting other tenants
- Benchmark performance isolation: noisy neighbor should not cause >3x latency increase
