# Load Balancing — L4/L7, Health Contracts, Drain

## Layer Choice

| Layer | What it sees           | Use for                            | Examples                          |
|-------|------------------------|------------------------------------|-----------------------------------|
| L4    | TCP/UDP packets        | DB, gRPC mTLS, raw TCP, max TPS    | AWS NLB, HAProxy mode tcp, IPVS   |
| L7    | HTTP req/resp, headers | path/host routing, canary, WAF     | ALB, Nginx, HAProxy mode http, Envoy, Traefik |

Rule: use L4 in front of L7 when you need millions of TPS + L7 features (Envoy behind NLB pattern).

## Algorithm Choice

```
round-robin     equal weight, stateless workloads
least-conn      sticky long-lived conns (websocket, gRPC streams)
ip-hash         basic session affinity, NAT-friendly
consistent-hash cache locality, sharded backends, minimize re-shuffle on add/remove
ewma / p2c      latency-aware (Envoy least_request with power-of-two-choices)
maglev          consistent + balanced (Google), GCP TCP/UDP LB
random          surprisingly good at high cardinality
```

## Health-Check Contract (THE single most important spec)

```
GET /healthz   (liveness)
  - Returns 200 if process is up and event loop responsive
  - NO external dependencies checked
  - Used by: orchestrator (k8s livenessProbe) to restart pod
  - Frequency: every 10s, failure threshold 3

GET /readyz    (readiness)
  - Returns 200 ONLY when ready to serve traffic
  - Checks: DB connection ok, cache warm, migrations applied, feature flags loaded
  - Used by: LB to add/remove from pool
  - Frequency: every 2s, failure threshold 2, success threshold 2
  - Slow-start: ramp traffic over 30s after first success

GET /startupz  (startup, optional)
  - Returns 200 once first-time init finished (long warm-up)
  - Used by: k8s startupProbe to disable liveness during boot
  - Failure threshold: high (e.g., 30 × 10s = 5min)
```

App example (Node):
```ts
app.get('/healthz', (_, res) => res.status(200).end())          // dumb
app.get('/readyz',  async (_, res) => {
  if (!dbPool.isHealthy() || !cache.connected || migrationsApplied !== true)
    return res.status(503).end()
  res.status(200).end()
})
```

## Drain on Shutdown (zero-downtime deploy)

```
SIGTERM received
   │
   ▼
1. Flip /readyz to 503     (LB removes from pool after next check)
2. Wait 2 × LB check interval  (≥ 15s)
3. Stop accepting new connections
4. Wait for in-flight requests to finish (with hard timeout = req timeout)
5. Close DB pool gracefully
6. Exit 0
```

Kubernetes hook:
```yaml
lifecycle:
  preStop:
    exec:
      command: ["/bin/sh","-c","kill -SIGUSR1 1 && sleep 25"]
terminationGracePeriodSeconds: 60     # must exceed preStop + max request time
```

## HAProxy — Production-Grade Config

```haproxy
global
  maxconn 100000
  nbthread 8
  log stdout format raw local0
  ssl-default-bind-ciphersuites TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
  ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
  mode http
  timeout connect 2s
  timeout client  30s
  timeout server  30s
  timeout http-request 10s
  timeout queue 5s
  timeout tunnel 1h            # websockets
  option httplog
  option dontlognull
  option redispatch
  retries 2
  option forwardfor

resolvers consul
  nameserver consul1 10.0.0.10:8600
  resolve_retries 3
  timeout retry 1s
  hold valid 10s

frontend fe_api
  bind *:443 ssl crt /etc/ssl/api.pem alpn h2,http/1.1
  http-request set-header X-Request-Id %[uuid()] unless { req.hdr(X-Request-Id) -m found }
  acl is_canary req.hdr(X-Canary) -m str true
  use_backend be_api_canary if is_canary
  default_backend be_api

backend be_api
  balance leastconn
  option httpchk
  http-check send meth GET uri /readyz ver HTTP/1.1 hdr Host api.internal
  http-check expect status 200
  default-server inter 2s fall 2 rise 2 slowstart 30s observe layer7 \
                 error-limit 10 on-error mark-down maxconn 1000
  server-template api 10 _api._tcp.service.consul resolvers consul check
```

## Nginx — Upstream + Active Health (Plus) / Passive (OSS)

```nginx
upstream api {
    zone api 64k;
    least_conn;
    server 10.0.1.10:8080 max_fails=3 fail_timeout=10s slow_start=30s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=10s slow_start=30s;
    server 10.0.2.10:8080 backup;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    proxy_next_upstream error timeout http_502 http_503 http_504;
    proxy_next_upstream_tries 2;
    proxy_connect_timeout 2s;
    proxy_read_timeout 30s;

    location / {
        proxy_pass http://api;
        proxy_set_header X-Request-Id $request_id;
        proxy_set_header Host $host;
    }

    location = /lb-status { stub_status; access_log off; allow 10.0.0.0/8; deny all; }
}
```

## Envoy — Modern L7 with Outlier Detection

```yaml
clusters:
- name: api
  connect_timeout: 2s
  type: STRICT_DNS
  lb_policy: LEAST_REQUEST
  least_request_lb_config: {choice_count: 2}    # power-of-two-choices
  health_checks:
  - timeout: 1s
    interval: 2s
    unhealthy_threshold: 2
    healthy_threshold: 2
    http_health_check: {path: /readyz, expected_statuses: [{start: 200, end: 201}]}
  outlier_detection:
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50
  load_assignment:
    cluster_name: api
    endpoints:
    - lb_endpoints:
      - endpoint: {address: {socket_address: {address: api.internal, port_value: 8080}}}
```

## Cloud LB — Key Settings

```
AWS ALB / NLB:
  - target group: deregistration_delay = 30s (drain time)
  - health check: path=/readyz, interval=10s, threshold healthy=2 unhealthy=2
  - cross-zone load balancing: ENABLED (true cost of off-AZ traffic acceptable for HA)
  - sticky sessions: only if app forces it; prefer stateless

GCP Backend Service:
  - connection draining timeout = 30s
  - health check: HTTPS /readyz, interval 10s, timeout 5s, healthy 2, unhealthy 3
  - locality_lb_policy: MAGLEV for consistent + balanced

Azure Application Gateway:
  - cookie-based affinity off unless needed
  - health probe: pick a host header, interval 30s, threshold 3 (be aware: slow detection)
  - autoscale: min 2 / max 10 instances per zone
```

## DB-in-Front LB (ProxySQL / Pgpool / PgBouncer)

```
App ── ProxySQL ── master      (writes)
              └── replica1     (reads, weighted)
              └── replica2
              └── replica3

ProxySQL query rules:
  - regex SELECT...FOR UPDATE  → master
  - regex ^SELECT              → replica pool
  - else                       → master
  - max replication lag: 5s   (pulls lagged replicas out automatically)
```

```ini
# pgbouncer.ini — connection pooling, not LB but critical for HA
[databases]
app = host=primary.db port=5432 dbname=app pool_size=50
app_ro = host=replica-lb.db port=5432 dbname=app pool_size=200

[pgbouncer]
pool_mode = transaction
max_client_conn = 5000
default_pool_size = 50
reserve_pool_size = 10
server_lifetime = 3600
server_idle_timeout = 600
```

## Common Pitfalls

- Health-check checks `/healthz` instead of `/readyz` → LB sends traffic to non-ready pod
- Drain time < LB check interval × failure-threshold → in-flight requests dropped
- No slow-start → newly-added node thundering-herd cache miss → instant overload
- Single LB instance → LB itself is SPOF (deploy ≥ 2 with VRRP / cloud-managed)
- Session stickiness on stateless app → uneven load, breaks rolling deploys
- Health check too aggressive (interval 1s, threshold 1) → flapping under GC pause
