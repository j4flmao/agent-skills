# API Versioning and Deprecation

## Versioning Strategies
URI versioning: /v1/resource, simple and explicit, tight client coupling. Header versioning: Accept: application/vnd.api+json;version=2. Accept header, cleaner URLs, complex routing. Query parameter: /resource?version=2. Simple, cache issues, not RESTful. Media type versioning: application/vnd.company.v2+json. Content negotiation, flexible.

## Semantic Versioning for APIs
Major version: breaking changes (field removal, type change, endpoint removal). Minor version: non-breaking additions (new field, new endpoint). Patch version: bug fixes, no contract changes. Communicate version changes in changelog. Support overlapping versions during migration.

## Deprecation Policies
Deprecation notice: add Deprecation response header with sunset date. Sunset header: indicates when version will be removed. Migration guide: document changes and migration path. Deprecation period: minimum 6 months for breaking changes. Communication: email, dashboard, API status page.

## Backward Compatibility
Add fields only (never remove or rename). Use optional fields with defaults. Never change field types. Never change endpoint semantics. Pagination changes: add new params, keep old ones working. Error format: add new fields only.

## API Changelog
Changelog endpoint: /changelog or /changes. Per-version changelog in documentation. Automated changelog generation from PR labels. Breaking change flag in PR checklist. API diff tooling: oasdiff, spectral.

## Migration Support
Version co-existence: run multiple versions simultaneously. Migration tokens: per-client migration window. Gradual rollout: migrate 1% of traffic initially. A/B testing for API changes. Feature flags for API behavior changes.

## References
- api-documentation-fundamentals.md -- Fundamentals
- openapi-basics.md -- OpenAPI
- design-first.md -- Design-First
