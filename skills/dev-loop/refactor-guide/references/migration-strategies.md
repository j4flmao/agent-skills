# Migration Strategies

## Overview

Migrations are large-scale structural changes to a codebase: framework upgrades, database changes, architecture transformations, or library replacements. Unlike refactoring, migrations involve behavior changes (new APIs, removed features, different semantics) and require careful coordination.

## Migration Patterns

### 1. Strangler Fig Pattern

Gradually replace a system component by building a new one alongside it and routing traffic over incrementally.

```typescript
// Phase 1: Proxy layer
class UserServiceProxy {
  private legacy = new LegacyUserService()
  private modern = new ModernUserService()

  async getUser(id: string): Promise<User> {
    if (featureFlags.isEnabled('modern-users')) {
      return this.modern.getUser(id)
    }
    return this.legacy.getUser(id)
  }
}

// Phase 2: Migrate consumers one by one
// Phase 3: Remove old implementation
// Phase 4: Remove proxy and feature flag
```

**Pros:** Low risk, incremental, reversible
**Cons:** Increased complexity during migration, dual maintenance cost

### 2. Branch by Abstraction

Replace a concrete dependency by abstracting behind an interface and swapping implementations.

```typescript
// Step 1: Create abstraction
interface EmailProvider {
  send(email: Email): Promise<void>
}

// Step 2: Wrap legacy
class SendGridProvider implements EmailProvider {
  async send(email: Email) { /* SendGrid API */ }
}

// Step 3: Build new
class SESProvider implements EmailProvider {
  async send(email: Email) { /* AWS SES API */ }
}

// Step 4: Swap
class NotificationService {
  constructor(private emailProvider: EmailProvider) {}

  async notify(user: User, message: string) {
    await this.emailProvider.send({ to: user.email, body: message })
  }
}
```

**Pros:** Clean separation, easy to test, no downtime
**Cons:** Requires interface extraction up-front, interface may not capture all behaviors

### 3. Parallel Run

Run old and new systems simultaneously, comparing outputs to verify correctness.

```typescript
// Dark launch — run both, compare, return old result
class PaymentMigration {
  async charge(amount: number): Promise<PaymentResult> {
    const legacyResult = await this.legacy.charge(amount)

    // Dark launch — don't return, just verify
    this.modern.charge(amount)
      .then(modernResult => {
        this.compareResults('charge', { amount }, legacyResult, modernResult)
      })
      .catch(err => {
        logger.error('Modern implementation failed', { error: err })
      })

    return legacyResult  // Return legacy until validated
  }

  private compareResults(
    operation: string,
    input: any,
    legacy: any,
    modern: any
  ) {
    const match = deepEqual(legacy, modern)
    if (!match) {
      logger.error('Result mismatch during parallel run', {
        operation, input, legacy, modern,
      })
    }
  }
}
```

**Pros:** Highest confidence in correctness, no impact on users
**Cons:** 2x infrastructure cost, complex comparison logic, side effects must be handled

### 4. Feature Flag Controlled Rollout

Roll out migration incrementally with granular targeting.

```typescript
const flags = new LaunchDarkly()

// Percentage rollout
app.use((req, res, next) => {
  const useNewSql = flags.variation('new-sql-engine', { key: req.user.id }, false)
  req.useNewSql = useNewSql
  next()
})

// Target specific users or segments
if (flags.variation('new-dashboard', user, false)) {
  return <NewDashboard />
}
return <LegacyDashboard />
```

**Pros:** Granular control, instant rollback, A/B testing capability
**Cons:** Flag management complexity, dead flag cleanup required, code complexity

### 5. Blue-Green Deployment

Maintain two identical environments and switch traffic instantly.

```
Before:
  Users → Load Balancer → Blue (v1, legacy)

During:
  Users → Load Balancer → Blue (v1, legacy)
                             Green (v2, new) ← internal testing

Switch:
  Users → Load Balancer → Green (v2, new)

Rollback:
  Users → Load Balancer → Blue (v1, legacy)
```

**Pros:** Instant switchover, instant rollback, no dual code paths
**Cons:** 2x infrastructure cost, data migration must be backward-compatible

## Database Migrations

### Schema Changes

```sql
-- Safe: additive changes
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- Less safe: destructive changes
ALTER TABLE users DROP COLUMN old_field;

-- Safe with backfill:
ALTER TABLE users ADD COLUMN normalized_email VARCHAR(255);
-- Backfill in batches:
UPDATE users SET normalized_email = LOWER(email) WHERE normalized_email IS NULL LIMIT 1000;
```

### Migration Strategies by Change Type

| Change Type | Strategy | Downtime? | Risk |
|-------------|----------|-----------|------|
| Add column | Direct ALTER TABLE | No | Low |
| Add index | CONCURRENTLY (PG) | No | Low |
| Remove column | Mark unused → drop in next release | No | Medium |
| Rename column | Add new → dual-write → backfill → drop old | No | Medium |
| Change column type | Add new column with new type → migrate → drop old | No | High |
| Split table | Create new → dual-write → backfill → switch reads → drop old | No | High |
| Merge tables | Create new → dual-write → backfill → migrate reads → drop old | No | High |
| Normalize schema | Create new tables → backfill → add views → migrate apps | No | High |
| Shard database | Application-level sharding or proxy | Yes | Very High |

### Expansive-Contractual Migrations

For zero-downtime schema changes, use the expand-migrate-contract pattern:

```
Phase 1: Expand
  - Add new column/table
  - Start writing to both old and new
  - Backfill existing data

Phase 2: Migrate
  - Switch reads to new structure
  - Monitor for errors

Phase 3: Contract
  - Stop writing to old structure
  - Remove old structure
```

## API Migrations

### Versioned API Strategy

```typescript
// URL versioning
app.use('/api/v1', v1Router)
app.use('/api/v2', v2Router)

// Or header versioning
app.use((req, res, next) => {
  const version = req.headers['accept-version'] || '1'
  req.apiVersion = version
  next()
})
```

### Migration Checklist for API Consumers

- [ ] Announce deprecation timeline (min 6 months for public APIs)
- [ ] Provide migration guide with before/after examples
- [ ] Maintain backward compatibility headers
- [ ] Add sunset header: `Sunset: Sat, 14 Nov 2026 23:59:59 GMT`
- [ ] Monitor consumer migration via version metrics
- [ ] Run old and new versions in parallel during transition

## Migration Planning Template

```markdown
## Migration: {Title}

### Scope
- **From**: {current system/version}
- **To**: {target system/version}
- **Drivers**: {why this migration is needed}

### Timeline
- Planning: {dates}
- Development: {dates}
- Testing: {dates}
- Rollout: {dates}
- Cooldown (old removal): {dates}

### Rollout Plan
- [ ] Phase 1: {incremental step}
- [ ] Phase 2: {next step}
- [ ] Phase 3: {final step}
- [ ] Rollback trigger: {condition that triggers rollback}

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data loss | Low | Critical | Backups, parallel run |
| Performance regression | Medium | High | Load testing, monitoring |
| API breaking changes | Medium | Medium | Versioning, deprecation notices |

### Verification
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks within threshold
- [ ] Rollback procedure tested
- [ ] Monitoring dashboards updated
- [ ] Team notified of migration window
```

## Migration Anti-Patterns

| Anti-Pattern | Why It Fails |
|-------------|-------------|
| Big bang migration | Too much risk, too long feedback loop, blocks all other work |
| Underestimating data migration | Data is always more complex than expected — edge cases, corruption, encoding |
| No rollback plan | Every migration needs a proven rollback procedure |
| Migrating without metrics | Without metrics, you cannot know if the migration improved things |
| Not communicating timeline | Stakeholders and dependent teams need advance notice |
| Skipping the parallel run | Only parallel runs catch semantic differences between old and new systems |
| Premature optimization | Don't migrate for theoretical benefits — measure the pain first |
