# OPA + Envoy Deployment

## Architecture: OPA as External Authz with Envoy

```
Client Request
     │
     ▼
┌─────────────┐     ┌──────────────┐
│   Envoy     │────>│    OPA       │
│  (PEP)      │<────│  (PDP)       │
│  :8080      │     │  :8181       │
└──────┬──────┘     └──────┬───────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│  App Service│     │ Policy Bundle│
│  :3000       │     │  (Git)       │
└─────────────┘     └──────────────┘
```

## Envoy Configuration

```yaml
# envoy.yaml
static_resources:
  listeners:
  - name: ingress
    address:
      socket_address: { address: 0.0.0.0, port_value: 8080 }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          codec_type: AUTO
          stat_prefix: ingress_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match: { prefix: "/api/public" }
                route: { cluster: app_service }      # No auth for public
              - match: { prefix: "/" }
                route: { cluster: app_service }
                typed_per_filter_config:
                  envoy.filters.http.ext_authz:
                    "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthzPerRoute
                    check_settings:
                      context_extensions:
                        resource_type: document
                        action: read
          http_filters:
          - name: envoy.filters.http.ext_authz
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
              transport_api_version: V3
              grpc_service:
                envoy_grpc:
                  cluster_name: opa_service
                timeout: 0.250s               # 250ms timeout
              with_request_body:
                max_request_bytes: 1024
                allow_partial_message: true
              failure_mode_allow: false         # Fail closed (block if OPA down)
              metadata_context_namespaces:
              - jwt.apache.org
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: app_service
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: app_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: app, port_value: 3000 }

  - name: opa_service
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    http2_protocol_options: {}                # gRPC requires HTTP/2
    load_assignment:
      cluster_name: opa_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: opa, port_value: 9191 }  # OPA gRPC port
```

## OPA Configuration

```yaml
# opa-config.yaml
services:
  app:
    url: http://bundle-server:8888

bundles:
  authz:
    service: app
    resource: bundles/authz.tar.gz
    polling:
      min_delay_seconds: 30
      max_delay_seconds: 60
    signing:
      keyid: bundle-key

decision_logs:
  console: true

plugins:
  envoy_ext_authz_grpc:
    addr: :9191                    # gRPC server address
    path: envoy/authz/allow        # Rego rule path
    workers: 10                    # Concurrent workers
```

## Rego: Envoy Decision

```rego
package envoy.authz

import input.attributes.request.http

# Default deny
default allow = false

# Extract JWT claims
token = split(http.headers.authorization, " ")[1]
claims = io.jwt.decode(token)[1]

# Request context
path = http.path
method = http.method
body = input.attributes.request.http.body

# Authorization decision
allow {
    # Must have valid JWT
    claims.role != ""
    claims.sub != ""

    # Specific endpoint checks
    allow_public_paths
}

allow {
    # Authenticated access to protected resources
    claims.role != ""
    claims.sub != ""
    allow_authorized_path
}

# Public paths
allow_public_paths {
    startswith(path, "/api/public")
}

# RBAC + ABAC check
allow_authorized_path {
    # Extract resource from path
    matches := regex.find_nested_submatch_string("^/([a-z]+)/([a-z0-9-]+)", path, 1)
    resource_type = matches[0][1]
    resource_id = matches[0][2]

    # Map HTTP method to action
    actions := {"GET": "read", "POST": "create", "PUT": "update", "DELETE": "delete"}
    action := actions[method]

    # RBAC check
    roles := data.roles[claims.role].permissions
    perm := sprintf("%s.%s", [resource_type, action])
    roles[_] == perm

    # ABAC condition: same org
    data.users[claims.sub].org_id == data.resources[resource_type][resource_id].org_id
}

# Deny response
deny_response = {
    "allowed": false,
    "headers": {"x-denied-reason": "Access denied by authorization policy"},
    "body": "Access denied",
}
```

## Kubernetes Deployment

```yaml
# opa-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa
  labels:
    app: opa
spec:
  replicas: 2
  selector:
    matchLabels:
      app: opa
  template:
    metadata:
      labels:
        app: opa
    spec:
      containers:
      - name: opa
        image: openpolicyagent/opa:latest
        args:
          - "run"
          - "--server"
          - "--log-level=info"
          - "--decision-log-console=true"
          - "--config-file=/config/opa-config.yaml"
        ports:
          - containerPort: 8181    # HTTP API
          - containerPort: 9191    # Envoy ext_authz gRPC
        livenessProbe:
          httpGet:
            path: /health
            port: 8181
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health?plugins
            port: 8181
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
          - name: opa-config
            mountPath: /config
          - name: opa-policies
            mountPath: /policies
      volumes:
        - name: opa-config
          configMap:
            name: opa-config
        - name: opa-policies
          configMap:
            name: opa-policies

---
# OPA Service
apiVersion: v1
kind: Service
metadata:
  name: opa
spec:
  selector:
    app: opa
  ports:
    - name: http
      port: 8181
      targetPort: 8181
    - name: grpc
      port: 9191
      targetPort: 9191
---
# Envoy sidecar — for user services
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: envoy
        image: envoyproxy/envoy:v1.28-latest
        ports:
          - containerPort: 8080    # Ingress (with authz)
          - containerPort: 9901    # Admin
        volumeMounts:
          - name: envoy-config
            mountPath: /etc/envoy
      - name: app
        image: my-app:latest
        ports:
          - containerPort: 3000    # App (internal, behind Envoy)
```

## Performance Tuning

### OPA caching
```rego
# Cache expensive lookups
package cached

# Cache user data (5 minute TTL)
users_cache := data.users

# Cache resource metadata
resources_cache[type] := data.resources[type]
```

### Worker pool sizing
```
OPA workers = (expected_rps * avg_eval_time_ms) / 1000 * safety_factor

Example:
  expected_rps = 1000
  avg_eval_time = 0.5ms
  safety_factor = 2

  workers = (1000 * 0.5) / 1000 * 2 = 1 worker

  Actual: 2-4 workers for most deployments
```

### Benchmarking
```bash
# Load test OPA directly
opa eval --data policy.rego --input input.json "data.authz.allow" --bench --count 10000

# Load test with Envoy
hey -n 10000 -c 50 -H "Authorization: Bearer $JWT" http://localhost:8080/api/documents
```

### Common performance issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Large rule sets | High eval time (>5ms) | Rule indexing, early exit |
| Expensive Rego builtins | eval `http.send` calls | Pre-compute, cache |
| Large input documents | Serialization overhead | Strip unnecessary attributes |
| Bundle size | Slow policy loading | Split into smaller bundles |
| Decision logging | Disk IPS bottleneck | Batch log writes, async |
| gRPC connection limits | Connection timeouts | Increase worker count |

## Production Checklist

- [ ] Envoy `failure_mode_allow: false` (fail closed).
- [ ] OPA `--decision-log-console=true` for audit trail.
- [ ] gRPC health checks configured.
- [ ] Bundle signing enabled (prevent tampering).
- [ ] Policy bundle served from Git-backed CDN.
- [ ] At least 2 OPA replicas.
- [ ] CPU/memory limits set (1 CPU, 512Mi per replica typical).
- [ ] 250ms Envoy ext_authz timeout.
- [ ] Policy update tested in staging first.
- [ ] Decision logs shipped to SIEM.
- [ ] Load test with expected peak RPS.
- [ ] Failover: if OPA is down, Envoy should still fail closed.
- [ ] Monitoring: OPA metrics (`opa_decision_duration`, `opa_eval_count`).
