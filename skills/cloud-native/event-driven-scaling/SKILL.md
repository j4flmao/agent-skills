# Event-Driven Scaling (KEDA)

## 1. Skill Context
**Focus**: Kubernetes Event-driven Autoscaling (KEDA), HPA (Horizontal Pod Autoscaler) limitations, scale-to-zero, metric thresholds.
**Triggers**: scale to zero, keda autoscaling, kafka scaling kubernetes, event driven scaling, sqs scaling

## 2. Advanced Technical Patterns
The agent addresses the limitations of standard CPU/Memory HPA by scaling based on queue depth and external metrics.

### KEDA Architecture
- **Metrics Adapter**: KEDA acts as a Kubernetes Metrics Server, feeding custom metrics (e.g., Kafka lag, RabbitMQ queue length) to the standard HPA controller.
- **Scale-to-Zero**: The KEDA operator scales deployments from 0 to 1 based on triggers, and the HPA takes over from 1 to N.

### Complex Scaling Scenarios
- **Kafka Partition-Aware Scaling**: Explaining why a consumer group cannot scale effectively beyond the number of Kafka partitions.
- **Scaling Hysteresis & Flapping**: Configuring `cooldownPeriod` and `pollingInterval` to prevent pods from rapidly spinning up and down due to bursty event traffic.
- **Long-Running Executions**: Scaling worker pods (e.g., video processing) without terminating active jobs. Utilizing Kubernetes `Jobs` via KEDA's `ScaledJob` resource instead of `ScaledObject` (Deployments).

## 3. Output Format
- Provide robust `ScaledObject` or `ScaledJob` YAML definitions.
- Detail the exact trigger authentication (e.g., `TriggerAuthentication` referencing IAM roles or Secrets).
- Explain metric math (e.g., `targetValue` = `queueLength / acceptableLatency`).
