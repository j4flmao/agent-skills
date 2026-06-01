# API Versioning Fundamentals

## Why Version

- Backward-incompatible changes require version transitions
- Clients need time to migrate
- Enables parallel running of old and new behavior

## Versioning Strategies

| Strategy | Example | Location | Pros | Cons |
|----------|---------|----------|------|------|
| URI Path | `/v1/users` | URL | Simple, explicit, cacheable | URL pollution, no resource identity |
| Query Param | `/users?version=1` | Query | Simple to implement | Cache unfriendly, easy to forget |
| Header | `Accept: app/vnd.api+json;version=1` | Header | Clean URLs, content negotiation | Complex to test in browser |
| Custom Header | `X-API-Version: 1` | Header | Simple header | Non-standard |
| Hostname | `v1.api.example.com` | DNS | Clear separation | Wildcard certs, DNS complexity |

### Recommendation
- **Public APIs**: URI path (`/v1/`) — simplest for clients
- **Internal APIs**: Header-based — cleaner URLs
- **Mobile APIs**: URI path — easier to hardcode in app

## Breaking Changes

### What Breaks Clients
- Removing a field from response
- Changing field type or format
- Adding required request fields
- Changing error codes
- Changing auth requirements
- Renaming endpoints

### What Does NOT Break Clients (BACKWARDS-COMPATIBLE)
- Adding optional request fields
- Adding new fields to response (tolerant reader)
- Adding new endpoints
- Changing internal implementation
- Performance improvements

## Version Lifecycle

```
v1 (current) → v1 + v2 (coexist) → v2 (current, v1 deprecated) → v2 only
```

### Deprecation Schedule
```
v1 released:  Jan 2024
v2 released:  Jul 2024 (v1 deprecated)
v1 warnings:  Jul 2024 — Jan 2025 (Sunset header, warning logs)
v1 EOL:       Jul 2025 (v1 removed)
```

Total migration window: 12 months for public APIs, 6 months for internal.

## API Version Status Headers

```http
GET /v1/users/123 HTTP/1.1
---
200 OK
Sunset: Sat, 01 Jul 2025 00:00:00 GMT
Deprecation: true
Link: </v2/users/123>; rel="version"; type="application/vnd.api+json;version=2"
```

## Minimum Viable Versioning

For early-stage APIs:
```typescript
// Single version, no breaking changes without notice
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// When v2 is stable, make it default
app.use('/api', (req, res, next) => {
  // Redirect /api to /api/v2
  req.url = `/api/v2${req.url}`;
  next();
});
```
