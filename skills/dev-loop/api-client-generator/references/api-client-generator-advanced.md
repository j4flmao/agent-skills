# API Client Generator Advanced

## Overview
Advanced API client generation covers multi-spec management, SDK monetization, integration testing, offline-first patterns, API versioning strategies, and cross-language generation.

## Advanced Concepts

### Concept 1: Multi-Spec Aggregation
Microservices expose multiple specs. Aggregate them into a unified client: merge specs with x-tag groups, handle cross-spec $ref resolution, manage shared schemas in a central registry, and generate a single SDK that spans services. Gateway specs for BFF patterns.

### Concept 2: SDK Packaging and Distribution
CI pipeline: generate for each target language → build → test → publish to package registry (npm, PyPI, NuGet, crates.io). Semantic versioning aligned with API version. Automated release notes from changelog. Signed packages for supply chain security.

### Concept 3: Offline-First Client
Generated client with offline support: request queue for failed calls (IndexedDB or SQLite), optimistic response generation, conflict resolution (last-write-wins or CRDT), and sync orchestration. Schema-driven offline cache.

### Concept 4: Integration Testing
Generated client tests: response deserialization (all schema variants), error response handling, authentication flows, rate limit behavior, and pagination. Test against spec validation (no undocumented fields). Contract testing (Pact) for service-to-service compatibility.

### Concept 5: API Versioning Strategy
Generated clients manage multiple API versions: namespace by version (v1.UsersClient), negotiate version via content negotiation, deprecation warnings in generated code, sunset headers for client migration, and automated migration guides.

## Advanced Techniques

### Spec-Driven SDK Packaging
```yaml
# CI pipeline
on:
  push:
    paths: ["openapi/**"]
jobs:
  publish-sdk:
    steps:
      - generate-client ${{ matrix.language }}
      - run-tests
      - publish-registry
```

### Contract Testing
```csharp
// Generated provider test
[Fact]
public void GetUser_ReturnsValidSchema() {
    var response = client.GetUser(1);
    Assert.True(OpenApiValidator.Validate(response, "User"));
}
```

## Anti-Patterns

- Merging incompatible specs (schema conflicts)
- No CI test for generated client
- Missing .d.ts/.pyi type stubs
- Not documenting breaking changes in release notes
- Ignoring API rate limits in generated client
- One-size-fits-all client for all consumers
- No deprecation notices in generated code
- SDK package without README
