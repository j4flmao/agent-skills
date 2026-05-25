# Authorization Testing

## Testing Strategy

| Test Type | What It Catches | When to Run | Tooling |
|-----------|----------------|-------------|---------|
| Unit tests | Wrong permission mapping, logic errors | Per commit | Jest, pytest, JUnit |
| Matrix tests | Missing role-action combinations | Per policy change | Custom matrix runner |
| Integration tests | Middleware, context propagation | Per deployment | Supertest, Playwright |
| Negative tests | Missing deny rules, bypasses | Per deployment | Custom |
| Fuzzing | Unexpected inputs, edge cases | CI nightly | Custom fuzzer |
| Regression tests | Policy change side effects | Per policy change | Snapshot testing |
| Performance tests | Latency impact | Per release | k6, autocannon |

## Permission Matrix Testing

The most important test: every role × every action × every resource.

```javascript
// Define the matrix
const PERMISSION_MATRIX = {
  'super-admin': {
    'document': { create: true, read: true, update: true, delete: true, approve: true },
    'workspace': { create: true, read: true, update: true, delete: true, invite: true },
    'user':      { create: true, read: true, update: true, delete: true, deactivate: true },
    'billing':   { read: true, update: true, export: true },
    'report':    { read: true, create: true, export: true, schedule: true },
  },
  'org-admin': {
    'document': { create: true, read: true, update: true, delete: true, approve: true },
    'workspace': { create: true, read: true, update: true, delete: false, invite: true },
    'user':      { create: true, read: true, update: true, delete: false, deactivate: true },
    'billing':   { read: true, update: false, export: false },
    'report':    { read: true, create: true, export: true, schedule: true },
  },
  'manager': {
    'document': { create: true, read: true, update: true, delete: false, approve: true },
    'workspace': { create: true, read: true, update: true, delete: false, invite: true },
    'user':      { create: false, read: true, update: false, delete: false, deactivate: false },
    'billing':   { read: false, update: false, export: false },
    'report':    { read: true, create: true, export: true, schedule: false },
  },
  'editor': {
    'document': { create: true, read: true, update: true, delete: false, approve: false },
    'workspace': { create: false, read: true, update: false, delete: false, invite: false },
    'user':      { create: false, read: false, update: false, delete: false, deactivate: false },
    'billing':   { read: false, update: false, export: false },
    'report':    { read: true, create: false, export: false, schedule: false },
  },
  'viewer': {
    'document': { create: false, read: true, update: false, delete: false, approve: false },
    'workspace': { create: false, read: true, update: false, delete: false, invite: false },
    'user':      { create: false, read: false, update: false, delete: false, deactivate: false },
    'billing':   { read: false, update: false, export: false },
    'report':    { read: true, create: false, export: false, schedule: false },
  },
};

// Auto-generate test cases from matrix
function generateMatrixTests(matrix) {
  const tests = [];
  for (const [role, resources] of Object.entries(matrix)) {
    for (const [resource, actions] of Object.entries(resources)) {
      for (const [action, expected] of Object.entries(actions)) {
        tests.push({
          name: `${role} ${action} ${resource} → ${expected ? 'allow' : 'deny'}`,
          user: { role },
          action: `${resource}.${action}`,
          expected,
        });
      }
    }
  }
  return tests;
}

// Run matrix tests
describe('Authorization matrix', () => {
  const tests = generateMatrixTests(PERMISSION_MATRIX);

  test.each(tests)('$name', ({ user, action, expected }) => {
    const result = authorize(user, action);
    expect(result).toBe(expected);
  });
});
```

## Negative Testing

Test explicitly denied combinations:

```javascript
describe('Negative authorization tests', () => {
  test('unauthenticated user is denied', () => {
    expect(authorize(null, 'document.read')).toBe(false);
  });

  test('unknown role is denied', () => {
    expect(authorize({ role: 'unknown' }, 'document.read')).toBe(false);
  });

  test('empty permissions resolve to deny', () => {
    expect(authorize({ role: 'viewer' }, 'nonexistent.action')).toBe(false);
  });

  test('guest cannot access admin functions', () => {
    const adminActions = ['user.deactivate', 'billing.export', 'workspace.delete'];
    for (const action of adminActions) {
      expect(authorize({ role: 'guest' }, action)).toBe(false);
    }
  });

  test('deleted user is denied', () => {
    expect(authorize({ role: 'admin', status: 'deleted' }, 'document.read')).toBe(false);
  });

  test('suspended user is denied', () => {
    expect(authorize({ role: 'manager', status: 'suspended' }, 'document.read')).toBe(false);
  });

  test('expired elevation is denied', () => {
    expect(authorizeWithElevation({
      userId: 'user1',
      activeElevation: { expiresAt: Date.now() - 1000, toRole: 'admin' },
    }, 'admin.action')).toBe(false);
  });
});
```

## Edge Case Testing

```javascript
describe('Authorization edge cases', () => {
  test('wildcard permission covers all', () => {
    const user = { role: 'admin' };
    expect(authorize(user, 'anything.anything')).toBe(true);
  });

  test('scope filtering prevents cross-org access', () => {
    const user = { role: 'org-admin', orgId: 'org-a' };
    const crossOrgResource = { orgId: 'org-b' };
    expect(authorizeScoped(user, 'document.read', 'document', crossOrgResource)).toBe(false);
  });

  test('SoD prevents conflicting actions', () => {
    const user = { id: 'alice', role: 'purchase-requester' };
    // Create purchase order
    authorize(user, 'purchase.create', { id: 'PO-123' });
    // Try to approve own order
    expect(checkDynamicSoD('alice', 'approve', 'PO-123')).toBe(false);
  });

  test('elevation does not persist after expiry', async () => {
    const user = { id: 'user1' };
    await createElevation(user.id, 'admin', -1); // already expired
    expect(authorizeWithElevation(user, 'admin.action')).toBe(false);
  });

  test('delegation does not exceed delegator permissions', () => {
    const viewer = { role: 'viewer', id: 'user-a' };
    expect(() => createDelegation('user-a', 'user-b', ['document.delete']))
      .toThrow('Cannot delegate permission you don\'t have');
  });
});
```

## Fuzzing

```javascript
function fuzzAuthorize(iterations = 10000) {
  const roles = ['admin', 'manager', 'editor', 'viewer', 'guest', null, undefined, ''];
  const actions = [
    'document.read', 'document.write', 'document.delete',
    'workspace.*', '*.read', '', null, undefined,
    'user.' + 'a'.repeat(1000),  // very long action
    '../../etc/passwd',           // path traversal
    '<script>alert(1)</script>',  // XSS
  ];

  for (let i = 0; i < iterations; i++) {
    const role = roles[Math.floor(Math.random() * roles.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];

    try {
      const result = authorize({ role }, action);
      // Should always return boolean, never throw
      expect([true, false]).toContain(result);
    } catch (e) {
      // Should never throw for any input
      fail(`Authorization threw for role=${role}, action=${action}: ${e.message}`);
    }
  }
}
```

## ABAC Policy Testing

```javascript
describe('ABAC policy: invoice approval', () => {
  const engine = new PolicyEngine(INVOICE_POLICIES, 'deny-overrides');

  test('manager approves dept invoice under limit', () => {
    const result = engine.evaluate({
      subject: { role: 'manager', department: 'eng', userId: 'user-b' },
      resource: { type: 'invoice', amount: 5000, department: 'eng', createdBy: 'user-a' },
      action: 'approve',
      environment: { riskScore: 20, isBusinessHours: true },
    });
    expect(result).toBe('allow');
  });

  test('manager cannot approve self-created invoice', () => {
    const result = engine.evaluate({
      subject: { role: 'manager', department: 'eng', userId: 'user-a' },
      resource: { type: 'invoice', amount: 5000, department: 'eng', createdBy: 'user-a' },
      action: 'approve',
      environment: { riskScore: 20, isBusinessHours: true },
    });
    expect(result).toBe('deny');
  });

  test('approval blocked during high risk', () => {
    const result = engine.evaluate({
      subject: { role: 'manager', department: 'eng', userId: 'user-b' },
      resource: { type: 'invoice', amount: 5000, department: 'eng', createdBy: 'user-a' },
      action: 'approve',
      environment: { riskScore: 85, isBusinessHours: true },
    });
    expect(result).toBe('deny');
  });

  test('cross-department approval blocked', () => {
    const result = engine.evaluate({
      subject: { role: 'manager', department: 'eng', userId: 'user-b' },
      resource: { type: 'invoice', amount: 5000, department: 'finance', createdBy: 'user-a' },
      action: 'approve',
      environment: { riskScore: 20, isBusinessHours: true },
    });
    expect(result).toBe('deny');
  });

  test('admin bypasses department restriction', () => {
    const result = engine.evaluate({
      subject: { role: 'org-admin', department: 'eng', userId: 'user-b' },
      resource: { type: 'invoice', amount: 5000, department: 'finance', createdBy: 'user-a' },
      action: 'approve',
      environment: { riskScore: 20, isBusinessHours: true },
    });
    expect(result).toBe('allow');
  });
});
```

## Regression Testing

```javascript
// Snapshot-based regression testing
describe('Authorization regression', () => {
  beforeAll(async () => {
    // Capture current state
    this.snapshot = await captureAuthorizationSnapshot();
  });

  test('no unexpected permission changes', () => {
    const current = getCurrentPermissionState();
    const diff = deepDiff(this.snapshot, current);

    const approvedChanges = [
      'permissions.viewer: added document.read',
    ];

    for (const change of diff) {
      if (!approvedChanges.includes(change)) {
        fail(`Unexpected permission change: ${change}`);
      }
    }
  });
});

async function captureAuthorizationSnapshot() {
  const snapshot = {};
  for (const role of getAllRoles()) {
    snapshot[role] = {};
    for (const perm of getAllPermissions()) {
      snapshot[role][perm] = authorize({ role }, perm);
    }
  }
  return snapshot;
}
```

## Audit Testing

```javascript
describe('Authorization audit', () => {
  test('every decision is logged', async () => {
    const logSpy = jest.spyOn(logger, 'info');
    authorize({ role: 'viewer' }, 'document.read');
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'authorization',
        userId: undefined,
        action: 'document.read',
        decision: 'allow',
      })
    );
  });

  test('denied decisions include reason', async () => {
    const logSpy = jest.spyOn(logger, 'info');
    authorize({ role: 'viewer' }, 'document.delete');
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'deny',
        reason: expect.any(String),
      })
    );
  });

  test('role changes are audited', async () => {
    await assignRole('user-a', 'admin', 'user-b');
    const audit = await getAuditLog({ userId: 'user-a', type: 'role_changed' });
    expect(audit).toMatchObject({
      targetUser: 'user-a',
      previousRole: expect.any(String),
      newRole: 'admin',
      changedBy: 'user-b',
    });
  });
});
```

## Performance Testing

```javascript
describe('Authorization performance', () => {
  test('authorize < 5ms per call', async () => {
    const user = { role: 'manager', department: 'eng' };
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      authorize(user, 'document.read');
    }
    const avg = (performance.now() - start) / 1000;
    expect(avg).toBeLessThan(5);
  });

  test('ABAC evaluation < 20ms per call', async () => {
    const engine = new PolicyEngine(ALL_POLICIES, 'deny-overrides');
    const request = {
      subject: { role: 'manager', department: 'eng', userId: 'user-b' },
      resource: { type: 'invoice', amount: 5000, department: 'eng', createdBy: 'user-a' },
      action: 'approve',
      environment: { riskScore: 20 },
    };
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      engine.evaluate(request);
    }
    const avg = (performance.now() - start) / 100;
    expect(avg).toBeLessThan(20);
  });
});
```

## Test Checklist

- [ ] Every role × every action × every resource tested (matrix).
- [ ] Null/undefined/empty role inputs do not crash.
- [ ] Wildcard permissions tested.
- [ ] Scope boundaries tested (cross-org, cross-dept).
- [ ] SoD conflicts enforced.
- [ ] Self-approval blocked.
- [ ] Elevation expiry enforced.
- [ ] Delegation properly scoped.
- [ ] Break-glass properly audited.
- [ ] All denied actions logged with reason.
- [ ] Performance meets SLA (RBAC < 5ms, ABAC < 20ms).
- [ ] No permission regression on policy update.
