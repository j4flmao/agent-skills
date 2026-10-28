---
name: cloud-native-event-driven-scaling
description: >
  Use this skill when the user says 'keda', 'scale to zero', 'scaledobject', 'scaledjob', 'scale on queue length', 'kafka consumer autoscaling', 'sqs scaling kubernetes', 'event driven autoscaling', 'triggerauthentication'. Configures KEDA to scale Kubernetes workloads on event-source metrics (queue depth, consumer lag, Prometheus queries, cron), including scale-to-zero, flapping control, and long-running jobs. Do NOT use for: CPU/memory HPA, VPA and node autoscaling in depth (devops-kubernetes-autoscaling), serverless platform cold starts (cloud-native-serverless-cold-starts).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, kubernetes, keda, autoscaling, kafka, sqs, scale-to-zero]
---

# Event-Driven Scaling with KEDA

## Purpose
CPU-based HPA reacts late to queue backlogs and cannot scale from zero. KEDA feeds event-source metrics to the HPA and handles 0↔1 activation itself, so consumers scale with work waiting rather than with CPU after the fact.

## Agent Protocol

### Trigger
"keda", "scale to zero", "ScaledObject", "ScaledJob", "scale on queue length", "kafka consumer autoscaling", "sqs scaling", "event driven autoscaling", "TriggerAuthentication".

### Input Context
- Event source and auth model (IRSA/EKS Pod Identity, Workload Identity, secrets).
- Per-pod throughput (messages/s) and acceptable backlog drain time.
- Message processing duration (seconds vs hours).

### Output Artifact
`ScaledObject`/`ScaledJob` + `TriggerAuthentication` YAML. No file unless requested.

### Response Format
```
Resource: {ScaledObject|ScaledJob} (why)
Trigger: {type} target={value} activation={value}
Replicas: min={n} max={n} (max bounded by {partitions|downstream limit})
Flapping control: {cooldownPeriod, HPA behavior}
Auth: {TriggerAuthentication / ClusterTriggerAuthentication}
```

### Completion Criteria
- [ ] Target value derived from per-pod throughput, not guessed.
- [ ] `maxReplicaCount` bounded by partitions or downstream capacity.
- [ ] Long-running work uses ScaledJob or graceful termination.

## How KEDA Works
- **keda-operator**: watches `ScaledObject`s, polls scalers every `pollingInterval` (default 30 s), creates/owns an HPA, and performs **activation** (scales 0→1 when the metric exceeds `activationThreshold`/`activation*` value, and 1→0 after `cooldownPeriod`, default 300 s, with no activity).
- **keda-operator-metrics-apiserver**: implements the Kubernetes **External Metrics API** (`external.metrics.k8s.io`); the HPA queries it for 1↔N scaling.
- KEDA does not replace the HPA — scaling between 1 and N is the regular HPA algorithm: `desired = ceil(current × currentMetric / target)`; for `AverageValue` external metrics this is effectively `ceil(totalMetric / target)`.
- Only one external metrics server can be registered per cluster; KEDA conflicts with other adapters (e.g. prometheus-adapter for external metrics).

## Sizing the Target
`target per pod = per-pod throughput (msg/s) × acceptable drain time (s)`
Example: a pod processes 20 msg/s, backlog must drain within 30 s → `queueLength: "600"`. A backlog of 6,000 → 10 replicas.

## ScaledObject — AWS SQS

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-pod-identity
  namespace: orders
spec:
  podIdentity:
    provider: aws          # uses the workload's IRSA / EKS Pod Identity role
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-worker
  namespace: orders
spec:
  scaleTargetRef:
    name: order-worker            # Deployment
  minReplicaCount: 0
  maxReplicaCount: 40
  pollingInterval: 15
  cooldownPeriod: 300             # only used for scaling to zero
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:                   # standard autoscaling/v2 behavior for 1..N
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
            - type: Percent
              value: 50
              periodSeconds: 60
  triggers:
    - type: aws-sqs-queue
      authenticationRef:
        name: aws-pod-identity
      metadata:
        queueURL: https://sqs.eu-west-1.amazonaws.com/123456789012/orders
        awsRegion: eu-west-1
        queueLength: "600"
        activationQueueLength: "0"
```
`identityOwner: operator` is the alternative when the KEDA operator's own role should read the queue.

## Kafka Consumers
```yaml
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka.kafka.svc:9092
        consumerGroup: payments
        topic: payments
        lagThreshold: "500"
        activationLagThreshold: "10"
        offsetResetPolicy: latest
```
- Replicas beyond the partition count sit idle (one partition → at most one consumer in the group). The Kafka scaler caps replicas at the partition count by default (`allowIdleConsumers: "false"`); `limitToPartitionsWithLag: "true"` caps further to partitions that actually have lag.
- Rebalances pause consumption; aggressive scaling causes rebalance storms → use scale-down stabilization and cooperative-sticky assignment in clients.

## ScaledJob for Long-Running Work
For multi-minute/hour tasks (video encoding, ML batch) a Deployment scale-down can kill in-flight work. `ScaledJob` creates one Kubernetes Job per unit of work instead:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: transcoder
spec:
  jobTargetRef:
    backoffLimit: 2
    template:
      spec:
        restartPolicy: Never
        containers:
          - name: transcoder
            image: registry.example.com/transcoder:1.8.2
  pollingInterval: 10
  maxReplicaCount: 20
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 5
  scalingStrategy:
    strategy: accurate        # accounts for pending jobs vs queue length
  triggers:
    - type: rabbitmq
      metadata:
        queueName: transcode
        mode: QueueLength
        value: "1"
      authenticationRef:
        name: rabbitmq-conn
```
If you must use a Deployment, set `terminationGracePeriodSeconds` longer than the max task time and stop consuming on SIGTERM.

## Anti-Patterns
- Running KEDA's External Metrics server alongside another external-metrics adapter.
- Also defining your own HPA on the same Deployment (KEDA owns the HPA; two HPAs fight).
- Scale-to-zero for latency-sensitive synchronous HTTP without an activator/buffer (use KEDA HTTP add-on or Knative).
- `pollingInterval: 1` against paid APIs (SQS/CloudWatch request costs, throttling).
- Credentials inline in trigger metadata instead of `TriggerAuthentication`.

## Checklist
- [ ] Target = throughput × drain time; activation threshold set.
- [ ] `maxReplicaCount` ≤ partitions / DB connection budget.
- [ ] HPA `behavior` tuned for scale-down; `cooldownPeriod` for zero.
- [ ] Pod identity auth; no static keys.
- [ ] Graceful shutdown or ScaledJob for long tasks.
- [ ] Alert on `keda_scaler_errors_total` and on HPA at max replicas.

## References
- `references/keda-architecture.md`
- `references/kafka-scaler-internals.md`
- `references/scale-to-zero-mechanics.md`
