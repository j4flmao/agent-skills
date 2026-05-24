# API Version Lifecycle Reference

## Deprecation Policy

### Version Support Timeline

```yaml
api_version_lifecycle:
  v1:
    introduced: "2023-01-15"
    stable_date: "2023-03-01"
    deprecated_date: "2025-06-01"     # Start deprecation headers
    sunset_date: "2026-06-01"          # End of life — return 410 Gone
    support_duration: "3 years"
    migration_window: "12 months"      # From deprecation to sunset
  
  v2:
    introduced: "2025-01-15"
    stable_date: "2025-03-01"
    deprecated_date: null               # Still active
    sunset_date: null
```

### Deprecation Policy Rules
- **Minimum notice**: 12 months between deprecation and sunset
- **Active versions**: Maximum 2 versions simultaneously (n-1 support)
- **Breaking changes**: Always bump version, never change within a version
- **Security patches**: Apply to last 2 versions for critical CVEs
- **Extension policy**: Enterprise customers can request 6-month extension with SLA

## Sunset Headers

```http
# Response from deprecated version
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 1 Jun 2026 00:00:00 GMT
Link: </v2/users>; rel="successor-version"
Warning: 299 - "This API version will be removed. Migrate to v2."
Content-Type: application/json
```

### Header Reference

| Header | Format | Required | Purpose |
|--------|--------|----------|---------|
| `Deprecation` | `true` | Yes on deprecated versions | Signals version is deprecated |
| `Sunset` | HTTP-date | Yes on deprecated | Tells clients when service ends |
| `Link` | URL + rel="successor-version" | Recommended | Points to replacement |
| `Warning` | `299 - "message"` | Recommended | Human-readable migration message |

```typescript
// Express middleware for deprecation headers
function deprecationMiddleware(deprecatedAt?: Date, sunsetAt?: Date, successorVersion?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (deprecatedAt && new Date() >= deprecatedAt) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', sunsetAt?.toUTCString() || '');
      res.setHeader('Warning', `299 - "This version is deprecated. Migrate to ${successorVersion || 'newer version'}."`);

      if (successorVersion) {
        const successorUrl = `${req.protocol}://${req.hostname}/${successorVersion}${req.path}`;
        res.setHeader('Link', `<${successorUrl}>; rel="successor-version"`);
      }
    }

    // Block if past sunset date
    if (sunsetAt && new Date() >= sunsetAt) {
      return res.status(410).json({
        error: 'gone',
        message: `This API version was sunset on ${sunsetAt.toISOString()}`,
        successorUrl: successorVersion ? `${req.protocol}://${req.hostname}/${successorVersion}${req.path}` : undefined,
      });
    }

    next();
  };
}
```

## Migration Windows

### Staged Migration Plan

```yaml
migration_plan:
  phase_1_announce:
    duration: "Month 1"
    actions:
      - "Publish migration guide"
      - "Email all API key holders"
      - "Add deprecation headers to old version"
      - "Blog post + changelog entry"
    metrics:
      - "Track migration guide page views"
      - "Monitor new client registrations on v2"

  phase_2_coexistence:
    duration: "Months 2-9"
    actions:
      - "Both versions operational"
      - "Monthly migration status updates"
      - "Office hours for migration support"
      - "Automated migration testing"
    metrics:
      - "v1 traffic declining week-over-week"
      - "v2 traffic increasing week-over-week"
      - "Support tickets related to migration"

  phase_3_final_warning:
    duration: "Month 10-11"
    actions:
      - "Escalated warnings on v1 responses"
      - "Direct outreach to remaining consumers"
      - "Offer migration assistance"
    metrics:
      - "Identify consumers still on v1"
      - "Track migration completion per consumer"

  phase_4_sunset:
    duration: "Month 12"
    actions:
      - "Return 410 Gone on v1 endpoints"
      - "Archive v1 code"
      - "Remove v1 from CI/CD"
      - "Final migration report"
```

## Version Sunset Communication

### Email Template
```
Subject: ACTION REQUIRED: API v1 Sunset — Migrate to v2 by June 1, 2026

Hello {consumer_name},

API v1 will be sunset on June 1, 2026 (12 months from today).
After this date, all requests to /v1/* will return 410 Gone.

What you need to do:
1. Review the migration guide: https://docs.example.com/migration-v1-to-v2
2. Update your API client to use /v2/* endpoints
3. Test in your staging environment
4. Deploy to production before June 1, 2026

Key changes:
- /v1/users → /v2/users (response now includes email_verified field)
- /v1/orders → /v2/orders (pagination uses cursor-based, not offset)
- Authentication remains the same (Bearer token)

Need help? Reply to this email or join our migration office hours (Wednesdays, 2pm ET).

Your current v1 usage: ~50,000 requests/day (last 30 days)

Thank you,
API Platform Team
```

## Breaking Change Windows

### Defining Breaking Changes

```yaml
breaking_changes:
  - "Removing a response field"
  - "Changing a field type (string → number)"
  - "Adding a required request field"
  - "Changing endpoint behavior (sort order, filtering logic)"
  - "Removing an endpoint"
  - "Changing authentication requirements"
  - "Changing error codes or format"
  - "Changing rate limit boundaries"

non_breaking_changes:
  - "Adding a new endpoint"
  - "Adding an optional response field"
  - "Adding an optional request parameter"
  - "Extending an enum with new values"
  - "Improving error messages"
  - "Changing documentation"
  - "Adding rate limit headers"
```

### Breaking Change Windows

```yaml
breaking_change_window:
  schedule: "Twice per year"
  windows:
    - "March 1 — March 31 (Q1)"
    - "September 1 — September 30 (Q3)"
  notice: "Minimum 6 months before window"
  process:
    - "Propose change → review with API guild"
    - "Announce with migration guide 6 months ahead"
    - "Release during window"
    - "Coexistence period (old + new) for 3 months"
    - "Remove old behavior after coexistence"
```

## Version Lifecycle Best Practices

- **Document sunset dates**: Every API version has a sunset date from day one
- **Monitor usage**: Track version adoption curves and active consumers
- **Automate migration testing**: CI validates v2 behavior matches v1 documented behavior
- **Grace period**: Enterprise customers can request short extensions
- **Post-sunset data**: Log and analyze 410 responses to identify lingering consumers
- **Celebrate migration**: When v1 traffic drops to zero, celebrate the cleanup
