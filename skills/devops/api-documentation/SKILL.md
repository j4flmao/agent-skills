---
name: api-documentation
description: >
  Use this skill when the user says 'API documentation', 'OpenAPI', 'Swagger',
  'API spec', 'REST API docs', 'API reference', 'API design', 'API contract',
  'API versioning', 'API portal', 'developer portal', 'API documentation tool',
  'docs as code', 'API changelog', 'API playground'.
  Covers: OpenAPI 3.x specification design, documentation generation, API portals,
  docs-as-code workflows, change management, versioning strategy, interactive docs
  (Swagger UI, Redoc, Stoplight), linting (Spectral), testing (Dredd/Schemathesis).
  Do NOT use for: general code documentation, architecture docs, or non-API docs.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, api-documentation, developer-experience, phase-5]
---

# API Documentation

## Purpose
Design and maintain API documentation following OpenAPI 3.x specification, docs-as-code workflows, and developer portal best practices.

## Agent Protocol

### Trigger
Exact user phrases: "API documentation", "OpenAPI", "Swagger", "API spec", "REST API docs", "API reference", "API design", "API contract", "API portal", "docs as code".

### Input Context
Before activating, verify:
- API design approach: design-first (spec before code) or code-first (annotations generate spec) or hybrid.
- Specification format: OpenAPI 3.0/3.1, AsyncAPI, GraphQL SDL.
- Tooling: Swagger UI, Redoc, Stoplight, Postman, readme.io, GitBook.
- CI/CD integration: spec linting, contract testing, changelog generation.
- Authentication methods: API keys, OAuth 2.0, JWT, mTLS.

### Output Artifact
Writes to OpenAPI 3.x YAML/JSON specification files, documentation config, lint rules, and CI pipeline snippets.

### Response Format
OpenAPI YAML or JSON with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] OpenAPI spec written with all endpoints, parameters, and responses.
- [ ] Schemas defined for request/response bodies.
- [ ] Authentication/authorization documented (securitySchemes).
- [ ] Linting rules configured and passing.
- [ ] Versioning strategy defined.

### Max Response Length
Direct file write. No response text.

## Architecture Decision Trees

### Design-First vs Code-First vs Hybrid
| Approach | Pros | Cons | Best For |
|---|---|---|---|
| Design-first | Contract before code, stakeholder review, language-agnostic spec | Can diverge from implementation | Public APIs, multiple consumers, microservices |
| Code-first | Always in sync, less duplication | Spec polluted with implementation details | Internal APIs, single consumer, fast iteration |
| Hybrid | Spec is single source of truth, code generates from spec | Requires discipline | Most production APIs |

### Specification Format Decision
| Format | When to Use |
|---|---|
| OpenAPI 3.0 | REST APIs (mature tooling, widely supported) |
| OpenAPI 3.1 | REST APIs needing JSON Schema 2020-12, webhooks |
| AsyncAPI | Event-driven APIs, message queues, WebSocket |
| GraphQL SDL | GraphQL APIs |
| gRPC (protobuf) | gRPC services |

### Tool Selection: Spec Editing
| Tool | Best For | Pricing |
|---|---|---|
| Swagger Editor | Quick edits, spec validation | Free |
| Stoplight Studio | Visual design, team collaboration | Free/Pro |
| Redocly CLI | CI/CD linting, bundle, preview | Free/Enterprise |
| Spectral | Linting rules, governance | Free |
| Bruno | API client with spec support | Free/Pro |

### Documentation Hosting
| Platform | Pros | Cons |
|---|---|---|
| Swagger UI | Open source, customizable | Basic UX, no search |
| Redoc | Beautiful, search, code samples | Read-only (no try-it) |
| Stoplight Elements | Components-based, try-it | Less UI flexibility |
| Postman | Collections, testing, monitoring | Vendor lock-in |
| readme.io | Hosted, analytics, guides | SaaS, paid tiers |
| Backstage (API docs) | Integrated portal | Requires Backstage setup |

## Quick Start
OpenAPI 3.0 spec YAML → Validate with Spectral → Generate docs with Redoc/Swagger UI → CI checks → Publish to developer portal.

## Core Workflow

### Step 1: OpenAPI 3.0 Specification Structure
```yaml
openapi: 3.0.3
info:
  title: Pet Store API
  description: |
    REST API for pet store operations. Supports CRUD for pets, inventory
    management, and order processing.
    Base URL: https://api.petstore.example.com/v1
  version: 1.2.0
  contact:
    name: API Support
    email: api-support@petstore.com
    url: https://developer.petstore.com/support
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0

servers:
  - url: https://api.petstore.example.com/v1
    description: Production
  - url: https://staging-api.petstore.example.com/v1
    description: Staging

security:
  - BearerAuth: []

paths:
  /pets:
    get:
      operationId: listPets
      summary: List all pets
      description: Returns a paginated list of pets with optional filtering.
      tags: [Pets]
      parameters:
        - name: limit
          in: query
          description: Maximum number of items to return
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: status
          in: query
          description: Filter by pet status
          schema:
            type: string
            enum: [available, pending, sold]
      responses:
        '200':
          description: A paginated list of pets
          headers:
            X-Total-Count:
              schema:
                type: integer
              description: Total number of items
            X-RateLimit-Remaining:
              schema:
                type: integer
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
      x-codeSamples:
        - lang: curl
          source: |
            curl -H "Authorization: Bearer $TOKEN" \
              "https://api.petstore.example.com/v1/pets?limit=20&status=available"

    post:
      operationId: createPet
      summary: Create a new pet
      tags: [Pets]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewPet'
      responses:
        '201':
          description: Pet created successfully
          headers:
            Location:
              schema:
                type: string
                format: uri
              description: URL of the created pet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
        '422':
          $ref: '#/components/responses/ValidationError'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        Enter your JWT token. Tokens expire after 24 hours.
        Get a token from POST /auth/login.

  schemas:
    Pet:
      type: object
      required: [id, name, status]
      properties:
        id:
          type: integer
          format: int64
          readOnly: true
          description: Unique identifier
        name:
          type: string
          minLength: 1
          maxLength: 100
          example: "Buddy"
        status:
          type: string
          enum: [available, pending, sold]
          description: Pet status in the store
        category:
          $ref: '#/components/schemas/Category'
        tags:
          type: array
          items:
            $ref: '#/components/schemas/Tag'
        createdAt:
          type: string
          format: date-time
          readOnly: true
      xml:
        name: pet

    NewPet:
      type: object
      required: [name]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        category_id:
          type: integer
          description: Category identifier
        tags:
          type: array
          items:
            type: string

    Category:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string

    Tag:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string

    Error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
          example: VALIDATION_ERROR
        message:
          type: string
          example: "Name is required"
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string

  responses:
    UnauthorizedError:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    NotFoundError:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    ValidationError:
      description: Validation failure
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  parameters:
    petId:
      name: petId
      in: path
      required: true
      description: The ID of the pet to operate on
      schema:
        type: integer
        format: int64
```

### Step 2: OpenAPI 3.1 with JSON Schema 2020-12
```yaml
openapi: 3.1.0
info:
  title: Modern API
  version: 2.0.0
jsonSchemaDialect: https://spec.openapis.org/ns/301/dialect
components:
  schemas:
    Pet:
      type: object
      properties:
        name:
          type: string
          pattern: '^[a-zA-Z ]+$'
        birthDate:
          type: string
          format: date
          examples: ["2023-01-15"]
        tags:
          type: array
          items:
            $ref: '#/components/schemas/Tag'
          # 3.1 supports unevaluatedProperties
          unevaluatedItems: false
      # 3.1 supports prefixItems (tuple validation)
      prefixItems:
        - type: string  # first element must be string
        - type: integer # second element must be integer
      $comment: "JSON Schema 2020-12 features enabled"
```

### Step 3: Spectral Linting Rules
```yaml
# .spectral.yaml
extends: spectral:oas
rules:
  # Operation rules
  operation-operationId: error
  operation-tag-defined: error
  operation-description: warn
  operation-summary: error
  operation-success-response: error

  # Parameter rules
  parameter-description: error
  parameter-name-snake-case: error

  # Path rules
  path-params: error
  paths-kebab-case: error
  no-identical-paths: error

  # Schema rules
  schema-properties-order: warn
  schema-description: error
  no-ambiguous-error-status: error

  # Custom rules
  my-rules:
    - description: All endpoints must have tags
      message: "Every operation must have at least one tag"
      severity: error
      given: "$.paths[*][*]"
      then:
        field: tags
        function: defined

    - description: Pagination parameters
      message: "List endpoints must support pagination (limit/offset)"
      severity: warn
      given: "$.paths[*].get"
      then:
        field: parameters
        function: truthy

    - description: Error response schema
      message: "4xx/5xx responses must include error schema"
      severity: error
      given: "$.paths[*][*].responses[?(@property.match(/^[45]\\d{2}$/))].content"
      then:
        function: truthy
```

### Step 4: Contract Testing with Dredd
```yaml
# dredd.yml
dry-run: null
hookfiles: ./tests/hooks/*.py
language: python
server: npm run start:test
server-wait: 3
init: false
custom:
  - apiUrl: "http://localhost:3000/api"
names: false
only: []
reporter: [apiary, markdown]
output: [test-results/api-tests.md]
header: []
sorted: false
user: null
inline-errors: false
details: false
method: []
color: true
loglevel: warning
path: []
hooks-worker-timeout: 5000
sandbox: false
```
```python
# tests/hooks/hooks.py
import dredd_hooks as hooks
import json

@hooks.before("Pets > List pets > 200")
def create_test_pet(transaction):
    """Create a pet before listing"""
    import requests
    response = requests.post(
        "http://localhost:3000/api/pets",
        json={"name": "Test Pet", "status": "available"},
        headers={"Authorization": "Bearer test-token"}
    )
    assert response.status_code == 201

@hooks.before_each
def set_auth_header(transaction):
    """Add auth header to all requests"""
    if "token" not in transaction.get("skip", []):
        transaction["request"]["headers"]["Authorization"] = "Bearer test-token"
```

### Step 5: CI/CD Integration
```yaml
# .github/workflows/api-docs.yml
name: API Documentation Checks
on:
  pull_request:
    paths:
      - 'spec/**'
      - '.spectral.yaml'
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g @stoplight/spectral-cli
      - run: spectral lint spec/openapi.yml --ruleset .spectral.yaml

  validate-examples:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g swagger-cli
      - run: swagger-cli validate spec/openapi.yml

  contract-test:
    runs-on: ubuntu-latest
    services:
      api:
        image: my-api:test
        ports:
          - 3000:3000
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g dredd
      - run: dredd

  build-docs:
    needs: [lint, validate-examples]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g redoc-cli
      - run: redoc-cli bundle spec/openapi.yml -o docs/index.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/
```

### Step 6: API Changelog Management
```yaml
# CHANGELOG.md following semantic versioning for API changes
# Based on OpenAPI spec diff analysis

# Breaking changes (MAJOR version bump):
# - Removed endpoint: DELETE /pets/{petId}
# - Changed response schema: /pets response array → paginated wrapper
# - Removed required field: Pet.tags
# - Changed parameter type: limit from string to integer
# - Updated security scheme: API Key → OAuth 2.0

# Non-breaking additions (MINOR version bump):
# - Added endpoint: GET /pets/{petId}/photos
# - Added optional field: Pet.breed
# - Added new status: reserved
# - Added pagination headers to list endpoint

# Bug fixes / clarifications (PATCH version bump):
# - Fixed example values in spec
# - Updated description for /pets endpoint
# - Added missing response schema for 429 Too Many Requests
```

### Step 7: Versioning Strategy
```
# API Versioning Approaches

# URL-based: https://api.example.com/v1/pets
# Pros: Explicit, easy to route
# Cons: URL pollution, difficult to maintain multiple versions

# Header-based: Accept: application/vnd.petstore.v1+json
# Pros: Clean URLs, content negotiation
# Cons: Less visible, harder to test in browser

# Query parameter: https://api.example.com/pets?version=1
# Pros: Simple
# Cons: Pollutes business logic, cached URLs

# Recommended: URL-based for major versions, header-based for minor
GET https://api.example.com/v1/pets
Accept: application/vnd.petstore.v1.2+json

# Deprecation headers
HTTP/1.1 200 OK
Sunset: Sat, 01 Jan 2026 00:00:00 GMT
Deprecation: true
```

## Anti-Patterns

### Anti-Pattern 1: Incomplete Response Documentation
Omitting error response schemas. Every 4xx/5xx should have a documented schema so consumers know how to handle errors.

### Anti-Pattern 2: No Examples
Specifying schemas without examples. Consumers need to see realistic payloads to understand the API. Every schema should have at least one `example`.

### Anti-Pattern 3: Spec-Code Drift
Letting the implementation diverge from the spec. Use contract testing (Dredd, Schemathesis, Pact) in CI to prevent drift.

### Anti-Pattern 4: Swagger UI as Production Docs
Swagger UI alone is insufficient for production. Use a proper developer portal with guides, SDKs, changelog, and support.

### Anti-Pattern 5: Overly Permissive Schemas
Using `additionalProperties: true` or `type: object` without defining properties. This makes the spec useless for code generation.

### Anti-Pattern 6: Ignoring API Lifecycle
No deprecation policy or sunset headers. Consumers get no warning before breaking changes.

## Production Considerations

### Security Documentation
- Document all authentication methods in `securitySchemes`.
- Document rate limits (X-RateLimit-*) in response headers.
- Document required scopes/OAuth permissions per endpoint.
- Document CORS configuration.
- Document data sensitivity levels (PII, PCI) per field.

### Developer Experience
- Provide SDK snippets for multiple languages in spec extensions (`x-codeSamples`).
- Keep spec file under 2000 lines; use `$ref` to split into multiple files.
- Include a "Getting Started" guide that walks through auth setup.
- Provide a public Postman collection alongside the spec.
- Use descriptive `operationId` values for code generation.

### Governance
- Version the spec file in git alongside the implementation.
- Review spec changes in PRs using rendered diff tools.
- Maintain an API style guide (Spectral ruleset).
- Register new APIs in a service catalog (Backstage, API portal).
- Audit deprecated endpoints quarterly.

## Troubleshooting

| Issue | Likely Cause | Solution |
|---|---|---|
| Spec validation fails | Syntax error, invalid $ref | Use `swagger-cli validate` to pinpoint |
| Schema examples don't match | Example violates schema constraints | Ensure example validates against schema |
| Contract test fails | Implementation differs from spec | Run contract tests locally first |
| Redoc doesn't render | Circular $ref, invalid YAML | Use `redocly-cli bundle` to resolve refs |
| Security schemes not shown | Wrong scoping in securitySchemes | Check global vs operation-level security |

## Rules & Constraints
- Every operation must have `operationId`, `summary`, `tags`, and `description`.
- Every parameter must have `description` and `schema`.
- Every response must have `description` and content type.
- Every schema must have `type` and `properties`.
- Use `$ref` for reusable components — no inline schema duplication.
- Pin OpenAPI version (3.0.3 or 3.1.0) — never use "3.0" without patch.
- Lint with Spectral using `spectral:oas` ruleset before every commit.
- Every 4xx response must include a documented error schema.
- No "see source code" in descriptions — API docs must be self-contained.

## Output Format
OpenAPI 3.x YAML/JSON specification, Spectral lint config, CI workflow YAML for docs pipeline.

## References
  - references/api-documentation-advanced.md
  - references/api-documentation-fundamentals.md
  - references/code-first.md
  - references/design-first.md
  - references/documentation-tools.md
  - references/openapi-basics.md
  - references/api-changelog-guide.md

## Handoff
After completing this skill:
- Next skill: **api-documentation-advanced** for complex patterns
- Pass context: spec file path, Spectral ruleset, CI integration, versioning approach
