# Gateway Configuration as Code and Safe Rollouts

How to manage API gateway configuration declaratively, validate it in CI, and roll out both config changes and gateway upgrades without dropping traffic. Platform topologies (ingress controllers, multi-region) are in `api-gateway-deployment.md`.

## Why Declarative

Clicking routes and plugins into an admin UI produces drift, no review, and no rollback. Treat gateway state like application code: stored in Git, reviewed, validated, applied by a pipeline, and reconciled continuously.

| Gateway | Declarative format | Apply tool |
|---------|-------------------|------------|
| Kong | `kong.yaml` (decK state file) or Kubernetes CRDs via KIC | `deck gateway diff/sync` |
| Apache APISIX | `apisix.yaml` (standalone) or ADC config | `adc diff/sync` or APISIX Ingress CRDs |
| Envoy Gateway / Istio / Contour | Kubernetes Gateway API + vendor CRDs | Argo CD / Flux |
| NGINX | `nginx.conf` + includes | `nginx -t` then reload |
| AWS API Gateway | OpenAPI + CloudFormation/CDK/Terraform | IaC pipeline |
| Azure API Management | Bicep/Terraform, APIOps | IaC pipeline |

## Repository Layout

```
gateway-config/
├── base/                 # shared plugins, global policies
├── services/
│   ├── orders.yaml       # routes + service-specific plugins, owned by orders team
│   └── payments.yaml
├── overlays/
│   ├── staging/
│   └── production/
└── tests/                # smoke requests per route
```

Use CODEOWNERS so each team reviews its own routes, and the platform team reviews `base/`.

## Kong with decK

```yaml
# services/orders.yaml
_format_version: "3.0"
services:
  - name: orders
    url: http://orders.internal:8080
    connect_timeout: 2000
    read_timeout: 10000
    routes:
      - name: orders-api
        paths: ["/v1/orders"]
        strip_path: false
    plugins:
      - name: rate-limiting
        config: { minute: 600, policy: local }
```

```bash
deck file validate services/*.yaml
deck file merge base/*.yaml services/*.yaml -o merged.yaml
deck gateway diff merged.yaml          # show planned changes in the PR
deck gateway sync merged.yaml          # apply on merge to main
```

Use `select_tags` so each pipeline only manages its own entities and does not delete objects owned by other teams.

## Kubernetes Gateway API with GitOps

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: { name: orders, namespace: orders }
spec:
  parentRefs: [{ name: public, namespace: gateway }]
  hostnames: ["api.example.com"]
  rules:
    - matches: [{ path: { type: PathPrefix, value: /v1/orders } }]
      backendRefs: [{ name: orders, port: 8080 }]
```

- Platform team owns the `Gateway` (listeners, TLS); app teams own `HTTPRoute`s in their namespaces. `allowedRoutes` on the listener controls which namespaces may attach.
- Argo CD/Flux reconcile continuously, reverting manual edits.
- Check `status.parents[].conditions` (`Accepted`, `ResolvedRefs`) in CI or post-sync hooks; a route can apply successfully yet be rejected by the controller.

## CI Validation Stages

1. **Schema**: `deck file validate`, `kubeconform` with Gateway API CRD schemas, `nginx -t` in a container.
2. **Policy**: OPA/Conftest or Kyverno rules, e.g. every route has auth, timeouts set, no wildcard hosts.
3. **Diff**: post planned changes as a PR comment.
4. **Ephemeral test**: start the gateway in a container with the config and run smoke requests.
5. **Promote**: staging sync → automated smoke tests → production sync.

```rego
package gateway
deny[msg] {
  some s
  svc := input.services[s]
  not has_auth(svc)
  msg := sprintf("service %s has no auth plugin", [svc.name])
}
has_auth(svc) { svc.plugins[_].name == "jwt" }
has_auth(svc) { svc.plugins[_].name == "openid-connect" }
```

## Zero-Downtime Config Reloads

| Gateway | Reload behaviour |
|---------|------------------|
| NGINX | `nginx -s reload` starts new workers; old ones finish in-flight requests |
| Envoy | xDS updates in place; listener changes drain old connections |
| Kong (DB-less) | Config pushed via `/config`; workers rebuild router |
| APISIX | Hot-reloads from etcd or the standalone file |

Always validate before reload; a failed validation should block the pipeline, not the gateway.

## Upgrading the Gateway Itself

- Run the gateway as a Deployment with ≥3 replicas, PodDisruptionBudget, and `maxUnavailable: 0`.
- Use `preStop` sleep (e.g. 10–15s) so the load balancer stops sending traffic before shutdown; set `terminationGracePeriodSeconds` above it.
- Canary the new version: second Deployment behind the same Service or weighted DNS/LB, watch error rate and latency, then shift.
- Read release notes for plugin config schema changes; run `deck file convert` (Kong) or equivalent migration tools.

## Rollback

- Git revert of the config commit, reapplied by the pipeline or GitOps controller.
- Keep the previous gateway image tag deployable; do not delete old images immediately.
- For database-backed gateways, back up the config DB before major upgrades.

## Pitfalls

- Mixing admin-API changes with declarative sync: the next sync deletes manual changes.
- One giant config owned by everyone, causing merge conflicts and risky syncs.
- Secrets (API keys, client secrets) committed in plain text; reference a vault or Kubernetes Secret instead.
- No smoke tests: config "applied" but routes return 404 due to precedence conflicts.

## Checklist

- [ ] All gateway state in Git; admin API write access restricted to the pipeline
- [ ] Schema validation, policy checks, and diff in every PR
- [ ] Ownership split via tags/namespaces and CODEOWNERS
- [ ] Staging promotion with automated smoke tests
- [ ] Graceful drain on reload and upgrade
- [ ] Documented rollback path tested at least once
