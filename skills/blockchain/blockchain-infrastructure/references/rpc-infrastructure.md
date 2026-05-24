# RPC Infrastructure

## Architecture Overview

```
                         ┌─────────────┐
                         │  Cloudflare  │
                         │  (DDoS/WAF)  │
                         └──────┬──────┘
                                │
                         ┌──────┴──────┐
                         │   HAProxy   │
                         │  (TLS term) │
                         └──────┬──────┘
                                │
                    ┌───────────┴───────────┐
                    │       Redis Cache     │
                    │  (eth_call, balances)  │
                    └───────────┬───────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
   ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐
   │  Node (us)  │      │  Node (eu)  │      │  Node (ap)  │
   │  full/arch  │      │  full/arch  │      │  full/arch  │
   └─────────────┘      └─────────────┘      └─────────────┘
```

## Load Balancing with HAProxy

### haproxy.cfg — Ethereum RPC
```haproxy
global
    log /dev/log local0
    maxconn 10000
    tune.ssl.default-dh-param 2048

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000
    timeout client 30000
    timeout server 30000
    timeout tunnel 3600000    # 1h for WSS

frontend rpc_http_frontend
    bind *:443 ssl crt /etc/ssl/certs/rpc.pem
    bind *:8545
    http-request set-header X-Forwarded-Proto https if { ssl_fc }

    # Rate limiting per IP
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }

    # Path-based routing
    use_backend rpc_backend if { path /v1/ethereum }
    use_backend ws_backend if { path /v1/ethereum/ws }

    default_backend rpc_backend

frontend rpc_ws_frontend
    bind *:443 ssl crt /etc/ssl/certs/rpc.pem
    bind *:8546
    timeout client 3600000
    timeout server 3600000

    default_backend ws_backend

backend rpc_backend
    balance leastconn

    # Health check via eth_blockNumber
    option httpchk POST / HTTP/1.1\r\nHost:\ localhost
    http-check send hdr Content-Type application/json
    http-check expect string "result"
    http-check send {\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}

    # Backend nodes — geographically distributed
    server node-us1 10.0.1.10:8545 check inter 10s fall 3 rise 2 weight 100
    server node-eu1 10.0.2.10:8545 check inter 10s fall 3 rise 2 weight 100
    server node-ap1 10.0.3.10:8545 check inter 10s fall 3 rise 2 weight 80

    # Backup node if all primary are down
    server node-backup 10.0.4.10:8545 check inter 30s backup

backend ws_backend
    balance leastconn
    option tcp-check

    # Sticky sessions via source IP
    stick-table type ip size 100k expire 1h
    stick on src

    server node-us1 10.0.1.10:8546 check inter 10s fall 3 rise 2 weight 100
    server node-eu1 10.0.2.10:8546 check inter 10s fall 3 rise 2 weight 100
    server node-ap1 10.0.3.10:8546 check inter 10s fall 3 rise 2 weight 80
```

## Rate Limiting with Nginx

### nginx.conf — RPC Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=rpc_global:10m rate=100r/s;
limit_req_zone $http_x_api_key zone=rpc_key_standard:10m rate=1000r/s;
limit_req_zone $http_x_api_key zone=rpc_key_premium:10m rate=10000r/s;
limit_conn_zone $binary_remote_addr zone=rpc_conn:10m;
limit_conn_zone $http_x_api_key zone=rpc_key_conn:10m;

upstream eth_nodes {
    least_conn;
    server 10.0.1.10:8545 max_fails=3 fail_timeout=30s;
    server 10.0.2.10:8545 max_fails=3 fail_timeout=30s;
    server 10.0.3.10:8545 max_fails=3 fail_timeout=30s backup;
}

server {
    listen 443 ssl http2;
    server_name rpc.example.com;

    ssl_certificate     /etc/ssl/certs/rpc.example.com.pem;
    ssl_certificate_key /etc/ssl/private/rpc.example.com-key.pem;

    location /v1/ethereum {
        # API key validation
        if ($http_x_api_key = "") {
            return 401;
        }

        # Rate limit based on key tier
        set $rate_limit_zone rpc_key_standard;
        if ($http_x_api_key ~* "premium-") {
            set $rate_limit_zone rpc_key_premium;
        }
        limit_req zone=$rate_limit_zone burst=50 nodelay;
        limit_conn rpc_key_conn 50;

        # IP-level fallback rate limit
        limit_req zone=rpc_global burst=20 nodelay;
        limit_conn rpc_conn 10;

        proxy_pass http://eth_nodes;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Response caching for read methods
        proxy_cache rpc_cache;
        proxy_cache_key "$request_method$request_uri$request_body";
        proxy_cache_valid 200 1s;
        proxy_cache_min_uses 2;
        proxy_cache_use_stale error timeout updating;
    }

    location /v1/ethereum/ws {
        proxy_pass http://eth_nodes;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;

        # WebSocket rate limiting
        limit_conn rpc_conn 5;
    }
}
```

## Caching Layer (Redis)

### Cache Patterns
```python
# redis_cache.py — Example cache middleware
import json
import hashlib
import redis.asyncio as redis
from time import time

rpc_cache = redis.Redis(host="10.0.10.10", port=6379, decode_responses=True)

CACHE_TTL = {
    "eth_blockNumber": 1,         # 1 second
    "eth_getBalance": 12,         # 12 seconds
    "eth_call": 30,               # 30 seconds (if view function)
    "eth_gasPrice": 5,            # 5 seconds
    "eth_getTransactionCount": 5, # 5 seconds
    "eth_chainId": 3600,          # 1 hour
    "net_version": 3600,          # 1 hour
}

def cache_key(method: str, params: list) -> str:
    body = json.dumps({"method": method, "params": params}, sort_keys=True)
    return f"rpc:{method}:{hashlib.md5(body.encode()).hexdigest()}"

async def get_cached(method: str, params: list):
    if method not in CACHE_TTL:
        return None
    key = cache_key(method, params)
    result = await rpc_cache.get(key)
    return json.loads(result) if result else None

async def set_cache(method: str, params: list, result, ttl_override=None):
    if method not in CACHE_TTL:
        return
    key = cache_key(method, params)
    ttl = ttl_override or CACHE_TTL[method]
    await rpc_cache.setex(key, ttl, json.dumps(result))

# Methods that MUST NOT be cached
WRITE_METHODS = {
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "personal_sign",
    "eth_sign",
    "eth_signTypedData",
    "eth_sendBundle",
}
```

## WebSocket Connection Management

### Sticky Session Configuration (HAProxy)
```haproxy
backend ws_backend
    balance leastconn

    # Stick on source IP for consistent node assignment
    stick-table type ip size 500k expire 24h
    stick on src

    # WebSocket health check
    option tcp-check
    tcp-check connect
    tcp-check expect string "HTTP/1.1 101"

    server ws-us1 10.0.1.10:8546 check inter 10s fall 3 rise 2 maxconn 2000
    server ws-eu1 10.0.2.10:8546 check inter 10s fall 3 rise 2 maxconn 2000
    server ws-ap1 10.0.3.10:8546 check inter 10s fall 3 rise 2 maxconn 1500
```

### Connection Limits per Backend
```yaml
# Limit connections to prevent node overload
server ws-us1 10.0.1.10:8546 check maxconn 2000
server ws-eu1 10.0.2.10:8546 check maxconn 2000

# Global pool limits
global
    maxconn 50000
    nbproc 4
    cpu-map 1 0
    cpu-map 2 1
    cpu-map 3 2
    cpu-map 4 3
```

## API Key Management

### Key Configuration (JSON)
```json
{
  "projects": {
    "proj_abc123": {
      "name": "Production dApp",
      "tier": "premium",
      "rate_limit": 10000,
      "allowed_methods": ["eth_*", "net_*", "web3_*"],
      "blocked_methods": ["miner_*", "admin_*", "debug_*"],
      "allowed_origins": ["https://app.example.com"],
      "allowed_ips": ["203.0.113.0/24"],
      "max_connections": 100,
      "enabled": true
    },
    "proj_def456": {
      "name": "Public explorer",
      "tier": "free",
      "rate_limit": 100,
      "allowed_methods": ["eth_blockNumber", "eth_getBalance", "eth_call"],
      "blocked_methods": ["*"],
      "allowed_origins": ["*"],
      "allowed_ips": [],
      "max_connections": 10,
      "enabled": true
    }
  }
}
```

## Security Configuration

### Cloudflare WAF Rules
```text
# Block known bad actors
Rule: (http.host eq "rpc.example.com" and ip.geoip.country in {"XX" "YY"})
→ Block

# Rate limit per IP
Rule: (http.host eq "rpc.example.com" and cf.threat_score gt 50)
→ Block

# Allowlist trusted partners
Rule: (http.host eq "rpc.example.com" and ip.src in {203.0.113.0/24})
→ Skip all remaining rules

# Layer 7 DDoS mitigation
Rule: (http.host eq "rpc.example.com" and http.request.rate > 1000 requests in 10 seconds)
→ Challenge (CAPTCHA)
```

### Mutual TLS for Private RPC
```yaml
# Docker Compose — mTLS sidecar
version: "3.8"
services:
  envoy:
    image: envoyproxy/envoy:v1.28-latest
    volumes:
      - ./envoy.yaml:/etc/envoy/envoy.yaml
      - ./certs/server.pem:/etc/envoy/certs/server.pem
      - ./certs/server-key.pem:/etc/envoy/certs/server-key.pem
      - ./certs/ca.pem:/etc/envoy/certs/ca.pem
    ports:
      - "443:443"

  geth:
    image: ethereum/client-go:v1.14.0
    ports:
      - "8545"
    command: >
      --http --http.addr 0.0.0.0
      --http.port 8545
      --http.api eth,net,web3
```

### Envoy mTLS Config
```yaml
static_resources:
  listeners:
  - name: rpc_listener
    address:
      socket_address: { address: 0.0.0.0, port_value: 443 }
    filter_chains:
    - filter_chain_match:
        transport_protocol: tls
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
          common_tls_context:
            tls_certificates:
            - certificate_chain: { filename: "/etc/envoy/certs/server.pem" }
              private_key: { filename: "/etc/envoy/certs/server-key.pem" }
            validation_context:
              trusted_ca: { filename: "/etc/envoy/certs/ca.pem" }
              match_subject_alt_names:
                - exact: "client.dapp.example.com"
            require_client_certificate: true
      filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: rpc_http
          route_config:
            virtual_hosts:
            - name: rpc
              domains: ["*"]
              routes:
              - match: { prefix: "/" }
                route:
                  cluster: geth_backend
          http_filters:
          - name: envoy.filters.http.router
  clusters:
  - name: geth_backend
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: geth_backend
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: geth, port_value: 8545 }
```
