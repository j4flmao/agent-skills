# Flagger Configuration

Flagger is a progressive delivery tool that automates canary releases using service mesh traffic shifting and metric analysis.

## Canary CRD

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
  namespace: prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 80
    targetPort: 8080
    portName: http
    gateways:
      - istio-system/public-gateway
    hosts:
      - myapp.example.com
    match:
      - uri:
          prefix: /
    timeout: 30s
  skipAnalysis: false
  analysis:
    interval: 60s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -s http://myapp-canary.prod:80/health | grep -q 'ok'"
```

## Service Mesh Integration

### Istio

```yaml
spec:
  service:
    port: 80
    targetPort: 8080
    portName: http
    gateways:
      - istio-system/public-gateway
    hosts:
      - myapp.example.com
  analysis:
    scheduleInterval: 1m
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
      - name: istio-requests-total
        templateRef:
          name: istio-error-rate
        interval: 1m
```

### Linkerd

```yaml
spec:
  service:
    port: 80
    targetPort: 8080
    portName: http
    portDiscovery: true
  analysis:
    metrics:
      - name: request-success-rate
        interval: 1m
        thresholdRange:
          min: 99
        query: |
          sum(
            rate(
              response_total{
                namespace="{{ .Namespace }}",
                deployment="{{ .TargetName }}-canary",
                classification="success"
              }[{{ .Interval }}]
            )
          ) * 100 /
          sum(
            rate(
              response_total{
                namespace="{{ .Namespace }}",
                deployment="{{ .TargetName }}-canary"
              }[{{ .Interval }}]
            )
          )
```

### AWS App Mesh

```yaml
spec:
  service:
    port: 80
    targetPort: 8080
    portDiscovery: true
    meshName: appmesh-mesh
    virtualNode: myapp
  analysis:
    metrics:
      - name: request-success-rate
        interval: 1m
        thresholdRange:
          min: 99
        query: |
          sum(rate(
            envoy_http_downstream_rq_xx{
              appmesh_mesh="appmesh-mesh",
              virtual_node="myapp-canary",
              namespace="{{ .Namespace }}"
            }[{{ .Interval }}]
          ))
```

## Metric Analysis

```yaml
analysis:
  interval: 30s
  threshold: 10
  maxWeight: 100
  stepWeight: 5
  metrics:
    - name: request-success-rate
      thresholdRange:
        min: 95
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 2000
      interval: 1m
    - name: custom-error-rate
      templateRef:
        name: error-rate
      interval: 1m
      threadCount: 2
```

## Alerting

Configure alerts via Prometheus and notification providers:

```yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack
  namespace: flagger
spec:
  type: slack
  channel: deployments
  username: flagger
  webhookUrl:
    valueFrom:
      secretKeyRef:
        name: slack-webhook
        key: url
---
apiVersion: flagger.app/v1beta1
kind: Canary
spec:
  alertRefs:
    - name: slack
      severity: warn
```

## Webhooks

```yaml
analysis:
  webhooks:
    - name: load-test
      type: rollout
      url: http://flagger-loadtester.test/
      timeout: 30s
      metadata:
        cmd: "hey -z 1m -q 10 http://myapp-canary.prod:80/"
    - name: integration-test
      type: pre-rollout
      url: http://tester.test/run
      timeout: 60s
      metadata:
        suite: canary
    - name: notify-slack
      type: confirm-promotion
      url: http://webhook.test/confirm
    - name: post-rollout-check
      type: post-rollout
      url: http://checker.test/verify
      timeout: 30s
```

## Blue-Green with Flagger

```yaml
spec:
  service:
    port: 80
    portDiscovery: true
  analysis:
    interval: 1m
    threshold: 5
    iterations: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

## Manual Gating

```yaml
analysis:
  webhooks:
    - name: manual-gate
      type: confirm-promotion
      url: http://approval-service.approval/confirm
      timeout: 300s
```

Use Flagger when you need automated canary releases with deep service mesh integration, metric-based rollback, and webhook-driven testing workflows.
