# Envoy Gateway Configuration

## Static Configuration (Bootstrap)

```yaml
static_resources:
  listeners:
    - name: public_listener
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 443
      listener_filters:
        - name: envoy.filters.listener.tls_inspector
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.listener.tls_inspector.v3.TlsInspector
      filter_chains:
        - filter_chain_match:
            transport_protocol: tls
            application_protocols:
              - h2
              - http/1.1
          transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              common_tls_context:
                tls_certificates:
                  - certificate_chain:
                      filename: /etc/envoy/certs/api.crt
                    private_key:
                      filename: /etc/envoy/certs/api.key
                tls_params:
                  tls_minimum_protocol_version: TLSv1_2
                  tls_maximum_protocol_version: TLSv1_3
          filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                codec_type: AUTO
                use_remote_address: true
                generate_request_id: true
                preserve_external_request_id: true
                access_log:
                  - name: envoy.access_loggers.file
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
                      path: /var/log/envoy/access.log
                      format: '{"time":"%START_TIME%","method":"%REQ(:METHOD)%","path":"%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%","protocol":"%PROTOCOL%","response_code":"%RESPONSE_CODE%","response_flags":"%RESPONSE_FLAGS%","bytes_received":"%BYTES_RECEIVED%","bytes_sent":"%BYTES_SENT%","duration":"%DURATION%","upstream_service_time":"%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%","x_forwarded_for":"%REQ(X-FORWARDED-FOR)%","user_agent":"%REQ(USER-AGENT)%","request_id":"%REQ(X-REQUEST-ID)%","authority":"%REQ(:AUTHORITY)%","upstream_host":"%UPSTREAM_HOST%","upstream_cluster":"%UPSTREAM_CLUSTER%","upstream_local_address":"%UPSTREAM_LOCAL_ADDRESS%","downstream_remote_address":"%DOWNSTREAM_REMOTE_ADDRESS%","downstream_local_address":"%DOWNSTREAM_LOCAL_ADDRESS%"}'
                route_config:
                  name: api_routes
                  virtual_hosts:
                    - name: api
                      domains:
                        - "api.example.com"
                      routes:
                        - match:
                            prefix: "/api/users"
                            headers:
                              - name: ":method"
                                regex_match: "GET|POST|PUT|DELETE"
                          route:
                            cluster: user_service
                            timeout: 10s
                            idle_timeout: 60s
                            retry_policy:
                              retry_on: "5xx,gateway-error,connect-failure,reset"
                              num_retries: 2
                              retry_host_predicate:
                                - name: envoy.retry_host_predicates.previous_hosts
                              host_selection_retry_max_attempts: 3
                              retry_back_off:
                                base_interval: 0.1s
                                max_interval: 1s
                            rate_limits:
                              - actions:
                                  - remote_address: {}
                        - match:
                            prefix: "/api/orders"
                          route:
                            cluster: order_service
                            timeout: 15s
                            retry_policy:
                              retry_on: "5xx"
                              num_retries: 1
                        - match:
                            prefix: "/api/public"
                          route:
                            cluster: public_service
                            timeout: 5s
                            auto_host_rewrite: true
                        - match:
                            prefix: "/health"
                          route:
                            cluster: health_service
                            timeout: 2s
                      cors:
                        allow_origin_string_match:
                          - prefix: "https://app.example.com"
                        allow_methods: GET, POST, PUT, DELETE, OPTIONS
                        allow_headers: Authorization, Content-Type, X-Request-ID
                        expose_headers: X-RateLimit-Remaining, X-Request-ID
                        max_age: "86400"
                        credentials: true
                http_filters:
                  - name: envoy.filters.http.jwt_authn
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
                      providers:
                        my_provider:
                          issuer: https://auth.example.com
                          audiences:
                            - api://default
                          from_headers:
                            - name: Authorization
                              value_prefix: "Bearer "
                          remote_jwks:
                            http_uri:
                              uri: https://auth.example.com/.well-known/jwks.json
                              cluster: auth_cluster
                              timeout: 5s
                            cache_duration: 300s
                          payload_in_metadata: my_payload
                      rules:
                        - match:
                            prefix: /api/public
                          requires:
                            allows_missing: {}
                        - match:
                            prefix: /
                          requires:
                            provider_name: my_provider
                  - name: envoy.filters.http.cors
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: user_service
      connect_timeout: 5s
      type: STRICT_DNS
      dns_lookup_family: V4_ONLY
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: user_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: users.internal
                      port_value: 8080
              - endpoint:
                  address:
                    socket_address:
                      address: users.internal
                      port_value: 8081
      circuit_breakers:
        thresholds:
          - priority: DEFAULT
            max_connections: 1024
            max_pending_requests: 1024
            max_requests: 1024
            max_retries: 5
      outlier_detection:
        consecutive_5xx: 3
        interval: 30s
        base_ejection_time: 60s
        max_ejection_percent: 50
        enforcing_consecutive_5xx: 100
        success_rate_minimum_hosts: 5
        success_rate_request_volume: 100
        success_rate_stdev_factor: 1900
      health_checks:
        timeout: 1s
        interval: 10s
        unhealthy_threshold: 3
        healthy_threshold: 2
        http_health_check:
          path: /health

    - name: order_service
      connect_timeout: 5s
      type: STRICT_DNS
      lb_policy: LEAST_REQUEST
      load_assignment:
        cluster_name: order_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: orders.internal
                      port_value: 8080

    - name: auth_cluster
      connect_timeout: 2s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: auth_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: auth.example.com
                      port_value: 443
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

## Rate Limiting (Global)

```yaml
# Per-route rate limit config (in route)
rate_limits:
  - actions:
      - remote_address: {}
    limit:
      requests_per_unit: 100
      unit: MINUTE

# Rate limit service config
rate_limit_service:
  grpc_service:
    envoy_grpc:
      cluster_name: rate_limit_cluster
  transport_api_version: V3
```

## JWT Authentication

```yaml
http_filters:
  - name: envoy.filters.http.jwt_authn
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
      providers:
        my_provider:
          issuer: https://auth.example.com
          from_headers:
            - name: Authorization
              value_prefix: "Bearer "
          forward: true
          forward_payload_header: x-jwt-payload
          remote_jwks:
            http_uri:
              uri: https://auth.example.com/.well-known/jwks.json
              cluster: jwks_cluster
              timeout: 5s
            cache_duration: 300s
      rules:
        - match:
            prefix: /api/public
          requires:
            allows_missing: {}
        - match:
            prefix: /
          requires:
            provider_name: my_provider
```

## External Authorization (ExtAuthz)

```yaml
http_filters:
  - name: envoy.filters.http.ext_authz
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
      grpc_service:
        envoy_grpc:
          cluster_name: ext_authz_cluster
        timeout: 1s
      with_request_body:
        max_request_bytes: 1024
      clear_route_cache: true
      metadata_context_namespaces:
        - envoy.filters.http.jwt_authn
```

## WASM Extensions

```yaml
http_filters:
  - name: envoy.filters.http.wasm
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
      config:
        name: my_wasm_plugin
        root_id: my_plugin_root_id
        vm_config:
          vm_id: my_vm
          runtime: "envoy.wasm.runtime.v8"
          code:
            local:
              filename: /etc/envoy/wasm/my-plugin.wasm
          allow_precompiled: true
```

## gRPC-JSON Transcoding

```yaml
http_filters:
  - name: envoy.filters.http.grpc_json_transcoder
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_json_transcoder.v3.GrpcJsonTranscoder
      proto_descriptor: /etc/envoy/protos/user.pb
      services:
        - user.UserService
      print_options:
        add_whitespace: true
        always_print_primitive_fields: false
      auto_mapping: true
      convert_grpc_status: true
```

## Envoy Gateway API (K8s CRD)

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: api-gateway
spec:
  gatewayClassName: envoy
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: api.example.com
      tls:
        mode: Terminate
        certificateRefs:
          - name: api-tls
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: user-routes
spec:
  parentRefs:
    - name: api-gateway
  hostnames:
    - api.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api/users
      filters:
        - type: RequestHeaderModifier
          requestHeaderModifier:
            add:
              - name: X-Gateway
                value: envoy
      backendRefs:
        - name: user-service
          port: 8080
          weight: 90
        - name: user-service-v2
          port: 8080
          weight: 10
```
