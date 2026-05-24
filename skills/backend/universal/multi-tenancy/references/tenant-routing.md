# Tenant Routing Reference

## Subdomain vs Path Routing

### Subdomain Routing
```
https://acme.myapp.com/dashboard   → Tenant: acme
https://beta.myapp.com/dashboard    → Tenant: beta
```

### Path Routing
```
https://myapp.com/acme/dashboard   → Tenant: acme
https://myapp.com/beta/dashboard    → Tenant: beta
```

### Comparison

| Factor | Subdomain | Path |
|--------|-----------|------|
| Security | Better (per-tenant cookies) | Shared cookies |
| DNS setup | Needs wildcard DNS | None |
| TLS | Wildcard cert | Single cert |
| SEO | Separate domain authority | Paths share authority |
| Custom domains | Easy (CNAME) | Requires proxy |
| Cookie scope | Per-subdomain | Top-level only |
| Development | URL rewriting needed | Cleaner URLs |
| Rate limiting | Per-subdomain counters | Per-path counters |

### Recommendation

```yaml
tenant_routing:
  default_strategy: subdomain
  reasons:
    - "Isolated cookie scope prevents CSRF between tenants"
    - "Cleaner custom domain support (acme-corp.com → acme.myapp.com)"
    - "Natural rate limiting and quota per tenant"
    - "Easier to isolate tenant-specific traffic patterns"
  when_to_use_path:
    - "Single-tenant-first product adding multi-tenancy later"
    - "No custom domain requirement"
    - "Simple multi-tenancy for internal tools"
```

## Custom Domains

```typescript
interface CustomDomain {
  domain: string;           // e.g., "portal.acme-corp.com"
  tenantId: string;         // e.g., "tenant_acme"
  sslStatus: 'pending' | 'active' | 'failed';
  verifiedAt: Date | null;
}

class CustomDomainService {
  async verifyAndProvision(domain: string, tenantId: string): Promise<void> {
    // 1. Check DNS: CNAME record points to myapp.com
    const dnsValid = await this.checkCNAME(domain, 'myapp.com');
    if (!dnsValid) throw new Error('CNAME not configured');

    // 2. Provision TLS certificate (Let's Encrypt via ACME)
    await this.provisionCertificate(domain);

    // 3. Update routing table
    await this.domainStore.set(domain, { tenantId, sslStatus: 'active' });

    // 4. Invalidate CDN cache
    await this.cdn.addDomain(domain);
  }
}
```

## Tenant Resolution Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

// AsyncLocalStorage for tenant context
import { AsyncLocalStorage } from 'async_hooks';
const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

// Resolution middleware
async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  try {
    // Strategy 1: Subdomain
    const host = req.headers.host;
    const subdomain = host?.split('.')[0];

    // Strategy 2: Path prefix
    const pathParts = req.path.split('/').filter(Boolean);
    const pathTenant = pathParts[0];

    // Strategy 3: Header
    const headerTenant = req.headers['x-tenant-id'] as string;

    // Try strategies in order
    let tenantId = subdomain && subdomain !== 'www'
      ? await resolveTenantByDomain(host!)
      : await resolveTenantByPath(pathTenant);

    tenantId = tenantId || headerTenant;

    if (!tenantId) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    req.tenantId = tenantId;
    tenantStorage.run({ tenantId }, () => next());
  } catch (err) {
    next(err);
  }
}

// Usage: wrap tenant-scoped operations
function getCurrentTenant(): string {
  return tenantStorage.getStore()?.tenantId || 'system';
}
```

### Resolution Performance

```yaml
resolution_benchmarks:
  subdomain_lookup:
    cache: "In-memory LRU (10K entries)"
    latency: "~1ms (cached), ~5ms (DB lookup)"
    strategy: "Cache domain→tenant mapping, TTL 300s"
  
  path_lookup:
    cache: "In-memory LRU (1K entries)"  
    latency: "~0.5ms (cached), ~3ms (DB lookup)"
    strategy: "First path segment → tenant lookup"
  
  header_identification:
    latency: "~0.1ms (header parse only)"
    strategy: "X-Tenant-Id header validation"
    
  combined:
    worst_case: "~8ms (miss all caches, DB query)"
    typical: "~0.5ms (domain cache hit)"
```

## Header-Based Identification

```yaml
tenant_identification_methods:
  header:
    name: "X-Tenant-Id"
    format: "tenant_slug or tenant_uuid"
    example: "X-Tenant-Id: acme-corp"
    security: "Must validate against allowed tenants"
    best_for: "Internal APIs, service-to-service"

  jwt_claim:
    format: "JWT payload includes tenant_id"
    example:
      jwt_decode(token).payload = { tenant_id: "tenant_acme", role: "admin" }
    security: "Signed JWT, validate signature"
    best_for: "User-facing APIs with auth"

  api_key:
    format: "API key maps to tenant"
    example: "Authorization: Bearer ak_abc123"
    security: "Rotate keys, scoped permissions"
    best_for: "Partner/integration APIs"
```

## Routing Table

```typescript
class TenantRoutingTable {
  private domains = new Map<string, string>();  // domain → tenantId
  private paths = new Map<string, string>();    // path prefix → tenantId

  async resolve(hostname: string, path: string): Promise<string | null> {
    // 1. Try exact domain match
    const byDomain = this.domains.get(hostname);
    if (byDomain) return byDomain;

    // 2. Try subdomain (wildcard)
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      const bySubdomain = await db.query(
        'SELECT tenant_id FROM tenant_domains WHERE subdomain = $1',
        [subdomain]
      );
      if (bySubdomain) return bySubdomain.tenant_id;
    }

    // 3. Try path-based
    const pathRoot = path.split('/')[1]; // /{tenant}/...
    const byPath = this.paths.get(pathRoot);
    if (byPath) return byPath;

    return null;
  }

  async register(tenantId: string, config: {
    domain?: string;
    subdomain?: string;
    path?: string;
  }) {
    if (config.domain) this.domains.set(config.domain, tenantId);
    if (config.path) this.paths.set(config.path, tenantId);
    // Persist to DB
    await db.query('INSERT INTO tenant_routes ...');
  }
}
```

## Tenant Routing Best Practices

- **Cache aggressively**: Tenant resolution adds latency — cache with 300s TTL minimum
- **Validate tenant exists**: Never trust client-provided tenant IDs without validation
- **Secure cookie scope**: Use subdomains + `__Host-` prefix for per-tenant cookies
- **Rate limit per tenant**: Apply rate limits at tenant resolution level, not global
- **Tenant isolation at edge**: Reject requests for unknown/disabled tenants in middleware
- **Log resolution failures**: Unknown tenants may indicate misconfiguration or probing
