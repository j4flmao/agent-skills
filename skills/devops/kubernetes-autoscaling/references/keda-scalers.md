# Keda Scalers

## Overview

Keda (Kubernetes Event-Driven Autoscaling) extends Kubernetes HPA with event-driven scaling. It supports 50+ scalers including message queues, databases, monitoring systems, and custom HTTP endpoints.

## Keda Architecture

```
                ┌──────────────────────────┐
                │      Event Source        │
                │ (Kafka, RabbitMQ, SQS)   │
                └───────────┬──────────────┘
                            │ metrics
                ┌───────────▼──────────────┐
                │     Keda Operator        │
                │                          │
                │   ┌──────────────────┐   │
                │   │  ScaledObject    │   │
                │   │  Controller      │   │
                │   └────────┬─────────┘   │
                │            │              │
                │   ┌────────▼─────────┐   │
                │   │  HPA (managed)   │   │
                │   └────────┬─────────┘   │
                └────────────┼─────────────┘
                             │ scale
                ┌────────────▼─────────────┐
                │     Deployment/Job       │
                └──────────────────────────┘
```

## ScaledObject

### Basic ScaledObject
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer
spec:
  scaleTargetRef:
    name: kafka-consumer        # Target deployment
    apiVersion: apps/v1         # Optional
    kind: Deployment            # Optional
  minReplicaCount: 1
  maxReplicaCount: 30
  pollingInterval: 30           # Check every 30s
  cooldownPeriod: 300           # Wait 5 min before scaling to 0
  fallback:
    replicas: 3                 # Min replicas if scaler fails
    failureThreshold: 5         # After 5 failures
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka-cluster:9092
      topic: orders
      consumerGroup: order-processor
      lagThreshold: "10"       # Scale per 10 messages lag
```

## Kafka Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-processor
spec:
  scaleTargetRef:
    name: kafka-processor
  minReplicaCount: 0   # Scale to zero when no messages
  maxReplicaCount: 50
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka-broker-0:9092,kafka-broker-1:9092
      topic: events
      consumerGroup: event-processor
      lagThreshold: "5"
      offsetResetPolicy: latest
      version: 2.5.0
      tls: enable
      sasl: plaintext
      saslUsername: keda-scaler
      authenticationRef:
        name: keda-kafka-creds
```

## Prometheus Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaled
spec:
  scaleTargetRef:
    name: api-server
  minReplicaCount: 2
  maxReplicaCount: 20
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring:9090
      metricName: http_requests_per_second
      threshold: "100"
      query: |
        sum(rate(http_requests_total{job="api-server"}[2m]))
```

## AWS SQS Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-worker
spec:
  scaleTargetRef:
    name: sqs-worker
  minReplicaCount: 0
  maxReplicaCount: 100
  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: keda-aws-creds
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/my-queue
      queueLength: "5"
      awsRegion: "us-east-1"
      identityOwner: pod  # Use IRSA: inherit pod identity
```

## RabbitMQ Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-consumer
spec:
  scaleTargetRef:
    name: rabbitmq-consumer
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  - type: rabbitmq
    metadata:
      host: amqp://guest:password@rabbitmq:5672
      queueName: tasks
      queueLength: "10"
      protocol: amqp10
      mode: QueueLength
      value: "10"
```

## Cron Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cron-scaler
spec:
  scaleTargetRef:
    name: batch-processor
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: cron
    metadata:
      timezone: America/New_York
      start: 30 6 * * *    # 6:30 AM daily
      end: 0 22 * * *      # 10:00 PM daily
      desiredReplicas: "5"
```

## ScaledJob

### Job from Queue
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: queue-job
spec:
  jobTargetRef:
    template:
      spec:
        containers:
        - name: worker
          image: myregistry/worker:latest
          command: ["process-tasks"]
        restartPolicy: Never
    backoffLimit: 3
  minReplicaCount: 0
  maxReplicaCount: 50
  pollingInterval: 15
  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: keda-aws-creds
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/job-queue
      queueLength: "1"
      awsRegion: us-east-1

  # Job-specific scaling config
  scalingStrategy:
    strategy: "custom"
    customScalingQueueLengthDeduction: 1  # Deduct from queue length
    customScalingRunningJobPercentage: "0.5"  # 50% running jobs
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 5
```

## Authentication

### TriggerAuthentication
```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-aws-creds
spec:
  podIdentity:
    provider: aws-eks  # IRSA
    # Or:
    # provider: azure-workload | gcp
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-kafka-creds
spec:
  secretTargetRef:
  - parameter: saslPassword
    name: kafka-secret
    key: sasl-password
  - parameter: tlsCa
    name: kafka-secret
    key: ca-cert
```

### ClusterTriggerAuthentication
```yaml
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: global-aws-creds
spec:
  podIdentity:
    provider: aws-eks
```

## Multiple Trigger Types

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: multi-trigger-worker
spec:
  scaleTargetRef:
    name: worker
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: cpu_usage
      threshold: "70"
      query: avg(container_cpu_usage_seconds_total{namespace="default"})
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      topic: events
      consumerGroup: workers
      lagThreshold: "10"
  - type: cron
    metadata:
      timezone: UTC
      start: 0 8 * * *
      end: 0 18 * * *
      desiredReplicas: "10"
```

## Fallback and Cooldown

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: resilient-worker
spec:
  scaleTargetRef:
    name: resilient-worker
  minReplicaCount: 0
  maxReplicaCount: 50
  pollingInterval: 30
  cooldownPeriod: 300
  fallback:
    replicas: 3            # Keep at least 3 if scaler fails
    failureThreshold: 3    # After 3 consecutive failures
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      topic: orders
      consumerGroup: processor
      lagThreshold: "5"
```

## Advanced Features

### Scaling Modifiers
```yaml
spec:
  advanced:
    scalingModifiers:
      formula: "max(1, trigger_1 / 100)"  # Custom formula
      target: "1"
      activationTarget: "0"
      metricType: "Value"
```

### HPA Name Customization
```yaml
spec:
  advanced:
    horizontalPodAutoscalerConfig:
      name: custom-hpa-name
      behavior:  # Override HPA behavior
        scaleDown:
          stabilizationWindowSeconds: 300
```

## Troubleshooting

```bash
# Check ScaledObject status
kubectl describe scaledobject kafka-consumer

# Check Keda operator logs
kubectl logs -n keda -l app=keda-operator

# Verify HPA created by Keda
kubectl get hpa -l keda.sh/scaledobject-name=kafka-consumer

# Test scaler
kubectl get --raw /apis/external.metrics.k8s.io/v1beta1
```

## Best Practices

1. **Set `minReplicaCount: 0`** for dev environments to save resources when idle.
2. **Use `cooldownPeriod`** to prevent rapid scale-down after processing bursts.
3. **Configure `fallback`** on critical scalers to maintain availability.
4. **Use `authenticationRef`** instead of inline secrets for security.
5. **Set `pollingInterval`** based on latency requirements (shorter for real-time, longer for batch).
6. **Test with `ScaledJob`** for one-off processing tasks (e.g., from SQS).
7. **Monitor Keda metrics** with Prometheus for operator health.
8. **Use IRSA/pod identity** for AWS/GCP/Azure authentication instead of static credentials.
9. **Set `successfulJobsHistoryLimit`** to prevent job history bloat.
10. **Combine triggers** for workloads with multiple scaling signals.
