# gRPC vs REST

## Comparison Table

| Feature | gRPC | REST |
|---------|------|------|
| Protocol | HTTP/2 | HTTP/1.1 or HTTP/2 |
| Payload | Protobuf (binary) | JSON / XML / text |
| Schema | Required (.proto) | Optional (OpenAPI) |
| Streaming | Native (unary, server, client, bidi) | Polling / SSE / WebSocket |
| Code gen | Built-in (protoc) | Manual or OpenAPI generators |
| Browser support | No (needs gRPC-web) | Native |
| Human-readable | No (binary) | Yes (JSON) |
| Performance | 5-10x faster | Baseline |
| Payload size | ~30% of JSON | Baseline |
| Tooling | Limited debugging | Rich (curl, Postman, browsers) |
| Caching | Not natively cacheable | HTTP caching (ETag, Cache-Control) |
| Cancelation | Built-in (context) | Requires polling endpoint |
| Load balancing | L7 (requires proxy awareness) | Standard L7 |

## When to Use gRPC

### Strong fit:
- Internal microservice-to-microservice communication
- High-throughput / low-latency systems
- Streaming data (real-time events, logs, metrics, chat)
- Polyglot environments (code gen for 11+ languages)
- Mobile backends (smaller payload = less battery/data)

### Weak fit:
- Public-facing APIs consumed by browsers
- Simple CRUD services where REST is sufficient
- Teams without protobuf expertise
- Services that benefit from HTTP caching

## When to Use REST

### Strong fit:
- Public web APIs
- Simple CRUD services
- Teams that prioritize debuggability over performance
- Services that need HTTP caching (CDN, browser cache)

### Weak fit:
- Real-time streaming
- Low-latency internal communication
- High-throughput data pipelines

## Hybrid Approach
```
External (public): REST/JSON — browsers, mobile, third-party integrations
Internal (services): gRPC — fast, typed, streaming between backend services

API Gateway:
  External request → REST → API Gateway → gRPC → Internal service
```

## Migration Path: REST → gRPC
1. Define protobuf schemas matching existing REST resources.
2. Implement gRPC alongside REST (dual-serving).
3. Internal services migrate to gRPC first.
4. API gateway translates external REST to internal gRPC.
5. Deprecate REST for internal consumers.
