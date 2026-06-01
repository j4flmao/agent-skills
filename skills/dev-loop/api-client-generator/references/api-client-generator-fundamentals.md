# API Client Generator Fundamentals

## Overview
API client generators create type-safe, idiomatic client SDKs from API specifications (OpenAPI, GraphQL, gRPC). Automated generation eliminates manual HTTP code, ensures type safety, and keeps clients synchronized with API changes.

## Core Concepts

### Concept 1: OpenAPI / Swagger Specification
OpenAPI 3.x defines API endpoints, request/response schemas, authentication, and parameters. The spec is the single source of truth for client generation. Validate specs before generation. Use references ($ref) for reusable components.

### Concept 2: Generator Selection
Choose by language + framework: openapi-generator for broad language support, NSwag for .NET, kiota for Microsoft ecosystem, graphql-codegen for GraphQL, and protoc for gRPC. Match generator capabilities to project requirements.

### Concept 3: Authentication Integration
Generated clients need authentication middleware: bearer token (JWT), API key (header/query), OAuth2 (authorization code, client credentials), or mTLS. Configure token provider for automatic token refresh.

### Concept 4: Error Handling
Generated clients throw typed errors: discriminated by status code (4xx vs 5xx), with parsed error bodies. Wrap generated calls in service layer for consistent error handling, retry logic, and logging.

### Concept 5: CI/CD Integration
API spec changes should trigger automatic client regeneration in CI. Run generation, check for diffs, and create automated PRs with updated client code. Pin generator version to avoid unexpected changes.

## Best Practices

- Validate OpenAPI spec before generation
- Pin generator version (avoid breaking changes)
- Separate generated from custom code
- Abstract behind repository/service layer
- Use typed error classes
- Generate at build time (not commit time)
- CI diff check for stale generated code
- Consistent naming conventions per language
- Authentication middleware for token management

## Anti-Patterns

- Not pinning generator version (unexpected breaks)
- Editing generated files directly (lost on regeneration)
- No spec validation (generating from broken spec)
- No authentication middleware (auth in every call)
- Ignoring nullable/optional types (runtime errors)
- Committing large generated files (noisy diffs)
- Not wrapping generated client (tight coupling)
- No rate limit handling (429 crashes)
