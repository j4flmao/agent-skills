---
name: backend-api-versioning
description: >
  Use this skill when the user says 'API versioning', 'version strategy', 'URI versioning', 'header versioning', 'content negotiation', 'accept header', 'breaking change', 'API migration', 'deprecate endpoint', 'sunset endpoint'. This skill manages API version transitions using URI, header, or content-negotiation strategies. Applies to any backend stack. Do NOT use for: database schema versioning, client SDK versioning, or infrastructure versioning.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, api-versioning, deprecation, breaking-changes]
---

# Backend API Versioning

## Purpose
Manage API version transitions without breaking existing clients. Support coexistence of multiple API versions and provide clear deprecation signals.

## Agent Protocol

### Trigger
Exact user phrases: "API versioning", "version strategy", "URI versioning", "header versioning", "content negotiation", "accept header", "breaking change", "API migration", "deprecate endpoint", "sunset endpoint", "version path".

### Input Context
- Current API version and clients.
- Type of breaking change being introduced.
- Number of active consumers and their upgrade cadence.

### Output Artifact
Versioning strategy recommendation or configuration. No file unless requested.

### Response Format
```
Strategy: {URI|Header|Content-negotiation}
Current Version: {v1|v2}
Deprecation Policy: {N versions back|N months}
```

### Completion Criteria
- [ ] Versioning strategy chosen and documented
- [ ] Current version endpoints are stable
- [ ] Deprecation headers present on old versions
- [ ] Sunset date communicated via header or docs
- [ ] Migration path documented for consumers

## Architecture Decision Trees

### Versioning Strategy Decision Tree
```
Do clients control the URL they call?
├── Yes → URI Path Versioning (most common)
├── No → Is content negotiation important?
│   ├── Yes → Content Negotiation (Accept header / media types)
│   └── No → Header Versioning (X-API-Version)

Is the API public or internal?
├── Public → URI path (most explicit for external devs)
│   └── Mobile clients? → URI path (app store can't change headers)
└── Internal → Header versioning (cleaner, version managed by gateway)

How many concurrent versions to support?
├── 2 → URI or Header works well
├── 3+ → URI versioning recommended (explicit routing)
└── 1 (always latest) → Not versioning — additive changes only

Is rapid iteration expected?
├── Yes → No versioning, feature flags, additive changes only
└── No → Formal versioning with deprecation policy (18-month min)
```

### Breaking Change Decision Tree
```
Is the change backward-compatible?
├── Yes → Can ship in current version
├── No → Does it remove a field from response?
│   ├── Yes → Major version bump required
│   └── No → Does it change a field type?
│       ├── Yes → Major version bump required
│       └── No → Does it change behavior/semantics?
│           ├── Yes → Major version bump required
│           └── No → Does it make optional field required?
│               ├── Yes → Major version bump required
│               └── No → Additive change, safe within version
└── Unsure → Assume breaking. Better to version than break clients.
```

### Deprecation Timeline Decision Tree
```
Who are the consumers?
├── External third-party developers
│   ├── Announce deprecation ≥ 12 months before sunset
│   ├── Send email notifications to known contacts
│   └── Post migration guide on developer portal
├── Internal B2B partners
│   ├── Announce deprecation ≥ 6 months before sunset
│   └── Provide dedicated migration support
└── Internal service-to-service
    ├── Announce deprecation ≥ 3 months before sunset
    └── Coordinate deployments with consumers
```

## Workflow

### Step 1: Choose Strategy

| Strategy | Mechanism | Pros | Cons | Best For |
|----------|-----------|------|------|----------|
| URI | `/v1/users` | Visible, cache-friendly, simple routing | URL pollution, hard-coded versions | Public APIs, mobile, REST |
| Header | `X-API-Version: 2` | Clean URLs, no pollution | Hidden, needs client config | Internal, service-to-service |
| Content-negotiation | `Accept: application/vnd.api+json;version=2` | RESTful, clean separation | Complex, opaque to tooling | Hypermedia, REST purists |
| Query param | `?version=2` | Simplest implementation | No cache differentiation, non-standard | Early-stage, internal tools |

### Step 2: Apply URI Versioning (Recommended for Public APIs)

```
GET  /v1/users        -> list v1 shape
GET  /v2/users        -> list v2 shape (migrated)
POST /v1/users        -> create v1 shape
POST /v2/users        -> create v2 shape
```

Implementation approaches:

**Pattern A: Separate Router per Version**
```typescript
// Express.js
const v1Router = express.Router();
v1Router.get('/users', v1UsersController.list);
v1Router.post('/users', v1UsersController.create);

const v2Router = express.Router();
v2Router.get('/users', v2UsersController.list);
v2Router.post('/users', v2UsersController.create);

app.use('/v1', v1Router);
app.use('/v2', v2Router);
```

```python
# FastAPI
from fastapi import APIRouter, FastAPI

app = FastAPI()
v1 = APIRouter(prefix="/v1")
v2 = APIRouter(prefix="/v2")

@v1.get("/users")
async def list_users_v1(): ...
@v2.get("/users")
async def list_users_v2(): ...

app.include_router(v1)
app.include_router(v2)
```

**Pattern B: Translation Layer** — shared core with version adapters:
```typescript
// Internal canonical model
interface InternalOrder {
  id: string;
  customer: { id: string; name: string; email: string };
  total: number;
  currency: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  createdAt: Date;
}

// Version adapters transform to wire format
class OrderTranslator {
  toV1(order: InternalOrder): OrderV1 {
    return {
      id: order.id,
      customer_name: order.customer.name,
      total: order.total,
      items: order.items.map(i => ({ product_id: i.productId, qty: i.quantity })),
    };
  }

  toV2(order: InternalOrder): OrderV2 {
    return {
      id: order.id,
      customer: { id: order.customer.id, name: order.customer.name, email: order.customer.email },
      total: order.total,
      currency: order.currency,
      items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      created_at: order.createdAt.toISOString(),
    };
  }
}

// Router uses translator
router.get('/v1/orders/:id', async (req, res) => {
  const order = await orderService.findById(req.params.id);
  res.json(translator.toV1(order));
});

router.get('/v2/orders/:id', async (req, res) => {
  const order = await orderService.findById(req.params.id);
  res.json(translator.toV2(order));
});
```

**Directory structure:**
```
src/
├── core/
│   ├── services/          # Shared business logic
│   ├── models/            # Internal canonical model
│   └── repositories/      # Shared data access
├── api/
│   ├── v1/
│   │   ├── controllers/
│   │   ├── schemas/       # v1 request/response schemas
│   │   └── adapters/      # v1 ↔ core model adapters
│   ├── v2/
│   │   ├── controllers/
│   │   ├── schemas/
│   │   └── adapters/
│   └── middleware/
│       └── version-router.ts
```

### Step 3: Header Versioning

```typescript
// Express header version middleware
function headerVersion(versionMap: Record<string, express.Router>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const version = req.headers['x-api-version'] as string || '1';
    const handler = versionMap[version];
    if (!handler) {
      return res.status(400).json({ error: `Unsupported version: ${version}` });
    }
    handler(req, res, next);
  };
}

app.get('/users', headerVersion({
  '1': v1UsersController.list,
  '2': v2UsersController.list,
}));
```

### Step 4: Add Deprecation Headers

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 23 May 2027 00:00:00 GMT
Link: </v2/users>; rel="successor-version"
Warning: 299 - "This API version is deprecated. Migrate to the latest version."
```

Implementation:
```typescript
function deprecationMiddleware(sunsetDate: string, migrationUrl: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate);
    res.setHeader('Link', `<${migrationUrl}>; rel="successor-version"`);
    res.setHeader('Warning', '299 - "This API version is deprecated. Migrate to the latest version."');
    next();
  };
}

router.get('/v1/users', deprecationMiddleware('2026-12-31T23:59:59Z', '/v2/users'), v1Handler);
```

### Step 5: Handle Breaking Changes

Breaking changes require a new version:
- Removing a required field from response
- Changing a field type (string to number, object to array)
- Making a previously optional input field required
- Changing endpoint behavior (different sort order, error codes)
- Renaming fields or endpoints
- Changing auth requirements

Non-breaking changes (additive within a version):
- Adding new optional fields to response
- Adding new endpoints
- Adding new optional request parameters
- Deprecating existing fields (but keeping them)
- Changing response header values (within documented constraints)

### Step 6: Deprecate and Sunset

1. Announce deprecation with minimum notice period:
   - Public: 12 months
   - B2B partners: 6 months
   - Internal: 3 months

2. Set explicit sunset date from day one
3. Add deprecation headers to all responses from deprecated versions
4. Keep old version running for full deprecation period
5. Monitor version adoption metrics
6. Send deprecation notices to known consumers
7. After sunset date, return 410 Gone with migration docs

```json
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": {
    "code": "GONE",
    "message": "API version 1 has been sunset. Please migrate to v2.",
    "migrationUrl": "https://docs.example.com/migration-v1-to-v2",
    "sunsetDate": "2026-12-31T23:59:59Z"
  }
}
```

### Step 7: Multi-Version Router (Advanced)

```typescript
class VersionRouter {
  private versions = new Map<string, Router>();

  register(version: string, router: Router): void {
    this.versions.set(version, router);
  }

  getRouter(): Router {
    const router = Router();

    // URI versioning
    router.use('/v:version(\\d+)', (req, res, next) => {
      const version = `v${req.params.version}`;
      const versionRouter = this.versions.get(version);
      if (!versionRouter) {
        return res.status(404).json({ error: { code: 'UNKNOWN_VERSION', message: `API version ${version} is not supported` } });
      }
      req.url = req.url.replace(`/v${req.params.version}`, '');
      versionRouter(req, res, next);
    });

    return router;
  }
}

const versionRouter = new VersionRouter();
versionRouter.register('v1', v1Router);
versionRouter.register('v2', v2Router);
app.use('/api', versionRouter.getRouter());
```

## Production Considerations

### Version Adoption Monitoring
- Track active consumers per version via API analytics
- Alert when version usage drops below migration targets
- Weekly adoption reports to stakeholders
- Identify slow-moving consumers and offer migration support

### Multi-Version Maintenance Burdens
| Versions | Maintenance Cost | Recommendation |
|----------|-----------------|----------------|
| 1 | Low | Default, additive changes only |
| 2 | Moderate | Standard — support current + previous |
| 3+ | High | Exponential overhead. Seek to retire oldest. |

### Database Schema Versioning
```sql
-- Canonical table with versioned projections
CREATE TABLE orders_canonical (
    id UUID PRIMARY KEY,
    data JSONB NOT NULL,  -- canonical format
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- v1 view
CREATE VIEW orders_v1 AS
SELECT id, data->>'customer_name' AS customer_name,
       (data->>'total')::DECIMAL AS total
FROM orders_canonical;

-- v2 view
CREATE VIEW orders_v2 AS
SELECT id, data->>'customer_id' AS customer_id,
       (data->>'total')::DECIMAL AS total,
       data->>'currency' AS currency
FROM orders_canonical;
```

### Kubernetes Version Routing
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: api-v1-service
            port: number: 80
      - path: /v2
        pathType: Prefix
        backend:
          service:
            name: api-v2-service
            port: number: 80
```

## Anti-Patterns

### Anti-Pattern 1: Versioning by Date Alone
Using `/2025-01-01/users` without semantic meaning. Combine with semver or release numbering.

### Anti-Pattern 2: Supporting Too Many Versions
3+ concurrent versions creates exponential maintenance burden. Enforce max 2 active versions.

### Anti-Pattern 3: No Deprecation Headers
Failing to inform clients leads to surprise breakage. Always include Deprecation, Sunset, Link headers.

### Anti-Pattern 4: Breaking Changes Without Version Bump
Treating breaking changes as "minor fixes" breaks clients silently. Define breaking changes clearly.

### Anti-Pattern 5: Internal APIs Not Versioned
Internal services change contracts without notice. Apply versioning with shorter deprecation (1-3 months).

### Anti-Pattern 6: No Migration Documentation
Releasing new version without migration guide leaves clients stranded. Provide before/after examples.

### Anti-Pattern 7: Duplicated Business Logic
Copy-pasting entire controllers for each version. Use shared core + version-specific adapters.

### Anti-Pattern 8: The "No Versioning" Trap
Assuming API will never break. Every API eventually needs to change.

### Anti-Pattern 9: The "Always Latest" Anti-Pattern
Forcing all clients to latest version breaks those that can't upgrade. Always support previous version.

### Anti-Pattern 10: The "Version Everything" Anti-Pattern
Versioning every single endpoint independently. Version at API level, not endpoint level.

## Security Considerations
- Versioning information leakage: don't expose that a newer version exists if client is on old version
- Ensure old versions still enforce current auth requirements
- Security patches apply to all supported versions, not just latest
- Audit log which version was used for every request
- Old versions should not bypass rate limiting or WAF rules

## Performance Considerations
- URI versioning: negligible overhead, version is just a path segment
- Header versioning: requires parsing Accept header (slightly slower)
- Translation layers: aim for <5ms overhead per translation step
- Multiple concurrent versions: lazy-load version modules on first request
- Database: use view models that transform same data differently per version
- Caching: URI versioning has natural cache isolation (different URLs)

## Comparative Analysis

### URI vs Header vs Content Negotiation
| Aspect | URI Path | Header | Content Negotiation |
|--------|----------|--------|---------------------|
| Explicitness | Highest | Medium | Low |
| Client effort | None | Medium | High |
| Cache friendliness | High | Low (Vary header) | Medium |
| RESTfulness | Medium | Medium | Highest |
| Browser testability | High | Low | Low |
| API gateway routing | Native | Requires config | Requires config |
| OpenAPI support | Native | Partial | Manual |
| Mobile client support | Native | Complex | Complex |

### Semver vs Date-Based Versioning
| Aspect | Semver (v1.2.3) | Date-based (2025-01) |
|--------|-----------------|---------------------|
| Change magnitude | Communicates | Doesn't communicate |
| Ordering | Numerical | Chronological |
| Client comprehension | Requires semver knowledge | Intuitive |
| Tooling | npm, package managers | Manual |
| API contracts | Well-suited | Less clear |

## Rules
- Never remove or change behavior in a non-backward-compatible way without a version bump
- Support at most 2 active versions simultaneously
- Every version must have a concrete sunset date from day one
- Document all breaking changes in a changelog accessible from the API spec
- Deprecation headers are mandatory on all responses from deprecated versions
- Internal services can share versions but must version public APIs
- Breaking changes require a major version bump
- Additive changes within a version are always backward compatible
- Deprecation period: 12 months minimum for public, 6 for B2B, 3 for internal
- After sunset, return 410 Gone with migration instructions
- Log the version used in every request for observability
- Use consumer-driven contracts to detect breaking changes before production

## References
- `references/breaking-change-mgmt.md` — Identifying, documenting, and communicating breaking changes
- `references/version-compatibility-testing.md` — Testing strategies for multi-version API compatibility
- `references/version-discovery.md` — How clients discover available versions and their capabilities
- `references/version-lifecycle.md` — Full version lifecycle from proposal to sunset
- `references/version-migration-automation.md` — Automating client migration between API versions
- `references/versioning-strategies.md` — Detailed comparison of URI, header, content-negotiation approaches
- `references/api-versioning-strategies.md` — Comprehensive strategy selection guide with implementation details
- `references/api-migration-deprecation.md` — Migration patterns and deprecation workflows in depth
- `references/api-versioning-fundamentals.md` — API Versioning Fundamentals
- `references/api-versioning-advanced.md` — API Versioning Advanced Patterns
- `references/api-versioning-multi-protocol.md` — Versioning Across REST, GraphQL, gRPC, and Events

## Handoff
No artifact produced unless requested.
Next skill: scheduling-cron — schedule background jobs for version migration tasks.
Carry forward: version strategy, active versions, sunset dates.
