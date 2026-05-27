---
name: api-documentation
description: >
  Use this skill when the user says 'OpenAPI', 'Swagger', 'API documentation',
  'code-first', 'design-first', 'spec validation', 'API versioning',
  'OpenAPI Generator', 'Swagger UI', 'Swagger Editor', 'API spec',
  'oas', 'json-schema', 'API contract', 'REST API docs',
  'api-docs', 'api specification', 'contract testing'.
  Covers: OpenAPI 3.x specification, code-first API documentation, design-first
  API development, spec validation, API versioning, doc generation tools.
  Do NOT use this for: GraphQL (Apollo, Relay), gRPC/protobuf, or non-REST API
  documentation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, api, openapi, swagger, documentation, phase-5]
---

# API Documentation

## Purpose
Design, document, and validate REST APIs using the OpenAPI 3.x specification with code-first or design-first approaches.

## Agent Protocol

### Trigger
Exact user phrases: "OpenAPI", "Swagger", "API documentation", "code-first", "design-first", "spec validation", "API versioning", "OpenAPI Generator", "Swagger UI", "API spec", "oas", "api-docs", "API contract", "contract testing".

### Input Context
Before activating, verify:
- Approach: code-first (generate spec from code) or design-first (code from spec).
- Language/framework (Express, Fastify, NestJS, Spring, FastAPI, Go, .NET).
- Existing tooling (Swagger Core, springdoc, FastAPI, drf-spectacular, ogen).
- Documentation hosting (Swagger UI, Redoc, Stoplight, docs site).

### Output Artifact
Writes to `openapi.yaml`, `openapi.json`, and/or language-specific annotation/config files.

### Response Format
OpenAPI YAML/JSON spec or code annotations with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
This skill is complete when:
- [ ] OpenAPI spec is defined (paths, schemas, parameters, responses).
- [ ] API documentation is renderable (Swagger UI or Redoc).
- [ ] Spec validation passes (no structural errors).
- [ ] Versioning strategy is applied (URL, header, or content negotiation).
- [ ] Authentication/authorization is documented in the spec.

### Max Response Length
Direct file write. No response text.

## Quick Start
Write `openapi.yaml` with `openapi: "3.1.0"`, `info`, `paths`, `components/schemas`. Validate with `swagger-cli validate openapi.yaml`. Render with Swagger UI or Redoc.

## When to Use This Skill
- Documenting a new REST API
- Migrating from code comments to OpenAPI spec
- Implementing design-first API development
- Validating API contract compliance with contract testing
- Generating client SDKs from OpenAPI spec

## Core Workflow

### Step 1: OpenAPI Spec (Design-First)
```yaml
# openapi.yaml
openapi: "3.1.0"

info:
  title: User API
  description: API for managing users
  version: "1.0.0"
  contact:
    name: API Team
    email: api@example.com

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging

paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      tags: [Users]
      parameters:
        - $ref: "#/components/parameters/pageParam"
        - $ref: "#/components/parameters/limitParam"
        - name: role
          in: query
          schema:
            type: string
            enum: [admin, user, viewer]
      responses:
        "200":
          description: Paginated list of users
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserList"
        "401":
          $ref: "#/components/responses/Unauthorized"
    post:
      summary: Create user
      operationId: createUser
      tags: [Users]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateUser"
      responses:
        "201":
          description: User created
          headers:
            Location:
              schema:
                type: string
                format: uri
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "409":
          $ref: "#/components/responses/Conflict"

components:
  schemas:
    User:
      type: object
      required: [id, email, name]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        role:
          type: string
          enum: [admin, user, viewer]
        createdAt:
          type: string
          format: date-time
    CreateUser:
      type: object
      required: [email, name]
      properties:
        email:
          type: string
          format: email
        name:
          type: string
        role:
          type: string
          enum: [user, viewer]
          default: user
    UserList:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/User"
        pagination:
          $ref: "#/components/schemas/Pagination"
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
    Error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object

  parameters:
    pageParam:
      name: page
      in: query
      schema:
        type: integer
        default: 1
        minimum: 1
      description: Page number
    limitParam:
      name: limit
      in: query
      schema:
        type: integer
        default: 20
        maximum: 100
      description: Items per page

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    Conflict:
      description: Resource conflict
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### Step 2: Code-First (NestJS Example)
```typescript
// users.controller.ts
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";

class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  email!: string;

  @ApiProperty({ example: "John Doe" })
  name!: string;

  @ApiProperty({ enum: ["user", "viewer"], default: "user" })
  role!: "user" | "viewer";
}

@ApiTags("Users")
@Controller("users")
export class UsersController {
  @Get()
  @ApiOperation({ summary: "List users", operationId: "listUsers" })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  async listUsers(@Query("page") page = 1, @Query("limit") limit = 20) {
    return this.userService.findAll({ page, limit });
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create user", operationId: "createUser" })
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
}
```

### Step 3: Spec Validation
```bash
# Install CLI
npm install -g @apidevtools/swagger-cli
# or
npm install -g @redocly/cli

# Validate
swagger-cli validate openapi.yaml
redocly lint openapi.yaml
redocly push openapi.yaml  # Upload to Redocly registry

# Bundle (resolve $refs)
swagger-cli bundle openapi.yaml -o bundled.yaml -t yaml
redocly bundle openapi.yaml -o bundled.yaml
```

### Step 4: API Versioning
```yaml
# URL versioning (most common)
paths:
  /v1/users:
    ...
  /v2/users:
    ...

# Header versioning
parameters:
  - name: Accept-Version
    in: header
    schema:
      type: string
      enum: ["1.0", "2.0"]
    required: true

# Content negotiation
parameters:
  - name: Accept
    in: header
    schema:
      type: string
      pattern: ^application/vnd\.example\.v\d+\+json$
```

### Step 5: Generate Client SDK
```bash
# OpenAPI Generator
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o generated/client/typescript

# Generate for multiple languages
npx @openapitools/openapi-generator-cli generate -i openapi.yaml -g python -o generated/client/python
npx @openapitools/openapi-generator-cli generate -i openapi.yaml -g go -o generated/client/go
npx @openapitools/openapi-generator-cli generate -i openapi.yaml -g java -o generated/client/java
```

## Rules & Constraints
- Always use `operationId` — unique across the spec for client generation
- Every endpoint must document all possible responses (200, 4xx, 5xx)
- Use `$ref` for reusable schemas — never inline the same schema twice
- Validate the spec in CI — invalid specs break code generation
- Keep spec files under version control — the spec is the contract
- Use semantic versioning for API versions — never break backward compatibility
- Document security schemes explicitly (OAuth2, API key, JWT)
- Set `nullable: true` explicitly for nullable fields instead of omitting them

## Output Format
OpenAPI 3.x YAML/JSON spec file, code annotations, or generated documentation.

## References
  - references/api-documentation-advanced.md — Api Documentation Advanced Topics
  - references/api-documentation-fundamentals.md — Api Documentation Fundamentals
  - references/code-first.md — Code-First API Documentation
  - references/design-first.md — Design-First API Development
  - references/documentation-tools.md — Documentation Tools
  - references/openapi-basics.md — OpenAPI Basics
## Handoff
After completing this skill:
- Next skill: **dependency-management** — keeping API tooling deps updated
- Pass context: OpenAPI spec path, versioning scheme, doc URL
