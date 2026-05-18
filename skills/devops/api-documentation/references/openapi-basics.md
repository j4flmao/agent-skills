# OpenAPI Basics

## Spec Structure

```
openapi: 3.1.0
info: { title, version, description, contact, license }
servers: [ { url, description } ]
paths: { /path: { httpMethod: { operationId, summary, parameters, requestBody, responses } } }
components: { schemas, parameters, responses, securitySchemes, requestBodies }
security: [ { securityScheme: [] } ]
tags: [ { name, description } ]
externalDocs: { url, description }
```

## Operation Object

```yaml
paths:
  /users/{id}:
    get:
      operationId: getUser
      summary: Get user by ID
      description: Returns a single user by their unique ID
      tags: [Users]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
          description: User UUID
      responses:
        "200":
          description: User found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "404":
          description: User not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
        "500":
          description: Internal server error
```

## Schema Object

```yaml
components:
  schemas:
    Address:
      type: object
      properties:
        street:
          type: string
          maxLength: 255
        city:
          type: string
        state:
          type: string
          minLength: 2
          maxLength: 2
        zipCode:
          type: string
          pattern: "^\d{5}(-\d{4})?$"
        country:
          type: string
          default: US

    Order:
      type: object
      required: [id, userId, items, total]
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
        userId:
          type: string
          format: uuid
        status:
          type: string
          enum: [pending, confirmed, shipped, delivered, cancelled]
        items:
          type: array
          minItems: 1
          items:
            $ref: "#/components/schemas/OrderItem"
        total:
          type: number
          format: float
          minimum: 0
        shippingAddress:
          $ref: "#/components/schemas/Address"
        notes:
          type: string
          nullable: true
        createdAt:
          type: string
          format: date-time
          readOnly: true
        updatedAt:
          type: string
          format: date-time
          readOnly: true

    OrderItem:
      type: object
      required: [productId, quantity, price]
      properties:
        productId:
          type: string
        quantity:
          type: integer
          minimum: 1
        price:
          type: number
          format: float
          minimum: 0
```

## Parameter Types

```yaml
parameters:
  - name: id
    in: path
    required: true
    schema:
      type: string

  - name: page
    in: query
    schema:
      type: integer
      minimum: 1
      default: 1

  - name: Authorization
    in: header
    required: true
    schema:
      type: string
      pattern: "^Bearer .+$"

  - name: X-Request-Id
    in: header
    schema:
      type: string
      format: uuid
    description: Idempotency key

  - name: filter
    in: query
    style: deepObject
    explode: true
    schema:
      type: object
      properties:
        status:
          type: string
        createdAfter:
          type: string
          format: date
```

## Response Object

```yaml
responses:
  "200":
    description: Successful operation
    headers:
      X-RateLimit-Remaining:
        schema:
          type: integer
      X-Request-Id:
        schema:
          type: string
          format: uuid
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/SuccessResponse"
  "400":
    description: Bad request
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/ValidationError"
  "429":
    description: Too many requests
    headers:
      Retry-After:
        schema:
          type: integer
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/Error"
```

## Security Schemes

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

    apiKey:
      type: apiKey
      in: header
      name: X-API-Key

    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/authorize
          tokenUrl: https://auth.example.com/token
          scopes:
            read: Read access
            write: Write access
            admin: Admin access

    basicAuth:
      type: http
      scheme: basic

    openIdConnect:
      type: openIdConnect
      openIdConnectUrl: https://auth.example.com/.well-known/openid-configuration
```

## Common Patterns

```yaml
# Paginated list response
paths:
  /items:
    get:
      parameters:
        - $ref: "#/components/parameters/pageParam"
        - $ref: "#/components/parameters/limitParam"
      responses:
        "200":
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/PaginationMeta"
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: "#/components/schemas/Item"

# Partial update (PATCH)
    patch:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                description:
                  type: string
```
