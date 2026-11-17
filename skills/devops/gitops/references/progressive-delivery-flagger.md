# Progressive Delivery with Flagger

Progressive delivery eliminates the massive risk of "Big Bang" deployments by routing a small percentage of traffic to a new version, monitoring its health, and automatically rolling back if errors occur.

## Flagger Workflow

```mermaid
%%{init: {"theme": "default", "sequence": {"useMaxWidth": true}}}%%
sequenceDiagram
    participant ArgoCD
    participant Flagger
    participant Istio
    participant Prometheus
    
    ArgoCD->>K8s API: Update Deployment to v2
    K8s API-->>Flagger: Deployment modified!
    Note over Flagger: Halts rollout.<br/>Spawns v2 as Canary pods.<br/>Primary is still v1.
    Flagger->>Istio: Route 5% traffic to Canary
    loop Every 1 Minute
        Flagger->>Prometheus: Query HTTP 5xx rate & Latency
        alt Metrics Healthy
            Flagger->>Istio: Increase traffic (10 percent, 20 percent...)
        else Metrics Fail
            Flagger->>Istio: Route 100 percent back to Primary (v1)
            Flagger->>K8s API: Terminate Canary (Rollback)
        end
    end
    Note over Flagger: If 50 percent reached safely,<br/>Promote Canary to Primary.
```

## The Canary CRD
Flagger abstracts away the complex Istio/Nginx routing configurations via the `Canary` resource:
```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: frontend
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5 # Rollback if 5 checks fail
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
```
