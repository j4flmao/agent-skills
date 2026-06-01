# API Documentation Advanced Topics

## Introduction
Advanced API documentation covers maintaining docs-as-code workflows, automating documentation generation, multi-version support, API changelogs, and integration with developer portals.

## Docs-as-Code Workflow
Store documentation in version control alongside API code. Use OpenAPI specification as the source of truth. Lint specifications with spectral or vacuum. Auto-generate reference docs from OpenAPI specs. Validate examples against schema. Review documentation changes via pull requests.

## OpenAPI Advanced Features
OpenAPI 3.1 with JSON Schema 2020-12 for full schema validation. Webhooks and callbacks for event-driven APIs. Links for describing API workflows. Discriminator mapping for polymorphic schemas. Server variables for multi-environment documentation. Security schemes object for comprehensive auth documentation.

## Multi-Version Documentation
Maintain separate OpenAPI specs per API version. Use versioned paths (/v1/, /v2/) or content negotiation. Document deprecation schedules and migration guides. Auto-generate version comparison pages. Support sunset headers and breaking change policies.

## Automated Documentation Generation
Use CI/CD to generate documentation on every API change. Spectral linting in CI to enforce documentation standards. Redoc CLI for bundling OpenAPI specs. TypeSpec for API design-first approach. Zod-to-OpenAPI for TypeScript-first API documentation.

## Interactive Documentation
Swagger UI for API exploration and testing. Postman collections for runnable examples. Run in Postman buttons for quick testing. OpenAPI code generators for client SDK snippets. Webhooks documentation for event-based APIs.

## References
- api-documentation-fundamentals.md -- Fundamentals
- openapi-spec.md -- OpenAPI Specification
- api-style-guide.md -- API Style Guide
- api-docs-workflow.md -- Documentation Workflow
