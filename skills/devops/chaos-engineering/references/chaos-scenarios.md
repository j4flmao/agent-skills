# Chaos Engineering Scenarios

## Pod Failure Scenario

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-failure-engine
spec:
  appinfo:
    appns: production
    applabel: "app=myapp"
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
  - name: pod-delete
    spec:
      probe:
      - name: health-probe
        type: http
        httpProbe/inputs:
          url: http://myapp:8080/health
          insecure: true
          method: GET
          criteria: == 200
          responseTimeout: 5000
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        - name: CHAOS_INTERVAL
          value: "10"
        - name: FORCE
          value: "true"
```

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Pods killed | 2 of 5 | Majority failure test |
| Chaos interval | 10s | Time between kills |
| Duration | 60s | Long enough to trigger HPA |
| Force | true | Simulate crash (not graceful) |

## Network Degradation Scenario

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay
spec:
  action: delay
  mode: all
  selector:
    namespaces: [production]
    labelSelectors:
      app: myapp-api
  delay:
    latency: "200ms"
    correlation: "50"
    jitter: "50ms"
  duration: "120s"
  target:
    mode: all
    selector:
      namespaces: [production]
      labelSelectors:
        app: myapp-db
  scheduler:
    cron: "@every 24h"
```

## Node Failure Scenario

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: node-failure
spec:
  chaosServiceAccount: litmus-admin
  experiments:
  - name: node-drain
    spec:
      components:
        env:
        - name: NODE_LABEL
          value: "kubernetes.io/hostname=worker-3"
        - name: FORCE
          value: "false"
        - name: DRAIN_TIMEOUT
          value: "120"
```

## DNS Failure Scenario

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: DNSChaos
metadata:
  name: dns-failure
spec:
  action: error
  mode: all
  selector:
    namespaces: [production]
    labelSelectors:
      app: myapp-api
  patterns:
  - "*.internal.svc"
  - "*.external.com"
  duration: "60s"
```

## Certificate Expiry Scenario

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: HTTPChaos
metadata:
  name: cert-expiry
spec:
  mode: all
  selector:
    namespaces: [production]
    labelSelectors:
      app: myapp-api
  target: Request
  port: 443
  abort: true
  duration: "30s"
```

## Database Failure Scenario

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: db-failure
spec:
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
        - name: TARGET_PODS
          value: "postgres-0"
        - name: TOTAL_CHAOS_DURATION
          value: "120"
```

## Scenario Progression

| Level | Scope | Fault Types | Approval |
|-------|-------|-------------|----------|
| Dev | 1 pod | Pod kill | Self |
| Staging | 1 deployment | Pod kill, network delay | Team lead |
| Canary | 1 service | Pod kill, network, CPU stress | Team lead |
| Production | 1 service | Pod kill (single), network latency (low) | Engineering manager |
| Production full | Multiple services | Full suite | VP/CISO |
