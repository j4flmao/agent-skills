# OpenAPI Security

## Overview
Secure OpenAPI specs and APIs: authentication schemes, authorization, rate limiting, input validation, CORS, and security headers.

## Security Schemes

```yaml
openapi: 3.0.3
info:
  title: Secure Payment API
  version: 1.0.0

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: >
        JWT bearer token obtained from /auth/login.
        Include as: Authorization: Bearer <token>

    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: >
        API key for third-party integrations.
        Rotate keys every 90 days.

    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/authorize
          tokenUrl: https://auth.example.com/token
          scopes:
            read:payments: Read payment information
            write:payments: Create and modify payments
            admin:payments: Admin operations

# Apply security globally
security:
  - bearerAuth: []

paths:
  /payments:
    get:
      summary: List payments
      security:
        - bearerAuth: [read:payments]
        - apiKey: []
      responses:
        '200':
          description: Successful response

    post:
      summary: Create payment
      security:
        - bearerAuth: [write:payments]
      responses:
        '201':
          description: Payment created
```

## Input Validation Schemas

```yaml
components:
  schemas:
    CreatePaymentRequest:
      type: object
      required:
        - amount
        - currency
        - source
      properties:
        amount:
          type: number
          minimum: 0.01
          maximum: 999999.99
          multipleOf: 0.01
          description: Payment amount (min 0.01, max 999999.99)
        currency:
          type: string
          pattern: '^[A-Z]{3}$'
          minLength: 3
          maxLength: 3
          example: USD
          description: ISO 4217 currency code
        source:
          type: string
          pattern: '^(tok_|src_|card_)[a-zA-Z0-9]{24}$'
          description: Payment source token
        description:
          type: string
          maxLength: 255
          description: Optional payment description
        metadata:
          type: object
          maxProperties: 20
          additionalProperties:
            type: string
            maxLength: 500
          description: Key-value metadata (max 20 pairs)

    ErrorResponse:
      type: object
      required:
        - code
        - message
        - requestId
      properties:
        code:
          type: string
          example: INSUFFICIENT_FUNDS
          description: Machine-readable error code
        message:
          type: string
          example: The payment source has insufficient funds
          description: Human-readable error message
        requestId:
          type: string
          format: uuid
          description: Unique request identifier for debugging
        details:
          type: array
          items:
            $ref: '#/components/schemas/FieldError'
          description: Field-level validation errors

    FieldError:
      type: object
      properties:
        field:
          type: string
          example: amount
        code:
          type: string
          example: REQUIRED
        message:
          type: string
          example: Amount is required
```

## Rate Limiting Headers

```yaml
paths:
  /payments:
    get:
      summary: List payments
      parameters:
        - $ref: '#/components/parameters/RateLimitHeaders'
      responses:
        '200':
          description: Success
          headers:
            X-RateLimit-Limit:
              schema:
                type: integer
              description: Max requests per window
            X-RateLimit-Remaining:
              schema:
                type: integer
              description: Remaining requests in window
            X-RateLimit-Reset:
              schema:
                type: integer
                format: unix-timestamp
              description: Time when rate limit resets
        '429':
          description: Too many requests
          headers:
            Retry-After:
              schema:
                type: integer
              description: Seconds to wait before retrying
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

components:
  parameters:
    RateLimitHeaders:
      name: RateLimit-*
      in: header
      description: Rate limit headers included in response
      schema:
        type: string
```

## CORS Configuration

```yaml
components:
  parameters:
    Origin:
      name: Origin
      in: header
      required: true
      schema:
        type: string
        format: uri
      description: Request origin (validated against allowlist)

paths:
  /payments:
    options:
      summary: CORS preflight
      parameters:
        - $ref: '#/components/parameters/Origin'
      responses:
        '204':
          description: CORS preflight response
          headers:
            Access-Control-Allow-Origin:
              schema:
                type: string
              description: Echoes allowed origin
            Access-Control-Allow-Methods:
              schema:
                type: string
              description: GET, POST, PUT, DELETE, PATCH
            Access-Control-Allow-Headers:
              schema:
                type: string
              description: Content-Type, Authorization, Idempotency-Key
            Access-Control-Max-Age:
              schema:
                type: integer
              description: Cache duration in seconds (86400)
```

## Security Compliance Validation

```typescript
class OpenAPISecurityValidator {
  async validateSecurity(spec: OpenAPIObject): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Check all endpoints have security
    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          if (!operation.security && operation.operationId !== 'health') {
            issues.push({
              path: `${method.toUpperCase()} ${path}`,
              issue: 'Missing security requirement',
              severity: 'HIGH',
            });
          }
        }
      }
    }

    // Check HTTPS only
    if (spec.servers) {
      for (const server of spec.servers) {
        if (!server.url.startsWith('https://')) {
          issues.push({
            path: server.url,
            issue: 'Server URL must use HTTPS',
            severity: 'CRITICAL',
          });
        }
      }
    }

    // Check input validation
    for (const [name, schema] of Object.entries(spec.components?.schemas || {})) {
      if (name.endsWith('Request') && !(schema as any).required) {
        issues.push({
          path: `components/schemas/${name}`,
          issue: 'Request schema missing required fields list',
          severity: 'MEDIUM',
        });
      }
    }

    return issues;
  }
}
```

## Key Points
- Define security schemes explicitly: bearer JWT, API key, OAuth2 flows
- Apply security globally, override per-endpoint for granular access
- Document rate limiting headers (X-RateLimit-*) and 429 error response
- Configure CORS with specific allowed origins, methods, and headers
- Validate all input with regex patterns, min/max length, and type constraints
- Return structured error responses with machine-readable codes
- Enforce HTTPS for all server URLs
- Every endpoint (except health) must have a security requirement
- Use field-level validation in error details for 422 responses
