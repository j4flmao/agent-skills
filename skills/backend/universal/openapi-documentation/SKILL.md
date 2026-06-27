---
name: backend-openapi-documentation
description: >
  Use this skill when the user says 'OpenAPI', 'Swagger', 'API documentation', 'spec-first', 'API spec', 'openapi.yaml', 'swagger.json', 'codegen', 'openapi-generator', 'API contract first'. This skill enforces spec-first API documentation with OpenAPI 3.x, code generation, and versioned specs. Applies to any backend stack. Do NOT use for: proto/gRPC specs, GraphQL schemas, or internal-only endpoints.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, openapi, swagger, documentation, api-spec]
---

# Backend OpenAPI Documentation

## Purpose
Drive all API development with an OpenAPI 3.x spec-first workflow: spec defines the contract, code is generated from it, and the spec is versioned alongside the code. The OpenAPI spec is the single source of truth for the API contract.

## Agent Protocol

### Trigger
Exact user phrases: "OpenAPI", "Swagger", "API documentation", "spec-first", "API spec", "openapi.yaml", "swagger.json", "codegen", "openapi-generator", "API contract first".

### Input Context
- Existing API endpoints or resource definitions.
- Chosen OpenAPI version (3.0.x or 3.1.x).
- Code generation target language.

### Output Artifact
OpenAPI YAML/JSON spec snippet or full spec file. No file unless requested.

### Response Format
```
Path: {path}
Method: {method}
OperationId: {operationId}
Tags: [{tag}]
```

### Completion Criteria
- [ ] Every endpoint has: path, method, operationId, summary, tags.
- [ ] Every request/response has a schema.
- [ ] All schemas use $ref and are not inline.
- [ ] Error responses documented.
- [ ] Security schemes defined.
- [ ] Spec passes validation (spectral or swagger-cli).

### Max Response Length
6 lines per endpoint. Unlimited for full spec.

## Architecture Decision Tree

### Spec-First vs Code-First

```
Who owns the API contract?
  ├── Spec-first (OpenAPI as source of truth)
  │   ├── PRO: Contract before implementation, generates client/server code
  │   ├── CON: Slower initial development, requires spec discipline
  │   └── Use when: Public API, multiple consumers, external integrations
  └── Code-first (annotations/comments generate spec)
      ├── PRO: Faster development, single source (code)
      ├── CON: Spec is afterthought, easy to forget docs
      └── Use when: Internal API, single consumer, rapid prototyping
```

### OpenAPI Version Decision

```
Do you need JSON Schema full compatibility?
  ├── Yes → OpenAPI 3.1.x (fully compatible with JSON Schema 2020-12)
  │   ├── PRO: $ref anywhere, JSON Schema ecosystem
  │   └── CON: Less tooling support, newer standard
  └── No → OpenAPI 3.0.x (wider tool support)
      ├── PRO: Most tools support this (Swagger UI, codegen, Spectral)
      └── CON: Limited JSON Schema compatibility
```

### API Style Decision

```
REST or resource-based?
  ├── Yes → Standard resource endpoints:
  │   GET /resources         → List resources
  │   POST /resources        → Create resource
  │   GET /resources/{id}    → Get resource
  │   PUT /resources/{id}    → Replace resource
  │   PATCH /resources/{id}  → Partial update
  │   DELETE /resources/{id} → Delete resource
  └── No → RPC-style operations:
      POST /rpc/operation    → Google-style, non-CRUD
```

## Workflow

### Step 1: Define Info and Servers
```yaml
openapi: 3.0.3
info:
  title: Payment Service API
  version: 1.0.0
  description: Handles payment processing and reconciliation
  contact:
    name: Payment Team
    email: payment-team@example.com
  license:
    name: MIT
servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: https://staging-api.example.com/v1
    description: Staging server
```

### Step 2: Define Paths and Operations
```yaml
paths:
  /payments:
    get:
      operationId: listPayments
      summary: List all payments with pagination and filtering
      tags: [Payments]
      parameters:
        - $ref: '#/components/parameters/pageParam'
        - $ref: '#/components/parameters/limitParam'
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, completed, failed, refunded]
      responses:
        '200':
          description: Paginated list of payments
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedPayments'
        '400':
          $ref: '#/components/responses/BadRequest'
    post:
      operationId: createPayment
      summary: Create a new payment
      tags: [Payments]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePaymentRequest'
      responses:
        '201':
          description: Payment created
          headers:
            Location:
              schema:
                type: string
                format: uri
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'
        '409':
          $ref: '#/components/responses/Conflict'
```

### Step 3: Define Schemas (components)
```yaml
components:
  schemas:
    Payment:
      type: object
      required: [id, amount, currency, status, createdAt]
      properties:
        id:
          type: string
          format: uuid
          description: Unique payment identifier
        amount:
          type: number
          minimum: 0.01
          example: 49.99
        currency:
          type: string
          pattern: '^[A-Z]{3}$'
          example: USD
        status:
          type: string
          enum: [pending, completed, failed, refunded]
        description:
          type: string
          maxLength: 500
        createdAt:
          type: string
          format: date-time
```

### Step 4: Add Error Responses
```yaml
components:
  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Conflict:
      description: Resource conflict
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
  schemas:
    ErrorResponse:
      type: object
      required: [code, message, requestId]
      properties:
        code:
          type: string
          description: Machine-readable error code
          example: PAYMENT_ALREADY_EXISTS
        message:
          type: string
          description: Human-readable error message
          example: Payment with this idempotency key already exists
        requestId:
          type: string
          format: uuid
          description: Trace ID for support
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
                description: Field that caused the error
              message:
                type: string
                description: Error message for this field
```

### Step 5: Add Security Schemes
```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Standard JWT authentication
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for service-to-service auth

security:
  - bearerAuth: []
```

### Step 6: Validate Spec
```bash
# Lint with Spectral
npx @stoplight/spectral-cli lint openapi.yaml

# Structural validation
npx swagger-cli validate openapi.yaml

# Diff against previous version
npx @openapitools/openapi-diff openapi-v1.yaml openapi-v2.yaml
```

### Step 7: Generate Code
```bash
# Server stub
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-express \
  -o ./generated/server \
  --additional-properties=typescriptThreePlus=true

# Client SDK
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./generated/client \
  --additional-properties=withInterfaces=true
```

## Implementation Patterns

### Schema Reuse Pattern
```yaml
# Define reusable pagination parameters
components:
  parameters:
    pageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
      description: Page number (1-indexed)
    limitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
      description: Items per page
  schemas:
    PaginatedResponse:
      type: object
      required: [data, pagination]
      properties:
        data:
          type: array
        pagination:
          type: object
          properties:
            page: { type: integer }
            limit: { type: integer }
            total: { type: integer }
            totalPages: { type: integer }
```

### Discriminated Union Pattern
```yaml
# OneOf for polymorphic responses
components:
  schemas:
    CreatePaymentResponse:
      oneOf:
        - $ref: '#/components/schemas/PaymentSuccess'
        - $ref: '#/components/schemas/PaymentError'
      discriminator:
        propertyName: type
        mapping:
          success: '#/components/schemas/PaymentSuccess'
          error: '#/components/schemas/PaymentError'
```

### Callback Pattern (Webhooks)
```yaml
paths:
  /payments:
    post:
      callbacks:
        paymentCompleted:
          '{$request.body#/callbackUrl}':
            post:
              requestBody:
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/PaymentWebhook'
```

## Production Considerations

### Versioning Strategy
| Strategy | Mechanism | Breaking Change? | Example |
|----------|-----------|-----------------|---------|
| URL path | `/v1/`, `/v2/` | New version | `api.example.com/v1/payments` |
| Header | `Accept: application/vnd.api+json;version=2` | New version | Custom accept header |
| Query param | `?version=2` | New version | `api.example.com/payments?version=2` |
| No versioning | Always backward compatible | Never | `api.example.com/payments` |

### Codegen Considerations
| Aspect | Recommendation |
|--------|---------------|
| When to generate | On spec change, committed to repo |
| What to generate | Client SDK, server interfaces, docs |
| What NOT to generate | Business logic, database access |
| Custom templates | Use mustache templates for custom patterns |
| Generated code | Check in to version control (deterministic) |

### Spec Validation Rules
```yaml
# Spectral ruleset
extends: [[spectral:oas, all]]
rules:
  operation-operationId: error
  path-params: error
  path-declarations-must-exist: error
  no-identical-paths: error
  operation-tags: error
  operation-summary: error
  oas3-unused-component: warn
  oas3-valid-media-example: error
```

## Anti-Patterns

1. **Inline schemas**: Defining schemas directly in path definitions prevents reuse. Always use `$ref`.
2. **Missing error schemas**: Documenting only success responses gives consumers no information about failure modes.
3. **No operationId**: operationId is required for code generation method names. Every operation must have one.
4. **Breaking changes without version bump**: Removing fields, changing types, or adding required fields are breaking changes. Always bump version.
5. **Spec and code out of sync**: Generated code that's modified manually diverges from the spec. Keep the spec as the single source of truth.
6. **Undocumented security**: Not documenting auth schemes means consumers must guess. Always define securitySchemes.
7. **Generic 500 response**: Use specific error responses per endpoint (4xx for client errors, 5xx for server errors).

## Performance

### Spec File Size
| Spec Size | Load Time | Notes |
|-----------|-----------|-------|
| < 100KB | Instant | Single service, simple API |
| 100KB-1MB | < 1s | Multiple services, many endpoints |
| 1MB-10MB | 1-5s | Use multi-file spec with $ref |
| > 10MB | Slow | Consider splitting into multiple specs |

### Multi-File Spec Organization
```yaml
# openapi.yaml (root)
paths:
  /users:
    $ref: paths/users.yaml
components:
  schemas:
    User:
      $ref: schemas/user.yaml
```

## Security

### Spec Security Checklist
- [ ] All endpoints require authentication (unless explicitly public)
- [ ] Security schemes defined (bearer, API key, OAuth2)
- [ ] Rate limiting documented via headers or extension
- [ ] CORS configuration documented
- [ ] PII fields marked with `format: sensitive`
- [ ] Input validation defined (min/max, pattern, enum)

## Rules
- Spec-first: always edit the spec, never generate backwards from code.
- Every operation must have an operationId — it is used for code generation method names.
- Use camelCase for property names (language-agnostic convention).
- Never inline schemas — always use $ref to components/schemas.
- Design for JSON: all examples are valid JSON.
- Version the spec with semver. Breaking changes increment the major version.
- Every spec must pass spectral with the default ruleset.
- Document all error responses, not just success responses.
- Every spec change must be reviewed and validated in CI.

## References
  - references/openapi-codegen.md — OpenAPI Code Generation
  - references/openapi-security.md — OpenAPI Security
  - references/openapi-setup.md — OpenAPI Project Setup Guide
  - references/openapi-testing.md — OpenAPI Testing
  - references/openapi-tools.md — OpenAPI Tools
  - references/openapi-versioning-strategies.md — OpenAPI Versioning Strategies
## Handoff
No artifact produced unless requested.
Next skill: contract-testing — verify the OpenAPI spec against provider behavior.
Carry forward: OpenAPI spec, generated client/server code, validation rules.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.