# Service Mesh Architecture

## Istio Installation

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
spec:
  profile: production
  components:
    pilot:
      k8s:
        hpaSpec:
          minReplicas: 3
          maxReplicas: 10
          metrics:
            - resource:
                name: cpu
                targetAverageUtilization: 80
              type: Resource
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            type: LoadBalancer
            annotations:
              service.beta.kubernetes.io/aws-load-balancer-type: nlb
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

## Virtual Service Configuration

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-gateway
  namespace: production
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-ingressgateway
  http:
    - match:
        - uri:
            prefix: /v1/users
      rewrite:
        uri: /users
      route:
        - destination:
            host: user-service
            port:
              number: 8080
          weight: 90
        - destination:
            host: user-service-v2
            port:
              number: 8080
          weight: 10
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: gateway-error,connect-failure,refused-stream

    - match:
        - uri:
            prefix: /v1/orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
      fault:
        abort:
          percentage:
            value: 1
          httpStatus: 500
```

## Destination Rule

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
  namespace: production
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 500
        maxRequestsPerConnection: 10
    loadBalancer:
      simple: ROUND_ROBIN
      consistentHash:
        httpHeaderName: x-user-id
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
      trafficPolicy:
        loadBalancer:
          simple: ROUND_ROBIN
```

## Key Points

- Use Istio for service mesh in production environment
- Configure mTLS for service-to-service communication
- Implement traffic splitting for canary deployments
- Use circuit breakers for fault isolation
- Configure outlier detection for automatic ejection
- Use retries and timeouts for resilience
- Implement fault injection for chaos testing
- Use VirtualService for request routing rules
- Configure DestinationRule for traffic policies
- Enable distributed tracing with Jaeger/Zipkin
- Monitor with Prometheus and Grafana dashboards
- Implement authorization policies for zero-trust
