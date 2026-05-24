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

## Workflow

### Step 1: Choose Strategy
| Strategy | Mechanism | Pros | Cons |
|----------|-----------|------|------|
| URI | `/v1/users` | Visible, cache-friendly | URL pollution |
| Header | `X-API-Version: 2` | Clean URLs | Hidden from caches |
| Content-negotiation | `Accept: application/vnd.api+json;version=2` | RESTful | Complex client setup |

### Step 2: Apply URI Versioning (Recommended)
```
GET  /v1/users        -> list v1 shape
GET  /v2/users        -> list v2 shape (migrated)
POST /v1/users        -> create v1 shape
POST /v2/users        -> create v2 shape
```

### Step 3: Add Deprecation Headers
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 23 May 2027 00:00:00 GMT
Link: </v2/users>; rel="successor-version"
```

### Step 4: Handle Breaking Changes
Breaking changes require a new version:
- Removing a field.
- Changing a field type.
- Making a required field optional (actually a consumer break).
- Changing endpoint behavior.
Non-breaking changes can be additive within a version.

### Step 5: Maintain Backward Compatibility
```javascript
// Router maps versions to different controllers
router.use('/v1/orders', v1OrderRoutes);
router.use('/v2/orders', v2OrderRoutes);
```
Or use a translation layer that adapts v2 response to v1 format.

### Step 6: Deprecate and Sunset
1. Announce deprecation with minimum 6 months notice.
2. Keep the old version running for the deprecation period.
3. Monitor usage of deprecated versions.
4. After sunset date, return 410 Gone.

## Rules
- Never remove or change behavior in a non-backward-compatible way without a version bump.
- Support at most 2 active versions simultaneously.
- Every version must have a concrete sunset date from day one.
- Document all breaking changes in a changelog accessible from the API spec.
- Deprecation headers are mandatory on all responses from deprecated versions.
- Internal services can share versions but must version public APIs.
- Never version by date alone — combine with semver or release-based numbering.

## References
- `references/breaking-change-mgmt.md` — Breaking change management workflow
- `references/version-discovery.md` — Content negotiation, version negotiation, sunset/deprecation headers, API changelog
- `references/version-lifecycle.md` — Deprecation policy, sunset headers, migration windows, breaking change windows
- `references/versioning-strategies.md` — Versioning strategy comparison

## Handoff
No artifact produced unless requested.
Next skill: scheduling-cron — schedule background jobs for version migration tasks.
Carry forward: version strategy, active versions, sunset dates.
