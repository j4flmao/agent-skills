# API Documentation Portal

## Documentation Formats and Standards

### OpenAPI / Swagger
- Industry standard for REST API documentation (OpenAPI 3.1 most recent)
- YAML or JSON format describing endpoints, schemas, security, and metadata
- Machine-readable and human-readable
- Broad tooling support: code generation, validation, mocking, testing

```yaml
openapi: 3.1.0
info:
  title: Order Service API
  version: 2.1.0
  description: API for managing customer orders
  contact:
    name: Platform Team
    email: api-team@company.com
    url: https://developer.company.com
  termsOfService: https://company.com/terms
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0.html
servers:
  - url: https://api.company.com/v2
    description: Production
  - url: https://staging-api.company.com/v2
    description: Staging
  - url: https://dev-api.company.com/v2
    description: Development
tags:
  - name: Orders
    description: Order management operations
  - name: Products
    description: Product catalog operations
paths:
  /orders:
    $ref: './paths/orders.yaml'
```

### GraphQL SDL (Schema Definition Language)
- Self-documenting schema with types, queries, mutations, and subscriptions
- Introspection enables automatic schema documentation
- Commonly used with GraphiQL or GraphQL Playground for interactive exploration

```graphql
"""Order management operations"""
type Query {
  """Retrieve a paginated list of orders"""
  orders(
    """Filter by order status"""
    status: OrderStatus
    """Maximum number of orders to return"""
    limit: Int = 20
    """Pagination cursor"""
    cursor: String
  ): OrderConnection!

  """Retrieve a single order by ID"""
  order(id: ID!): Order
}

"""Possible states of an order"""
enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

type Order {
  id: ID!
  customerId: String!
  status: OrderStatus!
  items: [OrderItem!]!
  total: Float!
  createdAt: DateTime!
}
```

### gRPC Reflections
- gRPC servers expose service definitions via reflection API
- Tools like grpcurl and grpcui discover services without proto files
- Used with protoc-gen-doc to generate reference docs from proto files

```protobuf
syntax = "proto3";
package orders.v2;

service OrderService {
  // Create a new order
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  // Get an order by ID
  rpc GetOrder(GetOrderRequest) returns (Order);
  // List orders with pagination
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
  // Cancel an existing order
  rpc CancelOrder(CancelOrderRequest) returns (Order);
}

message CreateOrderRequest {
  string customer_id = 1;
  repeated OrderItem items = 2;
  string shipping_address_id = 3;
  optional string coupon_code = 4;
}

message Order {
  string id = 1;
  string customer_id = 2;
  OrderStatus status = 3;
  repeated OrderItem items = 4;
  double total = 5;
  string created_at = 6;
  string updated_at = 7;
}
```

### AsyncAPI
- OpenAPI-equivalent for event-driven / message-based APIs
- Describes channels, message schemas, publish/subscribe semantics
- Growing ecosystem with AsyncAPI Generator,Studio, and playground

```yaml
asyncapi: 3.0.0
info:
  title: Order Events
  version: 1.0.0
  description: Event-driven API for order lifecycle events
channels:
  order.created:
    address: orders/created
    messages:
      orderCreated:
        $ref: '#/components/messages/OrderCreated'
  order.updated:
    address: orders/updated
    messages:
      orderUpdated:
        $ref: '#/components/messages/OrderUpdated'
operations:
  onOrderCreated:
    action: receive
    channel:
      $ref: '#/channels/order.created'
    summary: Receive notification when an order is created
components:
  messages:
    OrderCreated:
      name: OrderCreated
      title: Order Created Event
      summary: Emitted when a new order is placed
      payload:
        type: object
        properties:
          orderId:
            type: string
            format: uuid
          customerId:
            type: string
          total:
            type: number
          status:
            type: string
            enum: [pending]
```

## OpenAPI Specification Deep Dive

### Paths and Operations

```yaml
paths:
  /orders:
    get:
      summary: List all orders
      description: Returns a paginated list of orders filtered by optional parameters
      operationId: listOrders
      tags:
        - Orders
      parameters:
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/limit'
        - name: status
          in: query
          description: Filter by order status
          schema:
            type: string
            enum: [pending, confirmed, shipped, delivered, cancelled]
          example: confirmed
      responses:
        '200':
          description: A paginated list of orders
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderListResponse'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
    post:
      summary: Create a new order
      operationId: createOrder
      tags:
        - Orders
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: Order created successfully
          headers:
            Location:
              schema:
                type: string
                format: uri
              description: URL of the created order
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '422':
          $ref: '#/components/responses/ValidationError'
```

### Parameters

```yaml
components:
  parameters:
    page:
      name: page
      in: query
      description: Page number for pagination (1-indexed)
      schema:
        type: integer
        minimum: 1
        default: 1
      example: 1
    limit:
      name: limit
      in: query
      description: Number of items per page
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
      example: 20
    orderId:
      name: id
      in: path
      description: Unique identifier of the order
      required: true
      schema:
        type: string
        format: uuid
      example: "0194fdc2-fa2f-7cc0-81d3-ff120745b99c"
```

### Request Bodies

```yaml
components:
  requestBodies:
    CreateOrderRequest:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateOrderRequest'
          examples:
            minimal:
              summary: Minimal order
              value:
                customerId: "0194fdc2-fa2f-7cc0-81d3-ff120745b99c"
                items:
                  - productId: "prod_001"
                    quantity: 1
            withCoupon:
              summary: Order with coupon code
              value:
                customerId: "0194fdc2-fa2f-7cc0-81d3-ff120745b99c"
                items:
                  - productId: "prod_001"
                    quantity: 2
                  - productId: "prod_002"
                    quantity: 1
                couponCode: "SAVE10"
```

### Responses

```yaml
components:
  responses:
    NotFound:
      description: The specified resource was not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error:
              code: NOT_FOUND
              message: Order with id 0194fdc2-fa2f-7cc0-81d3-ff120745b99c not found
              requestId: req_abc123
    ValidationError:
      description: Request validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error:
              code: VALIDATION_ERROR
              message: 2 validation errors
              details:
                - field: items
                  code: MIN_ITEMS
                  message: At least 1 item is required
                  value: []
    Unauthorized:
      description: Authentication required
      headers:
        WWW-Authenticate:
          schema:
            type: string
          example: Bearer realm="orders", error="invalid_token"
```

### Schemas

```yaml
components:
  schemas:
    OrderResponse:
      type: object
      properties:
        data:
          $ref: '#/components/schemas/Order'
        meta:
          type: object
          properties:
            requestId:
              type: string
              format: uuid
            timestamp:
              type: string
              format: date-time
    Order:
      type: object
      required:
        - id
        - customerId
        - status
        - items
        - total
        - createdAt
      properties:
        id:
          type: string
          format: uuid
          description: Unique identifier for the order
          example: "0194fdc2-fa2f-7cc0-81d3-ff120745b99c"
        customerId:
          type: string
          format: uuid
          description: Identifier of the customer who placed the order
        status:
          type: string
          enum: [pending, confirmed, shipped, delivered, cancelled]
          description: Current processing status of the order
        items:
          type: array
          description: Line items in the order
          items:
            $ref: '#/components/schemas/OrderItem'
        total:
          type: number
          format: double
          description: Total order amount in the account's currency
          example: 99.99
        createdAt:
          type: string
          format: date-time
          description: Timestamp when the order was created
```

### Security Schemes

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        JSON Web Token obtained from the authentication service.
        Tokens expire after 24 hours. Use the refresh token endpoint
        to obtain a new access token.
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: |
        API key for server-to-server integrations.
        Generate keys in the Developer Portal dashboard.
    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.company.com/oauth/authorize
          tokenUrl: https://auth.company.com/oauth/token
          refreshUrl: https://auth.company.com/oauth/refresh
          scopes:
            orders:read: Read order information
            orders:write: Create and modify orders
            products:read: Read product catalog
```

## Documentation Tools

### Swagger UI
- Most widely used OpenAPI renderer
- Interactive API console for testing endpoints
- Customizable with themes and plugins
- Supports OpenAPI 3.1 and Swagger 2.0

```html
<!-- Swagger UI in HTML -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.yaml',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset,
      ],
      layout: 'BaseLayout',
      deepLinking: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      defaultModelsExpandDepth: 1,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    });
  </script>
</body>
</html>
```

```typescript
// Serve Swagger UI in Express
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const spec = YAML.load('./openapi.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
  customCss: '.topbar { display: none }',
  customSiteTitle: 'Order Service API Docs',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
  },
}));
```

### ReDoc
- Clean, three-panel responsive documentation
- Auto-generated table of contents on the left
- Excellent for reference-heavy documentation
- Supports OpenAPI 3.1, code samples, and webhooks

```html
<!-- ReDoc -->
<!DOCTYPE html>
<html>
<head>
  <title>Order Service API - Reference</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
</head>
<body>
  <div id="redoc-container"></div>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init('/openapi.yaml', {
      scrollYOffset: 60,
      hideDownloadButton: false,
      expandResponses: '200',
      nativeScrollbars: true,
      pathInMiddlePanel: true,
      sortOperationsAlphabetically: true,
      sortTagsAlphabetically: true,
      theme: {
        colors: { primary: { main: '#32329f' } },
        typography: {
          fontFamily: 'Roboto, sans-serif',
          headings: { fontFamily: 'Montserrat, sans-serif' },
        },
        sidebar: { backgroundColor: '#f8f9fa' },
      },
    }, document.getElementById('redoc-container'));
  </script>
</body>
</html>
```

### Stoplight Elements
- Modern, lightweight API doc component
- Supports OpenAPI 3.1 with JSON Schema
- Framework-agnostic web component
- Built-in HTTP client and code samples

```html
<!-- Stoplight Elements -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
</head>
<body>
  <elements-api
    apiDescriptionUrl="/openapi.yaml"
    router="hash"
    layout="sidebar"
    tryItCredentialsPolicy="same-origin"
    hideInternal="true"
  />
</body>
</html>
```

```typescript
// React component
import { API } from '@stoplight/elements';
import '@stoplight/elements/styles.min.css';

export function ApiDocsPage() {
  return (
    <API
      apiDescriptionUrl="/openapi.yaml"
      layout="sidebar"
      router="hash"
      tryItCredentialsPolicy="same-origin"
      hideSchemas={false}
      hideInternal={true}
    />
  );
}
```

### Scalar
- Modern, customizable API documentation
- Built-in API client with code generation
- Supports OpenAPI 3.1, dark mode, and theming

```html
<!-- Scalar -->
<script id="api-reference" data-url="/openapi.yaml"></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
```

```typescript
// Vue/React integration
import { ApiReference } from '@scalar/api-reference';

const app = createApp({
  components: { ApiReference },
  template: `
    <ApiReference
      :configuration="{
        spec: { url: '/openapi.yaml' },
        darkMode: true,
        showSidebar: true,
        hideModels: false,
        withDefaultFonts: true,
      }"
    />
  `,
});
```

### RapiDoc
- Web component-based API documentation
- Customizable theme, layout, and schema display
- Built-in Try It console

```html
<!-- RapiDoc -->
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
</head>
<body>
  <rapi-doc
    spec-url="/openapi.yaml"
    theme="dark"
    bg-color="#1a1a2e"
    text-color="#ffffff"
    render-style="read"
    schema-style="tree"
    show-header="false"
    show-info="true"
    allow-authentication="true"
    allow-try="true"
    default-api-server="https://api.company.com/v2"
  ></rapi-doc>
</body>
</html>
```

## Developer Portals

### ReadMe
- Full-featured developer portal platform
- API reference, guides, changelog, and community features
- Metrics and analytics on documentation usage
- Custom domain, SSO, and API key management

```yaml
# rdme configuration (readme.json)
{
  "apiKey": "rdme_xxx",
  "apiDefinition": "./openapi.yaml",
  "id": "1234abc",
  "categories": [
    { "title": "Getting Started", "type": "guide", "slug": "getting-started" },
    { "title": "Authentication", "type": "guide", "slug": "authentication" },
    { "title": "Orders", "type": "reference", "slug": "orders" },
    { "title": "Products", "type": "reference", "slug": "products" },
    { "title": "Webhooks", "type": "reference", "slug": "webhooks" },
    { "title": "Changelog", "type": "changelog", "slug": "changelog" }
  ]
}
```

```bash
# Sync OpenAPI spec to ReadMe
npx rdme openapi ./openapi.yaml \
  --key=$README_API_KEY \
  --id=$README_DOC_ID
```

### Stoplight
- Design-first API development platform
- Visual API designer with OpenAPI validation
- Documentation portal with hosting and versioning
- Built-in mocking and testing tools

```bash
# Stoplight CLI: validate and lint spec
npx @stoplight/spectral-cli lint ./openapi.yaml

# Push spec to Stoplight project
npx @stoplight/cli push \
  --project project-slug \
  --branch main \
  --token $STOPLIGHT_TOKEN
```

### SwaggerHub
- Centralized OpenAPI repository
- Team collaboration with comments and reviews
- Hosted documentation portals
- Connected with API auto-mocking and code generation

```bash
# SwaggerHub CLI
npx swaggerhub-cli api:create company/OrderAPI/2.1.0 \
  --file ./openapi.yaml \
  --visibility public

# Validate spec
npx swaggerhub-cli api:validate company/OrderAPI/2.1.0
```

### Postman
- API client with documentation generation
- Collections as living documentation
- Postman Workspaces for team collaboration
- Automated testing with Newman

```json
{
  "name": "Order Service API",
  "description": "Complete API reference for the Order Service. Includes authentication, order management, and webhook endpoints.",
  "variable": [
    { "key": "baseUrl", "value": "https://api.company.com/v2" },
    { "key": "authToken", "value": "" },
    { "key": "customerId", "value": "0194fdc2-fa2f-7cc0-81d3-ff120745b99c" }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{ \"email\": \"user@example.com\", \"password\": \"your_password\" }"
            }
          },
          "response": [
            {
              "name": "Success",
              "body": "{ \"token\": \"eyJhbGci...\", \"expiresIn\": 86400 }"
            }
          ]
        }
      ]
    }
  ]
}
```

### Redocly
- OpenAPI validation and linting (Redocly CLI)
- Hosted API reference documentation (Redocly Portal)
- Workflows for API review and governance

```yaml
# redocly.yaml
apis:
  order-api@v2:
    root: ./openapi.yaml
    x-tagGroups:
      - name: Core Resources
        tags:
          - Orders
          - Products
          - Customers
      - name: Operations
        tags:
          - Webhooks
          - Health

features:
  mockServer: true
  codeSamples:
    languages:
      - shell
      - javascript
      - python
      - go
      - java
      - csharp
```

```bash
# Lint and bundle spec
npx @redocly/cli lint ./openapi.yaml
npx @redocly/cli bundle ./openapi.yaml -o ./bundled-spec.yaml

# Preview docs
npx @redocly/cli preview-docs ./openapi.yaml
```

### developerhub.io
- Open-source developer portal framework
- Backstage-based plugin architecture
- API catalog with scorecards and governance

## Documentation Generation

### Code-First (OpenAPI generation from code)

```typescript
// swagger-jsdoc with Express
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Order Service API',
      version: '2.1.0',
      description: 'REST API for order management',
    },
    servers: [{ url: 'https://api.company.com/v2' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/schemas/*.ts'],
};

const spec = swaggerJsdoc(options);
export default spec;
```

```typescript
// JSDoc annotations on route handlers
/**
 * @openapi
 * /orders:
 *   get:
 *     summary: List all orders
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipped]
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get('/orders', authenticate, listOrders);
```

```java
// Swagger Core (Java / Spring Boot)
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

@RestController
@Tag(name = "Orders", description = "Order management endpoints")
public class OrderController {

  @GetMapping("/orders/{id}")
  @Operation(summary = "Get order by ID")
  @ApiResponse(responseCode = "200", description = "Order found")
  @ApiResponse(responseCode = "404", description = "Order not found")
  public Order getOrder(@PathVariable String id) {
    return orderService.findById(id);
  }
}
```

### Design-First (Spec before code)

```typescript
// Stoplight Studio: visual OpenAPI editor
// Then generate server stubs from spec

# OpenAPI Generator
npx @openapitools/openapi-generator-cli generate \
  -i ./openapi.yaml \
  -g typescript-express \
  -o ./generated-server

# oazapfts (TypeScript client)
npx oazapfts ./openapi.yaml ./src/api.ts
```

```yaml
# Stoplight Spectral: lint rules
extends: [[all, recommended]]
rules:
  operation-description: error
  operation-operationId: error
  operation-tags: error
  path-params: error
  component-description: error
  response-example: warn
  request-body-example: warn
  no-ambiguous-paths: error
  no-eval-in-descriptions: error
  no-http-verbs-in-path: error
  path-excludes-patterns: warn
```

## API Reference Documentation

### Endpoint Listing

| Section | Content |
|---------|---------|
| Summary | One-line description of what the endpoint does |
| HTTP Method + Path | `GET /orders/{id}` |
| Authentication | Required auth type (API key, OAuth scope, bearer) |
| Parameters | Path, query, header, and cookie parameters |
| Request Body | Schema, content type, examples |
| Responses | Status codes, schemas, examples, headers |
| Error Codes | Specific error codes this endpoint can return |
| Rate Limits | Request quota for this endpoint tier |

### Parameter Documentation

```
GET /v2/orders/{id}
Path Parameters:
  id (string, uuid) — Unique identifier of the order

Query Parameters:
  include (string, optional) — Comma-separated related resources
    Example: ?include=items,customer
    Options: items, customer, payments

Headers:
  Accept (string, default: application/json) — Response format
  X-Idempotency-Key (string, optional) — Idempotency key for retries
```

### Response Examples

```
200 OK
{
  "data": {
    "id": "0194fdc2-fa2f-7cc0-81d3-ff120745b99c",
    "customerId": "0194fdc2-fa2f-7cc0-81d3-ff120745b99c",
    "status": "confirmed",
    "items": [
      {
        "productId": "prod_001",
        "name": "Wireless Headphones",
        "quantity": 1,
        "unitPrice": 79.99,
        "totalPrice": 79.99
      }
    ],
    "total": 79.99,
    "subtotal": 79.99,
    "shipping": 0,
    "tax": 6.40,
    "currency": "USD",
    "createdAt": "2026-05-27T10:30:00Z",
    "updatedAt": "2026-05-27T10:30:05Z"
  }
}
```

### Error Codes Table

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 422 | Request body fails schema validation |
| `INVALID_STATUS_TRANSITION` | 409 | Can't ship a cancelled order |
| `INSUFFICIENT_STOCK` | 409 | Product quantity exceeds available stock |
| `ORDER_ALREADY_CANCELLED` | 409 | Attempt to cancel an already-cancelled order |
| `IDEMPOTENCY_REUSE` | 422 | Idempotency key used with different request body |

## Getting Started Guides

### Authentication Setup

```markdown
# Authentication

The Order Service API uses JWT bearer tokens for authentication.

## Obtaining an API Token

1. Register an account at https://dashboard.company.com
2. Navigate to Settings > API Tokens
3. Click "Generate New Token"
4. Copy the token immediately — it won't be shown again

## Using the Token

Include the token in the `Authorization` header:

\`\`\`
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
\`\`\`

## Token Scopes

| Scope | Access |
|-------|--------|
| `orders:read` | Read order information |
| `orders:write` | Create and modify orders |
| `products:read` | Read product catalog |
| `webhooks:manage` | Configure webhook endpoints |

## Example

curl -X GET "https://api.company.com/v2/orders" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Quick Start

```markdown
# Quick Start

## Prerequisites
- API token (see Authentication guide)
- curl or any HTTP client

## 1. List Products

GET https://api.company.com/v2/products?limit=5

Response:
{
  "data": [
    { "id": "prod_001", "name": "Wireless Headphones", "price": 79.99 },
    { "id": "prod_002", "name": "USB-C Cable", "price": 12.99 }
  ]
}

## 2. Create an Order

POST https://api.company.com/v2/orders
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "customerId": "0194fdc2-fa2f-7cc0-81d3-ff120745b99c",
  "items": [
    { "productId": "prod_001", "quantity": 1 }
  ]
}

## 3. Check Order Status

GET https://api.company.com/v2/orders/{orderId}

## 4. Handle Webhooks

Set up a webhook endpoint to receive order status updates:
POST https://your-server.com/webhooks/orders
```

### SDK / Client Library Generation

```bash
# OpenAPI Generator — multiple languages
npx @openapitools/openapi-generator-cli generate \
  -i ./openapi.yaml \
  -g typescript-fetch \
  -o ./generated-client \
  --additional-properties=npmName=@company/order-api-client

npx @openapitools/openapi-generator-cli generate \
  -i ./openapi.yaml \
  -g python \
  -o ./generated-client-python \
  --additional-properties=packageName=order_api_client

npx @openapitools/openapi-generator-cli generate \
  -i ./openapi.yaml \
  -g go \
  -o ./generated-client-go \
  --additional-properties=packageName=orderapi

npx @openapitools/openapi-generator-cli generate \
  -i ./openapi.yaml \
  -g java \
  -o ./generated-client-java \
  --additional-properties=groupId=com.company,artifactId=order-api-client
```

```bash
# Kiota (Microsoft) — generates API clients
kiota generate \
  --openapi ./openapi.yaml \
  --language typescript \
  --output ./generated/kiota-client \
  --namespace-name Company.OrderApi

kiota generate \
  --openapi ./openapi.yaml \
  --language python \
  --output ./generated/kiota-client-python \
  --namespace-name company.order_api
```

```bash
# Fern — API-first client generation
# fern/definition/api.yml
api:
  name: order-api
  auth: bearer
  base-path: /v2
  endpoints: {}
```

```yaml
# fern/definition/orders.yml
service:
  auth: true
  base-path: /orders
  endpoints:
    list:
      path: /
      method: GET
      request:
        query:
          status: optional<string>
      response: List<Order>
    get:
      path: /{id}
      method: GET
      path-parameters:
        id: string
      response: Order
    create:
      path: /
      method: POST
      request: CreateOrderRequest
      response: Order
```

```bash
# Generate with Fern
fern generate
```

```bash
# Speakeasy — SDK generation and registry
speakeasy generate \
  --schema ./openapi.yaml \
  --lang typescript \
  --out ./sdks/typescript \
  --package @company/orders-sdk

speakeasy generate \
  --schema ./openapi.yaml \
  --lang python \
  --out ./sdks/python
```

## Tutorials and Guides

### Step-by-Step Workflow

```markdown
# Tutorial: Building a Checkout Flow

## Overview
Learn how to implement a complete checkout flow using the Order Service API.

## Step 1: Get Products
Fetch available products to display in your storefront.

GET /v2/products?inStock=true&limit=50

## Step 2: Create Customer
If the customer doesn't exist, create a new customer record.

POST /v2/customers
{
  "email": "customer@example.com",
  "name": "Jane Smith",
  "shippingAddresses": [
    { "street": "123 Main St", "city": "Portland", "zip": "97201" }
  ]
}

## Step 3: Create Order
Submit the order with selected items.

POST /v2/orders
{
  "customerId": "cust_123",
  "items": [
    { "productId": "prod_001", "quantity": 1 },
    { "productId": "prod_002", "quantity": 2 }
  ],
  "shippingAddressId": "addr_456"
}

## Step 4: Process Payment
Pay for the order using a payment token.

POST /v2/orders/{orderId}/pay
{
  "method": "card",
  "paymentToken": "tok_visa_4242"
}

## Step 5: Track Order
Poll or listen for order status updates.

GET /v2/orders/{orderId}
```

### Use Case-Based Guides

```markdown
# Guide: Handling Order Refunds

## When to Refund
- Customer requests cancellation before shipping
- Product arrived damaged
- Duplicate charge

## Full Refund
POST /v2/orders/{orderId}/refund
{
  "reason": "Customer requested cancellation",
  "amount": null  // null = full refund
}

## Partial Refund
POST /v2/orders/{orderId}/refund
{
  "reason": "Damaged item: USB-C Cable",
  "amount": 12.99,
  "items": [{ "productId": "prod_002", "quantity": 1 }]
}

## Idempotent Refunds
Include an Idempotency-Key header to prevent duplicate processing:

POST /v2/orders/{orderId}/refund
Idempotency-Key: unique-key-123
```

### Interactive Tutorials

```markdown
// Embedded Swagger UI "Try It Out" sections
// API playground with pre-filled examples

## Interactive Console

The API console below lets you test endpoints with live data.
Click "Try It Out" on any endpoint to experiment.

- Authentication is pre-filled with a demo token
- Response data comes from the sandbox environment
- Rate limits: 100 requests/hour on the sandbox
```

## Changelog and Versioning

### API Version Documentation

```
# Changelog

## v2.1.0 (2026-05-15)

### Added
- `PATCH /orders/{id}/cancel` — Cancel an in-progress order
- `X-Request-Id` response header on all endpoints
- `couponCode` field on `CreateOrderRequest`

### Changed
- Paginated responses now include `total` count in `meta`
- `POST /orders` — `items` max raised from 25 to 50

### Deprecated
- `GET /v1/orders` — Sunset: 2026-08-15. Migrate to `GET /v2/orders`
- `legacy` field in Order schema — Will be removed in v2.2

### Fixed
- `PATCH /orders/{id}` now correctly validates partial updates
- Webhook delivery now includes `X-Signature` header

## v2.0.0 (2026-01-20)

### Breaking Changes
- Removed `GET /v1/products` — Use `GET /v2/products` instead
- Response envelope changed from `{ "orders": [] }` to `{ "data": [] }`
- Error format now uses `code` string instead of numeric `errorCode`
```

### Deprecation Notices

```yaml
# Deprecated endpoint in OpenAPI
paths:
  /v1/orders:
    get:
      summary: List orders (deprecated)
      deprecated: true
      description: |
        ⚠️ **Deprecated**: This endpoint is deprecated and will be removed on 2026-08-15.
        Use [`GET /v2/orders`](/v2/orders) instead.
      x-deprecated-sunset: "2026-08-15"
      x-migration-guide: "/docs/migration-v1-to-v2"
```

### Migration Guides

```markdown
# Migration Guide: v1 to v2

## What Changed

### Response Format
**v1:**
{
  "orders": [{ "id": "1", "title": "Order 1" }]
}

**v2:**
{
  "data": [{ "id": "1", "title": "Order 1" }],
  "meta": { "total": 1, "page": 1 }
}

### Error Format
**v1:** { "errorCode": 1001, "message": "Not found" }
**v2:** { "error": { "code": "NOT_FOUND", "message": "..." } }

## Timeline
- v1 supported until: August 15, 2026
- v1 fully removed: September 15, 2026
- v2.1 (current stable): May 2026

## Migration Steps
1. Update response parsing to use `data` envelope
2. Update error handling to use `code` field
3. Replace `GET /v1/orders` with `GET /v2/orders`
4. Test with v2 staging endpoint before cutover
```

## Interactive API Consoles

### Try-It-Now

```typescript
// Custom try-it-now component with sandbox
interface TryItConsoleProps {
  spec: OpenAPIObject;
  defaultServer: string;
  sandboxToken: string;
}

function TryItConsole({ spec, defaultServer, sandboxToken }: TryItConsoleProps) {
  const [endpoint, setEndpoint] = useState<string>('');
  const [method, setMethod] = useState<string>('GET');
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<ApiResponse | null>(null);

  async function executeRequest() {
    try {
      const res = await fetch(`${defaultServer}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${sandboxToken}`,
          'Content-Type': 'application/json',
        },
        body: method !== 'GET' ? requestBody : undefined,
      });
      setResponse({
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        body: await res.json(),
      });
    } catch (err) {
      setResponse({ status: 0, headers: {}, body: { error: String(err) } });
    }
  }

  return (
    <div className="try-it-console">
      <select value={method} onChange={e => setMethod(e.target.value)}>
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>PATCH</option>
        <option>DELETE</option>
      </select>
      <input
        type="text"
        value={endpoint}
        onChange={e => setEndpoint(e.target.value)}
        placeholder="/orders/123"
      />
      <button onClick={executeRequest}>Send Request</button>
      {response && (
        <div className="response-panel">
          <pre>Status: {response.status}</pre>
          <pre>{JSON.stringify(response.body, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### API Playground

```typescript
// GraphQL playground configuration
import { createGraphiQLFetcher } from '@graphiql/toolkit';
import { GraphiQL } from 'graphiql';
import 'graphiql/graphiql.css';

const fetcher = createGraphiQLFetcher({
  url: 'https://api.company.com/graphql',
  headers: {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SANDBOX_TOKEN}`,
  },
});

export function ApiPlayground() {
  return (
    <GraphiQL
      fetcher={fetcher}
      defaultQuery={`# Welcome to the Order API GraphQL Playground
# Explore the schema and run queries

query GetRecentOrders {
  orders(limit: 5, status: CONFIRMED) {
    edges {
      node {
        id
        status
        total
        createdAt
      }
    }
  }
}`}
      variables={JSON.stringify({ limit: 5 }, null, 2)}
      headerEditorEnabled={false}
      shouldPersistHeaders={false}
    />
  );
}
```

### Sandbox Environments

```yaml
# Sandbox configuration in OpenAPI
servers:
  - url: https://sandbox-api.company.com/v2
    description: |
      Sandbox environment for testing and development.
      - Uses fake payment data (test card: 4242 4242 4242 4242)
      - Orders auto-transition through statuses every 30 seconds
      - Data is reset daily at 00:00 UTC
      - Rate limit: 1000 requests/hour
    x-sandbox: true
    x-sandbox-features:
      auto-status-transition: true
      test-card-numbers:
        - 4242424242424242
        - 4000000000000002
      reset-schedule: "daily at 00:00 UTC"
      rate-limit: 1000/hour
```

## Authentication Documentation

### API Keys

```markdown
## API Key Authentication

API keys are used for server-to-server integrations.

### Generating an API Key
1. Go to Dashboard → Developer Settings → API Keys
2. Click "Create API Key"
3. Select the permissions scope
4. Copy the key (shown once)

### Using API Keys
Pass the key in the `X-API-Key` header:

curl -X GET "https://api.company.com/v2/products" \
  -H "X-API-Key: your-api-key-here"

### Best Practices
- Rotate keys every 90 days
- Use separate keys for development and production
- Revoke compromised keys immediately from the dashboard
- Store keys in environment variables or secrets manager
```

### OAuth2 Flows

```yaml
# OAuth2 authorization code flow documentation
x-oauth2-docs:
  flow: authorization_code
  authorization_url: https://auth.company.com/oauth/authorize
  token_url: https://auth.company.com/oauth/token
  scopes:
    orders:read: View order details
    orders:write: Create and update orders
  steps:
    - title: Redirect user to authorize
      description: >
        Redirect the user to the authorization URL with your client ID
      code: |
        GET https://auth.company.com/oauth/authorize
          ?response_type=code
          &client_id=YOUR_CLIENT_ID
          &redirect_uri=https://yourapp.com/callback
          &scope=orders:read+orders:write
          &state=random-state-string
    - title: Receive authorization code
      description: >
        The user authorizes and is redirected to your callback URL with a code
      code: |
        GET https://yourapp.com/callback
          ?code=authorization_code_123
          &state=random-state-string
    - title: Exchange code for token
      description: >
        Exchange the authorization code for an access token
      code: |
        POST https://auth.company.com/oauth/token
        Content-Type: application/x-www-form-urlencoded

        grant_type=authorization_code
        &code=authorization_code_123
        &client_id=YOUR_CLIENT_ID
        &client_secret=YOUR_CLIENT_SECRET
        &redirect_uri=https://yourapp.com/callback
```

### JWT Tokens

```json
{
  "token_type": "Bearer",
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "orders:read orders:write"
}
```

```typescript
// JWT structure documentation
interface JwtPayload {
  sub: string;          // User ID
  iss: string;          // Issuer (auth.company.com)
  aud: string;          // Audience (api.company.com)
  exp: number;          // Expiration timestamp
  iat: number;          // Issued at timestamp
  scope: string;        // Space-separated scopes
  customerId?: string;  // Associated customer
  roles?: string[];     // User roles
}
```

### mTLS Setup

```markdown
## mTLS Authentication

For high-security integrations, use mutual TLS (mTLS).

### Prerequisites
- Obtain a client certificate from the Platform team
- Certificate must be PEM-encoded (X.509)
- Private key must be RSA-2048 or ECDSA-P256

### Configuration

curl -X GET "https://api.company.com/v2/orders" \
  --cert /path/to/client.crt \
  --key /path/to/client.key \
  --cacert /path/to/ca.crt

### Certificate Rotation
- Certificates expire after 1 year
- Renew at least 30 days before expiry
- Use the /v2/certificates endpoint to check expiry
```

## Error Handling Documentation

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "2 validation errors in request body",
    "details": [
      {
        "field": "items[0].quantity",
        "code": "EXCEEDS_MAX",
        "message": "Quantity must not exceed 100",
        "value": 200,
        "constraint": { "max": 100 }
      },
      {
        "field": "shippingAddressId",
        "code": "REQUIRED",
        "message": "Shipping address is required when items are physical"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-05-27T10:30:00Z"
  }
}
```

### Common Errors

| Code | HTTP | Cause | What To Do |
|------|------|-------|------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token | Check your auth header |
| `FORBIDDEN` | 403 | Token lacks required scope | Request scope upgrade |
| `NOT_FOUND` | 404 | Resource doesn't exist | Verify the resource ID |
| `VALIDATION_ERROR` | 422 | Invalid request body | Fix the fields in `details` |
| `RATE_LIMITED` | 429 | Too many requests | Wait for `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Server error | Retry with exponential backoff |
| `SERVICE_UNAVAILABLE` | 503 | Maintenance or overload | Check status.company.com |

### Troubleshooting

```markdown
## Troubleshooting

### Request Not Reaching API
1. Verify your API token is not expired
2. Check the request URL matches the documented endpoint
3. Ensure correct HTTP method (POST vs PUT vs PATCH)
4. Confirm Content-Type header is application/json

### Getting Validation Errors
1. Read the `details` array for specific field errors
2. Check required fields are present
3. Verify field types match the schema documentation
4. Ensure enum values are from the allowed list

### Rate Limited
1. Check `X-RateLimit-Remaining` header before hitting limits
2. Implement exponential backoff on 429 responses
3. Use `Retry-After` header value (seconds) for wait time
4. Request rate limit increase from the dashboard

### Webhook Not Receiving Events
1. Verify the webhook URL is publicly accessible
2. Check the webhook secret is correctly configured
3. Verify signature validation logic matches documentation
4. Review webhook delivery logs in the dashboard
```

## Rate Limiting Documentation

### Limits and Headers

```yaml
x-rate-limiting:
  default:
    limit: 100
    window: 60 seconds
    headers:
      - X-RateLimit-Limit
      - X-RateLimit-Remaining
      - X-RateLimit-Reset
  endpoints:
    POST /auth/login:
      limit: 5
      window: 60 seconds
    GET /orders:
      limit: 200
      window: 60 seconds
    POST /orders:
      limit: 30
      window: 60 seconds
```

```markdown
## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `GET /orders` | 200 requests | 60 seconds |
| `POST /orders` | 30 requests | 60 seconds |
| `POST /auth/login` | 5 requests | 60 seconds |
| All other endpoints | 100 requests | 60 seconds |

### Response Headers
When you make an API request, the following headers indicate your rate limit status:

X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1716805800

### Best Practices
- Monitor `X-RateLimit-Remaining` and slow down when it drops below 10
- On 429 responses, use the `Retry-After` header value (seconds)
- Implement exponential backoff: 1s, 2s, 4s, 8s, max 60s
- Request higher limits via the Developer Dashboard
```

### Retry Logic

```typescript
// Retry logic with exponential backoff
async function apiRequest<T>(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) return response.json();

    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get('Retry-After') || String(2 ** attempt * 1000)
      );
      await sleep(retryAfter * 1000);
      continue;
    }

    if (response.status >= 500 && attempt < maxRetries) {
      const delay = 1000 * Math.pow(2, attempt) + Math.random() * 1000;
      await sleep(delay);
      continue;
    }

    throw new ApiError(response.status, await response.json());
  }

  throw new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Webhook Documentation

### Event Types

```yaml
x-webhooks:
  order.created:
    description: Fired when a new order is created
    httpMethod: POST
    payload:
      $ref: '#/components/schemas/OrderWebhookPayload'
    examples:
      - { event: order.created, data: { id: "ord_123", status: "pending", total: 49.99 } }
  order.updated:
    description: Fired when an order status changes
    httpMethod: POST
    payload:
      type: object
      properties:
        event: { type: string, enum: [order.updated] }
        data: { $ref: '#/components/schemas/Order' }
        previousStatus: { type: string }
  order.refunded:
    description: Fired when an order is refunded
    httpMethod: POST
```

### Payload Schemas

```json
{
  "event": "order.updated",
  "id": "evt_abc123",
  "created": "2026-05-27T10:30:00Z",
  "data": {
    "id": "ord_123",
    "customerId": "cust_456",
    "status": "shipped",
    "previousStatus": "confirmed",
    "items": [
      { "productId": "prod_001", "quantity": 1 }
    ],
    "total": 79.99
  }
}
```

### Retry Policies

```yaml
x-webhook-retry:
  maxRetries: 5
  initialDelay: 60 seconds
  backoff: exponential (doubles each attempt)
  maxDelay: 3600 seconds (1 hour)
  retention: 7 days
  deadLetter: true
  retryOnStatuses:
    - 500
    - 502
    - 503
    - 504
  noRetryOnStatuses:
    - 400
    - 401
    - 404
```

### Webhook Security

```typescript
// Signature verification documentation
// Webhook payloads are signed with HMAC-SHA256

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Usage in Express
app.post('/webhooks/orders', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const isValid = verifyWebhookSignature(
    req.body.toString(),
    signature,
    process.env.WEBHOOK_SECRET!
  );
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  // Process webhook
  res.status(200).send('OK');
});
```

```markdown
## Webhook Best Practices

1. **Acknowledge quickly** — Return 200 OK as fast as possible, process asynchronously
2. **Verify signatures** — Always validate the `X-Webhook-Signature` header
3. **Idempotent processing** — Use the webhook `id` to deduplicate deliveries
4. **Respond within 5 seconds** — Webhooks that timeout are retried
5. **Log all webhooks** — Debug issues by reviewing delivery logs
6. **Use a dead letter queue** — Store failed deliveries for manual review
```

## Search and Discoverability

### Full-Text Search

```typescript
// Documentation search implementation
interface SearchResult {
  title: string;
  description: string;
  url: string;
  category: string;
  content: string; // snippet
}

async function searchDocs(query: string): Promise<SearchResult[]> {
  const response = await fetch('/api/docs/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
}

// Search UI component
function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const debounce = setTimeout(async () => {
      const data = await searchDocs(query);
      setResults(data);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div className="search-bar">
      <input
        type="search"
        placeholder="Search documentation..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <div className="search-results">
          {results.map(result => (
            <a key={result.url} href={result.url} className="search-result">
              <span className="category">{result.category}</span>
              <span className="title">{result.title}</span>
              <p className="snippet">{result.content}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Tag-Based Browsing

```yaml
# Tag groups for documentation navigation
x-tagGroups:
  - name: Core Resources
    tags:
      - Orders
      - Products
      - Customers
      - Payments
  - name: Integrations
    tags:
      - Webhooks
      - SDKs
      - Authentication
  - name: Platform
    tags:
      - Health
      - Rate Limits
      - Changelog
```

### API Catalog

```yaml
# API catalog metadata for discoverability
x-api-catalog:
  name: Order Service
  domain: commerce
  team: Platform
  tier: gold
  sla:
    uptime: "99.95%"
    latency: "< 200ms p95"
  categories:
    - ecommerce
    - orders
    - payments
  tags:
    - rest
    - json
    - webhooks
  dependencies:
    - Payment Service
    - Inventory Service
    - Notification Service
```

## Versioning Documentation

### Content Negotiation

```yaml
# Version via Accept header
paths:
  /orders:
    get:
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
components:
  parameters:
    ApiVersion:
      name: Accept
      in: header
      description: API version via content negotiation
      schema:
        type: string
        example: application/vnd.company.v2+json
      required: true
```

```markdown
## API Versioning Strategy

### Method: Accept Header (Content Negotiation)

All API versions are available at the same base URL. Specify the version via the `Accept` header:

Accept: application/vnd.company.v2+json

Available versions:
- `application/vnd.company.v1+json` — Legacy (deprecated, sunset 2026-08-15)
- `application/vnd.company.v2+json` — Current stable version

### URL-Based Versioning (Legacy)

Older endpoints use URL prefix versioning:

GET /v1/orders
GET /v2/orders
```

### Changelog Management

```yaml
# openapi.yaml: changelog extension
x-changelog:
  - version: 2.1.0
    date: "2026-05-15"
    changes:
      - type: added
        description: "PATCH /orders/{id}/cancel endpoint"
      - type: changed
        description: "Increased max items per order from 25 to 50"
    migration: |
      No migration needed for existing clients.
      New fields are optional and will not break existing implementations.
  - version: 2.0.0
    date: "2026-01-20"
    changes:
      - type: breaking
        description: "Response envelope changed from { orders: [] } to { data: [] }"
    migration: |
      Update response parsing to read `data` instead of `orders`.
      See migration guide: /docs/migration-v1-to-v2
```

## Analytics and Feedback

### Documentation Usage Analytics

```typescript
// Track documentation page views
function trackDocPage(page: string, section: string) {
  if (typeof window === 'undefined') return;

  fetch('/api/analytics/docs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page,
      section,
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    }),
    // Use sendBeacon for reliability
    keepalive: true,
  });
}

// Track "Try It" executions
function trackTryIt(endpoint: string, method: string, status: number) {
  trackDocPage(window.location.pathname, `try-it:${method} ${endpoint} -> ${status}`);
}
```

### Feedback Collection

```typescript
// Documentation feedback widget
function DocFeedback() {
  const [submitted, setSubmitted] = useState(false);

  async function submitFeedback(helpful: boolean, comment?: string) {
    await fetch('/api/docs/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: window.location.pathname,
        helpful,
        comment,
        timestamp: new Date().toISOString(),
      }),
    });
    setSubmitted(true);
  }

  if (submitted) {
    return <p className="feedback-thanks">Thanks for your feedback!</p>;
  }

  return (
    <div className="doc-feedback">
      <p>Was this page helpful?</p>
      <button onClick={() => submitFeedback(true)}>Yes</button>
      <button onClick={() => submitFeedback(false)}>No</button>
    </div>
  );
}
```

### Improvement Cycles

```yaml
# Documentation quality metrics
x-doc-quality:
  metrics:
    - name: search_success_rate
      description: Percentage of searches that result in a page view
      target: "> 80%"
    - name: page_satisfaction
      description: Average feedback score per page (1-5)
      target: "> 4.0"
    - name: time_to_find
      description: Average time to locate a specific endpoint
      target: "< 30 seconds"
    - name: spec_validity
      description: OpenAPI spec passes linting without errors
      target: "100%"
  review_cycle: monthly
  actions:
    - "Review top 10 searched-but-not-found queries each week"
    - "Update pages with satisfaction score below 3.0"
    - "Audit OpenAPI spec for completeness bi-weekly"
```

## Documentation Best Practices

### Writing Style

```markdown
## Writing Style Guide

- **Use active voice**: "Create an order" not "An order is created"
- **Be concise**: Prefer short sentences and bullet points
- **Use consistent terminology**: "endpoint" not "route" or "URL"
- **Include real examples**: Every parameter should have an example value
- **Document error cases**: Show what happens when things go wrong
- **Provide context**: Explain why you'd use an endpoint, not just how

DO: "Create an order to start the checkout process."
DON'T: "This endpoint allows for the creation of a new order resource."

DO: "Returns 404 if the order ID doesn't exist."
DON'T: "May return a 404 status code under certain error conditions."
```

### Structure

```yaml
# Recommended documentation structure
x-doc-structure:
  getting-started:
    - overview.md: API overview and key concepts
    - authentication.md: How to authenticate
    - quickstart.md: First API call in 5 minutes
    - sdks.md: Client library setup
  guides:
    - checkout-flow.md: Complete checkout implementation
    - webhooks.md: Receiving real-time events
    - errors.md: Handling errors gracefully
    - rate-limiting.md: Managing API rate limits
    - pagination.md: Fetching large data sets
    - migration-guide.md: Migrating between versions
  reference:
    - openapi.yaml: Full API reference (auto-generated)
  resources:
    - changelog.md: API changelog
    - faq.md: Frequently asked questions
    - status.md: API status and incidents
```

### Accessibility

```html
<!-- Accessible documentation components -->
<nav aria-label="Documentation navigation" role="navigation">
  <ul>
    <li><a href="/docs/getting-started" aria-current="page">Getting Started</a></li>
    <li><a href="/docs/guides">Guides</a></li>
    <li><a href="/docs/api-reference">API Reference</a></li>
  </ul>
</nav>

<main role="main" aria-labelledby="page-title">
  <h1 id="page-title">Create an Order</h1>
  <p>Use this endpoint to create a new order.</p>

  <div role="region" aria-label="Example request" tabindex="0">
    <pre><code>curl -X POST "https://api.company.com/v2/orders" ...</code></pre>
  </div>

  <table aria-label="Response fields">
    <caption>Order response fields</caption>
    <thead>
      <tr>
        <th scope="col">Field</th>
        <th scope="col">Type</th>
        <th scope="col">Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td scope="row"><code>id</code></td>
        <td>string (uuid)</td>
        <td>Unique identifier for the order</td>
      </tr>
    </tbody>
  </table>
</main>
```

### Internationalization

```yaml
# Multi-language documentation configuration
x-doc-i18n:
  languages:
    - code: en
      label: English
      default: true
    - code: ja
      label: 日本語
    - code: zh-CN
      label: 简体中文
    - code: es
      label: Español
  strategy: separate-files
  content:
    guides:
      - getting-started
      - authentication
      - quickstart
    reference:
      - openapi
    auto-translate:
      - changelog
      - faq
```

```yaml
# Language-specific OpenAPI descriptions
info:
  title: Order Service API
  description:
    en: REST API for managing customer orders
    ja: 顧客注文を管理するためのREST API
    zh-CN: 用于管理客户订单的REST API
    es: API REST para gestionar pedidos de clientes
```

### Key Points
- OpenAPI 3.1 is the standard for REST API documentation — machine and human readable
- Use design-first approach (spec before code) for contract clarity, or code-first for rapid development
- Swagger UI, ReDoc, Stoplight Elements, Scalar, and RapiDoc are the primary doc rendering tools
- Developer portals (ReadMe, Stoplight, SwaggerHub, Postman) provide hosted docs with analytics
- Include getting started guides, authentication setup, and SDK generation in documentation
- Document error codes, rate limits, webhooks, and versioning strategy clearly
- Keep changelog with Added/Changed/Deprecated/Removed/Fixed sections and sunset dates
- Provide interactive consoles (Try It, GraphQL Playground) for hands-on exploration
- Use OpenAPI Generator, Kiota, Fern, and Speakeasy for SDK/client library generation
- Track documentation usage analytics and collect feedback for continuous improvement
- Follow accessibility standards (ARIA labels, semantic HTML) in documentation UI
- Support internationalization for multi-language developer audiences
- Validate OpenAPI spec in CI to prevent documentation drift from implementation
