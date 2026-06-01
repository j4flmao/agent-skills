# Service Mesh Debugging and Troubleshooting

## Common Issues
Envoy sidecar not starting: check injection label, sidecar resources, init container. mTLS handshake failure: mismatched root CA, expired certificate, wrong SAN. 503 Upstream Connect Error: no endpoints, circuit breaker open, health check failing. 403 RBAC denied: authorization policy blocking request. Connection timeout: upstream service not responding, network policy blocking.

## Debugging Tools
istioctl proxy-status: check Envoy sync status and versions. istioctl proxy-config: inspect Envoy config (clusters, listeners, routes). istioctl experimental describe: describe pod config and policies. Envoy admin endpoint: localhost:15000 for Envoy config and stats. Kiali: service mesh graph and traffic visualization.

## Traffic Flow Verification
Request routing verification: curl with specific headers vs destination. Trace propagation: verify trace context flows through sidecars. Access logs: enable Envoy access logs for request-level debugging. Protocol inspection: HTTP/1.1, HTTP/2, gRPC traffic inspection. Fault injection testing: delay and abort for resilience testing.

## Certificate Troubleshooting
Certificate chain verification: validate intermediate and root CAs. Certificate expiry monitoring: alert before 30-day expiry. CSR issues: check Istiod CA service status. Secret inspection: verify TLS secrets in istio-system namespace. mTLS mode: PERMISSIVE vs STRICT, check peer authentication.

## Performance Debugging
Latency breakdown: sidecar overhead vs application time. Connection pool exhaustion: increase max connections or reduce pool size. Circuit breaker: verify outlier detection and ejection thresholds. Memory/CPU of sidecar: adjust sidecar resource limits. Envoy stats: cluster.upstream_rq_time, listener.downstream_rq_time.

## Mesh Expansion
VM workload injection: verify DNS, network connectivity, cert delivery. Multi-cluster mesh: verify endpoint discovery across clusters. Gateway issues: check gateway configuration, TLS cert mount, listener bind.

## References
- service-mesh-fundamentals.md -- Fundamentals
- service-mesh-architecture.md -- Architecture
- istio-patterns.md -- Istio Patterns
- linkerd-patterns.md -- Linkerd Patterns
- mesh-observability.md -- Observability
