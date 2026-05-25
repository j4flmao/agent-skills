# ABAC Policy Lifecycle Management

## Policy as Code

Treat authorization policies exactly like application code:

```
policies/
├── documents/
│   ├── read.rego
│   ├── write.rego
│   ├── delete.rego
│   └── approve.rego
├── invoices/
│   ├── read.rego
│   ├── create.rego
│   └── approve.rego
├── users/
│   ├── read.rego
│   └── deactivate.rego
├── common/
│   ├── business_hours.rego
│   ├── risk_scoring.rego
│   └── scope_checks.rego
├── tests/
│   ├── documents_test.rego
│   ├── invoices_test.rego
│   └── integration_test.rego
├── .github/
│   └── workflows/
│       └── policy-tests.yml
└── Makefile
```

## CI/CD Pipeline

```yaml
# .github/workflows/policy-tests.yml
name: Policy Tests

on:
  pull_request:
    paths:
      - 'policies/**'
  push:
    branches: [main]
    paths:
      - 'policies/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OPA
        uses: open-policy-agent/setup-opa@v2
        with:
          version: latest

      - name: Lint policies
        run: opa fmt --check ./policies/

      - name: Run Rego tests
        run: opa test ./policies/ --verbose --coverage

      - name: Generate coverage report
        run: opa test ./policies/ --coverage --format=json > coverage.json

      - name: Check coverage threshold
        run: |
          # Ensure >90% coverage
          python -c "
          import json
          with open('coverage.json') as f:
              cov = json.load(f)
          covered = cov.get('covered_lines', 0)
          total = cov.get('covered_lines', 0) + cov.get('not_covered_lines', 0)
          pct = (covered / total) * 100 if total > 0 else 100
          print(f'Coverage: {pct:.1f}%')
          assert pct >= 90, f'Coverage {pct}% < 90%'
          "

  simulate:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: open-policy-agent/setup-opa@v2

      - name: Simulate against production traffic
        run: |
          # Download last 24h of production access patterns
          curl -o production_traffic.json \
            "https://api.audit-system.com/export/decisions?from=-24h&format=opa"

          # Compare current vs new policy decisions
          opa eval --data policies/ --input production_traffic.json \
            "data.authz.simulate_diff" > diff.json

          # Check for regressions
          python -c "
          import json
          with open('diff.json') as f:
              diff = json.load(f)
          regressions = [d for d in diff.get('result', []) if d.get('type') == 'denial_change']
          if regressions:
              print(f'Found {len(regressions)} behavior changes:')
              for r in regressions:
                  print(f'  {r}')
              import sys
              sys.exit(1)
          "

  deploy-staging:
    runs-on: ubuntu-latest
    needs: simulate
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: open-policy-agent/setup-opa@v2
      - name: Build bundle
        run: opa build -b policies/ -o bundle.tar.gz
      - name: Deploy to staging
        run: |
          curl -X PUT \
            -H "Authorization: Bearer ${{ secrets.BUNDLE_TOKEN }}" \
            -F "bundle=@bundle.tar.gz" \
            https://staging-bundles.mycompany.com/bundles/authz

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: open-policy-agent/setup-opa@v2
      - name: Build bundle
        run: opa build -b policies/ -o bundle.tar.gz
      - name: Sign bundle
        run: |
          openssl dgst -sha256 -sign private.pem -out bundle.tar.gz.sig bundle.tar.gz
      - name: Deploy to production
        run: |
          curl -X PUT \
            -H "Authorization: Bearer ${{ secrets.PROD_BUNDLE_TOKEN }}" \
            -F "bundle=@bundle.tar.gz" \
            -F "signature=@bundle.tar.gz.sig" \
            https://production-bundles.mycompany.com/bundles/authz
```

## Policy Versioning

```javascript
// Policy version registry
const POLICY_VERSIONS = [
  { version: 'v1.0.0', date: '2026-01-15', author: 'alice',
    summary: 'Initial ABAC policies for documents and invoices',
    regoHash: 'sha256:a1b2c3...', status: 'deprecated' },
  { version: 'v1.1.0', date: '2026-03-01', author: 'bob',
    summary: 'Added risk-based conditions, increased coverage to 85%',
    regoHash: 'sha256:d4e5f6...', status: 'deprecated' },
  { version: 'v2.0.0', date: '2026-05-15', author: 'alice',
    summary: 'Major refactor: split into policy per resource, added envoy ext_authz',
    regoHash: 'sha256:g7h8i9...', status: 'active' },
];

// Rollback procedure
async function rollbackPolicy(targetVersion) {
  const version = POLICY_VERSIONS.find(v => v.version === targetVersion);
  if (!version) throw new Error('Version not found');

  // Notify security team
  await notifySecurityTeam({
    severity: 'HIGH',
    title: 'Policy rollback',
    body: `Rolling back to ${targetVersion} from ${POLICY_VERSIONS.find(v => v.status === 'active').version}`,
  });

  // Deploy old bundle
  await deployBundle(version.regoHash);

  // Run simulation to verify rollback
  const diff = await simulatePolicyChange(version.regoHash);
  if (diff.regressions.length > 0) {
    await notifySecurityTeam({
      severity: 'WARNING',
      title: 'Rollback simulation issues',
      body: diff.regressions,
    });
  }

  // Update registry
  await prisma.policyVersion.update({
    where: { version: targetVersion },
    data: { status: 'active' },
  });
}
```

## Canary Policy Deployment

```javascript
// Deploy new policy to 5% of traffic first
async function canaryDeploy(newPolicyBundle, canaryPercent = 5) {
  // Deploy as secondary bundle
  await deployCanaryBundle(newPolicyBundle);

  // Route percentage of traffic to canary
  const decision = await authorize(user, action, resource, {
    // Use canary if user ID hash is within percentage
    useCanary: hashUser(user.id) % 100 < canaryPercent,
  });

  // Log decisions from both engines for comparison
  await logCanaryDecision({
    userId: user.id,
    action,
    resourceId: resource.id,
    productionDecision: productionResult,
    canaryDecision: decision,
    match: productionResult === decision,
  });
}

// Compare canary vs production
async function analyzeCanary() {
  const results = await prisma.canaryDecision.groupBy({
    by: ['action'],
    _count: true,
    _sum: { match: true },
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  for (const r of results) {
    const matchRate = (r._sum.match / r._count) * 100;
    console.log(`${r.action}: ${matchRate.toFixed(1)}% match (${r._count} decisions)`);

    if (matchRate < 99.5) {
      await notifySecurityTeam({
        severity: 'WARNING',
        title: 'Canary mismatch',
        body: `${r.action} has ${matchRate}% match rate. Investigate before full rollout.`,
      });
    }
  }
}
```

## Policy Monitoring & Alerting

```javascript
// Monitor policy evaluation metrics
async function monitorPolicyHealth() {
  const metrics = await prisma.authDecision.aggregate({
    _avg: { evaluationTimeMs: true },
    _count: true,
    where: {
      timestamp: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 min
    },
  });

  // Alert on high latency
  if (metrics._avg.evaluationTimeMs > 50) {
    await alertOpsTeam({
      severity: 'WARNING',
      title: 'Policy evaluation latency spike',
      body: `Avg ${metrics._avg.evaluationTimeMs}ms over ${metrics._count} decisions`,
    });
  }
}

// Detect policy anomalies
async function detectPolicyAnomalies() {
  const recent = await prisma.authDecision.findMany({
    where: {
      timestamp: { gte: new Date(Date.now() - 1 * 60 * 60 * 1000) }, // Last hour
    },
  });

  // Group by action
  const byAction = groupBy(recent, 'action');
  for (const [action, decisions] of Object.entries(byAction)) {
    const denyRate = decisions.filter(d => !d.allowed).length / decisions.length;

    // Alert if deny rate > 3x historical average
    const historical = getHistoricalDenyRate(action);
    if (denyRate > historical * 3) {
      await notifySecurityTeam({
        severity: 'HIGH',
        title: `Anomalous deny rate for ${action}`,
        body: `Current: ${(denyRate * 100).toFixed(1)}% | Historical: ${(historical * 100).toFixed(1)}%`,
      });
    }
  }
}
```

## Policy Review & Governance

```yaml
# Policy review schedule
reviews:
  - type: monthly
    scope: "All policies"
    reviewer: "Security team"
    checklist:
      - "Any new resource types added?"
      - "Any new actions defined?"
      - "Review denied access patterns (potential blocker)"
      - "Remove unused policies"
      - "Review policy coverage report"

  - type: quarterly
    scope: "Entire authorization model"
    reviewer: "Security architect + Compliance"
    checklist:
      - "RBAC role definitions still correct?"
      - "ABAC attribute sources still accurate?"
      - "SoD rules still adequate?"
      - "Any regulatory changes?"
      - "User feedback on authorization friction"
      - "Review policy performance metrics"

  - type: annual
    scope: "Authorization architecture"
    reviewer: "CISO + External auditor"
    checklist:
      - "Authorization model still appropriate?"
      - "Access certification compliance"
      - "Penetration test results"
      - "Incident post-mortems related to auth"
      - "Roadmap for auth improvements"
```

## Policy lifecycle checklist

- [ ] Policies stored in Git (not in DB, not in config files).
- [ ] CI runs tests + coverage check on every PR.
- [ ] Simulation against production traffic before merge.
- [ ] Canary deployment for high-risk policy changes.
- [ ] Rollback procedure documented and tested.
- [ ] Decision logs shipped to SIEM for audit.
- [ ] Monitoring alerts on evaluation latency.
- [ ] Anomaly detection alerts on deny rate spikes.
- [ ] Monthly policy review on calendar.
- [ ] Quarterly authorization model review.
- [ ] Annual external audit.
- [ ] Policy version history retained for 7 years.
