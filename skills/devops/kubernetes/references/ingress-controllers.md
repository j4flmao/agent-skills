# Kubernetes Ingress and Controllers

## Overview
Ingress exposes HTTP/HTTPS routes from outside the cluster to services within. Ingress controllers implement the actual routing logic. This reference covers ingress resources, controller types, TLS, annotations, and advanced traffic routing.

## Ingress Resource

### Basic Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 8080
```

### Multiple Hosts
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
    - host: admin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-service
                port:
                  number: 80
    - host: static.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: static-service
                port:
                  number: 80
```

## TLS Configuration

### TLS with Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-tls
type: kubernetes.io/tls
data:
  tls.crt: base64-encoded-cert
  tls.key: base64-encoded-key
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
        - admin.example.com
      secretName: app-tls
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
```

### Cert-Manager Integration
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-certificate
spec:
  secretName: app-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
    - admin.example.com
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
```

## NGINX Ingress Controller

### Common Annotations
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
  annotations:
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-rpm: "10000"
    nginx.ingress.kubernetes.io/limit-connections: "50"

    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"

    # Rewrite
    nginx.ingress.kubernetes.io/rewrite-target: "/$2"
    nginx.ingress.kubernetes.io/use-regex: "true"

    # SSL
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-ssl-protocols: "TLSv1.2 TLSv1.3"

    # Timeouts
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"

    # Buffering
    nginx.ingress.kubernetes.io/proxy-buffer-size: "8k"
    nginx.ingress.kubernetes.io/proxy-buffers-number: "4"

    # Authentication
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"

    # Canary
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
```

### Custom Error Pages
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: error-pages
  annotations:
    nginx.ingress.kubernetes.io/default-backend: custom-error-pages
    nginx.ingress.kubernetes.io/server-snippet: |
      error_page 404 /custom_404.html;
      location = /custom_404.html {
        internal;
      }
```

## Path-Based Routing

### Regex Paths
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: regex-ingress
  annotations:
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/v[0-9]+/users
            pathType: ImplementationSpecific
            backend:
              service:
                name: user-service
                port:
                  number: 80
          - path: /api/v[0-9]+/orders
            pathType: ImplementationSpecific
            backend:
              service:
                name: order-service
                port:
                  number: 80
```

## Traffic Splitting

### Canary Deployments
```yaml
# Primary ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-primary
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-stable
                port:
                  number: 80

---
# Canary ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
    # nginx.ingress.kubernetes.io/canary-by-header: "X-Canary"
    # nginx.ingress.kubernetes.io/canary-by-cookie: "canary"
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-canary
                port:
                  number: 80
```

## Controller Comparison

### Controller-Specific Configurations
```yaml
# AWS ALB Ingress Controller
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: alb-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:cert/abc
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS13-1-2-2021-06
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/success-codes: "200-399"

---
# GKE Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gke-ingress
  annotations:
    kubernetes.io/ingress.class: gce
    kubernetes.io/ingress.global-static-ip-name: app-static-ip
    networking.gke.io/managed-certificates: app-certificate
    kubernetes.io/ingress.allow-http: "false"
```

## Key Points
- Ingress resources define HTTP routing rules
- Ingress controllers implement the actual routing
- TLS can be configured with Kubernetes secrets or cert-manager
- NGINX ingress supports extensive annotations for customization
- Path types: Exact, Prefix, ImplementationSpecific
- Multiple paths and hosts can be defined in a single ingress
- Canary annotations enable traffic splitting
- Default backends handle unmatched requests
- Rate limiting and CORS are configured via annotations
- Different controllers (ALB, GCE, NGINX, Traefik) have unique features
- SSL configuration can enforce TLS versions and ciphers
- Rewrite targets allow URL path transformation
- Custom error pages improve user experience
- Annotations provide controller-specific functionality
