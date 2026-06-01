# API Governance

## Governance Framework

### Pillars of API Governance
```
API Governance
├── Design Standards    — Naming, pagination, errors, conventions
├── Review Process      — RFCs, API council, approval gates
├── Versioning Policy   — When and how to version, deprecation
├── Security Standards  — Auth, rate limiting, data protection
├── Documentation       — OpenAPI linting, changelog, migration guides
└── Performance Budgets — Latency, error rate, uptime targets
```

### API Council
```yaml
api_council:
  members:
    - API Product Manager (chair)
    - Principal Engineer (architecture)
    - Developer Advocate (DX)
    - Security Engineer
    - Platform Team Lead

  responsibilities:
    - Approve new API proposals
    - Resolve design disputes
    - Maintain API style guide
    - Review deprecation plans
    - Set performance budgets

  meeting_cadence: biweekly

  decision_process:
    - RFC submitted via repository
    - 3 business day review window
    - Simple majority vote
    - Chair has tie-breaking vote
    - Decisions documented in ADR
```

## API Design Standards

### Resource Naming
```yaml
resource_naming:
  resources: plural             # /users, /orders, /products
  case: snake_case             # created_at, first_name
  path_segments:
    - /{resource}
    - /{resource}/{id}
    - /{resource}/{id}/{subresource}
    - /{resource}/{id}/{action}   # POST /orders/123/cancel
  no_verbs: true               # /users not /getUsers
  no_file_extensions: true     # /users not /users.json

pagination:
  style: cursor                # Cursor-based (not page-based)
  request:
    first: query_param         # Items per page (max 100, default 20)
    after: query_param         # Cursor for next page
  response:
    - data: array
    - pagination:
        next_cursor: string | null
        has_more: boolean
```

### Error Response Standards
```yaml
error_format: RFC 7807          # Problem Details

error_response:
  required_fields:
    - type: URI                 # https://api.example.com/errors/rate-limit
    - title: string             # Short, human-readable description
    - status: integer           # HTTP status code
    - detail: string            # Human-readable explanation
    - instance: URI             # Specific occurrence

  field_errors:
    - field: string             # Field name
    - code: string              # Machine-readable error code
    - message: string           # Human-readable error message

error_codes:
  validation_error:
    http_status: 422
    title: "Validation Error"
    guidance: "Check the errors array for field-level issues"

  authentication_error:
    http_status: 401
    title: "Authentication Error"
    guidance: "Ensure X-API-Key header is set with a valid key"

  rate_limit_exceeded:
    http_status: 429
    title: "Rate Limit Exceeded"
    guidance: "Implement exponential backoff, check Retry-After header"

  not_found:
    http_status: 404
    title: "Resource Not Found"
    guidance: "Verify the resource ID exists for your account"

  internal_error:
    http_status: 500
    title: "Internal Server Error"
    guidance: "Reference ID: {error_id}. Contact support if persists."
```

### API Review Checklist
```yaml
api_review:
  naming:
    - [ ] Resource name is plural noun
    - [ ] Path uses kebab-case
    - [ ] Parameters use snake_case
    - [ ] No verbs in resource paths

  design:
    - [ ] List endpoints have pagination
    - [ ] Create endpoints return 201 with Location header
    - [ ] Update endpoints support partial update (PATCH)
    - [ ] Delete endpoints return 204
    - [ ] All responses have consistent envelope

  errors:
    - [ ] All error responses follow RFC 7807
    - [ ] Error messages are actionable
    - [ ] 429 response includes Retry-After header
    - [ ] Rate limit headers present (X-RateLimit-*)

  security:
    - [ ] Authentication method documented
    - [ ] Rate limiting configured
    - [ ] Input validation implemented
    - [ ] Sensitive data not exposed in responses
    - [ ] Authorization checks per endpoint

  docs:
    - [ ] OpenAPI spec complete and linted
    - [ ] All endpoints have description and example
    - [ ] All parameters have description
    - [ ] Changelog entry written
    - [ ] Migration guide written (if breaking)
```

## API Style Guide Maintenance

### Style Guide Versioning
```yaml
style_guide:
  current: v3
  history:
    - v1: Initial standards (restful naming, basic pagination)
    - v2: Added RFC 7807 errors, cursor pagination
    - v3: Added GraphQL support, webhook standards, rate limit headers

  review_cadence: quarterly
  Change Process:
    - Propose change via RFC
    - API council review
    - 1-month deprecation of old style
    - Automated linting check updated
```

## Automated Governance Enforcement

### CI/CD Governance Checks
```yaml
# .github/workflows/api-governance.yml
on:
  pull_request:
    paths: ['openapi/**', 'schemas/**']
jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint OpenAPI spec
        run: spectral lint openapi.yaml
      - name: Check naming conventions
        run: api-style-linter openapi.yaml --config .api-style.yaml
      - name: Validate breaking changes
        run: openapi-diff openapi.yaml deployment/openapi.yaml
      - name: Check documentation completeness
        run: doc-checker openapi.yaml --require-all-endpoints
      - name: Post results
        if: failure()
        run: |
          echo "## API Governance Check Failed" >> $GITHUB_STEP_SUMMARY
          echo "Review the linting and validation results above." >> $GITHUB_STEP_SUMMARY
```

## Key Points
- API governance ensures consistency, quality, and security across all APIs
- API council with cross-functional membership enforces standards and resolves disputes
- Design standards (naming, pagination, errors) must be documented and automated
- Error responses following RFC 7807 with actionable messages improve DX
- CI/CD governance checks enforce standards at pull request time
- Style guide is a living document reviewed quarterly
- Breaking change detection in CI prevents accidental consumer breakage
- Performance budgets (latency, error rate, uptime) are governance-enforced
