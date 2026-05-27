---
name: api-product-management
description: >
  Use when the user asks about API as product, API product management, API strategy, API monetization, developer portal, API documentation portal, API deprecation, versioning strategy, or API lifecycle management. Do NOT use for: API implementation (backend-api-design), API documentation generation (api-documentation), or technical API specification (backend-openapi-documentation).
version: "1.0.0"
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
Manage APIs as products: define API strategy, design developer experience, manage API lifecycle, implement API monetization, and build developer portals that drive adoption.

## Workflow

### API Product Lifecycle
```
Strategy → Design → Build → Publish → Promote → Monitor → Iterate
                                                          ↓
                                                    Deprecate → Retire
```

### API Maturity Model
| Level | Name | Characteristics |
|-------|------|----------------|
| 1 | Internal | Private APIs, single consumer |
| 2 | Partner | Published API docs, partner onboarding |
| 3 | Ecosystem | Public API portal, self-service, API keys |
| 4 | Platform | API marketplace, monetization, SLAs |
| 5 | API-first | APIs drive product strategy, internal + external |

### Developer Experience (DX) Principles
- **Onboarding**: First API call in < 5 minutes
- **Documentation**: Interactive API reference (Swagger UI, Stoplight)
- **SDKs**: First-class SDKs in popular languages
- **Support**: Developer forum, Slack community, dedicated support
- **Reliability**: Published SLAs, status page, changelog

### API Versioning Strategy
| Strategy | Example | Best For |
|----------|---------|----------|
| URL path | `/v1/users` | Simple, visible |
| Header | `Accept: application/vnd.api+json;version=2` | Clean URLs |
| Query param | `/users?api-version=2024-01-01` | Date-based |
| No versioning | Backward-compatible changes only | Internal APIs |

### Deprecation Policy
1. Announce deprecation with timeline (min 6 months)
2. Add `Sunset` and `Deprecation` headers
3. Create migration guide and support channel
4. Track remaining usage and notify affected consumers
5. Remove after all consumers migrated

## References
  - references/api-lifecycle-management.md — API Lifecycle Management
  - references/api-strategy.md — API Product Strategy
  - references/developer-experience.md — Developer Experience (DX)
  - references/developer-portal.md — Developer Portal Design
  - references/monetization.md — API Monetization
  - references/product-management-advanced.md — Product Management Advanced Topics
  - references/product-management-fundamentals.md — Product Management Fundamentals
  - references/product-metrics.md — API Product Metrics
