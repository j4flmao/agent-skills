# API Migration and Deprecation

## Overview

API migration is the process of transitioning clients from one API version to another. Deprecation is the mechanism for signaling that a version is being phased out. This reference covers full lifecycle management, migration strategies, deprecation workflows, communication templates, and tooling for automating the transition.

## API Version Lifecycle

### Lifecycle Stages

```
Proposal → Preview → Active → Deprecated → Sunset → Retired
    |          |         |           |          |         |
    |          |         |           |          |         +-- 410 Gone
    |          |         |           |          +-- Returns 410
    |          |         |           +-- Deprecation headers
    |          |         +-- Stable contract
    |          +-- Feedback period
    +-- Design review
```

### Stage Definitions

**Proposal**: API change is designed and reviewed. No code exists. Duration: 1-4 weeks.
**Preview**: New version is available for testing. Not for production use. Duration: 2-8 weeks.
**Active**: Stable version with full support. All clients should target active versions.
**Deprecated**: Version is still functional but will be removed. Deprecation headers added. Duration: 6-12 months (public), 1-3 months (internal).
**Sunset**: Version is turned off. Requests return 410 Gone. Maintain redirects or documentation links for 6 months after sunset.
**Retired**: Version is completely removed. No code, no redirects.

### Gate Criteria for Each Stage

**Proposal to Preview**:
- Breaking change documentation complete.
- Migration guide written.
- Test suite covering both old and new behavior.
- Performance benchmarks show acceptable overhead.

**Preview to Active**:
- Feedback from preview period incorporated.
- Client migration tools verified with at least 2 early adopters.
- Monitoring dashboards for new version ready.
- Support team trained on new version.

**Active to Deprecated**:
- Newer version is stable and adopted by >50% of clients.
- Deprecation announcement sent to all known consumers.
- Migration guide updated with all edge cases.
- Sunset date set (minimum 6 months out).

**Deprecated to Sunset**:
- All known consumers migrated or acknowledged.
- Usage of deprecated version below threshold (<1% of traffic).
- Stakeholder approval obtained.
- Runbook for sunset execution prepared.

## Migration Strategies

### Strategy A: Parallel Run (Recommended)

Both old and new versions run simultaneously. Clients migrate at their own pace.

```
Timeline:
Month 0: New version released alongside existing version
Month 1-5: Clients migrate gradually
Month 6: Old version usage monitored
Month 7: Deprecation announced if usage is low
Month 13: Old version sunset
```

Implementation considerations:
- Run separate deployments for each version or use feature flags.
- Shared database with version-aware queries or separate databases per version.
- Monitoring tracks per-version error rates, latency, and usage.
- Load balancing distributes traffic proportionally.

### Strategy B: Strangler Fig

Incrementally replace old endpoints with new ones. Clients are unaware of the migration.

```
Original: /orders -> monolithic controller
Step 1:   /orders/status -> new service
Step 2:   /orders/create -> new service  
Step 3:   /orders/{id} -> new service
Final:    /orders -> fully migrated to new service
```

Implementation:
```javascript
// Strangler Fig middleware
const stranglerFig = {
  '/orders': {
    '/status': newService.handleStatus,
    '/create': newService.handleCreate,
    '/*': oldService.handleAny
  }
};

app.use('/orders', (req, res, next) => {
  const path = req.path;
  const route = findMatchingRoute(stranglerFig['/orders'], path);
  if (route) {
    return route(req, res);
  }
  next();
});
```

### Strategy C: API Gateway Translation

API gateway transforms requests/responses between versions transparently.

```yaml
# Kong transformation plugin
plugins:
- name: request-transformer
  config:
    remove:
      headers:
      - X-Deprecated-Field
    add:
      headers:
      - X-New-Header: true
    append:
      body:
      - $: '{"new_field": "default_value"}'
```

### Strategy D: Consumer-Driven Contracts

Clients publish their API usage expectations. The provider uses these to detect breaking changes before deployment.

```javascript
// Pact consumer test
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');

const provider = new PactV3({
  consumer: 'OrderWebApp',
  provider: 'OrderService',
});

describe('Order Service contract', () => {
  it('returns order by ID', async () => {
    await provider
      .given('an order exists')
      .uponReceiving('a request for an order')
      .withRequest({
        method: 'GET',
        path: '/v1/orders/123',
        headers: { Accept: 'application/json' }
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: MatchersV3.like({
          id: '123',
          customer_name: 'Acme Corp',
          total: 250.00
        })
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/v1/orders/123`);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('customer_name');
    });
  });
});
```

### Strategy E: Feature Flags for API Changes

Use feature flags to roll out API changes gradually within the same version.

```javascript
// LaunchDarkly-style feature flag for API version behavior
function getHandler(endpoint, version) {
  if (flagV2Enabled && version === 2) {
    return v2Handlers[endpoint];
  }
  return v1Handlers[endpoint];
}

// Gradually increase rollout percentage
app.use('/api', (req, res, next) => {
  const userPercentile = hash(req.headers['x-user-id']) % 100;
  const rolloutPercent = await getFlagValue('api-v2-rollout', { default: 0 });
  
  if (userPercentile < rolloutPercent) {
    req.apiVersion = 2;
  } else {
    req.apiVersion = 1;
  }
  next();
});
```

## Deprecation Workflow

### Step-by-Step Deprecation Process

**Step 1: Audit and Decide**
- Review all endpoints in the version to be deprecated.
- Identify breaking changes and migration requirements.
- Confirm business need for deprecation (cost savings, technical debt, new capabilities).
- Get stakeholder approval.

**Step 2: Announce Deprecation**
- Send announcement to all known consumers via email.
- Update API documentation with deprecation notice.
- Add deprecation warning to API response headers.
- Post to developer portal/changelog.

**Step 3: Enable Monitoring**
- Track usage of deprecated endpoints by consumer.
- Set up alerts for high-traffic consumers that haven't migrated.
- Monitor error rates on deprecated vs new endpoints.

**Step 4: Migrate Consumers**
- Reach out to high-volume consumers individually.
- Provide migration support (office hours, dedicated Slack channel).
- Offer automated migration tools when possible.
- Set internal deadlines for migration completion.

**Step 5: Enforce Deprecation**
- Increase deprecation warning severity over time (info → warn → error in headers).
- Add response delay to deprecated endpoints (gradual QoS degradation).
- Restrict deprecated endpoint rate limits.
- Return 410 Gone on the sunset date.

**Step 6: Verify and Retire**
- Monitor for 30 days after sunset for any lingering consumers.
- Remove deprecated code and tests.
- Archive migration documentation.
- Conduct post-mortem on the process.

### Deprecation Header Specification

HTTP deprecation headers follow RFC recommendations:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 23 May 2027 00:00:00 GMT
Link: </v2/users>; rel="successor-version"
Deprecation-Notice: "This version will be removed on 2027-05-23. Migrate to /v2/users before this date."
```

Header details:

**Deprecation**: Boolean indicating the response comes from a deprecated version. Some implementations use a date instead: `Deprecation: Sat, 23 May 2026`.

**Sunset**: RFC 8594. The date and time when the API version will be removed. Must be in HTTP-date format (RFC 7231).

**Link**: Points to the successor version. Use `rel="successor-version"` or `rel="latest-version"`.

**Deprecation-Notice**: Human-readable deprecation notice. Optional but recommended for developer experience.

Implementation in middleware:

```javascript
// Express deprecation middleware
function deprecationMiddleware(options = {}) {
  const {
    sunsetDate = 'Sat, 23 May 2027 00:00:00 GMT',
    successorPath = '/v2',
    warningPercentage = 0.01,  // add latency to 1% of requests
  } = options;

  return (req, res, next) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', sunsetDate);
    res.set('Link', `<${successorPath}>; rel="successor-version"`);

    // Gradually add latency to encourage migration
    if (Math.random() < warningPercentage) {
      const delay = 100 + Math.random() * 400; // 100-500ms added latency
      setTimeout(next, delay);
    } else {
      next();
    }
  };
}
```

### Deprecation Notice Templates

**Email Template for Consumer Notification**:

```
Subject: Important: Deprecation of API v1 — Migrate to v2 by [Sunset Date]

Hello [Consumer Name],

This is a notification that [API Name] version 1 (v1) will be deprecated 
on [Sunset Date]. After this date, v1 endpoints will return HTTP 410 Gone 
and will no longer be functional.

What's changing:
- [List of breaking changes between v1 and v2]
- [Migration steps]

Migration path:
1. Update your API endpoint from /v1/[resource] to /v2/[resource]
2. Review the changes in [link to migration guide]
3. [Additional steps]

We recommend completing migration by [recommended date] to avoid service 
disruption.

Resources:
- Migration Guide: [URL]
- Changelog: [URL]
- Support: [email/Slack]

Thank you,
[API Team]
```

**Slack/Teams Message Template**:

```
[API Name] v1 deprecation notice

Version 1 of the [API Name] API is deprecated and will be sunset on [Date].

Action required: Migrate to v2 before [Date].

Migration guide: [URL]
Breaking changes: [URL]

Current v1 usage: [N requests/day from your service]
Last active: [date]

Please reply to this thread with questions or to request migration support.
```

### Deprecation Response Enhancement

Progressive deprecation with increasing severity:

```javascript
class DeprecationManager {
  constructor(version, sunsetDate) {
    this.version = version;
    this.sunsetDate = new Date(sunsetDate);
    this.severity = this.calculateSeverity();
  }

  calculateSeverity() {
    const daysUntilSunset = Math.ceil(
      (this.sunsetDate - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilSunset > 180) return 'info';
    if (daysUntilSunset > 90) return 'notice';
    if (daysUntilSunset > 30) return 'warning';
    if (daysUntilSunset > 0) return 'critical';
    return 'expired';
  }

  enhanceResponse(res) {
    res.set('Deprecation', 'true');
    res.set('Sunset', this.sunsetDate.toUTCString());
    res.set('Deprecation-Severity', this.severity);

    switch (this.severity) {
      case 'warning':
        res.set('Deprecation-Notice', `Deprecation warning: less than 30 days remaining`);
        break;
      case 'critical':
        res.set('Deprecation-Notice', `Critical: API will be removed in less than 30 days`);
        break;
      case 'expired':
        res.status(410).json({
          error: 'gone',
          message: 'This API version is no longer available. Please migrate to the current version.',
          documentation: 'https://docs.example.com/migration'
        });
        break;
    }
  }
}
```

### Deprecation via API Gateway

```yaml
# Kong deprecation plugin (custom)
plugins:
- name: deprecation-notice
  config:
    sunset_date: "2027-05-23T00:00:00Z"
    successor_url: "https://api.example.com/v2"
    notice: "This API version is deprecated. Please migrate to v2."
    severity_header: true
    latency_increase:
      enabled: true
      after_date: "2026-11-23"  # 6 months before sunset
      max_delay_ms: 2000
    rate_limit_reduction:
      enabled: true
      after_date: "2027-02-23"  # 3 months before sunset
      multiplier: 0.25           # reduce limit to 25%
```

## Automated Migration Tooling

### API Transformation Proxy

A proxy that transforms old requests to new format and converts responses back:

```javascript
class MigrationProxy {
  constructor(newApiUrl) {
    this.newApiUrl = newApiUrl;
  }

  async handle(req, res) {
    // Transform old request to new request format
    const newReqBody = this.transformRequestBody(req.body, req.version);
    
    // Forward to new API
    const newResponse = await fetch(`${this.newApiUrl}${req.path}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReqBody)
    });
    
    const newData = await newResponse.json();
    
    // Transform new response back to old format
    const oldResponse = this.transformResponseBody(newData, req.version);
    
    res.status(newResponse.status).json(oldResponse);
  }

  transformRequestBody(body, fromVersion) {
    // Convert v1 create request to v2 format
    return {
      customer: { id: body.customerId, name: body.customerName },
      items: body.products.map(p => ({
        productId: p.id,
        quantity: p.qty
      })),
      shipping: {
        address: body.shippingAddress,
        method: body.shippingMethod || 'standard'
      }
    };
  }

  transformResponseBody(body, toVersion) {
    // Convert v2 response to v1 format
    return {
      id: body.id,
      customerName: body.customer.name,
      total: body.total,
      status: body.status,
      products: body.items.map(i => ({
        id: i.productId,
        name: i.productName,
        qty: i.quantity
      }))
    };
  }
}

// Usage
const proxy = new MigrationProxy('http://api-v2.internal:8080');
app.post('/v1/orders', (req, res) => proxy.handle(req, res));
```

### Codemod for Client Migration

Provide automated code transformation for JavaScript/TypeScript clients:

```javascript
// codemod.js — usage: npx jscodeshift -t codemod.js src/
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Replace v1 API calls with v2
  root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: { name: 'fetch' }
    }
  }).forEach(path => {
    const args = path.node.arguments;
    if (args.length > 0 && args[0].type === 'Literal') {
      const url = args[0].value;
      if (url.includes('/v1/')) {
        args[0] = j.literal(url.replace('/v1/', '/v2/'));
      }
    }
  });

  // Update response field access
  root.find(j.MemberExpression, {
    property: { name: 'customerName' }
  }).forEach(path => {
    path.node.property = j.identifier('customer.name');
  });

  return root.toSource();
}
```

### Consumer Identification Middleware

Identify and track consumers for deprecation communication:

```javascript
function consumerTracking(options = {}) {
  const {
    headerName = 'x-api-key',   // or 'x-consumer-id'
    trackingDB = new Map(),
    onDiscovered = (consumer) => {}
  } = options;

  return (req, res, next) => {
    const consumerId = req.headers[headerName] 
      || req.ip 
      || req.headers['user-agent'];
    
    if (!trackingDB.has(consumerId)) {
      const consumer = {
        id: consumerId,
        firstSeen: new Date(),
        lastSeen: new Date(),
        endpoints: new Set(),
        versions: new Set(),
        contactEmail: null,
        userAgent: req.headers['user-agent']
      };
      trackingDB.set(consumerId, consumer);
      onDiscovered(consumer);
    }

    const consumer = trackingDB.get(consumerId);
    consumer.lastSeen = new Date();
    consumer.endpoints.add(req.path);
    consumer.versions.add(req.headers['x-api-version'] || '1');

    req.consumer = consumer;
    next();
  };
}

// Generate deprecation email list from tracking data
function generateDeprecationList(trackingDB, deprecatedVersion) {
  const affectedConsumers = [];
  
  for (const [id, consumer] of trackingDB) {
    if (consumer.versions.has(deprecatedVersion) && consumer.contactEmail) {
      affectedConsumers.push({
        email: consumer.contactEmail,
        consumerId: id,
        lastActive: consumer.lastSeen,
        endpointsUsed: [...consumer.endpoints],
        requestCount: consumer.requestCount
      });
    }
  }

  return affectedConsumers.sort((a, b) => b.requestCount - a.requestCount);
}
```

## Migration Runbook Template

### Pre-Migration Checklist

- [ ] Migration guide reviewed by tech writers
- [ ] All known consumers identified and contacted
- [ ] Early adopter program completed (2+ consumers validated)
- [ ] Performance benchmarks for new version meeting SLAs
- [ ] Rollback plan documented and tested
- [ ] Monitoring dashboards configured for both old and new versions
- [ ] Alert thresholds set for error rate increases
- [ ] Support team trained on new version
- [ ] Internal stakeholders briefed on timeline

### Migration Execution Steps

1. Deploy new version to staging environment.
2. Run smoke tests against new version.
3. Run contract tests against new version.
4. Deploy new version to production (5% traffic initially).
5. Monitor for 24 hours — error rates, latency, usage patterns.
6. Increase traffic to 25% if no issues.
7. Monitor for 48 hours.
8. Increase traffic to 50%.
9. Monitor for 1 week.
10. Increase traffic to 100%.
11. Monitor for 2 weeks.
12. Announce old version deprecation.
13. Execute deprecation timeline.

### Rollback Checklist

- [ ] Revert DNS/gateway routing to old version.
- [ ] Verify old version is operational.
- [ ] Check data consistency (no partial migrations).
- [ ] Notify stakeholders of rollback.
- [ ] Document root cause.
- [ ] Schedule remediation.

## Communication Templates

### Migration Guide Structure

```
# Migrating from v1 to v2

## Overview
[Brief description of why this migration is needed]

## Timeline
- v1 deprecation announced: [Date]
- v1 sunset date: [Date]
- Recommended migration completion: [Date]

## Breaking Changes
### Change 1: [Name]
- **Old behavior**: [description]
- **New behavior**: [description]
- **Impact**: [who is affected]
- **Migration**: [steps to update]

## Request Migration
### Change in request body
Old:
```json
{"customer_name": "Acme Corp"}
```
New:
```json
{"customer": {"name": "Acme Corp"}}
```

## Response Migration
### Change in response shape
Old:
```json
{"customer_name": "Acme Corp", "order_total": 250.00}
```
New:
```json
{"customer": {"name": "Acme Corp"}, "total": {"amount": 250.00, "currency": "USD"}}
```

## Migration Script
[Link to automated migration script or codemod]

## Frequently Asked Questions
### Q: What if I can't migrate before the sunset date?
[Answer with exception process]

## Support
- Documentation: [URL]
- Migration support: [Slack channel]
- Office hours: [schedule]
```

## Monitoring and Metrics

### Key Migration Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| v1 requests/day | Total requests to deprecated version | Trending to 0 |
| v2 adoption rate | % of traffic on new version | >90% before v1 sunset |
| Migration completion | % of known consumers migrated | 100% |
| v1/v2 error rate delta | Error rate difference between versions | <0.5% |
| v1/v2 latency delta | p95 latency difference | <100ms |
| Consumer last active | Days since consumer last called v1 | <30 days |
| Migration support tickets | Number of migration-related issues | <5 per month |

### Monitoring Dashboard Queries

```sql
-- Usage by version (PostgreSQL + TimescaleDB)
SELECT
  time_bucket('1 day', timestamp) AS day,
  version,
  count(*) AS request_count,
  count(DISTINCT api_key) AS unique_consumers
FROM api_requests
WHERE timestamp > now() - interval '90 days'
GROUP BY day, version
ORDER BY day DESC;

-- Consumer migration status
SELECT
  api_key,
  consumer_name,
  max(CASE WHEN version = 'v1' THEN timestamp END) AS last_v1_use,
  max(CASE WHEN version = 'v2' THEN timestamp END) AS last_v2_use,
  count(CASE WHEN version = 'v1' THEN 1 END) AS v1_requests_30d,
  count(CASE WHEN version = 'v2' THEN 1 END) AS v2_requests_30d
FROM api_requests
WHERE timestamp > now() - interval '30 days'
GROUP BY api_key, consumer_name
HAVING count(CASE WHEN version = 'v1' THEN 1 END) > 0
ORDER BY last_v1_use DESC;
```

```javascript
// Prometheus metrics for version tracking
const prometheus = require('prom-client');

const versionRequestsCounter = new prometheus.Counter({
  name: 'api_requests_by_version_total',
  help: 'Total API requests by version',
  labelNames: ['version', 'endpoint', 'method', 'status']
});

const versionConsumerGauge = new prometheus.Gauge({
  name: 'api_active_consumers_by_version',
  help: 'Number of active consumers per version',
  labelNames: ['version']
});

const versionLatencyHistogram = new prometheus.Histogram({
  name: 'api_request_duration_seconds_by_version',
  help: 'Request latency by API version',
  labelNames: ['version'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});
```

## Legal and Compliance Considerations

### Contractual Obligations

- Enterprise agreements may require 12+ months deprecation notice.
- Government contracts may have specific API stability requirements.
- SLA terms may guarantee version availability for a minimum period.
- Some regulated industries require documented deprecation plans.

### Compliance Documentation

- Maintain deprecation decision log with rationale and approval.
- Archive all deprecation communications with timestamps.
- Document consumer migration status for audit purposes.
- Keep old version code in source control even after removal (for forensic analysis).

## Post-Migration Review

Conduct a review 30 days after sunset completion:

1. Were there any consumers who broke unexpectedly? Why?
2. How effective was the communication strategy?
3. Did the migration timeline need adjustment? Why?
4. What would improve the next migration?
5. Update the deprecation process documentation based on lessons learned.
6. Archive all migration-related artifacts.

## Tools and Automation

### Migration Automation Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| jscodeshift | Code transformation for JS/TS clients | npm |
| Pact | Consumer-driven contract testing | CI pipeline |
| API Changelog Generator | Auto-generate changelog from diff | GitHub Actions |
| Deprecation Header Middleware | Add deprecation headers | Express/Koa middleware |
| Consumer Tracking DB | Monitor consumer migration progress | SQL/NoSQL |
| Migration Proxy | Transparent request/response transformation | Reverse proxy |
| Feature Flags | Gradual rollout of API changes | LaunchDarkly/Split |
| API Gateway Version Router | Route requests to appropriate version | Kong/AWS/Ambassador |
