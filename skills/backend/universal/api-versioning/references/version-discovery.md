# Version Discovery Reference

## Content Negotiation

Use HTTP content negotiation to let clients specify API version.

### MIME Type Versioning
```http
# Client requests v2 of the users resource
GET /users/123
Accept: application/vnd.myapi.v2+json

# Server responds with v2 format
HTTP/1.1 200 OK
Content-Type: application/vnd.myapi.v2+json
```

```typescript
// Express content negotiation versioning
function versionMiddleware(req: Request, res: Response, next: NextFunction) {
  const accept = req.headers.accept || '';
  const versionMatch = accept.match(/application\/vnd\.myapi\.v(\d+)\+json/);
  const version = versionMatch ? parseInt(versionMatch[1]) : 1;  // Default v1

  req.apiVersion = version;

  // Set response content type
  res.setHeader('Content-Type', `application/vnd.myapi.v${version}+json`);
  next();
}

// Versioned controllers
app.get('/users/:id', (req, res) => {
  if (req.apiVersion === 1) return v1UserController(req, res);
  if (req.apiVersion === 2) return v2UserController(req, res);
  return res.status(406).json({ error: 'Unsupported API version' });
});
```

### Content Negotiation vs URI vs Header

| Aspect | MIME Type (Accept) | URI (/v1/) | Custom Header (X-API-Version) |
|--------|-------------------|------------|-------------------------------|
| RESTful purity | Yes | Moderate | No |
| Cache-friendly | Yes (Vary: Accept) | Yes | No (Vary not commonly used) |
| URL simplicity | Clean URLs | Version visible | Clean URLs |
| Client complexity | Moderate | Low | Low |
| CDN compatibility | Good (with Vary) | Best | Poor |
| Tooling support | curl, Postman need config | Direct | curl, Postman need header |

## Version Negotiation

### Client-Driven Negotiation

```typescript
interface VersionNegotiator {
  // Determine best version for client based on:
  // 1. Explicit Accept header
  // 2. Registered client version
  // 3. Default to latest stable
  negotiate(req: Request): number;
}

class VersionNegotiatorImpl implements VersionNegotiator {
  private readonly supportedVersions = [1, 2];
  private readonly defaultVersion = 2;

  negotiate(req: Request): number {
    // Strategy 1: Accept header with MIME type
    const acceptVersion = this.parseAcceptVersion(req.headers.accept);
    if (acceptVersion && this.supportedVersions.includes(acceptVersion)) {
      return acceptVersion;
    }

    // Strategy 2: Custom header
    const headerVersion = parseInt(req.headers['x-api-version'] as string);
    if (!isNaN(headerVersion) && this.supportedVersions.includes(headerVersion)) {
      return headerVersion;
    }

    // Strategy 3: URI path
    const pathVersion = parseInt(req.path.split('/')[1]?.replace('v', '') || '');
    if (!isNaN(pathVersion) && this.supportedVersions.includes(pathVersion)) {
      return pathVersion;
    }

    // Strategy 4: Client registration (database)
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const client = clientRegistry.get(apiKey);
      if (client?.pinnedVersion) return client.pinnedVersion;
    }

    return this.defaultVersion;
  }

  private parseAcceptVersion(accept?: string): number | null {
    const match = accept?.match(/application\/vnd\.myapi\.v(\d+)\+json/);
    return match ? parseInt(match[1]) : null;
  }
}
```

## Sunset/Deprecation Discovery Headers

### Header Convention
```http
# Client can discover version status from ANY endpoint

GET /v1/users/123

HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 1 Jun 2026 00:00:00 GMT
Link: </v2/users/123>; rel="successor-version"
Sunset-Policy: /sunset-policies/v1
```

### Discovery Endpoint

```typescript
// Dedicated version discovery endpoint
app.get('/api-versions', (req, res) => {
  res.json({
    current: {
      version: 2,
      stableSince: '2025-03-01',
      status: 'active',
    },
    supported: [
      {
        version: 1,
        status: 'deprecated',
        deprecatedAt: '2025-06-01',
        sunsetAt: '2026-06-01',
        successorVersion: 2,
        migrationGuide: '/docs/migration-v1-to-v2',
      }
    ],
    changelog: '/api-changelog',
    roadmap: '/api-roadmap',
  });
});
```

## API Changelog

```markdown
# API Changelog

## v2.3.0 (2026-05-15)
### Added
- `POST /v2/orders/batch` — Create multiple orders in one request
- `X-Request-Id` response header on all endpoints

## v2.2.0 (2026-03-01)
### Added
- `email_verified` field on `/v2/users/:id` response
- Filter parameter `?status=` on `/v2/orders`

## v2.1.0 (2025-12-01)
### Added
- Webhook support for order events
- Rate limit headers (X-RateLimit-*) on all responses

## v2.0.0 (2025-03-01)
### Breaking Changes
- Pagination: offset → cursor-based (`?cursor=abc&limit=20`)
- Error format: `{ "error": "code", "message": "..." }`
- Removed: `POST /v2/users/:id/avatar` (use dedicated upload endpoint)
```

### Changelog API
```typescript
app.get('/api-changelog', (req, res) => {
  const since = req.query.since as string; // ISO date
  const entries = changelog.filter(e => !since || e.date >= since);
  res.json({
    entries: entries.map(e => ({
      version: e.version,
      date: e.date,
      type: e.type,      // 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed'
      description: e.description,
      documentation: e.docsUrl,
    })),
  });
});
```

## Migration Guides

```yaml
migration_guide:
  from_version: 1
  to_version: 2

  breaking_changes:
    - title: "Pagination changes"
      description: "Offset pagination replaced with cursor-based"
      old_code: "/v1/orders?page=2&limit=20"
      new_code: "/v2/orders?cursor=abc123&limit=20"
      migration_steps:
        - "Replace page parameter with cursor"
        - "Parse next_cursor from response for subsequent pages"

    - title: "Error format"
      description: "Errors now use consistent format"
      old_format: '{ "message": "Not found" }'
      new_format: '{ "error": "NOT_FOUND", "message": "User not found", "requestId": "req-abc" }'
      migration_steps:
        - "Update error handling to parse error.code instead of message text"

  new_features:
    - "Batch operations"
    - "Webhook support"
    - "Rate limit headers"
```

## Version Discovery Best Practices

- **Always respond with version metadata**: Every response from deprecated versions includes `Deprecation` + `Sunset` headers
- **Expose discovery endpoint**: `/api-versions` endpoint lists all supported versions, statuses, and migration info
- **Document changelog programmatically**: Machine-readable changelog enables automated migration tooling
- **Publish migration guides**: One guide per version transition, with code examples and breaking change mapping
- **Support gradual migration**: Allow clients to pin versions and migrate at their own pace within the support window
