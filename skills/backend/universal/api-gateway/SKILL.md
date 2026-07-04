---
name: api-gateway
description: >
  Comprehensive API Gateway skill covering routing, security,
  rate limiting, and protocol translation using Envoy and GraphQL Federation.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [api, gateway, envoy, graphql]
---
# API Gateway Engineering

## Purpose - comprehensive description
This skill defines the operational mechanics for deploying, configuring, and maintaining an enterprise-grade API Gateway. It orchestrates complex microservices architectures by providing centralized routing, authentication, and GraphQL Federation capabilities. The gateway acts as the single point of entry, enforcing policies and ensuring observability across the service mesh.

## Core Principles
1. Decentralized Configuration Management: Configurations are treated as code and decentralized across service teams.
2. Zero Trust Security: Every request is authenticated and authorized at the edge.
3. Resilient Routing: Failover, retries, and circuit breaking are built into the routing logic.
4. Unified Graph: GraphQL Federation is used to compose a single supergraph from multiple subgraphs.
5. Pervasive Observability: Distributed tracing and metrics collection are mandatory for all traffic.

## Agent Protocol
Triggers: Route modifications, schema updates, policy deployments.
Input Context Required: Service definitions, OpenAPI/GraphQL schemas, policy documents.
Output Artifact: Gateway deployment manifest, routing rules, federation schema.
Response Formats:
```json
{
  "status": "configured",
  "gateway_url": "https://gateway.example.com",
  "routes_updated": 15
}
```

## Decision Matrix
```
[Incoming Request]
       |
       v
+--------------+
| Auth Check   |---> (Fail) ---> [401/403]
+--------------+
       | (Pass)
       v
+--------------+
| Protocol?    |
+--------------+
  /          \
REST        GraphQL
 /            \
v              v
[Envoy]   [Apollo Router]
```

## Detailed Architectural Overview
```
       +-------------+
       |   Client    |
       +-------------+
              |
              v
       +-------------+
       | API Gateway |
       | (Envoy/GQL) |
       +-------------+
        /     |     \
       v      v      v
   [Svc A] [Svc B] [Svc C]
```

## Workflow Steps
Phase 1: Initial Setup
1. Define gateway topology.
2. Provision edge nodes.
3. Configure TLS/SSL certificates.
4. Establish baseline routing.

Phase 2: Security Integration
1. Configure Identity Provider.
2. Implement JWT validation.
3. Set up rate limiting policies.
4. Enable WAF rules.

Phase 3: Routing Configuration
1. Define REST routes.
2. Set up GraphQL endpoints.
3. Configure retries and timeouts.
4. Implement circuit breakers.

Phase 4: GraphQL Federation
1. Deploy Apollo Router.
2. Register subgraph schemas.
3. Compose supergraph.
4. Validate query plans.

Phase 5: Observability Setup
1. Enable OpenTelemetry tracing.
2. Configure Prometheus metrics.
3. Set up structured logging.
4. Create dashboards.

Phase 6: Deployment & Maintenance
1. Perform canary rollout.
2. Monitor error rates.
3. Update routing rules.
4. Scale gateway nodes.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| High latency | Upstream service slow | Adjust timeout/circuit breaker |
| 502 Bad Gateway | Upstream offline | Check service health/routing |
| 401 Unauthorized | Invalid token/expired | Verify identity provider sync |
| Schema composition error | Incompatible subgraphs | Review GraphQL schema changes |
| Rate limit triggers | Spike in traffic | Adjust rate limit thresholds |
| Missing metrics | Telemetry agent down | Restart observability sidecar |

## Complete Execution Scenario
```
Client -> Gateway -> Auth Filter -> Route Match -> Upstream Service -> Response -> Gateway -> Client
```

## Rules and Guidelines
1. Always validate configuration syntax before reloading.
2. Never log sensitive headers (e.g., Authorization).
3. Use strict timeouts for all upstream calls.
4. Ensure backward compatibility in GraphQL schema changes.
5. Rate limit per tenant or client ID, not just IP.

## Reference Guides
1. [Envoy Base Configuration](references/envoy_base.md)
2. [GraphQL Federation Setup](references/gql_fed.md)
3. [Rate Limiting Policies](references/rate_limiting.md)
4. [Security & Auth](references/security_auth.md)
5. [Routing Strategies](references/routing_strategies.md)
6. [Observability & Tracing](references/observability.md)
7. [Deployment Architecture](references/deployment.md)
8. [Performance Tuning](references/performance.md)

## Handoff
Proceed to `service-mesh` skill for advanced internal routing.
<!-- COMPRESSED_FOOTER_v2 -->




































































































