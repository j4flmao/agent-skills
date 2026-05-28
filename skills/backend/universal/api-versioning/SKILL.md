---
name: backend-api-versioning
description: >
  Use this skill when the user says 'API versioning', 'version strategy', 'URI versioning', 'header versioning', 'content negotiation', 'accept header', 'breaking change', 'API migration', 'deprecate endpoint', 'sunset endpoint'. This skill manages API version transitions using URI, header, or content-negotiation strategies. Applies to any backend stack. Do NOT use for: database schema versioning, client SDK versioning, or infrastructure versioning.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, api-versioning, deprecation, breaking-changes]
---

# Backend API Versioning

## Purpose
Manage API version transitions without breaking existing clients. Support coexistence of multiple API versions and provide clear deprecation signals.

## Agent Protocol

### Trigger
Exact user phrases: "API versioning", "version strategy", "URI versioning", "header versioning", "content negotiation", "accept header", "breaking change", "API migration", "deprecate endpoint", "sunset endpoint", "version path".

### Input Context
- Current API version and clients.
- Type of breaking change being introduced.
- Number of active consumers and their upgrade cadence.

### Output Artifact
Versioning strategy recommendation or configuration. No file unless requested.

### Response Format
```
Strategy: {URI|Header|Content-negotiation}
Current Version: {v1|v2}
Deprecation Policy: {N versions back|N months}
```

### Completion Criteria
- [ ] Versioning strategy chosen and documented.
- [ ] Current version endpoints are stable.
- [ ] Deprecation headers present on old versions.
- [ ] Sunset date communicated via header or docs.
- [ ] Migration path documented for consumers.

### Max Response Length
3 lines per strategy. 15 lines for full plan.

## Architecture / Decision Trees

### Versioning Strategy Decision Tree

```
Do clients control the URL they call?
├── Yes → URI Path Versioning
├── No → Is content negotiation important?
│   ├── Yes → Content Negotiation (Accept header)
│   └── No → Header Versioning

How many concurrent versions to support?
├── 2 → URI or Header works well
├── 3+ → URI versioning recommended (explicit routing)
└── 1 (always latest) → Not versioning — use additive changes only

Is the API public or internal?
├── Public → URI path (most explicit for external devs)
└── Internal → Header (cleaner, internal tooling can manage)
```

### URI Path Versioning

```
/v1/users       -> v1 implementation
/v2/users       -> v2 implementation
        ^
   version is part of URL path
```

Pros: most explicit, cache-friendly, easy to route, simple to implement, works with any client.
Cons: URL pollution, clients hard-code versions, difficult to maintain parallel code paths.

Best for: public APIs, REST APIs, API gateways, long-lived APIs.

### Header Versioning

```
GET /users
X-API-Version: 2
              ^
     version in custom header
```

Pros: clean URLs, no URL pollution, can be set by clients transparently.
Cons: hidden from caches, harder to test from browser, requires client middleware support.

Best for: internal APIs, mobile app backends, service-to-service communication.

### Content Negotiation (Accept Header)

```
GET /users
Accept: application/vnd.myapp.v2+json
                          ^
              version in media type
```

Pros: RESTful, leverages HTTP content negotiation, clean separation of concerns.
Cons: complex client setup, opaque to non-RESTful tooling, hard to debug.

Best for: hypermedia APIs, REST purists, APIs with multiple representation formats.

### Query Parameter Versioning

```
GET /users?version=2
                ^
     version as query param
```

Pros: simplest to implement, easy to test.
Cons: pollutes query string, easily forgotten, caching issues, not standard.

Best for: early-stage APIs, internal tools, transitional approach.

## Workflow

### Step 1: Choose Strategy
Evaluate based on client control, internal vs external, and number of versions.

| Strategy | Mechanism | Pros | Cons |
|----------|-----------|------|------|
| URI | `/v1/users` | Visible, cache-friendly | URL pollution |
| Header | `X-API-Version: 2` | Clean URLs | Hidden from caches |
| Content-negotiation | `Accept: application/vnd.api+json;version=2` | RESTful | Complex client setup |
| Query param | `?version=2` | Simple to implement | No caching differentiation |

### Step 2: Apply URI Versioning (Recommended for Public APIs)
```
GET  /v1/users        -> list v1 shape
GET  /v2/users        -> list v2 shape (migrated)
POST /v1/users        -> create v1 shape
POST /v2/users        -> create v2 shape
```

Implementation approaches:
- **Router per version**: separate router for each version, routes map to different controllers.
- **Translation layer**: one router translates between versions (v2 internal, v1 response adapted).
- **Code generation**: generate version-specific endpoints from a canonical schema.

### Step 3: Add Deprecation Headers
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 23 May 2027 00:00:00 GMT
Link: </v2/users>; rel="successor-version"
```

Every response from a deprecated version must include these headers. The `Sunset` header gives clients a hard deadline. The `Link` header provides the migration path.

### Step 4: Handle Breaking Changes
Breaking changes require a new version:
- Removing a required field from response.
- Changing a field type (string to number, object to array).
- Making a previously required input field optional (can break clients that always sent it).
- Changing endpoint behavior (different sort order, different error codes).
- Renaming fields or endpoints.

Non-breaking changes (additive within a version):
- Adding new optional fields to response.
- Adding new endpoints.
- Adding new optional request parameters.
- Deprecating existing fields (but keeping them).
- Changing response header values (within documented constraints).

### Step 5: Maintain Backward Compatibility
```javascript
// Router maps versions to different controllers
router.use('/v1/orders', v1OrderRoutes);
router.use('/v2/orders', v2OrderRoutes);
```

Or use a translation layer that adapts v2 response to v1 format:
```javascript
function adaptV2ToV1(v2Order) {
  return {
    id: v2Order.id,
    customer_name: v2Order.customer.name,  // flattened in v1
    total: v2Order.total,
    created_at: v2Order.createdAt
  };
}
```

### Step 6: Deprecate and Sunset
1. Announce deprecation with minimum 6 months notice for public APIs (3 months for internal).
2. Set explicit sunset date from day one.
3. Add deprecation headers to all responses from deprecated versions.
4. Keep the old version running for the full deprecation period.
5. Monitor usage metrics on deprecated versions — watch for clients that haven't migrated.
6. Send deprecation notices to known consumers via email/webhook.
7. After sunset date, return 410 Gone with clear error message and migration docs.

### Step 7: Monitor Version Adoption
Track active consumers per version using API analytics. Set alerts when version usage drops below migration targets. Generate weekly adoption reports. Communicate progress to stakeholders.

### Step 8: Internal Version Handling
For internal services, use semver with contract testing. Automate compatibility verification in CI with consumer-driven contract tests (Pact, Spring Cloud Contract). Allow major version bumps with coordinated deployment windows.

## Common Pitfalls

### Pitfall 1: Versioning by Date Alone
Using dates as version identifiers (`/2025-01-01/users`) without semantic meaning. Combine with semver or release-based numbering. Dates help with ordering but don't communicate change magnitude.

### Pitfall 2: Supporting Too Many Versions
Maintaining 3+ concurrent versions creates exponential maintenance burden. Enforce a maximum of 2 active versions. Use sunset dates to retire old versions predictably.

### Pitfall 3: No Deprecation Headers
Failing to inform clients about deprecation leads to surprise breakage. Always include `Deprecation`, `Sunset`, and `Link` headers on deprecated endpoints.

### Pitfall 4: Breaking Changes Without Version Bump
Treating breaking changes as "minor fixes" breaks clients silently. Define breaking changes clearly in API contract. Train teams on what constitutes a breaking change.

### Pitfall 5: Internal APIs Not Versioned
Internal services assume they can change contracts without notice. Apply versioning to internal APIs too, with shorter deprecation windows (1-3 months).

### Pitfall 6: No Migration Documentation
Releasing a new version without migration guide leaves clients stranded. Document every breaking change, provide before/after examples, and include codemods when possible.

### Pitfall 7: Duplicated Business Logic
Copy-pasting entire controllers for each version leads to divergent bugs. Use a shared core with version-specific adapters. Keep business logic in services, not controllers.

## Best Practices

- Choose one strategy and apply it consistently across all endpoints. Mixing strategies confuses clients.
- Document version policy in OpenAPI spec with `deprecated: true` and external docs links.
- Use consumer-driven contracts to detect breaking changes before they reach production.
- Automate version compatibility tests in CI with both old and new client versions.
- Generate changelogs automatically from git commit messages tagged with API version.
- Version your API specification (OpenAPI file) alongside the API itself.
- Use feature flags for gradual rollouts of new endpoint behavior within the same version.
- Keep v1 response adapter code clean and separate from core business logic.
- Set up monitoring dashboards tracking version adoption, error rates by version, and migration progress.
- Establish a formal API review board for breaking change approval.

## Compared With

### URI vs Header Versioning
URI is more explicit and cache-friendly but clutters URLs. Header keeps URLs clean but requires client configuration. Choose URI for public APIs where explicitness matters. Choose Header for internal APIs where URL cleanliness matters.

### URI vs Content Negotiation
Content negotiation is more RESTful and separates representation from resource. URI is simpler and more universally supported. Choose content negotiation for hypermedia APIs. Choose URI for simple REST APIs.

### Header vs Query Parameter
Query parameters are easier to implement but have caching issues. Headers are cleaner but need client support. Choose headers for production APIs. Choose query parameters for transitional or internal APIs.

### Major-Minor-Patch vs Date-Based
Semver communicates change impact clearly but requires discipline. Date-based is simpler but doesn't convey magnitude. Use semver for APIs with formal contracts. Use date-based for continuously evolving APIs.

### Contract Testing vs Integration Testing
Contract testing catches consumer-side impacts of provider changes. Integration testing verifies provider correctness. Use both: contracts for compatibility, integration for correctness.

## Performance Considerations

- URI versioning adds negligible routing overhead — version is just a path segment.
- Header versioning requires parsing the Accept header, which is slightly slower than URI matching.
- Translation layers between versions add latency. Aim for <5ms overhead per translation step.
- Multiple concurrent versions increase memory usage from loaded controllers. Lazy-load version modules on first request.
- Database queries may need version-specific adapters. Use view models that transform the same data differently per version.
- Caching is more effective with URI versioning since each version has its own cache key.
- API gateway version routing is typically sub-millisecond. Offload version routing to the gateway when possible.

## Rules
- Never remove or change behavior in a non-backward-compatible way without a version bump.
- Support at most 2 active versions simultaneously. Exception: notify and get approval for 3.
- Every version must have a concrete sunset date from day one.
- Document all breaking changes in a changelog accessible from the API spec.
- Deprecation headers are mandatory on all responses from deprecated versions.
- Internal services can share versions but must version public APIs.
- Never version by date alone — combine with semver or release-based numbering.
- Breaking changes require a major version bump (semver MAJOR).
- Additive changes within a version are always backward compatible.
- Deprecation period: 6 months minimum for public APIs, 3 months for internal.
- After sunset, return 410 Gone with migration instructions in the response body.
- Monitor version adoption weekly and escalate slow migration to product owners.
- Always include migration guide with new version release.
- Test every version combination in CI with contract tests.
- Log the version used in every request for observability.

## References
- `references/breaking-change-mgmt.md` — Identifying, documenting, and communicating breaking changes
- `references/version-compatibility-testing.md` — Testing strategies for multi-version API compatibility
- `references/version-discovery.md` — How clients discover available versions and their capabilities
- `references/version-lifecycle.md` — Full version lifecycle from proposal to sunset
- `references/version-migration-automation.md` — Automating client migration between API versions
- `references/versioning-strategies.md` — Detailed comparison of URI, header, content-negotiation approaches
- `references/api-versioning-strategies.md` — Comprehensive strategy selection guide with implementation details
- `references/api-migration-deprecation.md` — Migration patterns and deprecation workflows in depth

## Handoff
No artifact produced unless requested.
Next skill: scheduling-cron — schedule background jobs for version migration tasks.
Carry forward: version strategy, active versions, sunset dates.
