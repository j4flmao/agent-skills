# Service Mesh Security

## Mutual TLS Configuration

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT

---
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: permissive-mtls
  namespace: legacy
spec:
  mtls:
    mode: PERMISSIVE
```

## Authorization Policies

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-service-authz
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/order-service
              - cluster.local/ns/production/sa/api-gateway
      to:
        - operation:
            methods: ["POST", "GET"]
            paths: ["/api/v1/payments/*"]
      when:
        - key: request.headers[X-Request-Id]
          values: ["*"]

    - from:
        - source:
            namespaces: ["monitoring"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/health", "/metrics"]

---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: DENY
  rules:
    - from:
        - source:
            notPrincipals:
              - cluster.local/ns/production/sa/api-gateway
```

## Request Authentication

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  jwtRules:
    - issuer: https://auth.example.com
      jwksUri: https://auth.example.com/.well-known/jwks.json
      forwardOriginalToken: true
      audiences:
        - api-gateway
      outputPayloadToHeader: x-jwt-payload

---
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: external-jwt
spec:
  jwtRules:
    - issuer: https://accounts.google.com
      jwksUri: https://www.googleapis.com/oauth2/v3/certs
```

## Egress Control

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.external.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL

---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-api-route
spec:
  hosts:
    - api.external.com
  tls:
    - match:
        - port: 443
          sniHosts:
            - api.external.com
      route:
        - destination:
            host: api.external.com
            port:
              number: 443
      exportTo:
        - "."

---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: egress-control
spec:
  action: DENY
  rules:
    - to:
        - operation:
            hosts:
              - "*.external.com"
```

## Key Points

- Enable STRICT mTLS for all production traffic
- Use PERMISSIVE mode during migration
- Implement least-privilege authorization policies
- Use JWT authentication for end-user auth
- Configure egress controls for external traffic
- Use ServiceEntry for mesh-external services
- Implement deny-by-default security model
- Use workload-level authorization granularity
- Enable audit logging for security events
- Rotate certificates automatically with Istio CA
- Monitor authorization failures for attacks
- Use namespace isolation with security boundaries
