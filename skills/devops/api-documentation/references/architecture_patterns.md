# API Documentation Architecture Patterns

How to organize specs, generated artifacts and portals when an organization has many APIs and teams. Covers repository layouts, single-source-of-truth choices, spec federation into a portal, overlays for audience-specific variants, and the docs-as-code pipeline.

## Source-of-Truth Models

| Model | Spec origin | Strength | Weakness |
|-------|-------------|----------|----------|
| Design-first | Hand-written OpenAPI reviewed before code | Contract agreed early; mocks and SDKs before implementation | Drift unless implementation is validated against spec |
| Code-first | Generated from annotations/types (FastAPI, NestJS Swagger, springdoc) | Always matches code | Design reviewed late; quality depends on annotations |
| Hybrid | Code generates, CI diffs against committed spec | Drift caught in PRs | Two artifacts to reconcile |

Whichever model, commit the resulting spec to version control and treat it as a build artifact that is linted, diffed and published.

## Repository Layouts

### Spec with the service (most common)

```
orders-service/
  src/
  openapi/
    openapi.yaml          # root, refs below
    paths/orders.yaml
    schemas/order.yaml
  .spectral.yaml
  redocly.yaml
```

Pros: changes to code and spec in one PR. Cons: portal must aggregate from many repos.

### Central API repository

```
api-specs/
  orders/v1/openapi.yaml
  billing/v2/openapi.yaml
  shared/schemas/problem.yaml
  shared/parameters/pagination.yaml
```

Pros: consistent governance, shared components, one portal build. Cons: cross-repo PRs for each change.

A common compromise: spec in the service repo; CI publishes the bundled spec to a registry (artifact store, API registry, or central repo) consumed by the portal.

## Shared Components

Extract organization-wide pieces into a versioned package:
- Problem details error schema (RFC 9457)
- Pagination parameters and envelopes
- Common headers (`X-Request-ID`, rate-limit headers)
- Security schemes

Reference them by URL or bundle them at build time. Version shared components so a change does not silently alter every API.

## Docs-as-Code Pipeline

```
author spec ──► lint (Spectral/Redocly) ──► breaking-change diff (oasdiff)
            ──► bundle ──► generate (reference docs, SDKs, mocks)
            ──► contract tests vs implementation ──► publish portal
```

Every stage runs in CI on pull requests; publish runs on merge/tag.

## Portal Federation

| Approach | Description | Tools |
|----------|-------------|-------|
| Static site aggregating bundles | Build step pulls each API's bundled spec | Redocly, Docusaurus + OpenAPI plugin, Scalar, Mintlify |
| Developer portal catalog | Services register APIs as catalog entities | Backstage (`kind: API`), Port |
| Gateway portal | Gateway-managed APIs auto-listed | Kong, Apigee, Azure API Management, AWS API Gateway portals |
| SaaS docs platform | Upload/sync specs via CLI or Git | ReadMe, Bump.sh, Stoplight |

Backstage example:

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: orders-api
  description: Orders public REST API
spec:
  type: openapi
  lifecycle: production
  owner: team-orders
  system: commerce
  definition:
    $text: ./openapi/openapi.yaml
```

## Audience-Specific Variants with Overlays

One master spec, several published views (public, partner, internal). The OpenAPI Overlay Specification (1.0) applies JSONPath-targeted updates/removals:

```yaml
overlay: 1.0.0
info: { title: Public view, version: 1.0.0 }
actions:
  - target: $.paths.*.*[?(@['x-internal'] == true)]
    remove: true
  - target: $.info
    update:
      description: Public Orders API for third-party developers.
```

Alternatives: Redocly `filter-in`/`filter-out` decorators on `x-internal` in `redocly.yaml`. Never maintain hand-copied public and internal specs.

## Multi-Protocol Documentation

| Interface | Spec |
|-----------|------|
| REST/HTTP | OpenAPI |
| Events/async (Kafka, AMQP, MQTT, WebSocket) | AsyncAPI 3.0 |
| GraphQL | SDL + introspection; docs via GraphiQL/Apollo Studio/SpectaQL |
| gRPC | `.proto` with comments; `protoc-gen-doc`, Buf Schema Registry |

Portals should link REST operations to the events they emit (AsyncAPI channel references).

## Versioned Documentation

- Publish each supported major version at a stable URL (`/docs/v1`, `/docs/v2`).
- Mark deprecated operations (`deprecated: true`) and include sunset dates (`Sunset` header, RFC 8594) in descriptions.
- Generate a changelog from spec diffs per release.

## Generated Artifacts from the Spec

| Artifact | Tools |
|----------|-------|
| Reference docs | Redoc, Swagger UI, Scalar, Stoplight Elements |
| SDKs | OpenAPI Generator, Speakeasy, Fern, Kiota, Stainless |
| Mock servers | Prism, Microcks, WireMock (OpenAPI import) |
| Contract tests | Schemathesis, Dredd, Pact (consumer-driven) |
| Gateway config | Import into Kong/APIM/API Gateway |

## Ownership

- Each spec has an owning team (CODEOWNERS on `openapi/`).
- An API governance group owns the shared ruleset and style guide, not individual specs.
- Breaking changes require review from API governance.

## Checklist

- [ ] Source-of-truth model chosen per API and documented
- [ ] Spec committed, linted and diffed in CI
- [ ] Shared components versioned centrally
- [ ] Portal aggregates bundled specs automatically
- [ ] Internal/public variants produced via overlays or filters
- [ ] AsyncAPI for event interfaces
- [ ] Clear ownership via CODEOWNERS
