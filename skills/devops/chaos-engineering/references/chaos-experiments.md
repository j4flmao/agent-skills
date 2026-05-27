# Chaos Engineering Experiments

## Pod Failure Experiment

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-failure-engine
  namespace: production
spec:
  appinfo:
    appns: production
    applabel: app=api-gateway
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "60"
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "true"
            - name: RAMP_TIME
              value: "10"
        probe:
          - name: check-api-health
            type: httpProbe
            httpProbe/inputs:
              url: http://api-gateway:8080/health
              insecure: true
              responseTimeout: 10
            mode: Continuous
            runProperties:
              interval: 10
              probeTimeout: 5
              retry: 3
```

## Network Chaos

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: network-chaos
  namespace: production
spec:
  appinfo:
    appns: production
    applabel: app=payment-service
    appkind: deployment
  experiments:
    - name: pod-network-latency
      spec:
        components:
          env:
            - name: NETWORK_LATENCY
              value: "2000"
            - name: JITTER
              value: "500"
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: TARGET_PODS
              value: "1"
---
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: network-loss
spec:
  appinfo:
    appns: production
    applabel: app=payment-service
  experiments:
    - name: pod-network-loss
      spec:
        components:
          env:
            - name: NETWORK_PACKET_LOSS_PERCENTAGE
              value: "50"
            - name: TOTAL_CHAOS_DURATION
              value: "60"
```

## CPU Stress Test

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: cpu-stress-engine
  namespace: production
spec:
  appinfo:
    appns: production
    applabel: app=worker-service
    appkind: deployment
  experiments:
    - name: pod-cpu-hog
      spec:
        components:
          env:
            - name: CPU_CORES
              value: "2"
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: STRESS_IMAGE
              value: "alpine:latest"
            - name: RAMP_TIME
              value: "10"
---
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: memory-stress-engine
spec:
  appinfo:
    appns: production
    applabel: app=worker-service
  experiments:
    - name: pod-memory-hog
      spec:
        components:
          env:
            - name: MEMORY_CONSUMPTION
              value: "500"
            - name: TOTAL_CHAOS_DURATION
              value: "120"
```

## Key Points

- Start with non-production environments for experiments
- Define steady-state hypothesis before experiments
- Implement probes to validate system behavior
- Use blast radius controls to limit impact
- Automate experiments with CI/CD pipelines
- Monitor SLOs and SLIs during experiments
- Use experiment templates for consistency
- Implement automatic rollback on failure
- Document findings and remediation actions
- Gradually increase experiment severity
- Run experiments during off-peak hours
- Build a culture of resilience testing
