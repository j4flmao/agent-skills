# OpenAPI Project Setup Guide

## Choosing OpenAPI Version
- OpenAPI 3.0.3: stable, widely supported, recommended for new projects.
- OpenAPI 3.1.0: uses JSON Schema 2020-12, more expressive. Tooling support is maturing.

## Project Structure
```
api/
├── openapi.yaml              # Root spec (info, servers, paths refs)
├── paths/
│   ├── _index.yaml           # Path-level index
│   ├── users.yaml            # /users paths
│   └── orders.yaml           # /orders paths
├── schemas/
│   ├── User.yaml
│   ├── Order.yaml
│   └── Error.yaml
├── parameters/
│   ├── pageParam.yaml
│   └── limitParam.yaml
├── responses/
│   ├── UserResponse.yaml
│   └── ErrorResponse.yaml
└── examples/
    ├── user-example.yaml
    └── order-example.yaml
```

## Root Spec Template
```yaml
openapi: 3.0.3
info:
  title: Payment Service API
  version: 1.0.0
  description: |
    API for processing payments and managing transactions.
    See https://docs.example.com/api for full documentation.
  contact:
    name: API Support
    email: api-support@example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging
paths:
  /users:
    $ref: './paths/users.yaml'
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
security:
  - bearerAuth: []
```

## Component Design

### Parameters (reusable)
```yaml
parameters:
  pageParam:
    name: page
    in: query
    schema:
      type: integer
      minimum: 1
      default: 1
    description: Page number for pagination
  limitParam:
    name: limit
    in: query
    schema:
      type: integer
      minimum: 1
      maximum: 100
      default: 20
    description: Items per page
```

### Request Bodies
```yaml
requestBodies:
  CreateUser:
    required: true
    content:
      application/json:
        schema:
          $ref: '../schemas/CreateUserRequest.yaml'
```

### Responses
```yaml
responses:
  SuccessResponse:
    description: Successful operation
    content:
      application/json:
        schema:
          type: object
          properties:
            data:
              type: object
            meta:
              $ref: '../schemas/Meta.yaml'
  ErrorResponse:
    description: Error occurred
    content:
      application/json:
        schema:
          $ref: '../schemas/Error.yaml'
```

## Validation Tooling

### Spectral Linting
```bash
npm install -g @stoplight/spectral-cli
npx spectral lint api/openapi.yaml
```
Spectral enforces naming conventions, security requirements, response codes, and more. Use the default ruleset or create a custom `.spectral.yaml`:
```yaml
extends: spectral:oas
rules:
  operation-operationId: error
  path-params: error
  operation-tag-defined: warn
```

### swagger-cli Validation
```bash
npm install -g @apidevtools/swagger-cli
npx swagger-cli validate api/openapi.yaml
```

### Redocly
```bash
npm install -g @redocly/cli
npx redocly lint api/openapi.yaml
npx redocly preview-docs api/openapi.yaml
```

## CI Integration
```yaml
# .github/workflows/api-spec-check.yml
- name: Validate OpenAPI spec
  run: npx spectral lint api/openapi.yaml

- name: Check for breaking changes
  run: npx @redocly/op diff previous-openapi.yaml api/openapi.yaml
```

## Tips
- Use `operationId: camelCase` format — tooling generates method names from it.
- Never use `example` without also using `schema` — examples without schemas are not validated.
- Use `enum` for fixed values instead of `description` notes.
- Define pagination, errors, and metadata as reusable components.
- Keep individual spec files under 500 lines by using $ref splitting.
- Use `discriminator` for polymorphic schemas (e.g., PaymentMethod with card/bank/ewallet subtypes).
