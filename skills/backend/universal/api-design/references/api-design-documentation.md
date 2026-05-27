# API Design Documentation

## Overview
Document APIs with OpenAPI/Swagger, generate interactive docs, maintain changelogs, and keep documentation in sync with implementation.

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Order Service API
  version: 2.1.0
  description: API for managing customer orders
  contact:
    name: Platform Team
    url: https://developer.company.com
servers:
  - url: https://api.company.com/v2
    description: Production
  - url: https://staging-api.company.com/v2
    description: Staging
```

## Documenting Endpoints

```typescript
// Using swagger-jsdoc decorators in Express
/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         $ref: '#/components/schemas/ValidationError'
 */
router.post('/orders', validate(createOrderSchema), createOrder);
```

## Schema Definitions

```yaml
components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: string
          format: uuid
          example: "0194fdc2-fa2f-7cc0-81d3-ff120745b99c"
        customerId:
          type: string
          format: uuid
        status:
          type: string
          enum: [pending, confirmed, shipped, delivered, cancelled]
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
        total:
          type: number
          format: float
          example: 99.99
        createdAt:
          type: string
          format: date-time
      required:
        - id
        - customerId
        - status
        - items
        - total

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              example: VALIDATION_ERROR
            message:
              type: string
            requestId:
              type: string
              format: uuid
```

## Documentation Automation

```typescript
// Auto-generate OpenAPI spec from route definitions
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: { title: 'Order API', version: '2.1.0' },
    servers: [{ url: '/v2' }],
  },
  apis: ['./src/routes/*.ts', './src/schemas/*.ts'], // Scan JSDoc comments
};

const spec = swaggerJsdoc(options);

// Serve UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
```

## Changelog Management

```yaml
# CHANGELOG.md
# API Version 2.1.0 (2026-05-15)
## Added
- `PATCH /orders/:id/cancel` — Cancel an in-progress order
- `X-Request-Id` response header on all endpoints

## Changed
- `POST /orders` now accepts optional `couponCode` field
- Paginated list responses include `total` count

## Deprecated
- `GET /v1/orders` — Use `GET /v2/orders` instead. Sunset: 2026-08-15

## Removed
- `GET /legacy/reports` — Removed. Use `/analytics/reports` instead.
```

## Documentation Testing

```yaml
# dredd.yml - Contract testing docs against implementation
language: node
server: npm start
server_wait: 5
hookfiles: ./dredd-hooks.ts
color: true
loglevel: warning
```

```typescript
// Verify OpenAPI spec matches implementation
import { testSpec } from 'openapi-tester';

describe('API Contract', () => {
  it('matches the OpenAPI specification', async () => {
    const result = await testSpec('/v1/orders', {
      method: 'GET',
      expectedStatus: 200,
    });
    expect(result.valid).toBe(true);
  });
});
```

## Key Points
- Keep OpenAPI spec as the source of truth for API contracts
- Use JSDoc annotations to auto-generate specs from code
- Maintain a changelog with Added/Changed/Deprecated/Removed sections
- Include sunset dates for deprecated endpoints
- Test documentation against implementation to prevent drift
