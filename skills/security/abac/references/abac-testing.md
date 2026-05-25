# ABAC Testing

## Testing Categories

| Category | What It Verifies | Tool |
|----------|-----------------|------|
| Unit tests | Individual policy conditions | Jest, OPA test |
| Integration tests | Full evaluation pipeline | Supertest, custom |
| Policy coverage | Which attribute combinations are covered | Custom analyzer |
| Regression | Policy changes don't break existing behavior | Snapshot comparison |
| Fuzzing | Unexpected inputs don't crash the engine | Custom fuzzer |
| Performance | Evaluation latency stays within SLA | k6, autocannon |

## Unit Testing Policies

### Jest (custom engine)
```javascript
describe('ABAC policy: invoice approval', () => {
  const engine = new PolicyEngine(INVOICE_POLICIES, 'deny-overrides');

  const baseRequest = {
    subject: {
      role: 'manager',
      department: 'engineering',
      userId: 'user-b',
      clearance: 'level-2',
      region: 'US',
    },
    resource: {
      type: 'invoice',
      amount: 5000,
      department: 'engineering',
      createdBy: 'user-a',
      classification: 'internal',
      sensitivity: 2,
      region: 'US',
    },
    action: 'approve',
    environment: {
      riskScore: 20,
      isBusinessHours: true,
      deviceTrust: 90,
      authMethod: 'password',
    },
  };

  test('approves within same department under threshold', () => {
    expect(engine.evaluate(baseRequest)).toBe('allow');
  });

  test('denies cross-department approval', () => {
    const cross = {
      ...baseRequest,
      resource: { ...baseRequest.resource, department: 'finance' },
    };
    expect(engine.evaluate(cross)).toBe('deny');
  });

  test('denies self-approval', () => {
    const selfApprove = {
      ...baseRequest,
      resource: { ...baseRequest.resource, createdBy: 'user-b' },
    };
    expect(engine.evaluate(selfApprove)).toBe('deny');
  });

  test('denies when risk score is high', () => {
    const highRisk = {
      ...baseRequest,
      environment: { ...baseRequest.environment, riskScore: 85 },
    };
    expect(engine.evaluate(highRisk)).toBe('deny');
  });

  test('denies outside business hours', () => {
    const offHours = {
      ...baseRequest,
      environment: { ...baseRequest.environment, isBusinessHours: false },
    };
    expect(engine.evaluate(offHours)).toBe('deny');
  });

  test('admin bypasses restrictions', () => {
    const adminRequest = {
      ...baseRequest,
      subject: { ...baseRequest.subject, role: 'org-admin' },
    };
    expect(engine.evaluate(adminRequest)).toBe('allow');
  });
});
```

### OPA test (Rego)
```rego
package test_invoice_abac

import data.abac

base_input = {
  "subject": {"role": "manager", "department": "engineering", "id": "user-b", "region": "US"},
  "resource": {"type": "invoice", "amount": 5000, "department": "engineering", "owner": "user-a", "region": "US"},
  "action": {"action": "approve"},
  "environment": {"time": 14, "day": 3, "risk_score": 20, "device_trust": 90},
}

test_approve_same_dept  { abac.allow with input as base_input }
test_deny_cross_dept    { not abac.allow with input as object.union(base_input, {"resource": {"department": "finance"}}) }
test_deny_self_approve  { not abac.allow with input as object.union(base_input, {"resource": {"owner": "user-b"}}) }
test_deny_high_risk     { not abac.allow with input as object.union(base_input, {"environment": {"risk_score": 85}}) }
```

## Coverage Analysis

```javascript
// Analyze which attribute combinations your policies cover
function analyzePolicyCoverage(policies) {
  const actions = ['read', 'write', 'delete', 'approve', 'export'];
  const roles = ['viewer', 'member', 'lead', 'manager', 'org-admin', 'super-admin'];
  const departments = ['engineering', 'finance', 'sales', 'hr'];
  const riskLevels = [10, 50, 90];
  const hours = [3, 10, 14, 22];

  const coverage = {
    total: 0,
    allowed: 0,
    denied: 0,
    gaps: [],
  };

  for (const action of actions) {
    for (const role of roles) {
      for (const dept of departments) {
        for (const risk of riskLevels) {
          for (const hour of hours) {
            coverage.total++;
            const result = evaluate({
              subject: { role, department: dept },
              resource: { type: 'document', department: dept === 'engineering' ? dept : 'engineering' },
              action,
              environment: { riskScore: risk, hour, isBusinessHours: hour >= 9 && hour < 17 },
            });
            if (result) coverage.allowed++;
            else coverage.denied++;
          }
        }
      }
    }
  }

  coverage.coverageRate = ((coverage.allowed / coverage.total) * 100).toFixed(1);
  return coverage;
}
```

## Edge Cases

```javascript
describe('ABAC edge cases', () => {
  test('null department does not crash', () => {
    const req = {
      subject: { role: 'manager', department: null },
      resource: { type: 'invoice', amount: 5000, department: null },
      action: 'read',
      environment: { riskScore: 10 },
    };
    expect(() => engine.evaluate(req)).not.toThrow();
    expect(engine.evaluate(req)).toBeDefined();
  });

  test('missing attribute defaults to deny', () => {
    const req = {
      subject: { role: 'manager' }, // no department
      resource: { type: 'invoice', amount: 5000, department: 'eng' },
      action: 'read',
      environment: { riskScore: 10 },
    };
    expect(engine.evaluate(req)).toBe('deny');
  });

  test('extreme values are handled', () => {
    const req = {
      subject: { role: 'member', department: 'eng' },
      resource: { type: 'invoice', amount: 1e12, department: 'eng' },
      action: 'approve',
      environment: { riskScore: -1 },
    };
    expect(engine.evaluate(req)).toBe('deny');
  });

  test('XSS in attributes does not cause issues', () => {
    const req = {
      subject: { role: '<script>alert(1)</script>', department: 'eng' },
      resource: { type: 'invoice', amount: 5000, department: 'eng' },
      action: 'read',
      environment: { riskScore: 10 },
    };
    expect(engine.evaluate(req)).toBe('deny');
  });
});
```

## Fuzz Testing

```javascript
function fuzzABAC(engine, iterations = 5000) {
  const roles = ['admin', 'manager', 'editor', 'viewer', 'guest', null, undefined, ''];
  const departments = ['eng', 'finance', 'sales', 'hr', null, undefined, ''];
  const actions = ['read', 'write', 'delete', 'approve', 'export', null, undefined, ''];
  const amounts = [0, 100, 5000, 1000000, -1, NaN, Infinity, null, undefined];
  const riskScores = [0, 50, 100, -10, 999, null, undefined, NaN];

  for (let i = 0; i < iterations; i++) {
    const input = {
      subject: {
        role: roles[Math.floor(Math.random() * roles.length)],
        department: departments[Math.floor(Math.random() * departments.length)],
      },
      resource: {
        type: 'invoice',
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        department: departments[Math.floor(Math.random() * departments.length)],
      },
      action: actions[Math.floor(Math.random() * actions.length)],
      environment: {
        riskScore: riskScores[Math.floor(Math.random() * riskScores.length)],
      },
    };

    try {
      const result = engine.evaluate(input);
      // Must always return a valid result, never throw
      expect(['allow', 'deny']).toContain(result);
    } catch (e) {
      fail(`Fuzz iteration ${i} threw: ${e.message}\nInput: ${JSON.stringify(input)}`);
    }
  }
}
```

## Regression Testing

```javascript
// Snapshot-based regression
async function capturePolicySnapshot(engine, testSuite) {
  const snapshot = [];
  for (const testCase of testSuite) {
    const result = engine.evaluate(testCase.input);
    snapshot.push({
      id: testCase.id,
      result,
      timestamp: new Date().toISOString(),
    });
  }
  return snapshot;
}

describe('ABAC regression', () => {
  let baseline;

  beforeAll(async () => {
    baseline = await capturePolicySnapshot(engine, STANDARD_TEST_SUITE);
  });

  test('no unexpected policy changes', () => {
    const current = capturePolicySnapshot(engine, STANDARD_TEST_SUITE);
    const differences = [];

    for (const base of baseline) {
      const cur = current.find(c => c.id === base.id);
      if (cur && cur.result !== base.result) {
        differences.push({
          id: base.id,
          expected: base.result,
          actual: cur.result,
        });
      }
    }

    if (differences.length > 0) {
      console.table(differences);
    }
    expect(differences).toHaveLength(0);
  });
});
```

## Performance Testing

```javascript
describe('ABAC performance', () => {
  const engine = new PolicyEngine(ALL_POLICIES, 'deny-overrides');
  const request = {
    subject: { role: 'manager', department: 'eng', userId: 'user-b', clearance: 'level-2' },
    resource: { type: 'invoice', amount: 5000, department: 'eng', createdBy: 'user-a', classification: 'internal', sensitivity: 2 },
    action: 'approve',
    environment: { riskScore: 20, isBusinessHours: true, deviceTrust: 90 },
  };

  test('evaluates under 5ms average', () => {
    const times = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      engine.evaluate(request);
      times.push(performance.now() - start);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    expect(avg).toBeLessThan(5);
  });

  test('handles 100 policies without degradation', () => {
    const largeEngine = new PolicyEngine(generateNPolicies(100), 'deny-overrides');
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      largeEngine.evaluate(request);
    }
    const avg = (performance.now() - start) / 100;
    expect(avg).toBeLessThan(20);
  });
});
```

## ABAC Simulation

```javascript
// Simulate a policy change before deploying
async function simulatePolicyChange(newPolicies, currentTraffic) {
  const simulationEngine = new PolicyEngine(newPolicies, 'deny-overrides');
  const changes = [];

  for (const request of currentTraffic) {
    const currentResult = productionEngine.evaluate(request);
    const newResult = simulationEngine.evaluate(request);

    if (currentResult !== newResult) {
      changes.push({
        request,
        current: currentResult,
        proposed: newResult,
      });
    }
  }

  return {
    totalRequests: currentTraffic.length,
    changed: changes.length,
    changeRate: ((changes.length / currentTraffic.length) * 100).toFixed(2),
    newDenials: changes.filter(c => c.current === 'allow' && c.proposed === 'deny').length,
    newGrants: changes.filter(c => c.current === 'deny' && c.proposed === 'allow').length,
    changes,
  };
}
```

## Test Checklist

- [ ] Every policy has at least one "should allow" test.
- [ ] Every policy has at least one "should deny" test (missing attribute, wrong value).
- [ ] Boundary values tested for numeric conditions (min, max, just above, just below).
- [ ] Null/missing attributes don't crash the engine.
- [ ] Cross-attribute conditions tested (e.g., same department).
- [ ] Combining algorithm verified with conflicting policies.
- [ ] Priority/ordering of policies verified.
- [ ] Disabled policies don't affect evaluation.
- [ ] Performance meets SLA under load.
- [ ] Regression snapshot updated when policy intentionally changes.
- [ ] Simulation run for every policy deployment.
