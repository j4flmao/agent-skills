# Kong Gateway Configuration

## Declarative Config (DB-less Mode)

```yaml
# kong.yml
_format_version: "3.0"
_transform: true

services:
  - name: auth-service
    url: http://auth.internal:8080
    protocol: http
    connect_timeout: 5000
    read_timeout: 10000
    write_timeout: 10000
    retries: 3
    routes:
      - name: auth-login
        paths:
          - /api/auth/login
        methods: [POST]
        strip_path: false
      - name: auth-verify
        paths:
          - /api/auth/verify
        methods: [POST]
        strip_path: false

  - name: user-service
    url: http://users.internal:8080
    routes:
      - name: user-crud
        paths:
          - /api/users
        methods: [GET, POST, PUT, DELETE, PATCH]
        strip_path: false
        plugins:
          - name: jwt
            config:
              claims_to_verify: [exp]
          - name: rate-limiting
            config:
              minute: 100
              policy: redis
              redis_host: redis.internal
              redis_port: 6379
          - name: cors
          - name: prometheus

consumers:
  - username: admin-client
    custom_id: "client-admin-01"
  - username: public-client
    custom_id: "client-public-01"

jwt_secrets:
  - consumer: admin-client
    secret: "${JWT_ADMIN_SECRET}"
    algorithm: HS256
    key: admin-issuer

plugins:
  - name: cors
    config:
      origins:
        - "https://app.example.com"
      methods: [GET, POST, PUT, DELETE, OPTIONS]
      headers: [Authorization, Content-Type]
      credentials: true
  - name: rate-limiting
    config:
      minute: 1000
      policy: redis
      fault_tolerant: true
  - name: prometheus
    config:
      status_code_metrics: true
      latency_metrics: true
      bandwidth_metrics: true
      upstream_health_metrics: true
  - name: correlation-id
    config:
      header_name: X-Request-ID
      generator: uuid
      echo_downstream: true
  - name: file-log
    config:
      path: /var/log/kong/access.log
      reopen: true
  - name: request-size-limiting
    config:
      allowed_payload_size: 10
```

## Key Auth Plugin

```yaml
plugins:
  - name: key-auth
    service: public-api
    config:
      key_names:
        - apikey
      key_in_body: false
      key_in_header: true
      key_in_query: true
      hide_credentials: true
      anonymous: null
      run_on_preflight: true
```

## OAuth2 Plugin

```yaml
plugins:
  - name: oauth2
    service: auth-service
    config:
      scopes:
        - read
        - write
        - admin
      mandatory_scope: true
      provision_key: "${OAUTH2_PROVISION_KEY}"
      token_expiration: 7200
      enable_authorization_code: true
      enable_client_credentials: true
      enable_password_grant: true
      hide_credentials: true
      refresh_token_ttl: 1209600
```

## Rate Limiting Advanced

```yaml
plugins:
  - name: rate-limiting-advanced
    config:
      limit:
        - 100
      window_size:
        - 60
      window_type: sliding
      retry_after_jitter_max: 0
      sync_rate: -1
      namespace: api-rate-limit
      strategy: redis
      redis:
        host: redis.internal
        port: 6379
        database: 0
        timeout: 2000
```

## Proxy Cache

```yaml
plugins:
  - name: proxy-cache
    config:
      response_code:
        - 200
        - 301
        - 404
      request_method:
        - GET
        - HEAD
      content_type:
        - application/json
        - text/plain
        - application/xml
      cache_ttl: 60
      strategy: memory
      memory:
        dictionary_name: kong-cache
```

## Canary / Blue-Green

```yaml
plugins:
  - name: canary
    service: order-service
    config:
      percentage: 10
      upstream_host: orders-v2.internal
      upstream_port: 8080
      hash: none
  - name: blue-green
    service: payment-service
    config:
      blue:
        host: payments-blue.internal
        port: 8080
      green:
        host: payments-green.internal
        port: 8080
      active: blue
```

## IP Restriction

```yaml
plugins:
  - name: ip-restriction
    config:
      allow:
        - 10.0.0.0/8
        - 172.16.0.0/12
        - 192.168.0.0/16
      deny:
        - 0.0.0.0/0
```

## Request Transformer

```yaml
plugins:
  - name: request-transformer
    config:
      add:
        headers:
          - X-Forwarded-Proto:https
          - X-Gateway:kong
      remove:
        headers:
          - X-Internal-Token
      rename:
        headers:
          - X-User-ID:X-Kong-User-ID
```

## Response Transformer

```yaml
plugins:
  - name: response-transformer
    config:
      add:
        headers:
          - X-Gateway-Response-Time:$context
      remove:
        headers:
          - Server
          - X-Powered-By
```

## Upstream Health Checks

```yaml
upstreams:
  - name: user-service-upstream
    algorithm: round-robin
    healthchecks:
      active:
        type: http
        http_path: /health
        healthy:
          interval: 10
          successes: 3
          http_statuses:
            - 200
        unhealthy:
          interval: 5
          http_failures: 3
          tcp_failures: 2
          timeouts: 2
          http_statuses:
            - 429
            - 503
      passive:
        type: http
        healthy:
          http_statuses:
            - 200
            - 201
          successes: 3
        unhealthy:
          http_failures: 3
          tcp_failures: 3
          timeouts: 3
          http_statuses:
            - 429
            - 503
targets:
  - target: user-service-1.internal:8080
    weight: 100
  - target: user-service-2.internal:8080
    weight: 100
```

## Kong Ingress Controller (Kubernetes)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  annotations:
    kubernetes.io/ingress.class: kong
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 8080
          - path: /api/orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 8080
---
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit
plugin: rate-limiting
config:
  minute: 100
  policy: redis
---
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: user-service-config
proxy:
  protocol: http
  retries: 3
  connect_timeout: 5000
  read_timeout: 10000
route:
  methods:
    - GET
    - POST
    - PUT
    - DELETE
  strip_path: false
```
