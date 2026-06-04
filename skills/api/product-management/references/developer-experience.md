# Developer Experience (DX)

## API Design Principles

### Principle Hierarchy
1. **Discoverable** — Developers can find what they need without docs
2. **Consistent** — Same patterns across all endpoints
3. **Predictable** — Responses match expectations
4. **Forgiving** — Sensible defaults, helpful errors
5. **Performant** — Fast responses, efficient payloads

### Consistency Rules
```yaml
consistency_rules:
  naming:
    case: snake_case
    plurals: true  # /users not /user
    verbs: never   # /users not /getUsers

  pagination:
    style: cursor
    params: [first, after]
    response:
      edges: []
      pageInfo:
        hasNextPage: bool
        endCursor: string

  errors:
    format: RFC 7807
    always_include:
      - type
      - title
      - detail
      - instance
```

## SDK Generation

### OpenAPI-Based SDK
```yaml
# openapi-generator-config.yaml
generatorName: typescript-fetch
additionalProperties:
  npmName: "@example/api-client"
  npmVersion: "2.0.0"
  typescriptThreePlus: true
  supportsES6: true
  withInterfaces: true
```

```bash
# Generate SDK
openapi-generator-cli generate \
    -i openapi.yaml \
    -g typescript-fetch \
    -o ./sdk/typescript \
    -c openapi-generator-config.yaml

# Publish
cd ./sdk/typescript
npm publish --access public
```

### SDK Design Guidelines
```typescript
// GOOD — intuitive client
const client = new ApiClient({ apiKey: "sk-..." });
const users = await client.users.list({ page: 1 });
const user = await client.users.get("usr_123");

// GOOD — typed responses
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// GOOD — typed errors
try {
  await client.users.get("invalid");
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.status, error.body.detail);
  }
}
```

### SDK Features Checklist
```yaml
sdk_features:
  - [ ] Full type coverage (request/response)
  - [ ] Automatic retry with backoff
  - [ ] Rate limiting awareness
  - [ ] Token refresh / auth management
  - [ ] Request/response interceptors
  - [ ] Pagination helpers
  - [ ] File upload support
  - [ ] Environment configuration
  - [ ] Tree-shakeable exports
```

## Documentation

### Documentation Structure
```
api-docs/
├── getting-started.md      # 5-minute quickstart
├── authentication.md       # API keys, OAuth flow
├── concepts/               # Core domain concepts
│   ├── users.md
│   ├── orders.md
│   └── payments.md
├── guides/                 # Common tasks
│   ├── pagination.md
│   ├── error-handling.md
│   └── webhooks.md
├── api/                    # Endpoint reference (auto-generated)
│   ├── users.md
│   └── orders.md
├── changelog.md
└── migration-guides/
    └── v1-to-v2.md
```

### Interactive Documentation
```yaml
# Stoplight or Redoc configuration
docs:
  theme:
    colors:
      primary: "#0066FF"
    logo: "./logo.svg"

  try_it_out: true
  code_samples:
    - lang: curl
    - lang: python
    - lang: javascript
    - lang: go

  authentication:
    - type: apiKey
      name: X-API-Key
      in: header
```

### Keeping Docs in Sync
```bash
# CI job to validate docs match implementation
spectral lint openapi.yaml
openapi-diff openapi.yaml deployment/openapi.yaml

# Auto-generate docs from spec
npx @redocly/cli build-docs openapi.yaml -o docs/index.html
```

## Error Messages

### Error Response Format (RFC 7807)
```json
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "email must be a valid email address",
  "instance": "/users",
  "errors": [
    {
      "field": "email",
      "code": "invalid_format",
      "message": "Must be a valid email address"
    }
  ]
}
```

### Helpful Error Messages

| Bad Message | Good Message |
|------------|-------------|
| "Invalid request" | "email must be a valid email address, got 'not-an-email'" |
| "Forbidden" | "API key does not have permission to access users.write" |
| "Rate limit exceeded" | "Rate limit exceeded. Retry after 30 seconds (reset at 2025-01-15T10:00:00Z)" |
| "Internal server error" | "Something went wrong. Reference ID: err_abc123" |

### Error Code Catalog
```yaml
error_codes:
  validation_error:
    http_status: 422
    description: Request body failed validation
    guidance: Check the errors array for field-level details

  authentication_error:
    http_status: 401
    description: Invalid or missing API key
    guidance: Ensure X-API-Key header is set with a valid key

  rate_limit_exceeded:
    http_status: 429
    description: Too many requests
    guidance: Implement exponential backoff, check Retry-After header

  not_found:
    http_status: 404
    description: Resource not found
    guidance: Verify the resource ID exists for your account
```

## Client Libraries

### Library Maintenance
```yaml
client_libraries:
  typescript:
    repo: github.com/example/api-client-ts
    package: "@example/api-client"
    maintainer: team-platform
    tests: npm test
    release: npm publish

  python:
    repo: github.com/example/api-client-python
    package: example-api-client
    maintainer: team-platform
    tests: pytest
    release: twine upload

  go:
    repo: github.com/example/api-client-go
    module: github.com/example/api-client-go
    maintainer: team-platform
    tests: go test ./...
    release: git tag
```

### Automated Release Pipeline
```yaml
name: Release SDK
on:
  push:
    branches: [main]
    paths:
      - "openapi.yaml"
jobs:
  generate-and-publish:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        lang: [typescript, python, go]
    steps:
      - uses: actions/checkout@v4
      - name: Generate SDK
        run: |
          openapi-generator-cli generate \
            -i openapi.yaml \
            -g ${{ matrix.lang }} \
            -o ./sdk/${{ matrix.lang }}
      - name: Run Tests
        run: cd ./sdk/${{ matrix.lang }} && make test
      - name: Publish
        run: cd ./sdk/${{ matrix.lang }} && make publish
```

## Developer Portal

### Portal Sections
```yaml
portal:
  sections:
    - name: Quickstart
      content: Get an API key and make your first request in 5 minutes
      interactive: true

    - name: Guides
      content: Step-by-step tutorials for common tasks
      interactive: true

    - name: API Reference
      content: Auto-generated endpoint documentation
      interactive: true

    - name: SDKs & Tools
      content: Client libraries, CLI tools, Postman collections

    - name: Changelog
      content: Release notes and migration guides

    - name: Status
      content: API uptime and incident history
```

### API Key Management
```python
class ApiKeyManager:
    def create_key(self, user_id: str, name: str, scopes: list[str]) -> str:
        key = f"sk_{secrets.token_urlsafe(32)}"
        hashed = hashlib.sha256(key.encode()).hexdigest()
        self.db.execute(
            "INSERT INTO api_keys (key_hash, user_id, name, scopes) VALUES (?, ?, ?, ?)",
            [hashed, user_id, name, json.dumps(scopes)],
        )
        return key

    def validate_key(self, key: str) -> dict | None:
        hashed = hashlib.sha256(key.encode()).hexdigest()
        row = self.db.fetchone(
            "SELECT * FROM api_keys WHERE key_hash = ? AND revoked = false",
            [hashed],
        )
        return row
```

## Onboarding Flow

### New Developer Checklist
```yaml
onboarding:
  - [ ] Sign up for account
  - [ ] Generate API key
  - [ ] Make first API call (interactive)
  - [ ] Complete tutorial (create a resource)
  - [ ] Set up webhook receiver
  - [ ] Join developer community
```

### First Request Experience
```bash
# Copy-paste ready
curl -H "X-API-Key: $API_KEY" \
     https://api.example.com/v2/users \
     | jq '.'
```

```python
# Python quickstart
import os
from example_api_client import ApiClient

client = ApiClient(api_key=os.environ["API_KEY"])
users = client.users.list(limit=5)
print(f"Found {len(users)} users")
for user in users:
    print(f"  - {user.name} ({user.email})")
```

## Rate Limiting UX

### Rate Limit Headers
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1705316400
```

### Rate Limit Exceeded
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705316400

{
  "type": "https://api.example.com/errors/rate-limit",
  "title": "Rate Limit Exceeded",
  "detail": "1000 requests per hour. Reset at 2025-01-15T10:00:00Z.",
  "retry_after_seconds": 30
}
```

## Webhooks UX

### Webhook Setup
```yaml
webhooks:
  - name: order.created
    description: Triggered when a new order is placed
    payload:
      type: object
      properties:
        order_id: { type: string }
        amount: { type: number }
        created_at: { type: string }

  - name: order.updated
    description: Triggered when order status changes
    payload:
      type: object
      properties:
        order_id: { type: string }
        status: { type: string }
        updated_at: { type: string }
```

### Webhook Testing
```bash
# Use a webhook testing service
curl -X POST https://webhook.site/unique-uuid \
     -H "Content-Type: application/json" \
     -d '{"type": "order.created", "order_id": "ord_123"}'

# Or use the developer portal's test UI
```

## Key Points
- DX principles: discoverable, consistent, predictable, forgiving, performant
- SDK generation from OpenAPI spec ensures client-server consistency
- Interactive documentation with try-it-out reduces onboarding friction
- Error messages must be actionable — tell the developer what's wrong and how to fix it
- Rate limit headers enable clients to self-regulate
- Webhook testing tools help developers validate integrations
- Developer portal centralizes quickstart, guides, reference, SDKs, and status
- Automated SDK pipelines keep client libraries in sync with API changes

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with API product management, lifecycle standards, DX principles, and governance models.
-->

