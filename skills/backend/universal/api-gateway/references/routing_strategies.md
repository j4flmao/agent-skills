# Traffic Routing Strategies with the Kubernetes Gateway API

Progressive delivery and traffic management at the gateway: weighted canaries, header-based routing, mirroring, timeouts, and retries, expressed with the Kubernetes Gateway API (`gateway.networking.k8s.io/v1`) and equivalents in NGINX and Envoy. Basic match types (path, host, method) are catalogued in `gateway-patterns.md`.

## Gateway API Resource Model

| Resource | Owner | Purpose |
|----------|-------|---------|
| `GatewayClass` | Infra provider | Which controller implements gateways (Envoy Gateway, Istio, Cilium, NGINX Gateway Fabric, Kong, etc.) |
| `Gateway` | Platform team | Listeners: ports, protocols, hostnames, TLS certificates, allowed route namespaces |
| `HTTPRoute` / `GRPCRoute` | App teams | Matching rules, filters, backends |
| `ReferenceGrant` | Target namespace owner | Allows cross-namespace references (e.g. route → Service in another namespace) |

HTTPRoute, GRPCRoute, Gateway, and GatewayClass are GA (v1). Features are classified as Core, Extended, or Implementation-specific; check your controller's conformance report before relying on Extended features.

## Match Precedence

Within a listener, the Gateway API resolves conflicts in this order: exact path over prefix; longer prefix over shorter; method match; more header matches; more query param matches. Ties go to the oldest route, then alphabetical. Design routes so precedence is obvious rather than relying on tie-breakers.

## Weighted Canary

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: { name: checkout, namespace: shop }
spec:
  parentRefs: [{ name: public, namespace: gateway }]
  hostnames: ["shop.example.com"]
  rules:
    - matches: [{ path: { type: PathPrefix, value: /checkout } }]
      backendRefs:
        - { name: checkout-v1, port: 8080, weight: 95 }
        - { name: checkout-v2, port: 8080, weight: 5 }
```

Progression: 1% → 5% → 25% → 50% → 100%, gated on error rate and latency SLOs. Automate with Argo Rollouts or Flagger, both of which can drive Gateway API weights.

Weights are per request, so a user can hit both versions across requests. When that breaks UX (sessions, schema changes), use header or cookie routing instead.

## Header- or Cookie-Based Routing

```yaml
rules:
  - matches:
      - path: { type: PathPrefix, value: /checkout }
        headers: [{ name: x-canary, value: "true" }]
    backendRefs: [{ name: checkout-v2, port: 8080 }]
  - matches: [{ path: { type: PathPrefix, value: /checkout } }]
    backendRefs: [{ name: checkout-v1, port: 8080 }]
```

Uses: internal dogfooding, beta cohorts, tenant pinning. Set the header at the edge from a trusted source (feature flag service, auth claims), never trust it directly from public clients for anything security-relevant.

## Traffic Mirroring (Shadowing)

```yaml
rules:
  - matches: [{ path: { type: PathPrefix, value: /search } }]
    filters:
      - type: RequestMirror
        requestMirror:
          backendRef: { name: search-v2, port: 8080 }
    backendRefs: [{ name: search-v1, port: 8080 }]
```

- Mirror responses are discarded; clients see only the primary.
- Mirror only idempotent, side-effect-free traffic, or point the shadow at isolated storage — mirroring `POST /payments` charges twice.
- Watch mirror target capacity; it receives full production load.

## Timeouts and Retries

```yaml
rules:
  - matches: [{ path: { type: PathPrefix, value: /orders } }]
    timeouts:
      request: 10s           # total time for the client request
      backendRequest: 3s     # each attempt to the backend
    backendRefs: [{ name: orders, port: 8080 }]
```

`timeouts` is in the standard channel. Retry configuration in HTTPRoute is newer and may still be experimental in your version; many controllers expose retries through their own policy CRDs (Envoy Gateway `BackendTrafficPolicy`, Istio `VirtualService`). Retry only idempotent methods, cap attempts (2–3), and keep `backendRequest × attempts ≤ request`.

## Request and Response Modification

| Filter | Use |
|--------|-----|
| `RequestHeaderModifier` | Add tenant/version headers, remove client-supplied internal headers |
| `ResponseHeaderModifier` | Add security headers, remove `Server` |
| `URLRewrite` | Strip or replace path prefix, rewrite hostname |
| `RequestRedirect` | HTTP→HTTPS, old paths → new paths (301/302) |

```yaml
filters:
  - type: URLRewrite
    urlRewrite:
      path: { type: ReplacePrefixMatch, replacePrefixMatch: / }
  - type: RequestHeaderModifier
    requestHeaderModifier:
      remove: ["x-internal-user"]
```

## API Versioning via Routing

- Path versions (`/v1`, `/v2`) map cleanly to separate backends.
- Header versions (`Accept: application/vnd.acme.v2+json` or `api-version`) use header matches; ensure caches vary on that header.
- Keep old versions routed until traffic drops to agreed thresholds; emit `Deprecation` and `Sunset` headers on old routes.

## Equivalents Outside Gateway API

NGINX weighted split:

```nginx
split_clients "${remote_addr}${http_user_agent}" $checkout_upstream {
    5%  checkout_v2;
    *   checkout_v1;
}
location /checkout { proxy_pass http://$checkout_upstream; }
```

`split_clients` hashes the key, so a given client sticks to one version (unlike per-request weights).

Envoy: `weighted_clusters` on a route, `request_mirror_policies` for shadowing, `retry_policy` per route.

## Blue-Green vs Canary

| Strategy | Switch | Rollback | Cost |
|----------|--------|----------|------|
| Blue-green | 0% → 100% at once | Instant flip back | Double capacity during switch |
| Canary | Gradual weights | Set weight to 0 | Needs good metrics per version |
| Shadow | No user impact | n/a | Extra load, side-effect care |
| Feature flags | In-app | Toggle | Code complexity |

## Pitfalls

- Canary pods receiving traffic before readiness (missing readiness probes).
- Version-specific metrics not labelled, making canary analysis impossible.
- Overlapping routes from different teams on the same hostname, resolved by obscure tie-breakers.
- Mirroring non-idempotent requests.
- Sticky sessions or connection reuse skewing actual traffic split for HTTP/2 or gRPC (weights apply per request in most implementations, per connection in some L4 setups).

## Checklist

- [ ] Gateway owned by platform; routes owned by app teams with `allowedRoutes`
- [ ] Canary steps and SLO gates automated (Argo Rollouts / Flagger)
- [ ] Mirroring only on idempotent routes
- [ ] Timeouts on every route; retries bounded and idempotent-only
- [ ] Internal headers stripped from client requests
- [ ] Deprecation headers and traffic monitoring on old API versions
