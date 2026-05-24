# Traffic Mirroring / Shadowing

Traffic mirroring sends a copy of live traffic to a new version without impacting the user experience. It validates new releases under real production conditions.

## Istio Mirror

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp
  http:
    - route:
        - destination:
            host: myapp
            subset: v1
      mirror:
        host: myapp
        subset: v2
      mirrorPercentage:
        value: 100.0
```

### Mirror with Percentage

```yaml
http:
  - match:
      - uri:
          prefix: /api
    route:
      - destination:
          host: myapp-stable
            port:
              number: 8080
    mirror:
      host: myapp-canary
      port:
        number: 8080
    mirrorPercentage:
      value: 50.0  # mirror 50% of requests
```

### Headers for Traceability

```yaml
http:
  - route:
      - destination:
          host: myapp
    mirror:
      host: myapp-shadow
    appendHeaders:
      x-shadow: "true"
      x-original-destination: "myapp-stable"
```

## Envoy Shadow

Envoy native shadowing via weighted clusters:

```yaml
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address: { address: 0.0.0.0, port_value: 8080 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route:
                            weighted_clusters:
                              clusters:
                                - name: stable
                                  weight: 100
                            request_mirror_policies:
                              - cluster: shadow
                                runtime_fraction:
                                  default_value:
                                    numerator: 50
                                    denominator: HUNDRED
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Service Mesh Traffic Split

### Linkerd TrafficSplit

```yaml
apiVersion: split.smi-spec.io/v1alpha4
kind: TrafficSplit
metadata:
  name: myapp
spec:
  service: myapp
  backends:
    - service: myapp-stable
      weight: 100m
    - service: myapp-canary
      weight: 0m  # mirror only, no production traffic
```

### Consul Service Splitter

```yaml
kind: ServiceSplitter
apiVersion: consul.hashicorp.com/v1alpha1
metadata:
  name: myapp
spec:
  splits:
    - service: myapp-v1
      weight: 100
    - service: myapp-v2
      weight: 0
      mirror: true
```

## Dark Launches

Launch features behind a flag while mirroring all traffic to validate:

```yaml
http:
  - match:
      - headers:
          x-dark-launch:
            exact: "feature-x"
    route:
      - destination:
          host: myapp-v2
  - route:
      - destination:
          host: myapp-v1
    mirror:
      host: myapp-v2
    mirrorPercentage:
      value: 25.0
```

## Request Duplication for Testing

```yaml
http:
  - route:
      - destination:
          host: myapp
    mirror:
      host: myapp-shadow
    mirrorPercentage:
      value: 5.0  # start low, ramp up
```

## Comparison: Mirroring vs Traffic Splitting

| Aspect | Traffic Mirroring | Traffic Splitting |
|--------|------------------|-------------------|
| User impact | None (async copy) | Users experience new version |
| Validation | Real traffic, no risk | Real traffic, some risk |
| Performance overhead | 2x request processing | Proportional to weight |
| Response correctness | Not validated by user | User validates implicitly |
| Use case | Dark launches, validation | Gradual rollouts |

## NGINX Mirror Module

```nginx
upstream stable {
    server 10.0.0.1:8080;
}
upstream shadow {
    server 10.0.0.2:8080;
}
server {
    location / {
        mirror /mirror;
        proxy_pass http://stable;
    }
    location = /mirror {
        internal;
        proxy_pass http://shadow$request_uri;
        proxy_set_header X-Mirrored "true";
    }
}
```

## Envoy Shadow Cluster Stats

Monitor shadow traffic through Envoy stats:

```
cluster.shadow.upstream_rq_total
cluster.shadow.upstream_rq_xx
cluster.shadow.upstream_rq_time
```

## ALB Traffic Mirroring (AWS)

```hcl
resource "aws_lb_listener_rule" "mirror" {
  listener_arn = aws_lb_listener.front_end.arn
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.stable.arn
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.shadow.arn
    forward {
      target_group {
        arn    = aws_lb_target_group.shadow.arn
        weight = 0
      }
    }
  }
}
```

Traffic mirroring provides risk-free validation in production by observing how new code handles real-world traffic patterns without affecting users.
