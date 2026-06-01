# API Versioning Multi-Protocol

## Challenge

Different API protocols have different versioning mechanisms. A multi-protocol API needs consistent versioning across REST, GraphQL, gRPC, and WebSocket.

## Version Mapping

| Protocol | Version Mechanism | BFF Translation |
|----------|------------------|-----------------|
| REST | URI path (`/v1/`) | Passthrough |
| GraphQL | Schema tag/directive | BFF rewrites schema per version |
| gRPC | Package name (`users.v1`) | BFF proxies to correct service |
| WebSocket | Connection URL (`/v1/ws`) | BFF routes to correct handler |

## GraphQL + REST Versioning

```typescript
class MultiProtocolGateway {
  async handleRequest(req: Request, res: Response): Promise<void> {
    const version = resolveVersion(req);
    const protocol = detectProtocol(req);

    switch (protocol) {
      case 'rest':
        return this.routeRest(req, res, version);
      case 'graphql':
        return this.routeGraphQL(req, res, version);
      case 'grpc':
        return this.routeGRPC(req, res, version);
    }
  }

  private async routeGraphQL(req: Request, res: Response, version: string) {
    const schema = version === 'v2' ? schemaV2 : schemaV1;
    const response = await graphql({
      schema,
      source: req.body.query,
      variableValues: req.body.variables,
    });
    res.json(response);
  }
}
```

## gRPC Versioning

```protobuf
// users/v1/users.proto
package users.v1;
service Users {
  rpc GetUser (GetUserRequest) returns (UserV1);
}
message UserV1 {
  string id = 1;
  string first_name = 2;
  string last_name = 3;
}

// users/v2/users.proto
package users.v2;
service Users {
  rpc GetUser (GetUserRequest) returns (UserV2);
}
message UserV2 {
  string id = 1;
  string full_name = 2;
}
```

## Version Discovery

```http
# Clients discover available versions
GET /api/versions HTTP/1.1

{
  "versions": {
    "v1": {
      "status": "deprecated",
      "sunset": "2025-07-01T00:00:00Z",
      "migration": "/api/v2/users"
    },
    "v2": {
      "status": "current",
      "latest": true,
      "docs": "https://docs.example.com/api/v2"
    }
  },
  "protocols": ["rest", "graphql", "grpc", "websocket"]
}
```

## Consistent Sunset Policy

```
All protocols share the same sunset date for a given version:

Version v1 sunset: July 1, 2025
  - REST /v1/ → returns Deprecation header
  - GraphQL @version(v1) → returned in deprecationErrors
  - gRPC users.v1 → returns warning in response trailer
  - WebSocket /v1/ws → sends deprecation notice on connect
```
