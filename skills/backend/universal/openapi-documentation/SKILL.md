---
name: backend-openapi-documentation
description: >
  Use this skill when the user says 'OpenAPI', 'Swagger', 'API documentation', 'spec-first', 'API spec', 'openapi.yaml', 'swagger.json', 'codegen', 'openapi-generator', 'API contract first'. This skill enforces spec-first API documentation with OpenAPI 3.x, code generation, and versioned specs. Applies to any backend stack. Do NOT use for: proto/gRPC specs, GraphQL schemas, or internal-only endpoints.
version: "1.0.0"
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
Drive all API development with an OpenAPI 3.x spec-first workflow: spec defines the contract, code is generated from it, and the spec is versioned alongside the code.

## Agent Protocol

### Trigger
Exact user phrases: "OpenAPI", "Swagger", "API documentation", "spec-first", "API spec", "openapi.yaml", "swagger.json", "codegen", "openapi-generator", "API contract first", "API spec review".

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

## Workflow

### Step 1: Define Info and Servers
```yaml
openapi: 3.0.3
info:
  title: Payment Service API
  version: 1.0.0
  description: Handles payment processing and reconciliation
servers:
  - url: https://api.example.com/v1
```

### Step 2: Define Paths and Operations
```yaml
paths:
  /payments:
    get:
      operationId: listPayments
      summary: List all payments with pagination
      tags: [Payments]
      parameters:
        - $ref: '#/components/parameters/pageParam'
        - $ref: '#/components/parameters/limitParam'
      responses:
        '200':
          $ref: '#/components/responses/PaymentList'
```

### Step 3: Define Schemas (components)
```yaml
components:
  schemas:
    Payment:
      type: object
      required: [id, amount, currency]
      properties:
        id:
          type: string
          format: uuid
        amount:
          type: number
          minimum: 0.01
        currency:
          type: string
          pattern: '^[A-Z]{3}$'
```

### Step 4: Add Error Responses
```yaml
    ErrorResponse:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
        requestId:
          type: string
          format: uuid
```

### Step 5: Validate Spec
```bash
npx @stoplight/spectral-cli lint openapi.yaml
npx swagger-cli validate openapi.yaml
```

### Step 6: Generate Code
```bash
npx @openapitools/openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./generated
```

## Rules
- Spec-first: always edit the spec, never generate backwards from code.
- Every operation must have an operationId — it is used for code generation method names.
- Use snake_case for property names (language-agnostic convention).
- Never inline schemas — always use $ref to components/schemas.
- Design for JSON: all examples are valid JSON.
- Version the spec with semver. Breaking changes increment the major version.
- Every spec must pass spectral with the default ruleset.

## References
- `references/openapi-setup.md` — OpenAPI project setup guide
- `references/openapi-codegen.md` — OpenAPI code generation patterns
- `references/openapi-tools.md` — OpenAPI tooling ecosystem, linting, mock servers, breaking change detection
- `references/openapi-versioning-strategies.md` — API versioning strategies, migration guides, spec management

## Handoff
No artifact produced unless requested.
Next skill: contract-testing — verify the OpenAPI spec against provider behavior.
Carry forward: OpenAPI spec, generated client/server code, validation rules.
