# Authorization Advanced

## Policy as Code (PaC)

Treat authorization policies as code: version control, review, test, deploy.

### Policy Pipeline
```
Developer edits policy → PR created → CI runs policy tests →
  Review + approval → Merge → Policy bundle built →
    Signed with private key → Deployed to policy engine(s)
```

### OPA Bundle Structure
```
policies/
├── production/
│   ├── rbac.rego
│   ├── abac.rego
│   └── .manifest         (roots, metadata)
└── testing/
    ├── rbac_test.rego
    └── data.json          (mock data for tests)
```

### Bundle Signing
```bash
# Generate signing key
openssl genrsa -out bundle_signing_key.pem 2048

# Build and sign bundle
opa build -b policies/ -o bundle.tar.gz
opa sign bundle.tar.gz --signing-key bundle_signing_key.pem

# Verify in OPA
opa run -s --verification-key bundle_signing_key.pem --bundle bundle.tar.gz
```

## Distributed Authorization Architectures

### Sidecar Pattern (OPA/Cerbos)
```
Service A ──gRPC/HTTP──> OPA Sidecar ──bundle pull──> Policy Bundle Server
Service B ──gRPC/HTTP──> OPA Sidecar ──bundle pull──> Policy Bundle Server
```
- Pros: Low latency (<5ms), no SPoF, local evaluation
- Cons: Resource per service, bundle sync delay
- Best for: K8s environments with sidecar injection

### Centralized Policy Service
```
Service A ──> Policy Service (SpiceDB/OPA Central) ──> Policy Data Store
Service B ──> Policy Service (SpiceDB/OPA Central) ──> Policy Data Store
```
- Pros: Single source of truth, real-time policy updates
- Cons: Higher latency (network call), SPoF, scaling challenges
- Best for: ReBAC with relationship graphs (SpiceDB)

### Embedded Library (Casbin)
```
Service A ──in-process──> Casbin Enforcer ──> Policy File/DB
Service B ──in-process──> Casbin Enforcer ──> Policy File/DB
```
- Pros: Lowest latency, no network dependency
- Cons: Language lock-in, policy sync across instances, memory overhead
- Best for: Single-language monoliths or services

## Caching Strategies

### Decision Cache
```typescript
interface CacheKey {
  subjectId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  attributes: string; // serialized subject/resource/env attributes
}

// Cache with TTL = min(token_remaining_ttl, 5 minutes)
// Invalidate on: policy change, role change, permission revoke
async function getCachedDecision(key: CacheKey): Promise<boolean | null> {
  const cacheKey = `authz:${hash(key)}`;
  const cached = await redis.get(cacheKey);
  return cached ? JSON.parse(cached) : null;
}
```

### Write-Through Policy Cache
- Cache entire role → permissions mapping in Redis
- Update on role change (publish event → invalidate cache)
- Fallback to DB on cache miss

### Pre-computed Permissions
For services where a user checks many resources per request:
```typescript
// Embed allowed resource IDs in JWT (for frequently accessed lists)
const token = jwt.sign({
  sub: user.id,
  allowedOrgs: user.memberships.map(m => m.orgId), // Pre-computed
  permissions: ['workspace.read', 'document.write'],
  scope: 'department:engineering'
}, privateKey, { expiresIn: '15m' });
```

## Real-Time Policy Updates

### Change Data Capture for Policies
```sql
-- PostgreSQL LISTEN/NOTIFY for policy changes
CREATE OR REPLACE FUNCTION notify_policy_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('policy_changes', json_build_object(
    'type', TG_OP,
    'role', NEW.role_name,
    'permission', NEW.permission,
    'timestamp', now()
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Event-Driven Invalidation
```
Policy Change → Event Bus → All Service Instances → Invalidate Cache
```

## Zero-Trust Authorization

### Every request must be authorized
- No internal network trust — service-to-service calls also checked
- mTLS between services, authorization on every hop
- Policy evaluated on each request, no pre-computed trust

### Continuous authorization
- Re-evaluate on context change (e.g., user changes department mid-session)
- Risk-based step-up: low-risk = standard auth, high-risk = MFA required
- Session terminates when policy no longer allows

## Performance at Scale

### Optimization Checklist
- [ ] Batch policy evaluations for list endpoints
- [ ] Decision cache with TTL < token expiry
- [ ] Pre-compute frequently accessed permissions
- [ ] Use Bloom filter for deny-list checks (O(1) memory)
- [ ] Read replicas for policy stores
- [ ] Connection pool for sidecar gRPC
- [ ] Profile policy evaluation: identify slow conditions (DB calls, external API)

### Benchmark Targets
| Metric | Target | Degraded |
|--------|--------|----------|
| P50 latency | <2ms | >10ms |
| P99 latency | <10ms | >50ms |
| Throughput | >10K decisions/sec | <1K decisions/sec |
| Cache hit rate | >95% | <80% |

## Testing Authorization at Scale

### Property-Based Testing
```typescript
// For any user, the effective permissions should be a subset of
// the union of all permissions in their role hierarchy
test('effective permissions are subset of role permissions', () => {
  forAll(arbitraryUser, arbitraryResource, (user, resource) => {
    const effective = getEffectivePermissions(user);
    const allRolePerms = getAllPermissionsInHierarchy(user.role);
    expect(effective.every(p => allRolePerms.includes(p))).toBe(true);
  });
});
```

### Chaos Testing for Authorization
- Simulate policy load failures → verify default deny ensures security
- Simulate cache misses → verify fallback to DB works
- Simulate policy bundle corruption → verify OPA returns default deny
- Simulate clock skew → verify JWT and policy time checks still work
