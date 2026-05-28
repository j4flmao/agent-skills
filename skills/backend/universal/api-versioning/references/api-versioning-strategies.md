# API Versioning Strategies

## Comprehensive Strategy Guide

This reference provides an in-depth analysis of all major API versioning strategies, including implementation details, trade-off analysis, code examples across frameworks, and guidance for selecting the right strategy for any scenario.

## Strategy Selection Framework

### Decision Matrix

| Factor | URI Path | Header | Content Negotiation | Query Parameter |
|--------|----------|--------|---------------------|-----------------|
| Explicitness | Highest | Medium | Low | Medium |
| Client effort | None | Medium | High | Low |
| Cache friendliness | High | Low | Medium | Low |
| RESTfulness | Medium | Medium | Highest | Low |
| Browser testability | High | Low | Low | High |
| Routing simplicity | High | Medium | Low | High |
| API gateways | Native | Requires config | Requires config | Native |
| OpenAPI support | Native | Manual | Manual | Partial |
| Tooling support | Universal | Limited | Limited | Universal |

### Selection Algorithm

```
IF (API is public-facing)
  IF (clients are server-side or native mobile)
    → URI Path Versioning
  ELSE IF (clients are web browsers)
    → URI Path Versioning (most universal)
  ELSE
    → URI Path Versioning or Content Negotiation
ELSE (API is internal)
  IF (service-to-service with shared gateway)
    → Header Versioning (cleaner, version managed by gateway)
  ELSE
    → URI Path Versioning or Header Versioning
```

## URI Path Versioning

### Implementation Patterns

**Pattern A: Separate Router per Version**

Each version gets its own router with completely independent route definitions. This is the most common pattern and provides full isolation between versions.

```javascript
// Express.js
const express = require('express');
const app = express();

const v1Router = express.Router();
v1Router.get('/users', v1UsersController.list);
v1Router.post('/users', v1UsersController.create);

const v2Router = express.Router();
v2Router.get('/users', v2UsersController.list);
v2Router.post('/users', v2UsersController.create);

app.use('/v1', v1Router);
app.use('/v2', v2Router);
```

```python
# FastAPI
from fastapi import APIRouter, FastAPI

app = FastAPI()
v1 = APIRouter(prefix="/v1")
v2 = APIRouter(prefix="/v2")

@v1.get("/users")
async def list_users_v1(): ...

@v2.get("/users")
async def list_users_v2(): ...

app.include_router(v1)
app.include_router(v2)
```

```go
// Gin
func SetupRouter() *gin.Engine {
    r := gin.Default()
    v1 := r.Group("/v1")
    v2 := r.Group("/v2")
    {
        v1.GET("/users", v1.ListUsers)
        v2.GET("/users", v2.ListUsers)
    }
    return r
}
```

```java
// Spring Boot
@RestController
@RequestMapping("/v1/users")
public class UserControllerV1 { ... }

@RestController
@RequestMapping("/v2/users")
public class UserControllerV2 { ... }
```

```csharp
// ASP.NET Core
[ApiVersion("1.0")]
[Route("v{version:apiVersion}/users")]
public class UsersV1Controller : ControllerBase { ... }

[ApiVersion("2.0")]
[Route("v{version:apiVersion}/users")]
public class UsersV2Controller : ControllerBase { ... }
```

**Pattern B: Translation Layer**

One canonical internal representation with version-specific response adapters. Best for APIs where versions are close and the translation cost is low.

```typescript
// TypeScript translation layer
interface OrderV1 {
  id: string;
  customer_name: string;
  total: number;
  items: Array<{ product_id: string; qty: number }>;
}

interface OrderV2 {
  id: string;
  customer: { id: string; name: string; email: string };
  total: number;
  currency: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  created_at: string;
}

class OrderTranslator {
  toV1(order: InternalOrder): OrderV1 {
    return {
      id: order.id,
      customer_name: order.customer.name,
      total: order.total,
      items: order.items.map(item => ({
        product_id: item.productId,
        qty: item.quantity
      }))
    };
  }

  toV2(order: InternalOrder): OrderV2 {
    return {
      id: order.id,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        email: order.customer.email
      },
      total: order.total,
      currency: order.currency,
      items: order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      created_at: order.createdAt.toISOString()
    };
  }
}

// Router uses translator
router.get('/v1/orders/:id', async (req, res) => {
  const order = await orderService.findById(req.params.id);
  res.json(translator.toV1(order));
});

router.get('/v2/orders/:id', async (req, res) => {
  const order = await orderService.findById(req.params.id);
  res.json(translator.toV2(order));
});
```

**Pattern C: Versioned Middleware**

A middleware intercepts the version and routes to the appropriate handler. Useful for fine-grained control over version-specific behavior.

```python
# Python with middleware version routing
from functools import wraps

def versioned(version_map):
    """Decorator that routes to version-specific handler based on URL prefix."""
    def decorator(func):
        @wraps(func)
        async def wrapper(request, *args, **kwargs):
            version = request.url.path.split('/')[1]
            handler = version_map.get(version)
            if not handler:
                return JSONResponse(status_code=404, content={"error": "Version not found"})
            return await handler(request, *args, **kwargs)
        return wrapper
    return decorator

@versioned({"v1": list_users_v1, "v2": list_users_v2})
async def list_users(request):
    pass  # versioned decorator routes to specific implementation
```

### Shared Core with Version Adapters

The recommended architecture for scalable URI versioning:

```
src/
├── core/
│   ├── services/
│   │   └── order.service.ts      # Shared business logic
│   ├── models/
│   │   └── order.model.ts         # Internal canonical model
│   └── repositories/
│       └── order.repository.ts    # Shared data access
├── api/
│   ├── v1/
│   │   ├── controllers/
│   │   ├── schemas/              # v1 request/response schemas
│   │   └── adapters/             # v1 ↔ core model adapters
│   ├── v2/
│   │   ├── controllers/
│   │   ├── schemas/
│   │   └── adapters/
│   └── middleware/
│       └── version-router.ts
└── app.ts
```

## Header Versioning

### Custom Request Header

```javascript
// Express header version middleware
function headerVersion(versionMap) {
  return (req, res, next) => {
    const version = req.headers['x-api-version'] || '1';
    const handler = versionMap[version];
    if (!handler) {
      return res.status(400).json({ error: `Unsupported version: ${version}` });
    }
    req.apiVersion = version;
    handler(req, res, next);
  };
}

// Usage
app.get('/users', headerVersion({
  '1': v1UsersController.list,
  '2': v2UsersController.list
}));
```

### Accept Header with Custom Media Types

```python
# FastAPI with Accept header versioning
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

API_VERSIONS = {
    "application/vnd.myapp.v1+json": 1,
    "application/vnd.myapp.v2+json": 2,
    "application/vnd.myapp.v3+json": 3,
}

def get_api_version(request: Request) -> int:
    accept = request.headers.get("accept", "")
    for media_type, version in sorted(API_VERSIONS.items(), key=lambda x: -x[1]):
        if media_type in accept:
            return version
    return 1  # default to latest

@app.get("/users")
async def list_users(request: Request):
    version = get_api_version(request)
    if version == 1:
        return await list_users_v1()
    elif version == 2:
        return await list_users_v2()
```

### Header Versioning with API Gateway

```yaml
# Kong API Gateway configuration
services:
  - name: user-service
    routes:
      - name: users-v1
        paths:
          - /users
        headers:
          X-API-Version: "1"
        service: user-service-v1
      - name: users-v2
        paths:
          - /users
        headers:
          X-API-Version: "2"
        service: user-service-v2
```

### Multi-Header Strategy

Combine version headers with other context headers for fine-grained routing:

```
X-API-Version: 2
X-API-Minor: 5
X-API-Patch: 1
X-API-Breaking: false
X-API-Date: 2025-06-15
```

This allows granular version control without changing the major version. Only use this pattern for internal APIs with sophisticated clients.

## Content Negotiation Versioning

### Full Implementation

```python
# Content negotiation with Flask
from flask import Flask, request, jsonify
from enum import Enum

app = Flask(__name__)

class Version(Enum):
    V1 = "v1"
    V2 = "v2"

MEDIA_TYPE_MAP = {
    "application/vnd.myapp.user.v1+json": Version.V1,
    "application/vnd.myapp.user.v2+json": Version.V2,
}

def resolve_version():
    accept = request.headers.get("Accept", "")
    best_type = request.accept_mimetypes.best_match(MEDIA_TYPE_MAP.keys())
    return MEDIA_TYPE_MAP.get(best_type, Version.V2)

@app.route("/users", methods=["GET"])
def list_users():
    version = resolve_version()
    if version == Version.V1:
        return jsonify(users_v1())
    return jsonify(users_v2())
```

### Vendor-Specific Media Types

Standard format: `application/vnd.{vendor}.{resource}.{version}+{format}`

- `application/vnd.myapp.users.v1+json`
- `application/vnd.myapp.orders.v2+xml`
- `application/vnd.myapp.products.v1+json`

The version can be specified as:
- Sequential: `v1`, `v2`, `v3`
- Semantic: `v1.0`, `v2.5` (major.minor)
- Date-based: `v2025-01-01`, `v2025-06-15`

### Content Negotiation with Quality Values

Clients can specify quality values to indicate preference:

```
Accept: application/vnd.myapp.v2+json;q=0.9, application/vnd.myapp.v1+json;q=0.5
```

The server uses quality values to determine the best representation when multiple versions are acceptable.

## Query Parameter Versioning

### Implementation

```javascript
// Express query param versioning
app.get('/users', (req, res) => {
  const version = parseInt(req.query.version) || 1;
  switch (version) {
    case 1:
      return v1UsersController.list(req, res);
    case 2:
      return v2UsersController.list(req, res);
    default:
      return res.status(400).json({ error: 'Invalid version' });
  }
});
```

### Hybrid Approaches

Combine query parameter with default version fallback:

```javascript
app.get('/users', (req, res) => {
  const version = req.query.version || req.headers['x-api-version'] || 'latest';
  // Try query param first, then header, then default to latest
});
```

## Kubernetes-Based Version Routing

### Ingress with Path-Based Routing

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: api-v1-service
            port:
              number: 80
      - path: /v2
        pathType: Prefix
        backend:
          service:
            name: api-v2-service
            port:
              number: 80
```

### Service Mesh Version Routing (Istio)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-versions
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - uri:
        prefix: /v1
    route:
    - destination:
        host: api-service
        subset: v1
  - match:
    - uri:
        prefix: /v2
    route:
    - destination:
        host: api-service
        subset: v2
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-versions
spec:
  host: api-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Database Schema Versioning for APIs

### Multiple Table Versions

```sql
-- v1 table structure
CREATE TABLE orders_v1 (
    id UUID PRIMARY KEY,
    customer_name VARCHAR(255),
    total DECIMAL(10,2),
    status VARCHAR(50)
);

-- v2 table structure (different schema)
CREATE TABLE orders_v2 (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    subtotal DECIMAL(10,2),
    tax DECIMAL(10,2),
    shipping DECIMAL(10,2),
    total DECIMAL(10,2),
    currency VARCHAR(3),
    status VARCHAR(50),
    items JSONB,
    created_at TIMESTAMPTZ
);
```

### Canonical View with Versioned Projections

```sql
-- Canonical table (internal)
CREATE TABLE orders_canonical (
    id UUID PRIMARY KEY,
    data JSONB NOT NULL,  -- full data in canonical format
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- v1 view (projection from canonical)
CREATE VIEW orders_v1 AS
SELECT
    id,
    data->>'customer_name' AS customer_name,
    (data->>'total')::DECIMAL AS total,
    data->>'status' AS status
FROM orders_canonical;

-- v2 view
CREATE VIEW orders_v2 AS
SELECT
    id,
    data->>'customer_id' AS customer_id,
    (data->>'subtotal')::DECIMAL AS subtotal,
    (data->>'total')::DECIMAL AS total,
    data->>'currency' AS currency,
    data->>'status' AS status
FROM orders_canonical;
```

## API Gateway Version Strategies

### Kong Gateway

```yaml
# Kong declarative config
_format_version: "3.0"
services:
- name: user-service-v1
  url: http://user-service-v1:8080
  routes:
  - name: users-v1
    paths:
    - /v1/users
- name: user-service-v2
  url: http://user-service-v2:8080
  routes:
  - name: users-v2
    paths:
    - /v2/users

plugins:
- name: request-transformer
  config:
    add:
      headers:
      - X-API-Version-Requested:{path[1]}
```

### AWS API Gateway

```yaml
# SAM template with versioned resources
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ApiGateway:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: versioned-api

  V1Resource:
    Type: AWS::ApiGateway::Resource
    Properties:
      ParentId: !GetAtt ApiGateway.RootResourceId
      PathPart: v1
      RestApiId: !Ref ApiGateway

  V2Resource:
    Type: AWS::ApiGateway::Resource
    Properties:
      ParentId: !GetAtt ApiGateway.RootResourceId
      PathPart: v2
      RestApiId: !Ref ApiGateway

  V1UsersProxy:
    Type: AWS::ApiGateway::Resource
    Properties:
      ParentId: !Ref V1Resource
      PathPart: users
      RestApiId: !Ref ApiGateway

  V1UsersLambda:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: users-v1-handler
      Handler: v1/users.handler
      Runtime: nodejs20.x

  V1UsersMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      HttpMethod: ANY
      ResourceId: !Ref V1UsersProxy
      RestApiId: !Ref ApiGateway
      AuthorizationType: NONE
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${V1UsersLambda.Arn}/invocations
```

## OpenAPI Specification for Versioning

### URI Versioning in OpenAPI

```yaml
openapi: 3.1.0
info:
  title: User API
  version: 2.0.0
  description: |
    Current version: v2
    Deprecated version: v1 (sunset 2026-12-31)

servers:
  - url: https://api.example.com/v2
    description: Current version
  - url: https://api.example.com/v1
    description: Deprecated version
    x-deprecated: true
    x-sunset: "2026-12-31T23:59:59Z"

paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Successful response
```

### Content Negotiation in OpenAPI

```yaml
openapi: 3.1.0
info:
  title: User API
  version: 2.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: Accept
          in: header
          required: true
          schema:
            type: string
            enum:
              - application/vnd.myapp.users.v1+json
              - application/vnd.myapp.users.v2+json
      responses:
        '200':
          description: Successful response
          content:
            application/vnd.myapp.users.v1+json:
              schema:
                $ref: '#/components/schemas/UserV1'
            application/vnd.myapp.users.v2+json:
              schema:
                $ref: '#/components/schemas/UserV2'
```

## Versioning for Different API Styles

### REST API Versioning

Use URI path versioning as default. Keep version in the URL for maximum visibility. Deprecate by removing versions on a schedule.

### GraphQL API Versioning

GraphQL typically avoids versioning by evolving the schema additively. Use deprecation directives on fields:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  oldField: String @deprecated(reason: "Use newField instead. Removed in schema v2.")
  newField: String
}
```

For breaking changes, use schema namespacing or separate endpoints:

```graphql
# Two separate endpoints
POST /v1/graphql
POST /v2/graphql
```

### gRPC API Versioning

gRPC uses package-level versioning:

```protobuf
// v1/user.proto
package user.v1;
service UserService {
  rpc GetUser (GetUserRequest) returns (User);
}

// v2/user.proto
package user.v2;
service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
}
```

gRPC supports protocol-level versioning via the `go-grpc-middleware` version interceptor:

```go
import "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/version"

func main() {
    verInterceptor := version.NewInterceptor(version.Config{
        CurrentVersion:  "2.0.0",
        MinimumAccepted: "1.0.0",
    })
    // Apply to gRPC server
}
```

### WebSocket API Versioning

Version WebSocket connections via the connection URL path:

```
wss://api.example.com/v1/ws/chat
wss://api.example.com/v2/ws/chat
```

Include version in the connection handshake:

```javascript
const ws = new WebSocket('wss://api.example.com/ws/chat');
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'handshake', version: 2 }));
};
```

### Event-Driven API Versioning

For event-driven systems (Kafka, EventBridge), version events using schema registries:

```json
{
  "schemaType": "AVRO",
  "schema": "{\"type\":\"record\",\"name\":\"OrderCreated\",\"fields\":[...]}"
}
```

Avro schema evolution rules: can add fields with defaults, can remove fields with defaults, can change field types only within compatibility rules. Use Confluent Schema Registry with compatibility modes (BACKWARD, FORWARD, FULL, NONE).

## Versioning Strategy Anti-Patterns

### The "No Versioning" Trap

Assuming the API will never break. Every API eventually needs to change. Without versioning, you either never change (stagnation) or break clients (bad).

### The "Always Latest" Anti-Pattern

Forcing all clients to always use the latest version. This breaks clients that can't upgrade immediately. Always support at least one previous version.

### The "Version Everything" Anti-Pattern

Versioning every single endpoint independently. This creates complexity explosion. Version at the API level, not the endpoint level.

### The "Cosmetic Versioning" Anti-Pattern

Bumping version numbers without actually making breaking changes. This trains clients to ignore version changes and ignore migration guides.

### The "Perpetual Beta" Anti-Pattern

Keeping versions in "beta" or "preview" indefinitely. Either commit to a version or remove it. Beta versions should have clear lifespan.

## References and Further Reading

- RFC 7231: HTTP semantics for content negotiation
- RFC 8594: The Sunset HTTP header
- OpenAPI Specification: versioning best practices
- Google API Design Guide: versioning section
- Microsoft REST API Guidelines: versioning section
- Zalando RESTful API Guidelines: versioning rules
