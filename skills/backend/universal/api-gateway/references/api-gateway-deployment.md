# API Gateway Deployment Patterns

## Kubernetes Ingress Deployment

### Kong Ingress Controller
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  annotations:
    konghq.com/strip-path: "true"
    konghq.com/plugins: jwt-auth, rate-limit
spec:
  ingressClassName: kong
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
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
```

### Envoy as Ingress Gateway (Istio)
```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: api-tls
      hosts:
        - api.example.com
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routing
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/users
      route:
        - destination:
            host: user-service
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api/orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
```

## Multi-Region Deployment

### Active-Active with Global Load Balancing
```yaml
# Route53 / Global Accelerator DNS routing
regions:
  us-east-1:
    gateway:
      instances: 3
      autoScaling:
        min: 3
        max: 10
        targetCPU: 70
    healthCheck: /health
    fallback: us-west-2
  
  us-west-2:
    gateway:
      instances: 3
      autoScaling:
        min: 3
        max: 10
        targetCPU: 70
    healthCheck: /health
    fallback: eu-west-1
  
  eu-west-1:
    gateway:
      instances: 2
      autoScaling:
        min: 2
        max: 6
        targetCPU: 70
    healthCheck: /health
    fallback: us-east-1
```

## CI/CD Pipeline Integration

### Blue-Green Deployment
```yaml
# GitLab CI pipeline for gateway deployment
stages:
  - validate
  - build
  - deploy-blue
  - test-blue
  - switch
  - cleanup

validate:
  stage: validate
  script:
    - spectral lint openapi.yaml
    - nginx -t -c nginx.conf

build:
  stage: build
  script:
    - docker build -t gateway:$CI_COMMIT_SHA .
    - docker push registry.example.com/gateway:$CI_COMMIT_SHA

deploy-blue:
  stage: deploy-blue
  script:
    - kubectl set image deployment/gateway-blue gateway=registry.example.com/gateway:$CI_COMMIT_SHA
    - kubectl rollout status deployment/gateway-blue
  environment:
    name: production/blue

test-blue:
  stage: test-blue
  script:
    - curl -f https://blue-api.example.com/health
    - npm run test:smoke -- --base-url https://blue-api.example.com

switch:
  stage: switch
  script:
    - kubectl patch service/gateway -p '{"spec":{"selector":{"version":"blue"}}}'
    - kubectl set image deployment/gateway-green gateway=registry.example.com/gateway:$CI_COMMIT_SHA
  environment:
    name: production/active

cleanup:
  stage: cleanup
  script:
    - kubectl rollout status deployment/gateway-green
    - kubectl delete deployment/gateway-blue  # After 48h
  when: manual
```
