# API Gateway Performance Tuning

Reducing latency overhead and raising throughput of API gateways (NGINX, Envoy, Kong, APISIX). Most gains come from connection reuse, sensible timeouts, buffering choices, and keeping expensive plugins off the hot path.

## Where Gateway Latency Comes From

| Source | Typical cause | Fix |
|--------|---------------|-----|
| TLS handshakes | No session resumption, new connection per request | Keepalive, TLS 1.3, session tickets, HTTP/2 |
| Upstream connection setup | No upstream keepalive pool | Enable upstream keepalive / connection pooling |
| Plugins | Remote auth/introspection per request, heavy Lua/Wasm | Cache auth results, local JWT validation |
| Buffering | Large bodies buffered to disk | Tune buffer sizes or stream |
| DNS | Resolving per request or stale DNS | Resolver caching with TTL respect |
| Queueing | Too few workers, CPU saturation | Size workers to cores; scale out |

Measure gateway overhead as `total request time − upstream time` from access logs before tuning.

## Downstream (Client-Side) Connections

- Enable HTTP/2 for browser and mobile clients (multiplexing removes head-of-line blocking at HTTP level). HTTP/3 (QUIC) helps lossy mobile networks; supported in NGINX, Envoy, and most CDNs.
- TLS 1.3 with ECDSA certificates reduces handshake cost; enable session resumption.
- Client keepalive timeout long enough for clients to reuse connections (e.g. 60–75s). If a cloud load balancer sits in front of the gateway, make the gateway's keepalive timeout longer than the load balancer's idle timeout, so the LB (not the gateway) closes idle connections first.

## Upstream Connection Pooling

### NGINX

```nginx
upstream orders {
    server orders-1:8080;
    server orders-2:8080;
    keepalive 64;                 # idle connections cached per worker
    keepalive_requests 10000;
    keepalive_timeout 60s;
}

location /v1/orders {
    proxy_pass http://orders;
    proxy_http_version 1.1;
    proxy_set_header Connection "";   # required for upstream keepalive
}
```

Without `proxy_http_version 1.1` and clearing `Connection`, NGINX opens a new upstream connection per request.

### Envoy

```yaml
clusters:
  - name: orders
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        common_http_protocol_options: { idle_timeout: 60s }
        explicit_http_config:
          http2_protocol_options: { max_concurrent_streams: 100 }
    circuit_breakers:
      thresholds: [{ max_connections: 1024, max_pending_requests: 1024, max_requests: 1024 }]
```

Envoy pools are per worker thread; the default circuit-breaker thresholds (1024) can cap throughput for high-traffic clusters — raise them deliberately.

## Workers and CPU

| Gateway | Setting |
|---------|---------|
| NGINX / OpenResty / Kong / APISIX | `worker_processes auto;` + `worker_connections` (e.g. 16384) + `worker_rlimit_nofile` |
| Envoy | `--concurrency` defaults to hardware threads; in containers set it to the CPU limit |

In Kubernetes, CPU limits cause CFS throttling and latency spikes; set requests sized for p99 load and consider no CPU limit (or a generous one) for the gateway, with worker count matched to the request.

## Buffering and Large Bodies

```nginx
client_max_body_size 10m;
client_body_buffer_size 128k;     # bodies larger than this spill to disk
proxy_buffering on;               # default; off for SSE/streaming endpoints
proxy_buffers 16 16k;
proxy_buffer_size 16k;
```

- Turn `proxy_buffering off` (or `X-Accel-Buffering: no`) for server-sent events and streaming responses.
- For uploads, consider `proxy_request_buffering off` to stream to the upstream.
- Envoy streams by default; filters that need the full body (some auth, transformation) buffer it — avoid them on large-body routes.

## Timeouts

| Timeout | Guidance |
|---------|----------|
| Connect | Short (1–3s); fail fast to another endpoint |
| Upstream response / route | Per route, based on SLO; longer for reports, unlimited only for streams |
| Idle (client and upstream) | Upstream idle timeout below the backend's own keepalive timeout to avoid races that cause 502s |
| Retry per-try timeout | Smaller than the route timeout so retries fit in budget |

The classic intermittent-502 bug: gateway reuses an upstream connection the backend just closed. Fix by making the gateway's upstream idle timeout shorter than the backend server's keepalive timeout.

## Plugin and Auth Cost

- Validate JWTs locally with cached JWKS instead of calling an introspection endpoint per request; if introspection is required, cache results for a short TTL bounded by token expiry.
- Order cheap rejections first: IP allow/deny and rate limiting before auth calls and body transformations.
- Rate limiting with a central Redis adds a network round trip per request; use local limiting with periodic sync or Envoy's local rate limit plus a coarser global limit.
- Avoid regex-heavy routing on hot paths; prefer prefix/exact matches.

## Caching at the Gateway

```nginx
proxy_cache_path /var/cache/nginx keys_zone=api_cache:50m max_size=2g inactive=10m use_temp_path=off;

location /v1/catalog {
    proxy_cache api_cache;
    proxy_cache_valid 200 60s;
    proxy_cache_use_stale error timeout updating http_502 http_503;
    proxy_cache_lock on;              # collapse concurrent misses for the same key
    proxy_pass http://catalog;
}
```

Only cache responses that are public or keyed by the identity that varies them.

## Compression

Compress text responses (gzip or brotli) at the gateway if backends do not; skip already-compressed types and small bodies. Compression costs CPU, so offload to a CDN when possible.

## Load Testing the Gateway

- Test with realistic connection reuse (many clients, keepalive) and TLS, not one connection hammering one route.
- Use open-model load (constant arrival rate, e.g. k6 `constant-arrival-rate`) to see queueing.
- Compare against direct-to-backend to isolate gateway overhead.

## Pitfalls

- Upstream keepalive not enabled → ephemeral port exhaustion and high latency.
- CPU limits throttling gateway pods during spikes.
- Buffering SSE responses so clients receive nothing until completion.
- Circuit breaker defaults silently rejecting requests (`UO` / overflow flags in Envoy).

## Checklist

- [ ] HTTP/2 and TLS 1.3 to clients; keepalive tuned
- [ ] Upstream connection pooling enabled and verified in metrics
- [ ] Worker count matches CPU allocation
- [ ] Per-route timeouts; idle timeouts shorter than backends'
- [ ] Auth validated locally or cached
- [ ] Streaming routes unbuffered
- [ ] Gateway overhead measured under realistic load
