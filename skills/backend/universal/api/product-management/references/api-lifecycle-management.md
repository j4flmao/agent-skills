# API Lifecycle Management

## Lifecycle Stages

### Stage Model
```
Idea → Design → Development → Testing → Release → GA → Deprecation → Sunset
         ↑            |                                              |
         └────────────┴────────── Feedback loop ─────────────────────┘
```

### Stage Gates

| Stage | Entry Criteria | Exit Criteria | Artifacts |
|-------|---------------|---------------|-----------|
| Idea | Problem statement | Approved RFC | RFC document |
| Design | Approved RFC | Reviewed spec | OpenAPI spec |
| Development | Reviewed spec | Passed code review | Implementation |
| Testing | Implementation | All tests pass | Test report |
| Release | QA sign-off | Canary OK | Release notes |
| GA | Production stable | SLO met | Launch post |
| Deprecation | Replacement ready | Migration plan | Migration guide |
| Sunset | All traffic migrated | Zero usage | Archive |

## Versioning Strategy

### URL Versioning
```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

### Header Versioning
```
GET /users
Accept: application/vnd.example.v2+json
```

### Query Parameter Versioning
```
GET /users?version=2
```

### Version Selection Guide

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| URL | Explicit, cacheable | URL duplication | Major versions |
| Header | Clean URLs | Harder to discover | Media type negotiation |
| Query param | Easy to test | Pollutes URLs | Internal APIs |
| No versioning | Simplest | Breaking changes break all | Private/controlled clients |

### Semantic Versioning for APIs
```
v{major}.{minor}.{patch}

Major: Breaking change — client must modify code
Minor: Backward-compatible addition
Patch: Backward-compatible bug fix
```

### Version Lifecycle Policy
```yaml
version_policy:
  supported_versions:
    - v1: sunset
    - v2: deprecated
    - v3: current
    - v4: beta

  timelines:
    beta_lifetime: 90d
    max_supported_versions: 2
    deprecation_notice: 180d
    sunset_after_deprecation: 90d
```

## Breaking Changes

### What Constitutes Breaking

| Change | Breaking? | Mitigation |
|--------|-----------|------------|
| Remove field | Yes | Deprecate first, remove after notice |
| Rename field | Yes | Add new field, deprecate old |
| Change field type | Yes | Add new field with new type |
| Add required field | Yes | Make optional with default |
| Remove endpoint | Yes | Deprecate, redirect |
| Change error codes | Yes | Add new codes, preserve old |
| Change auth method | Yes | Support both during migration |
| Add optional field | No | Safe additive change |
| Add new endpoint | No | No client impact |
| Relax validation | No | No client impact |

### Additive Changes
```yaml
# v1: Original
paths:
  /users:
    get:
      parameters:
        - name: page
          in: query
          schema: { type: integer }

# v2: Additive (non-breaking)
paths:
  /users:
    get:
      parameters:
        - name: page
          in: query
          schema: { type: integer }
        - name: sort
          in: query
          schema: { type: string, enum: [name, date] }
```

### Deprecation Headers
```http
HTTP/1.1 200 OK
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Deprecated: true
```

```json
{
  "data": { ... },
  "deprecation": {
    "version": "v1",
    "sunset": "2025-12-31",
    "migration": "/docs/migrate-v1-to-v2",
    "alternative": "/v2/users"
  }
}
```

## Migration Planning

### Migration Timeline
```
Month 0:  Announce deprecation of v1
Month 1:  Release v2 GA
Month 2:  Begin migration support
Month 4:  50% traffic on v2 target
Month 6:  v1 enters sunset
Month 7:  Final v1 traffic cutoff
Month 8:  v1 infrastructure decommissioned
```

### Migration Guide Template
```markdown
# v1 to v2 Migration Guide

## Changes
- `/users` response now returns paginated results
- `name` field split into `firstName` and `lastName`
- Authentication now requires Bearer token

## Before (v1)
```json
GET /v1/users
{
  "users": [
    { "id": 1, "name": "John Doe" }
  ]
}
```

## After (v2)
```json
GET /v2/users?page=1&per_page=10
{
  "data": [
    { "id": 1, "firstName": "John", "lastName": "Doe" }
  ],
  "pagination": { "page": 1, "total": 50 }
}
```

## Changelog
- 2025-01-15: v2 released
- 2025-06-01: v1 deprecated
- 2025-12-31: v1 sunset
```

### Automated Migration Tools
```python
class MigrationProxy:
    def __init__(self, v2_url: str):
        self.v2_url = v2_url

    async def handle_migration(self, request: Request):
        if request.headers.get("X-API-Version") == "v2":
            return await self.forward_to_v2(request)

        v1_response = await self.call_v1(request)
        v2_response = await self.call_v2(request)

        if self.detect_migration(request, v1_response, v2_response):
            self.record_migration(request)

        return v1_response

    async def forward_to_v2(self, request: Request):
        v2_path = request.url.path.replace("/v1/", "/v2/")
        return await self.client.get(v2_path, params=request.params)
```

## Release Management

### Release Types

| Type | Frequency | Risk | Process |
|------|-----------|------|---------|
| Major | Quarterly | High | Full regression, staged rollout |
| Minor | Bi-weekly | Medium | Automated tests, canary |
| Patch | As needed | Low | Hotfix, expedited review |
| Beta | Continuous | High | Feature flags, limited audience |

### Release Checklist
```yaml
release_checklist:
  - [ ] All tests pass (unit, integration, contract)
  - [ ] API specification published
  - [ ] Changelog updated
  - [ ] Migration guide written (if breaking)
  - [ ] Deprecation headers added (if sunsetting)
  - [ ] Canary deployment configured
  - [ ] Rollback plan documented
  - [ ] Monitoring dashboards updated
  - [ ] Team notified
  - [ ] Client libraries regenerated
```

### Changelog Format
```markdown
# Changelog

## v2.0.0 (2025-06-15)

### Breaking Changes
- `/users` response now uses paginated format
- `name` field replaced with `firstName` + `lastName`

### Features
- New `/users/{id}/roles` endpoint
- Added sorting support to `/users`

### Deprecations
- v1 API deprecated, sunset 2025-12-31

## v1.2.0 (2025-05-01)

### Features
- Added filtering to `/products` endpoint
```

## Deprecation Policy

### Deprecation Notice Format
```http
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </docs/migration>; rel="deprecation"
```

### Client Notification
```python
class DeprecationNotifier:
    def __init__(self):
        self.notified = set()

    async def check_deprecation(self, request: Request, response: Response):
        client_id = request.headers.get("X-Client-ID")
        version = self.get_api_version(request)

        if (client_id, version) not in self.notified:
            self.notified.add((client_id, version))
            await self.send_notification(client_id, version)

    async def send_notification(self, client_id: str, version: str):
        message = {
            "type": "api_deprecation",
            "version": version,
            "sunset_date": self.get_sunset_date(version),
            "migration_url": self.get_migration_url(version),
        }
        await self.notification_service.send(client_id, message)
```

### Deprecation Dashboard
```sql
SELECT
    client_id,
    api_version,
    COUNT(*) as request_count,
    MAX(last_called) as last_called
FROM api_usage
WHERE deprecated = true
GROUP BY client_id, api_version
ORDER BY request_count DESC;
```

## Sunset Process

### Sunset Checklist
```yaml
sunset_checklist:
  - [ ] All clients migrated (verify zero traffic)
  - [ ] DNS entries removed
  - [ ] Load balancer rules removed
  - [ ] Infrastructure decommissioned
  - [ ] Documentation archived
  - [ ] Monitoring alerts removed
  - [ ] Client libraries deprecated
  - [ ] Team communication sent
```

### Traffic Cutoff
```bash
# Verify zero traffic
curl -s "http://monitor:9090/api/v1/query?query=sum(api_requests{version=\"v1\"})"

# Remove from load balancer
aws elbv2 deregister-targets \
    --target-group-arn arn:aws:elasticloadbalancing:... \
    --targets Id=i-123456789

# Remove DNS
aws route53 change-resource-record-sets \
    --hosted-zone-id Z123456 \
    --change-batch '{
        "Changes": [{
            "Action": "DELETE",
            "ResourceRecordSet": {
                "Name": "api-v1.example.com.",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [{"Value": "lb.example.com"}]
            }
        }]
    }'
```

## Feedback Loop

### Usage Analytics
```python
class UsageAnalytics:
    def track_usage(self, request: Request, response: Response):
        event = {
            "endpoint": request.url.path,
            "method": request.method,
            "version": self.detect_version(request),
            "client_id": request.headers.get("X-Client-ID"),
            "status": response.status_code,
            "latency_ms": response.elapsed_ms,
            "timestamp": datetime.utcnow(),
        }
        self.analytics_client.send(event)
```

### Client Feedback Survey
```python
async def request_feedback(client_id: str, version: str):
    if random.random() < 0.001:  # 0.1% sampling
        await notification_service.send(client_id, {
            "type": "feedback_request",
            "message": f"How is your experience with API {version}?",
            "survey_url": f"https://survey.example.com/api-feedback?v={version}",
        })
```

## Key Points
- APIs progress through Idea → Design → Dev → Test → Release → GA → Deprecation → Sunset
- Breaking changes require deprecation notices with minimum 180-day migration window
- URL versioning is most explicit; header versioning keeps URLs clean
- Additive changes (new fields, endpoints) are always backward-compatible
- Migration guides must provide before/after examples and timelines
- Deprecation headers and client notifications enable smooth transitions
- Sunset requires verified zero traffic before decommissioning
- Usage analytics and feedback surveys inform lifecycle decisions

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with API product management, lifecycle standards, DX principles, and governance models.
-->
