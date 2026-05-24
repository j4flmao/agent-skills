# Deployment Strategy Comparison

## Strategy Overview

| Strategy | Risk | Deployment Speed | Rollback Speed | Traffic Control | Cost |
|----------|------|-----------------|----------------|-----------------|------|
| Recreate | High | Fast | Slow | None | Low |
| Rolling Update | Medium | Medium | Medium | None | Low |
| Blue-Green | Low | Instant | Instant | DNS/LB switch | High (2x infra) |
| Canary | Very Low | Gradual | Fast | Service mesh/LB | Medium |
| A/B Testing | Low | Gradual | Fast | Request routing | Medium |
| Shadow | Minimal | Parallel | Instant | Traffic mirror | High (2x infra) |

## Recreate

Terminates all old pods before creating new ones. Simple but causes downtime.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  strategy:
    type: Recreate
  template:
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
```

## Rolling Update

Gradually replaces old pods with new ones. Kubernetes native, no additional tooling needed.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: app
          image: myapp:2.0.0
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

## Blue-Green

Two identical environments (blue = current, green = new). Switch traffic instantaneously.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
    version: blue  # Switch to 'green' for cutover
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
spec:
  replicas: 4
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-green
spec:
  replicas: 4
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
        - name: app
          image: myapp:2.0.0
```

## Canary

Incrementally shifts a percentage of traffic to the new version while monitoring metrics.

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
            subset: stable
          weight: 90
        - destination:
            host: myapp
            subset: canary
          weight: 10
```

## A/B Testing

Routes traffic based on request attributes (headers, cookies, geolocation).

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp
  http:
    - match:
        - headers:
            user-agent:
              regex: ".*Mobile.*"
      route:
        - destination:
            host: myapp
            subset: v2
    - route:
        - destination:
            host: myapp
            subset: v1
```

## Shadow (Traffic Mirroring)

Sends a copy of live traffic to the new version without impacting responses.

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
        value: 50.0
```

## Decision Matrix

| Factor | Recommended Strategy |
|--------|---------------------|
| Zero tolerance for downtime | Blue-Green or Canary |
| Quick rollback needed | Blue-Green (instant) |
| Testing in production | Canary or A/B |
| Minimal infrastructure cost | Rolling Update |
| Validate with real traffic safely | Shadow |
| Simple stateless services | Rolling Update or Recreate |

## Automation Tools

| Tool | Supported Strategies |
|------|---------------------|
| Kubernetes Deployments | Recreate, Rolling Update |
| Argo Rollouts | Blue-Green, Canary |
| Flagger | Canary, Blue-Green, A/B Testing |
| Istio | Traffic splitting, Mirroring |
| NGINX Ingress | Canary (weight-based) |
| AWS ALB | Blue-Green (target groups), Canary |

Choose your deployment strategy based on risk tolerance, infrastructure complexity, and rollback requirements.
