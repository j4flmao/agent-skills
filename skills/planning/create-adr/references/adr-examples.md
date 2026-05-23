# ADR Examples

Real-world ADR examples covering common architecture decisions.

## Example 1: Database Technology Choice

```markdown
# ADR-001: Use PostgreSQL as Primary Database

## Status
Accepted

## Context
We are building a multi-tenant SaaS platform for project management.
Initial requirements include complex relational queries (projects,
tasks, users, permissions), full-text search across task descriptions,
and geospatial queries for location-based features. The team has
experience with both PostgreSQL and MongoDB. The estimated data volume
is 500GB over 3 years with 50M+ rows in the tasks table.

## Decision
We will use PostgreSQL 16 as the primary database.

## Rationale
PostgreSQL provides native JSONB for semi-structured metadata,
built-in full-text search eliminating an external search dependency,
PostGIS for geospatial queries, and a mature ecosystem for ORM
integration. The relational nature of project management data maps
naturally to PostgreSQL's schema model. A single database reduces
operational complexity compared to a polyglot-persistence approach.

## Consequences

### Positive
- JSONB allows flexible metadata without schema migrations
- Full-text search available without Elasticsearch initially
- PostGIS for future location features
- Strong consistency for financial and permission data
- Mature tooling (pgAdmin, DataGrip, pgcli)

### Negative
- Horizontal scaling (sharding) is more complex than NoSQL alternatives
- Connection pooling requires PgBouncer for >200 concurrent connections
- Full-text search performance degrades beyond 10M documents (mitigation:
  add Elasticsearch at that scale)

### Mitigation
- Use Citus for future sharding if needed
- Add PgBouncer from day one
- Plan Elasticsearch migration trigger at 10M documents

## Compliance
- All services use a shared Prisma schema in the `packages/database` module
- Schema changes require a migration PR reviewed by the lead engineer
- Raw SQL must use parameterized queries (ban on string interpolation)
- All queries visible via pg_stat_statements in production

## Alternatives Considered

### MongoDB
**Pros:** Schema-less, easier horizontal scaling via sharding, rich
document model for nested data, better write throughput.
**Cons:** No native joins (application-level joins are slow), no
full-text search, no geospatial at the required precision, eventual
consistency complicates permission checks, no ACID transactions across
collections without multi-document transactions (slower).
**Why not chosen:** The relational nature of the domain makes
document joins painful. Full-text search and geospatial are hard
requirements. Eventual consistency risks for permissions are
unacceptable.

### MySQL 8
**Pros:** Excellent read performance, mature replication, great ORM
support, lower operational overhead than PostgreSQL.
**Cons:** No native JSONB (JSON type is slower), full-text search less
capable, no PostGIS equivalent, stored procedure syntax less
expressive, limited indexing options for complex queries.
**Why not chosen:** JSONB performance and PostGIS dominance
PostgreSQL for this use case. MySQL's JSON implementation lacks
indexing flexibility.
```

## Example 2: API Protocol

```markdown
# ADR-003: Use GraphQL for Public API

## Status
Accepted

## Context
Our product is a data-intensive dashboard platform where users build
custom views from 20+ data sources. Mobile clients need to minimize
payload size. Frontend teams iterate rapidly and need the ability to
evolve data requirements without backend versioning. The API surface
has deep nested relationships (Organization > Projects > Tasks >
Comments > Attachments). We have 3 frontend clients (web, iOS,
Android) with divergent data needs.

## Decision
Use GraphQL via Apollo Server as the primary public API protocol.

## Rationale
GraphQL's declarative data fetching eliminates over-fetching and
under-fetching for 3 diverse clients. The type system (GraphQL SDL)
serves as living documentation. Schema evolution with deprecation
fields avoids versioning. The resolver pattern maps cleanly to our
microservice architecture using DataLoader for N+1 prevention.

## Consequences

### Positive
- Mobile payloads reduced 60% compared to REST equivalents
- Frontend ships features without backend changes (add fields to query)
- Introspection generates TypeScript types and documentation
- Single endpoint simplifies API gateway configuration
- Batch loading via DataLoader resolves N+1 queries efficiently

### Negative
- Query complexity can create expensive operations (mitigation:
  depth limiting, cost analysis, query timeout)
- Caching is harder than REST (no natural URL-based cache keys)
- File upload is non-standard (requires custom scalar or separate REST
  endpoint)
- Learning curve for backend team unfamiliar with resolver patterns

### Mitigation
- Implement query cost analysis with max-cost rejection
- Use Apollo Cache Control for response caching hints
- Leverage CDN caching for public GraphQL queries
- File uploads handled via presigned S3 URLs

## Compliance
- All resolvers must use DataLoader (ban on raw ORM queries in resolvers)
- Query depth limited to 6 levels
- Query cost analysis enforced in gateway
- Mutations require CSRF tokens
- Schema changes require GraphQL lint pass

## Alternatives Considered

### REST (JSON:API)
**Pros:** Universal compatibility, excellent caching at
HTTP/CDN level, simpler tooling, well-understood patterns.
**Cons:** Over-fetching for mobile (40-60% unnecessary data),
versioning required for field changes, N+1 queries require careful
design, endpoint proliferation for complex views.
**Why not chosen:** Three divergent clients with mobile payload
constraints make GraphQL's declarative fetching a decisive advantage.

### gRPC
**Pros:** Excellent performance (binary protocol), strong typing with
protobuf, built-in streaming, code generation.
**Cons:** Poor browser support (requires gRPC-Web proxy), no native
query flexibility, schema changes require proto regeneration, complex
tooling for debugging, larger initial setup cost.
**Why not chosen:** Browser client requirement eliminates gRPC as
primary protocol. gRPC may be used for inter-service communication
internally.
```

## Example 3: Frontend Framework

```markdown
# ADR-005: Adopt Next.js 14 with App Router for Web Client

## Status
Accepted

## Context
We are building a collaborative document editing platform requiring
server-side rendering for SEO, real-time collaboration via WebSockets,
and excellent performance on low-end devices. The team has React
experience but limited Next.js exposure. We need image optimization,
dynamic routing for documents, and incremental static generation for
public pages. The content is dynamic per-user (private documents),
so ISR has limited applicability.

## Decision
Use Next.js 14 with App Router, React Server Components, and
Tailwind CSS.

## Rationale
Next.js provides SSR, SSG, and ISR out of the box, solving SEO and
initial load performance simultaneously. The App Router's server
components reduce client-side JavaScript by 40-60% for data-heavy
pages. Tailwind CSS ensures consistent design system implementation
and rapid iteration. Vercel's platform integration simplifies
deployment and preview environments.

## Consequences

### Positive
- Server components reduce JS bundle for document viewing pages
- Image optimization via next/image improves Lighthouse scores
- Route groups and layouts map cleanly to document hierarchy
- Middleware enables efficient auth checks before page render
- Turbopack dev server provides instant HMR

### Negative
- Server/client component boundaries require discipline (common mistake)
- App Router is relatively new with evolving patterns
- Real-time collaboration requires WebSocket server separate from
  Next.js (next start doesn't serve WebSockets)
- Vercel vendor lock-in if using platform-specific features

### Mitigation
- Document server/client component rules in component documentation
- Run WebSocket server as separate Node process behind same domain
- Keep Vercel-specific features behind abstraction layer
- Upstream critical bug fixes to Next.js

## Compliance
- All data-fetching components default to server components
- "use client" must have a documented justification in PR
- Bundle analyzer runs in CI with warnings for client bundle >200KB
- Performance budget: <100ms TTFB, <2s LCP on 3G
```

## Example 4: Authentication Strategy

```markdown
# ADR-007: Use OAuth 2.0 + OpenID Connect with Auth0

## Status
Accepted

## Context
Our B2B SaaS product needs SSO for enterprise customers (SAML/OKTA),
social login for SMB users (Google, GitHub, Microsoft), and role-based
access control. The team has 4 engineers with no security specialists.
We need SOC 2 compliance within 12 months. Building auth in-house
would require password storage, MFA, session management, rate
limiting, account recovery, and security audits.

## Decision
Use Auth0 as the identity provider with OAuth 2.0 + OpenID Connect.

## Rationale
Auth0 provides enterprise SSO (SAML, OIDC), social login, MFA, breach
detection, and anomaly monitoring out of the box. Delegating identity
management to a specialized provider reduces security risk and frees
engineering time. Auth0's Actions allow custom login flows
(organization selection, JWT enrichment) without managing
infrastructure. SOC 2 compliance is built-in.

## Consequences

### Positive
- Enterprise SSO available day one (competitive requirement)
- Social login in < 1 day implementation
- Built-in rate limiting and brute force protection
- Audit logs for compliance without building them
- Zero password storage liability
- Custom JWT claims via Auth0 Actions

### Negative
- $0.02 per active user at 10K+ users ($2,400/yr at 10K users)
- Auth0 outage blocks all login (mitigation: offline session cache)
- Migration path from Auth0 is complex (vendor lock-in risk)
- Custom Actions have timeout limits (20s execution)

### Mitigation
- Implement session token with 7-day offline grace period
- Use standard OpenID Connect claims for portability
- Keep auth abstraction layer to allow provider swap
- Monitor Auth0 status page via webhook

## Compliance
- All API routes validate JWT via middleware
- Auth0 tenant uses strict token exchange policy
- Custom Actions are version-controlled and tested
- MFA required for admin roles
- Passwordless login for SMB users
```
