# API Gateway Comparison

## Feature Matrix

| Feature | Kong | NGINX | AWS API GW | Azure APIM | Apigee | APISIX | Tyk | KrakenD | Envoy | Spring CG | Traefik | HAProxy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Type** | Proxy+Plugin | Reverse Proxy | Managed | Managed | Managed | Proxy+Plugin | Proxy+Plugin | Proxy | L7 Proxy | Reactive Proxy | Reverse Proxy | L4/L7 Proxy |
| **Open Source** | Yes (CE) | Yes | No | No | No | Yes | Yes (CE) | Yes | Yes | Yes | Yes | Yes |
| **Managed SaaS** | Konnect | No | Yes | Yes | Yes | No | Tyk Cloud | No | No | No | No | No |
| **K8s Ingress** | Yes | Yes (Ingress Nginx) | No (ALB Ingress) | Yes (AGIC) | Yes (Apigee Adapter) | Yes | Yes | No | Yes (Envoy Gateway) | No | Yes | No |
| **Hot Reload** | Yes | No (reload) | N/A | N/A | N/A | Yes | Yes | No (static) | Yes (xDS) | No (restart) | Yes | No (reload) |
| **Auth Plugins** | JWT, OAuth2, OIDC, Basic, HMAC, LDAP, OpenID | Lua/custom | Cognito, Lambda, IAM, Custom | Azure AD, JWT, OAuth2, mTLS | OAuth2, SAML, OIDC, LDAP | JWT, OAuth2, OIDC, Basic, HMAC, LDAP | JWT, OAuth2, OIDC, SAML, Basic, LDAP | JWT, Basic, OAuth2 (via proxy) | JWT, OAuth2, OIDC, mTLS, custom filter | Spring Security, OAuth2, OIDC, JWT | JWT, Basic, OIDC, Forward Auth | Basic, mTLS, Lua |
| **Rate Limiting** | Local/Redis | ngx_http_limit_req | Usage Plans, Per-method | Rate limit policy | Per-product, per-developer | limit-count, limit-req | In-memory, Redis | Fixed config | Local/Global, gRPC | RequestRateLimiter | RateLimit middleware | stick-table |
| **Caching** | Proxy Cache, Redis | proxy_cache, Redis | API Cache (HTTP API) | Response caching policy | Response cache | proxy-cache, Redis | In-memory, Redis | HTTP cache | Cache filter (L3/L7) | Local cache | No | No |
| **Circuit Breaker** | No (upstream health) | proxy_next_upstream | No | No | No | No | Yes (API-level) | Circuit breaker (config) | Outlier detection | Resilience4j | Circuit breaker | Server health check |
| **Canary** | Canary plugin | split_clients | Canary (deploy) | Slots (sliding) | Canary deployment | traffic-split | Canary release | config weight | Cluster weight, runtime | Weighted config | Weighted services | Weighted server |
| **Protocols** | HTTP, HTTPS, GRPC, GRPC-Web, WS, TCP | HTTP, HTTPS, WS, TCP, UDP | HTTP, HTTPS, WS | HTTP, HTTPS, WS, GRPC | HTTP, HTTPS, GRPC, WS | HTTP, HTTPS, GRPC, WS, TCP, MQTT | HTTP, HTTPS, GRPC, WS, TCP | HTTP, HTTPS, GRPC | HTTP, HTTPS, GRPC, HTTP/2, TCP, UDP | HTTP, HTTPS, WS | HTTP, HTTPS, GRPC, WS, TCP, UDP | HTTP, HTTPS, GRPC, TCP, UDP |
| **GraphQL** | Yes (plugin) | No | No | Yes (policy) | Yes | Yes | No | No | Yes (WASM/filter) | No | No | No |
| **gRPC** | Yes (plugin) | No (gRPC pass) | Yes (HTTP/2) | Yes | Yes | Yes | Yes (plugin) | Yes | Native | No | Yes | HTTP/2 only |
| **WebSocket** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes | Yes | Yes | TCP mode |
| **Serverless** | Lambda plugin | Lua/script | Native Lambda | Azure Functions | Cloud Functions | serverless plugin | Cloud plugin | No | Lambda filter | No | No | No |
| **Service Discovery** | DNS, K8s, Consul | DNS, upstream | NLB/VPC | Internal LB | N/A | DNS, K8s, Consul, Eureka | DNS, K8s, Consul | DNS, static | xDS, K8s, Consul, Eureka | DiscoveryClient | K8s, Docker, Consul | DNS, static |
| **OpenTelemetry** | Yes (plugin) | Lua/OTel | No (CloudWatch) | App Insights | Yes | Yes | Yes | No | Native (xDS) | Micrometer | Yes (plugin) | No |
| **WAF** | No (plugin) | No | AWS WAF | Azure WAF | Apigee WAF | No | Tyk WAF (beta) | No | WASM (Coraza) | No | OWASP (plugin) | No |
| **Dev Portal** | Yes | No | No | Yes | Yes | Yes (Apache APISIX Dashboard) | Yes | No | No | No | No | No |
| **Analytics** | Vitals, Prometheus | Prometheus exporter | CloudWatch | App Insights | Analytics dashboard | Prometheus plugin | Tyk Analytics | Prometheus, InfluxDB | Native stats, Prometheus | Micrometer, Prometheus | Prometheus, Traefik Pilot | HAProxy stats |
| **Performance** | ~20K req/s (CE) | ~100K+ req/s | ~10K req/s (throttled) | ~5K req/s (Basic) | ~2K req/s | ~50K req/s | ~10K req/s | ~100K+ req/s | ~50K req/s | ~10K req/s | ~30K req/s | ~500K+ req/s |

## Selection Decision Tree

```
Need managed cloud API gateway?
  ├── Using AWS? → AWS API Gateway (REST/HTTP/WebSocket/Private)
  ├── Using Azure? → Azure API Management
  ├── Using GCP? → Apigee or GCP API Gateway
  └── Multi-cloud or on-prem?
      ├── Need API management portal + analytics? → Kong or Tyk
      └── Need high performance, no portal? → KrakenD or APISIX

Need open-source self-hosted?
  ├── Need plugin ecosystem + K8s ingress?
  │   ├── Kong (mature, enterprise)
  │   └── APISIX (faster, hot-reload)
  ├── Need extreme performance + custom logic?
  │   └── NGINX/OpenResty (Lua scripting)
  ├── Service mesh / cloud-native?
  │   └── Envoy (xDS, WASM, gRPC)
  ├── Java/Spring ecosystem?
  │   └── Spring Cloud Gateway
  ├── Simple auto-discovery + Let's Encrypt?
  │   └── Traefik
  ├── TCP/UDP high-throughput?
  │   └── HAProxy
  └── Ultra-low latency aggregation?
      └── KrakenD

Hybrid/multi-cloud API program?
  └── Tyk (MDCB, multi-cloud sync)

Already have NGINX in production?
  └── Extend with OpenResty Lua, don't replace.
```

## Performance Comparison

| Gateway | P50 (μs) | P99 (μs) | Max req/s (1 core) | Notes |
|---|---|---|---|---|
| HAProxy | 50 | 150 | 500,000+ | Pure proxy, no auth |
| NGINX | 80 | 200 | 300,000+ | Lua adds ~200μs |
| KrakenD | 100 | 300 | 200,000+ | Static config, no plugin overhead |
| APISIX | 200 | 500 | 100,000+ | Plugin chain adds latency |
| Envoy | 300 | 800 | 80,000+ | Rich filter chain, WASM slower |
| Traefik | 400 | 1000 | 50,000+ | Auto-discovery adds overhead |
| Kong | 500 | 1500 | 30,000+ | Plugin DB lookup |
| Spring CG | 1000 | 3000 | 15,000+ | Java VM overhead |
| Tyk | 1500 | 4000 | 10,000+ | Go + RPC for distributed |
| AWS API GW | 2000 | 5000 | 10,000+ | Throttled, cold start |
| Azure APIM | 3000 | 8000 | 5,000+ | Policy execution overhead |
| Apigee | 5000 | 15000 | 2,000+ | Message processor overhead |

## Cost Comparison

| Provider | Pricing Model | Cost Estimate (100M req/mo) |
|---|---|---|
| **Kong CE** | Free (self-hosted) | Infrastructure only (~$100/mo) |
| **NGINX** | Free (OSS) | Infrastructure only (~$50/mo) |
| **KrakenD** | Free (OSS) | Infrastructure only (~$50/mo) |
| **APISIX** | Free (OSS) | Infrastructure only (~$100/mo) |
| **Envoy** | Free (OSS) | Infrastructure only (~$200/mo) |
| **Traefik** | Free (OSS) | Infrastructure only (~$100/mo) |
| **HAProxy** | Free (OSS) | Infrastructure only (~$50/mo) |
| **Spring CG** | Free (OSS) | Infrastructure (~$200/mo) |
| **Tyk CE** | Free (CE) | Infrastructure (~$150/mo) |
| **AWS API GW** | $3.50/M + $0.09/1M | ~$12,500/mo |
| **Azure APIM** | $0.70-13.30/hr (Premium) | ~$500-10,000/mo |
| **Apigee** | $0.01-0.05/API call | ~$1,000-5,000/mo |
| **Kong Konnect** | $0.025/1M calls | ~$2,500/mo |
| **Tyk Cloud** | $500-5000/mo | ~$500-5,000/mo |

## Migration Paths

```
NGINX → Kong:           Keep NGINX as edge, add Kong for API management
NGINX → APISIX:         Migrate config one route at a time, APISIX supports similar Lua
AWS API GW → Kong:      Export OpenAPI, import to Kong via deck
Spring CG → Envoy:      Side-by-side, migrate routes gradually, Envoy xDS for dynamic
Tyk → Kong:             Export APIs via Tyk API, import to Kong via deck
HAProxy → Envoy:        HAProxy as L4 edge, Envoy as L7 gateway inside
```
