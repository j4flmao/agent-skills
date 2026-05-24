# Horizontal Pod Autoscaler (HPA)

## Overview

HPA automatically scales the number of pods based on observed metrics. Kubernetes autoscaling/v2 API supports resource metrics, custom metrics, and external metrics with advanced behavior configuration.

## Basic HPA

### CPU-Based Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Memory-Based Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cache-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cache-service
  minReplicas: 3
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
```

### Multiple Metrics
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: requests_per_second
      target:
        type: AverageValue
        averageValue: 1000
```

## Custom Metrics

### Prometheus Custom Metrics
```yaml
# Requires prometheus-adapter or custom-metrics-apiserver
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  minReplicas: 1
  maxReplicas: 50
  metrics:
  - type: Pods
    pods:
      metric:
        name: queue_messages_processing
      target:
        type: AverageValue
        averageValue: 5
```

### Prometheus Adapter Config
```yaml
# prometheus-adapter config
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
    - seriesQuery: 'rate(http_requests_total{job="my-app"}[5m])'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total"
        as: "requests_per_second"
      metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'
```

## External Metrics

### Kafka Lag-Based Scaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kafka-consumer
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kafka-consumer
  minReplicas: 1
  maxReplicas: 30
  metrics:
  - type: External
    external:
      metric:
        name: kafka_consumer_lag
        selector:
          matchLabels:
            topic: orders
            consumer-group: order-processor
      target:
        type: AverageValue
        averageValue: 100
```

### SQS Queue Depth
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sqs-worker
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sqs-worker
  minReplicas: 1
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: aws_sqs_approximate_number_of_messages_visible
        selector:
          matchLabels:
            queue_name: my-queue
      target:
        type: AverageValue
        averageValue: 10
```

## Behavior Configuration

### Stabilization and Scaling Policies
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-behavior
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 min before scaling down
      policies:
      - type: Percent
        value: 10      # Max 10% pods can scale down per period
        periodSeconds: 60
      - type: Pods
        value: 5       # Or max 5 pods per period (whichever is less restrictive)
        periodSeconds: 60
      selectPolicy: Min  # Use the policy that results in fewer changes
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
      - type: Percent
        value: 100     # Can double pods per period
        periodSeconds: 15
      - type: Pods
        value: 4       # Or add 4 pods (whichever is more)
        periodSeconds: 15
      selectPolicy: Max
```

### Aggressive Scale-Up, Conservative Scale-Down
```yaml
behavior:
  scaleUp:
    policies:
    - type: Pods
      value: 10
      periodSeconds: 15
    - type: Percent
      value: 200
      periodSeconds: 15
    selectPolicy: Max
    stabilizationWindowSeconds: 0
  scaleDown:
    stabilizationWindowSeconds: 600  # 10 min window
    policies:
    - type: Percent
      value: 5
      periodSeconds: 60
    selectPolicy: Min
```

## Advanced Patterns

### HPA with Custom Resource Metrics
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ml-inference
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ml-inference
  minReplicas: 1
  maxReplicas: 100
  metrics:
  - type: Object
    object:
      describedObject:
        apiVersion: v1
        kind: Service
        name: inference-ingress
      metric:
        name: inference_requests_inflight
      target:
        type: AverageValue
        averageValue: 50
```

### HPA with Multiple Scaling Triggers
```yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
- type: Pods
  pods:
    metric:
      name: grpc_requests_in_flight
    target:
      type: AverageValue
      averageValue: 100
- type: External
  external:
    metric:
      name: pubsub_subscription_undelivered_messages
      selector:
        matchLabels:
          subscription_id: my-sub
    target:
      type: Value
      value: 500
```

## Troubleshooting

### Common Issues
```bash
# Check HPA status
kubectl describe hpa web-app

# View HPA events
kubectl get events --field-selector involvedObject.name=web-app

# Check metric server
kubectl get --raw /apis/metrics.k8s.io/v1beta1

# Verify custom metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1

# Check external metrics
kubectl get --raw /apis/external.metrics.k8s.io/v1beta1
```

### HPA Status Fields
```
Targets:          <current>/<target> (e.g., 35%/70%)
MinPods:          2
MaxPods:          10
Deployment pods:  3 current / 3 desired
Conditions:
  AbleToScale     True
  ScalingActive   True
  ScalingLimited  False
```

## Best Practices

1. **Set `requests` equal to `limits`** for predictable scaling behavior.
2. **Use `averageUtilization`** for CPU/memory — not `averageValue`.
3. **Configure `stabilizationWindowSeconds`** to prevent thrashing.
4. **Use `scaleDown` policies** to prevent rapid scale-down during traffic dips.
5. **Set appropriate `minReplicas`** for HA (2+ for production).
6. **Set `maxReplicas`** high enough to handle peak load, but within cluster capacity.
7. **Combine multiple metrics** for more responsive scaling.
8. **Monitor scaling events** with Prometheus and alert on scaling failures.
9. **Use `selectPolicy: Max`** for scale-up (fast), `selectPolicy: Min` for scale-down (slow).
10. **Test HPA behavior** with load testing tools before production.
