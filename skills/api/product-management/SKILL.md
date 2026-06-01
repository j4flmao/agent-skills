---
name: api-product-management
description: >
  Use when the user asks about API as product, API product management, API strategy, API monetization, developer portal, API documentation portal, API deprecation, versioning strategy, or API lifecycle management. Do NOT use for: API implementation (backend-api-design), API documentation generation (api-documentation), or technical API specification (backend-openapi-documentation).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [api, product-management, phase-3]
---

# API Product Management

## Purpose
Manage APIs as products: define API product strategy, design developer experience, manage API lifecycle, implement API monetization, build developer portals that drive adoption, and use API analytics to inform product decisions.

## Workflow

### API Product Lifecycle
```
Strategy → Design → Build → Publish → Promote → Monitor → Iterate
                                                          ↓
                                                    Deprecate → Retire
```

### API Product Strategy Framework

#### Vision & Mission
```
API Product Vision:
  "Our API platform enables any developer to integrate payments
   in under 5 minutes, driving ecosystem growth and partner revenue."

API Product Mission:
  "Provide the most developer-friendly payment processing API
   with 99.99% uptime, comprehensive SDKs, and transparent pricing."
```

#### Strategy Canvas
| Dimension | Current State | Target State | Gap |
|-----------|--------------|--------------|-----|
| Developer adoption | 500 active consumers | 5000 active consumers | Documentation, SDKs |
| API reliability | 99.9% uptime | 99.99% uptime | Multi-region, redundancy |
| Feature coverage | Payments only | Payments + Subscriptions + Payouts | Roadmap |
| Developer experience | 15 min to first call | 3 min to first call | Quickstart, SDKs |
| Monetization | Free only | Free + Pro + Enterprise | Pricing tiers |

#### API Business Models

| Model | Description | Example | Best For |
|-------|-------------|---------|----------|
| Free | No charge, drive ecosystem adoption | GitHub API | Platform lock-in, ecosystem growth |
| Usage-based | Pay per request/unit | Stripe ($0.025/call) | Variable usage patterns |
| Tiered | Different plans with limits | Google Maps API | Predictable consumption segments |
| Freemium | Free tier + paid premium | Slack API | Bottom-up adoption |
| Revenue share | % of transaction value | Stripe Connect (2.9% + $0.30) | Platform businesses |
| Internal value | Cost savings, not direct revenue | Platform APIs | Internal developer platforms |

#### Selecting the Right Model
```yaml
model_selection_factors:
  - consumer_type: [developer, enterprise, partner]
  - usage_pattern: [steady, bursty, growing]
  - value_metric: [requests, data_volume, transactions, users]
  - market_position: [new_entrant, challenger, market_leader]

example:
  scenario: SaaS platform launching public API
  recommendation:
    primary: freemium
    tiers:
      - name: Free
        limits: 1000 req/day, read-only
        goal: Developer onboarding
      - name: Pro
        limits: 100000 req/day, read-write
        price: $99/month
        goal: Revenue from growing apps
      - name: Enterprise
        limits: Custom, SLA-backed
        price: Custom
        goal: Strategic partnerships
```

### API Maturity Model

| Level | Name | Characteristics | Capabilities |
|-------|------|----------------|--------------|
| 0 | No API | Direct DB access, no abstraction | — |
| 1 | Internal | Private APIs, single consumer | Basic endpoints |
| 2 | Partner | Published API docs, partner onboarding | API keys, docs portal |
| 3 | Ecosystem | Public API portal, self-service | Self-serve signup, SDKs, SLAs |
| 4 | Platform | API marketplace, monetization | Pricing tiers, usage analytics |
| 5 | API-first | APIs drive product strategy, internal + external | API design reviews, dogfooding, API-as-product |

### API Versioning Strategy

#### Versioning Approaches

| Strategy | Mechanism | Example | Pros | Cons |
|----------|-----------|---------|------|------|
| URL path | Path prefix | `/v1/users` | Explicit, cacheable | URL duplication |
| Header | Accept header | `Accept: application/vnd.api+json;version=2` | Clean URLs | Harder to discover |
| Query param | Query string | `/users?api-version=2024-01-01` | Easy to test | Pollutes URLs, not cacheable |
| Content negotiation | Content-Type | `Content-Type: application/vnd.example.v2+json` | Semantic | Complex |
| No versioning | Backward-compatible only | `/users` | Simplest | Breaking changes break all |

#### Version Lifecycle Policy
```yaml
version_policy:
  naming: semver                    # v{major}.{minor}.{patch}
  current_version: v3
  supported_versions:
    - version: v1
      status: sunset
      sunset_date: "2025-12-31"
      active_consumers: 2
    - version: v2
      status: deprecated
      sunset_date: "2026-06-30"
      active_consumers: 45
    - version: v3
      status: current
      sunset_date: null
      active_consumers: 230
    - version: v4
      status: beta
      sunset_date: null
      active_consumers: 12

  rules:
    max_supported_versions: 2       # Only 2 active versions at any time
    deprecation_notice_days: 180    # Minimum 6 months notice
    sunset_after_deprecation_days: 90
    beta_lifetime_days: 90
```

### Deprecation & Sunset Policy

#### Deprecation Process
```
Week 1:  Announce deprecation with timeline
Week 2:  Add Deprecation + Sunset headers to API responses
Week 4:  Email all known consumers with migration guide
Week 8:  Schedule migration office hours
Month 6: Deprecated version enters sunset
Month 7: Traffic cutoff — return 410 Gone
Month 8: Infrastructure decommissioned
```

#### Deprecation Headers
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </docs/migrate-v2-to-v3>; rel="deprecation"
```

#### Breaking Change Classification

| Change Type | Breaking? | Recommended Approach |
|-------------|-----------|---------------------|
| Remove a field | Yes | Deprecate field, keep 6+ months, then remove in new version |
| Rename a field | Yes | Add new field, deprecate old, migrate consumers |
| Change field type | Yes | New field with new type, deprecate old |
| Add required field | Yes | Make optional with default value |
| Remove an endpoint | Yes | Return 301 redirect or deprecate with sunset header |
| Change error codes | Yes | Add new codes, preserve old codes during migration |
| Change auth method | Yes | Support both old and new during migration window |
| Add optional field | No | Safe additive change — no impact on existing consumers |
| Add new endpoint | No | No impact on existing consumers |
| Relax validation | No | Old inputs remain valid |
| Change response format | Yes (if clients parse structure) | New version or careful additive changes |

### Developer Experience (DX)

#### DX Hierarchy
```
1. Discoverable  — Developers find what they need without external docs
2. Consistent   — Same patterns across all endpoints
3. Predictable  — Responses match expectations
4. Forgiving    — Sensible defaults, helpful errors
5. Performant   — Fast responses, efficient payloads
```

#### First Call Experience
```bash
# Copy-paste ready — first API call in under 2 minutes
export API_KEY="your_key_here"

curl -H "X-API-Key: $API_KEY" \
     https://api.example.com/v3/users \
     | jq '.'
```

```python
# Python quickstart
import os
from example_api_client import ApiClient

client = ApiClient(api_key=os.environ["API_KEY"])
users = client.users.list(limit=5)
for user in users:
    print(f"{user.name} ({user.email})")
```

#### SDK Design Principles
```typescript
// Intuitive client — follows natural language patterns
const client = new ApiClient({ apiKey: "sk-..." });

// Resource methods instead of generic request()
const user = await client.users.get("usr_123");
const users = await client.users.list({ page: 1, perPage: 50 });
const newUser = await client.users.create({ name: "Alice", email: "alice@example.com" });

// Typed responses
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Typed errors
try {
  await client.users.get("invalid");
} catch (error) {
  if (error instanceof ApiError) {
    console.log(`[${error.status}] ${error.body.detail}`);
  }
}
```

### API Monetization

#### Usage Tracking Architecture
```python
class UsageTracker:
    def record(self, api_key: str, endpoint: str, method: str, status: int, latency_ms: int):
        event = {
            "api_key_hash": hashlib.sha256(api_key.encode()).hexdigest(),
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "latency_ms": latency_ms,
            "timestamp": datetime.utcnow().isoformat(),
            "tier": self.get_tier(api_key),
        }
        self.buffer.append(event)
        if len(self.buffer) >= 100:
            self.flush()

    def check_limits(self, api_key: str) -> dict:
        tier = self.get_tier(api_key)
        usage = self.get_current_usage(api_key)
        limits = self.get_tier_limits(tier)

        return {
            "allowed": usage["requests"] < limits["max_requests"],
            "current": usage["requests"],
            "limit": limits["max_requests"],
            "reset_at": usage["window_end"],
            "remaining": limits["max_requests"] - usage["requests"],
        }
```

#### Tier Configuration
```yaml
tiers:
  free:
    requests_per_second: 10
    requests_per_day: 1000
    max_concurrent: 5
    features: [read]
    support: community
    sla_uptime: "99.9%"

  pro:
    requests_per_second: 100
    requests_per_day: 100000
    max_concurrent: 50
    features: [read, write, webhooks]
    support: email
    sla_uptime: "99.95%"
    price: "$99/month"

  enterprise:
    requests_per_second: 1000
    requests_per_day: unlimited
    max_concurrent: 500
    features: [read, write, webhooks, admin, audit_logs]
    support: dedicated
    sla_uptime: "99.99%"
    price: "Custom"
```

### API Analytics

#### Metrics Framework

| Category | Metric | Definition | Target |
|----------|--------|------------|--------|
| Adoption | Active consumers | Unique keys used in last 30d | > 10% MoM growth |
| Adoption | Consumer growth | New key registrations | > 5% MoM |
| Adoption | Activation rate | Keys with first call within 7d | > 60% |
| Adoption | Retention rate | Active in month N who return in N+1 | > 80% |
| DX | Time to first call | Key creation → first successful request | < 5 min |
| DX | API completeness | Endpoints documented with examples | > 95% |
| DX | Error clarity | Errors with actionable messages | > 90% |
| DX | SDK coverage | Users using official SDK | > 70% |
| Reliability | Uptime | % of time API is available | > 99.9% |
| Reliability | Error rate | % of 5xx responses | < 1% |
| Reliability | Latency P95 | 95th percentile response time | < 200ms |
| Business | Revenue per consumer | Monthly revenue / active consumers | Growing |
| Business | API revenue | Total API-generated revenue | Targets per model |
| Business | Churn rate | % stopped using API | < 5%/month |

#### Analytics Dashboard SQL
```sql
-- Active consumers per version
SELECT
    api_version,
    COUNT(DISTINCT api_key_hash) as active_consumers,
    COUNT(*) as total_requests,
    AVG(latency_ms) as avg_latency,
    COUNT(CASE WHEN status >= 500 THEN 1 END) * 100.0 / COUNT(*) as error_rate
FROM api_usage
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY api_version
ORDER BY api_version;

-- Churned consumers (active in previous month, inactive this month)
SELECT DISTINCT api_key_hash
FROM api_usage
WHERE timestamp BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'
  AND api_key_hash NOT IN (
    SELECT DISTINCT api_key_hash
    FROM api_usage
    WHERE timestamp > NOW() - INTERVAL '30 days'
  );
```

#### API Product Scorecard
```python
class ApiProductScorecard:
    def compute(self, metrics: dict) -> dict:
        weights = {
            "adoption": 0.25,
            "developer_experience": 0.25,
            "reliability": 0.25,
            "business_value": 0.15,
            "documentation": 0.10,
        }
        scores = {
            "adoption": self.adoption_score(metrics),
            "developer_experience": self.dx_score(metrics),
            "reliability": self.reliability_score(metrics),
            "business_value": self.business_score(metrics),
            "documentation": self.docs_score(metrics),
        }
        total = sum(scores[k] * weights[k] for k in scores)
        return {
            "overall": round(total, 1),
            "breakdown": scores,
            "status": "healthy" if total >= 80 else "needs_attention" if total >= 60 else "critical",
        }
```

### API Governance

#### Design Review Gates
```yaml
api_design_review:
  required_for:
    - New endpoint creation
    - Breaking schema changes
    - New authentication mechanisms
    - Error format changes

  checklist:
    - [ ] Naming follows API style guide (snake_case, plural resources)
    - [ ] Pagination implemented for list endpoints
    - [ ] Error responses follow RFC 7807 format
    - [ ] Rate limiting documented
    - [ ] Authentication method specified
    - [ ] OpenAPI spec updated
    - [ ] Changelog entry drafted
    - [ ] Migration guide written (if breaking)

  review_process:
    - Submit RFC via API governance repository
    - 3 business days for review
    - Two approvals required from API council
    - Design review blocks production deployment
```

#### API Catalog
```yaml
api_catalog:
  - name: Users API
    version: v3
    status: current
    owner: team-identity
    endpoints: 12
    consumers: 230
    p99_latency: 150ms
    error_rate: 0.2%
    documentation_url: /docs/users
    sdk_coverage: [python, typescript, go, java]

  - name: Payments API
    version: v2
    status: deprecated
    owner: team-payments
    endpoints: 8
    consumers: 45
    p99_latency: 280ms
    error_rate: 0.5%
    sunset_date: "2026-06-30"
    migration_guide: /docs/migrate-payments-v2-to-v3
```

### Stakeholder Communication

#### API Product Health Report (Monthly)
```markdown
## API Platform Health — June 2026

### Highlights
- 12% MoM growth in active consumers (now 1,200)
- v3 API reaches 99.95% uptime (above 99.9% SLO)
- New TypeScript SDK published — 40% adoption in first month

### Version Migration Status
| Version | Status | Consumers | Actions Required |
|---------|--------|-----------|-----------------|
| v1 | Sunsetting — Dec 2025 | 2 | Urgent: migrate to v3 |
| v2 | Deprecated — June 2026 | 45 | Planned: migrate to v3 |
| v3 | Current | 230 | — |
| v4 | Beta | 12 | — |

### Risk Items
- 2 remaining v1 consumers at risk of cutoff
- Payments API P99 latency increased 30% (investigating)
- 3 open P1 support tickets from enterprise consumers

## Stakeholder Alignment Techniques

### One-on-One Preparation
Before roadmap reviews or major decisions:
```yaml
pre_meeting_prep:
  for_each_stakeholder:
    - What are their top 3 priorities this quarter?
    - How does the proposal support or conflict with those priorities?
    - What objections might they raise?
    - What data would address those objections?
    - Who are potential allies who could support the proposal?

  expected_pushback:
    - VP Product: "This delays revenue-generating features"
      response: "Show adoption impact data, expected revenue from improved DX"
    - Engineering Director: "We don't have capacity"
      response: "Trade-off analysis: what we'd descope to make room"
    - Sales: "Customers are asking for this feature"
      response: "Track feature request volume, show prioritization score"
```

### Trade-Off Communication
```yaml
trade_off_format:
  decision: "Invest 3 engineers for 6 months in multi-region deployment"

  gains:
    - "99.99% uptime (meets enterprise SLA requirement)"
    - "EU region compliance for GDPR"
    - "P99 latency reduction: 500ms → 100ms"

  costs:
    - "Developer portal v2 delayed to Q3"
    - "Python SDK improvements deferred to Q3"
    - "Mobile SDKs (iOS/Android) deferred to Q1 2027"

  risk:
    - "No remaining capacity for unplanned work"
    - "If timeline slips, no buffer available"
```

### Escalation Framework
| Level | Scope | Resolver | Timeline |
|-------|-------|----------|----------|
| L1 | Single API/team decision | API Product Manager | 1 week |
| L2 | Cross-team or consumer impact | API Council | 2 weeks |
| L3 | Strategic or pricing changes | VP Product + CTO | 1 month |

## Launch Playbook

### Launch Type Matrix
| Type | Timeline | Effort | Risk | Example |
|------|----------|--------|------|---------|
| New API | 8 weeks | High | High | First version of Payments API |
| Major version | 8 weeks | Medium | Medium | v2→v3 migration |
| Feature add | 4 weeks | Low | Low | New endpoint, sort parameter |
| Beta program | 6 weeks | Medium | Medium | Preview to select partners |

### Launch Day Checklist
```yaml
launch_day_checklist:
  deploy:
    - Deploy to production
    - Verify health check returns 200
    - Execute test queries against production
    - Confirm monitoring data flowing

  communicate:
    - Publish blog post and changelog
    - Announce on community channels (Slack, forum, newsletter)
    - Notify existing partners about new version
    - Social media announcements

  monitor:
    - Check error rate every 15 min for first hour
    - Check P99 latency every 15 min for first hour
    - Monitor support channels for developer questions
    - Watch for unexpected high usage or abuse patterns
```

### Success Metrics by Launch Type
```yaml
new_api_metrics:
  primary:
    - Active developers (MAD) in first 30 days
    - Time to first call (TTFC)
    - Developer NPS from beta participants
  targets:
    ideal: "100+ devs, TTFC < 5 min, NPS > 40"
    acceptable: "50+ devs, TTFC < 10 min, NPS > 30"

major_version_metrics:
  primary:
    - Migration rate (% of consumers on new version)
    - New version adoption in first 90 days
  targets:
    ideal: "80% migrated in 90 days"
    acceptable: "50% migrated in 90 days"

feature_metrics:
  primary:
    - Feature adoption rate (% of consumers using)
    - Feature-specific error rate
  targets:
    ideal: "60% adoption in 30 days, error rate < 0.5%"
    acceptable: "30% adoption in 30 days"
```

## API Monetization Decision Tree

```
Question: What type of API are you launching?
│
├─ Infrastructure/Platform API (compute, storage, messaging)
│   └─ Usage-based pricing (pay per request/unit)
│
├─ Data API (maps, weather, financial data)
│   └─ Tiered pricing by data volume or feature access
│
├─ Transaction API (payments, booking, marketplace)
│   └─ Revenue share (% of transaction value)
│
├─ Platform API (SaaS integrations, embeddable features)
│   ├─ B2B: Per-seat or per-account pricing
│   └─ B2D: Freemium with API call limits
│
└─ Internal Platform API
    └─ Internal value model (cost savings, velocity)
```

### Tier Structure Principles
```yaml
tier_design:
  free_tier:
    purpose: Adoption, familiarity, bottom-up entry
    generosity: Enough for real projects, limited enough to motivate upgrades
    limits: 1,000 requests/day, read-only, community support
    signup_friction: Zero — self-service, instant key

  pro_tier:
    purpose: Revenue from growing applications
    limits: 100,000 requests/day, read-write, webhooks
    price: $99/month or metered
    support: Email, SLA 99.95%

  enterprise_tier:
    purpose: Strategic partnerships, high-value accounts
    limits: Custom, SLA-backed (99.99%), dedicated support
    price: Custom (annual contract)
    features: SSO/SAML, audit logs, dedicated SLAs, custom integrations
```

### Pricing Psychology
- **Anchor high**: Show enterprise tier first to make pro seem reasonable
- **Free tier generosity**: Calculated — enough for real development, not enough for production
- **Usage visibility**: Show consumers their consumption (X-RateLimit-Remaining, dashboard)
- **Automatic upgrades**: Notify when approaching limit, offer seamless upgrade path
- **Annual discounts**: 15-20% discount for annual commitments (improves retention, cash flow)

## References
- `references/product-management-fundamentals.md` — API product management fundamentals: lifecycle, maturity model, strategy canvas, governance
- `references/product-management-advanced.md` — Advanced API product strategy: consumer insights, SLA management, partnership programs
- `references/api-lifecycle-management.md` — Full lifecycle: design to sunset, versioning, migration
- `references/api-strategy.md` — API business models, strategy canvas, governance
- `references/developer-experience.md` — DX principles, SDKs, documentation, error messages
- `references/developer-portal.md` — Developer portal design, self-service onboarding, analytics
- `references/monetization.md` — Pricing models, usage tracking, rate limiting tiers
- `references/product-metrics.md` — Adoption, DX, reliability, and business metrics with dashboards
- `references/api-consumer-insights.md` — Consumer lifecycle, health scoring, churn prediction
- `references/api-governance.md` — Governance framework, API council, design standards
- `references/api-stakeholder-management.md` — Stakeholder mapping, communication, escalation
- `references/api-launch-playbook.md` — Launch planning, execution, metrics, retrospective
