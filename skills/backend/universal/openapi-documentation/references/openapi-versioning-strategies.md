# OpenAPI Versioning Strategies

## Versioning Strategies

| Strategy | URL Style | Header Style | Breaking Change Handling |
|----------|-----------|-------------|-------------------------|
| URL Path | `/v1/users`, `/v2/users` | N/A | Full new version |
| Query Parameter | `/users?version=1` | N/A | Version in query |
| Custom Header | `/users` | `X-API-Version: 1` | Version in request header |
| Accept Header | `/users` | `Accept: application/vnd.api.v1+json` | Content negotiation |
| No Versioning | `/users` | N/A | Backward-compatible only |

## Recommended: URL Path Versioning

```yaml
openapi: 3.0.3
info:
  title: Order Service API
  version: 2.0.0
  description: |
    Version 2.0.0 of the Order Service API.
    See https://docs.example.com/api/v2/migration for v1→v2 changes.

servers:
  - url: https://api.example.com/v2
    description: v2 (current)
  - url: https://api.example.com/v1
    description: v1 (deprecated, sunset Nov 2026)

paths:
  /orders:
    get:
      operationId: listOrders
      summary: List orders (v2 — includes pagination)
      parameters:
        - $ref: '#/components/parameters/pageParam'
        - $ref: '#/components/parameters/limitParam'
      responses:
        '200':
          $ref: '#/components/responses/OrderList'
```

## Multi-Version Spec Management

```
api/
├── v1/
│   ├── openapi.yaml          # v1 spec — frozen
│   ├── paths/
│   │   ├── users.yaml
│   │   └── orders.yaml
│   └── schemas/
│       ├── User.yaml
│       └── Order.yaml
├── v2/
│   ├── openapi.yaml          # v2 spec — active development
│   ├── paths/
│   │   ├── users.yaml
│   │   └── orders.yaml
│   └── schemas/
│       ├── User.yaml
│       └── Order.yaml
└── common/
    ├── parameters.yaml        # Shared parameters
    └── error-responses.yaml   # Shared error schemas
```

## Breaking vs Non-Breaking Changes

```yaml
non_breaking:
  - "Adding optional request parameter"
  - "Adding optional response field"
  - "Adding new endpoint"
  - "Adding new enum value"
  - "Relaxing validation constraint (widening type)"
  - "Adding description or summary"
  - "Adding example"

breaking:
  - "Removing endpoint"
  - "Removing required field from response"
  - "Making optional field required in request"
  - "Renaming field or endpoint"
  - "Changing field type"
  - "Narrowing enum values"
  - "Adding new required field to request"
  - "Changing response structure"
  - "Changing endpoint URL"
  - "Changing HTTP method"
```

## Deprecation Headers

```yaml
paths:
  /v1/orders:
    get:
      operationId: listOrdersV1
      summary: List orders (deprecated)
      deprecated: true
      responses:
        '200':
          description: Successful response
          headers:
            Deprecation:
              schema:
                type: string
              description: "Deprecation flag"
              example: "true"
            Sunset:
              schema:
                type: string
                format: date-time
              description: "When the endpoint will be removed"
              example: "Sat, 30 Nov 2026 23:59:59 GMT"
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderList'
```

## Version Migration Guide

```yaml
migration:
  v1:
    deprecated: true
    sunset: "2026-11-30"
    changelog:
      - "Initial version"

  v2:
    current: true
    changelog:
      - "BREAKING: Pagination now uses cursor-based instead of offset"
      - "BREAKING: Order status enum values renamed to UPPER_SNAKE_CASE"
      - "NEW: Added /orders/{id}/items endpoint"
      - "CHANGE: Order.total now includes tax by default"
      - "DEPRECATED: v1 /orders endpoint scheduled for removal"
```

## Spec Diff Detection

```yaml
# CI step to detect breaking changes
steps:
  - name: "Check for breaking API changes"
    run: |
      npx @redocly/cli diff \
        api/v1/openapi.yaml \
        api/v2/openapi.yaml \
        --format markdown > api/compatibility-report.md

  - name: "Upload compatibility report"
    uses: actions/upload-artifact@v4
    with:
      name: api-compatibility
      path: api/compatibility-report.md

  - name: "Fail on breaking changes (production)"
    if: github.ref == 'refs/heads/main'
    run: |
      npx openapi-diff \
        --old api/v1/production.yaml \
        --new api/v2/openapi.yaml \
        --fail-on-breaking
```

## SDK Versioning

```yaml
sdk_versioning:
  major_version_lockstep:
    description: "SDK major version matches API major version"
    example: "order-sdk v2.x works with API v2"
    release: "Release new SDK major for each API breaking change"

  generated_sdks:
    strategy: "Generate SDKs from each versioned spec"
    output:
      - "sdks/v1/typescript/"
      - "sdks/v1/python/"
      - "sdks/v2/typescript/"
      - "sdks/v2/python/"
```

## Graceful Transition

```typescript
// Router that supports versioned paths
class VersionedRouter {
  private handlers: Map<string, Map<string, Function>> = new Map();

  register(method: string, path: string, version: number, handler: Function): void {
    const key = `${method}:${path}`;
    if (!this.handlers.has(key)) this.handlers.set(key, new Map());
    this.handlers.get(key)!.set(version.toString(), handler);
  }

  async handle(req: Request, res: Response): Promise<void> {
    const version = this.extractVersion(req);
    const key = `${req.method}:${req.path}`;
    const versioned = this.handlers.get(key);

    if (!versioned) return res.status(404).json({ error: 'Not found' });

    // Find exact or latest compatible version
    const handler = versioned.get(version) ||
                    versioned.get(this.findNearestVersion(version, [...versioned.keys()]));

    if (!handler) return res.status(404).json({ error: 'Version not supported' });

    await handler(req, res);
  }

  private extractVersion(req: Request): string {
    return req.path.match(/^\/v(\d+)/)?.[1] || '1';
  }

  private findNearestVersion(requested: string, available: string[]): string | undefined {
    const reqNum = parseInt(requested);
    return available
      .map(v => parseInt(v))
      .filter(v => v <= reqNum)
      .sort((a, b) => b - a)[0]
      ?.toString();
  }
}
```
