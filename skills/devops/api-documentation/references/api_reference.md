# OpenAPI 3.1 Advanced Object Reference

Field-level reference for the parts of OpenAPI 3.1 that go beyond basic paths and schemas: JSON Schema 2020-12 alignment, polymorphism, webhooks, callbacks, links, reusable components and the differences from 3.0. Basic structure is in `openapi-basics.md`.

## 3.0 vs 3.1 Differences

| Topic | OpenAPI 3.0.x | OpenAPI 3.1.x |
|-------|---------------|---------------|
| Schema dialect | Extended subset of JSON Schema Draft 5 | Full JSON Schema 2020-12 by default |
| Nullable | `nullable: true` | `type: [string, "null"]` |
| Examples in schema | `example` (single) | `examples` (array, JSON Schema); `example` deprecated |
| Exclusive bounds | `exclusiveMinimum: true` + `minimum` | `exclusiveMinimum: 5` (number) |
| Webhooks | Not supported | Top-level `webhooks` |
| `paths` | Required | Optional (a document can contain only components or webhooks) |
| `$ref` siblings | Ignored | `summary`/`description` allowed beside `$ref` in reference objects; schemas allow siblings |
| `info.summary`, `license.identifier` (SPDX) | No | Yes |
| File upload | `format: binary` | `contentMediaType` / `contentEncoding` |

Check tooling support before switching: some generators and gateways still lag on 3.1. OpenAPI 3.2 was published in 2025; adopt it only once your toolchain supports it.

## Schema Object Essentials (3.1)

```yaml
components:
  schemas:
    Money:
      type: object
      required: [amount, currency]
      properties:
        amount: { type: string, pattern: '^-?\d+(\.\d{1,2})?$', description: Decimal as string to avoid float errors }
        currency: { type: string, minLength: 3, maxLength: 3, examples: [EUR] }
      additionalProperties: false
    Customer:
      type: object
      properties:
        id: { type: string, format: uuid, readOnly: true }
        email: { type: string, format: email }
        middleName: { type: [string, "null"] }
        password: { type: string, writeOnly: true, minLength: 12 }
        tags: { type: array, items: { type: string }, uniqueItems: true, maxItems: 20 }
```

- `readOnly` properties appear only in responses; `writeOnly` only in requests.
- `format` is an annotation by default in 2020-12; do not rely on it for validation unless your validator enables format assertion.
- `additionalProperties: false` makes contracts strict; plan for evolution (clients should ignore unknown fields in responses, so many APIs leave responses open and requests closed).

## Polymorphism

```yaml
PaymentMethod:
  oneOf:
    - $ref: '#/components/schemas/Card'
    - $ref: '#/components/schemas/BankTransfer'
  discriminator:
    propertyName: type
    mapping:
      card: '#/components/schemas/Card'
      bank_transfer: '#/components/schemas/BankTransfer'
Card:
  type: object
  required: [type, last4]
  properties:
    type: { const: card }
    last4: { type: string, pattern: '^\d{4}$' }
```

| Keyword | Meaning |
|---------|---------|
| `oneOf` | Exactly one subschema matches |
| `anyOf` | At least one matches |
| `allOf` | All match (composition/inheritance) |
| `discriminator` | Hint for tools to pick the subschema; does not replace `oneOf` validation |

Use `const` (3.1) on the discriminator property so each variant is mutually exclusive.

## Parameters

```yaml
parameters:
  - name: filter
    in: query
    style: deepObject       # ?filter[status]=open&filter[owner]=me
    explode: true
    schema:
      type: object
      properties: { status: { type: string }, owner: { type: string } }
  - name: ids
    in: query
    style: form
    explode: false          # ?ids=1,2,3
    schema: { type: array, items: { type: integer } }
  - name: X-Request-ID
    in: header
    schema: { type: string, format: uuid }
```

`in` values: `path` (always `required: true`), `query`, `header`, `cookie`. Headers named `Accept`, `Content-Type`, `Authorization` are ignored as parameters; describe them via content types and `securitySchemes`.

## Responses, Headers, Links

```yaml
responses:
  '201':
    description: Created
    headers:
      Location: { schema: { type: string, format: uri } }
      RateLimit-Remaining: { schema: { type: integer } }
    content:
      application/json:
        schema: { $ref: '#/components/schemas/Order' }
    links:
      GetOrder:
        operationId: getOrder
        parameters: { orderId: '$response.body#/id' }
  default:
    $ref: '#/components/responses/Problem'
```

`links` describe how a response value feeds another operation (runtime expressions like `$response.body#/id`, `$request.path.id`).

## Webhooks (3.1)

```yaml
webhooks:
  orderShipped:
    post:
      summary: Sent when an order ships
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/OrderShippedEvent' }
      responses:
        '2XX': { description: Acknowledged }
```

Webhooks describe calls the provider makes to consumer-registered URLs, independent of any API operation.

## Callbacks

Callbacks are tied to a specific operation (e.g. subscription registration supplies a URL):

```yaml
/subscriptions:
  post:
    callbacks:
      onEvent:
        '{$request.body#/callbackUrl}':
          post:
            requestBody: { content: { application/json: { schema: { $ref: '#/components/schemas/Event' } } } }
            responses: { '200': { description: OK } }
```

## Security Schemes

```yaml
components:
  securitySchemes:
    oauth:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/authorize
          tokenUrl: https://auth.example.com/token
          scopes: { orders:read: Read orders, orders:write: Create orders }
    apiKey: { type: apiKey, in: header, name: X-API-Key }
    mtls: { type: mutualTLS }
    oidc: { type: openIdConnect, openIdConnectUrl: https://auth.example.com/.well-known/openid-configuration }
security: [ { oauth: [orders:read] } ]
```

Per-operation `security` overrides the global value; `security: []` marks an operation as public.

## Reuse and Splitting

| Component | Reuse for |
|-----------|-----------|
| `schemas` | Data models |
| `parameters` | Pagination, common headers |
| `responses` | Problem details, 401/403/404 |
| `requestBodies`, `headers`, `examples`, `links`, `callbacks` | Shared pieces |
| `pathItems` (3.1) | Reusable path items, e.g. for webhooks |

External refs (`$ref: './schemas/order.yaml'`) keep files small; bundle them for distribution (`redocly bundle`).

## Extensions

`x-` prefixed fields are allowed almost anywhere: `x-internal: true` for filtering, `x-codeSamples` (Redoc), `x-tagGroups`, gateway-specific keys such as `x-amazon-apigateway-integration`.

## Checklist

- [ ] Version declared (`openapi: 3.1.x`) and tooling verified for it
- [ ] Nullable via type arrays, `examples` arrays
- [ ] `oneOf` + discriminator with `const` for polymorphism
- [ ] `readOnly`/`writeOnly` on server-generated and secret fields
- [ ] Problem-details default response
- [ ] Webhooks/callbacks documented for async interactions
- [ ] Security per operation with scopes
