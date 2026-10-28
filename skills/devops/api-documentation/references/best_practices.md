# API Documentation Writing Best Practices

What makes API reference and guides usable: naming, descriptions, examples, error documentation, onboarding paths and a style guide that linting can enforce. Tool configuration lives in `configuration_templates.md`.

## Documentation Types

| Type | Question it answers | Example |
|------|---------------------|---------|
| Reference | What does each endpoint/field do? | Generated from OpenAPI |
| Getting started | How do I make my first successful call? | 5-minute quickstart |
| Guides / how-tos | How do I accomplish task X? | "Accept a payment", "Paginate results" |
| Concepts | How does the system work? | Idempotency, rate limits, webhooks |
| Changelog | What changed and when? | Dated entries, breaking flagged |

Reference alone is not enough; most developers first need the quickstart and authentication guide.

## Operations

```yaml
/orders/{orderId}/cancel:
  post:
    operationId: cancelOrder
    summary: Cancel an order
    description: |
      Cancels an order that has not shipped. Payment authorizations are released;
      captured payments are refunded asynchronously and an `order.refunded` webhook is sent.

      Cancelling an already-cancelled order returns `200` with the current state (idempotent).
    tags: [Orders]
```

- `summary`: short imperative phrase, shown in navigation ("Cancel an order").
- `description`: behavior, side effects, idempotency, async consequences, permissions required.
- `operationId`: stable camelCase verb+noun; SDK method names derive from it, so renaming is a breaking change for generated clients.
- One tag per resource; order tags by user journey with `tags` at the root.

## Schemas and Fields

Every property should state meaning, units, format and constraints:

```yaml
amount:
  type: integer
  minimum: 1
  description: Amount in the smallest currency unit (e.g. cents for USD).
  examples: [1999]
expiresAt:
  type: string
  format: date-time
  description: RFC 3339 timestamp in UTC after which the link can no longer be used.
status:
  type: string
  enum: [pending, paid, failed, refunded]
  description: |
    - `pending`: awaiting payment
    - `paid`: funds captured
    - `failed`: payment declined; see `failureCode`
    - `refunded`: fully refunded
```

Rules:
- Name units in the field description or name (`timeoutMs`, `sizeBytes`).
- Document every enum value; state whether new values may be added (clients should handle unknown values).
- Describe defaults and what omission means.
- Avoid descriptions that restate the name ("`id`: The ID").

## Examples

- Provide realistic request and response examples for every operation, including at least one error.
- Use `examples` (named) for multiple scenarios:

```yaml
content:
  application/json:
    examples:
      card:
        summary: Card payment
        value: { method: card, amount: 1999, currency: USD }
      bank:
        summary: Bank transfer
        value: { method: bank_transfer, amount: 50000, currency: EUR }
```

- Examples must validate against the schema; lint for it (Redocly `no-invalid-media-type-examples`).
- Use obviously fake data (`example.com` emails, test card numbers published by the provider); never real customer data or real keys.
- Add copy-pasteable code samples (curl plus major SDK languages); Redoc/Scalar render `x-codeSamples`.

## Errors

Document a consistent error format (RFC 9457 problem details) once and reference it:

```yaml
components:
  responses:
    Problem:
      description: Error response
      content:
        application/problem+json:
          schema: { $ref: '#/components/schemas/Problem' }
```

Per operation, list the specific error cases and their codes:

| Status | `code` | When | Client action |
|--------|--------|------|---------------|
| 400 | `invalid_request` | Malformed body | Fix request |
| 404 | `order_not_found` | Unknown ID or not visible to caller | Check ID |
| 409 | `order_already_shipped` | Cannot cancel shipped order | Start a return instead |
| 429 | `rate_limited` | Too many requests | Retry after `Retry-After` |

## Cross-Cutting Concepts to Document

- Authentication: how to obtain credentials, token lifetime, scopes per operation.
- Pagination: cursor format, page size limits, ordering guarantees.
- Rate limits: limits, headers (`RateLimit-*`, `Retry-After`), recommended backoff.
- Idempotency: `Idempotency-Key` header semantics and retention window.
- Versioning and deprecation policy, with timelines.
- Webhooks: event catalog, signature verification, retry schedule, ordering.
- Environments: sandbox vs production base URLs and test data.

## Style Guide (enforce with linting)

| Rule | Example |
|------|---------|
| Path naming | lowercase, plural nouns, kebab-case: `/payment-methods` |
| Field naming | one convention org-wide (camelCase or snake_case) |
| Every operation has `operationId`, `summary`, `tags` | Spectral built-in rules |
| Every 4xx/5xx uses problem schema | Custom rule |
| Descriptions end with a period, no "This endpoint..." filler | Custom rule |
| Dates as RFC 3339 strings | `format: date-time` |

## Getting Started Page Pattern

1. Get credentials (link to dashboard or sandbox key).
2. Make one call with curl, showing the full request and response.
3. Do one meaningful task (create + retrieve a resource).
4. Next steps: links to SDKs, key guides, and reference.

Measure "time to first successful call" with new developers and fix the slowest step.

## Maintenance

- Docs change in the same PR as the API change.
- Changelog entries are generated from spec diffs and edited for humans.
- Broken links and invalid examples fail CI.
- Collect feedback (page rating, "edit this page" links) and review search queries with no results.

## Checklist

- [ ] Quickstart gets a new developer to a successful call quickly
- [ ] Every operation: summary, description, examples, error cases
- [ ] Every field: meaning, units, constraints, enum semantics
- [ ] Shared error schema and concept pages (auth, pagination, limits, idempotency)
- [ ] Examples validate against schemas
- [ ] Style guide encoded as lint rules
