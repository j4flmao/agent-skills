# Chaos Engineering Experiment Catalog (LitmusChaos and Chaos Mesh)

Ready-to-adapt Kubernetes fault experiments with steady-state probes and blast-radius controls. Examples use LitmusChaos 3.x `ChaosEngine` (`litmuschaos.io/v1alpha1`) and Chaos Mesh (`chaos-mesh.org/v1alpha1`). Run them first in staging; promote to production only with an approved game-day plan, an abort switch, and on-call present.

## Experiment Template

| Field | Example |
|---|---|
| Hypothesis | "If one api-gateway pod dies, p99 latency stays < 500 ms and error rate < 1%" |
| Steady-state signal | SLO metrics from Prometheus; HTTP health probe |
| Fault | pod-delete, 1 pod, 60 s |
| Blast radius | one namespace, one deployment, `PODS_AFFECTED_PERC` limited |
| Abort condition | error rate > 5% for 1 min, or manual stop |
| Rollback | delete the ChaosEngine / set `engineState: stop` |
| Owner / window | team, date, on-call contact |

## Prerequisites (Litmus)

- Litmus experiments installed in the target namespace (ChaosHub or `ChaosExperiment` CRs).
- A dedicated ServiceAccount with only the RBAC the experiment needs (`pod-delete-sa`, not cluster-admin).
- Target workload labeled; with `annotationCheck: "true"`, the target also needs `litmuschaos.io/chaos: "true"`.

## 1. Pod Failure with Continuous Health Probe

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: api-gateway-pod-delete
  namespace: staging
spec:
  engineState: active                 # set to "stop" to abort
  annotationCheck: "false"
  appinfo:
    appns: staging
    applabel: app=api-gateway
    appkind: deployment
  chaosServiceAccount: pod-delete-sa
  jobCleanUpPolicy: delete
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
              value: "false"          # graceful termination exercises shutdown hooks
            - name: PODS_AFFECTED_PERC
              value: "30"
        probe:
          - name: gateway-health
            type: httpProbe
            mode: Continuous
            httpProbe/inputs:
              url: http://api-gateway.staging.svc:8080/health
              method:
                get:
                  criteria: ==
                  responseCode: "200"
            runProperties:
              probeTimeout: 5s
              interval: 10s
              retry: 2
```

Verdict lives in the `ChaosResult` CR:
```bash
kubectl get chaosresult -n staging api-gateway-pod-delete-pod-delete -o jsonpath='{.status.experimentStatus.verdict}'
```

## 2. Network Latency on One Replica

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: payment-latency
  namespace: staging
spec:
  engineState: active
  appinfo:
    appns: staging
    applabel: app=payment-service
    appkind: deployment
  chaosServiceAccount: pod-network-latency-sa
  experiments:
    - name: pod-network-latency
      spec:
        components:
          env:
            - name: NETWORK_LATENCY      # milliseconds
              value: "2000"
            - name: JITTER
              value: "500"
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: TARGET_PODS          # comma-separated pod names; omit to pick by percentage
              value: ""
            - name: PODS_AFFECTED_PERC
              value: "25"
            - name: DESTINATION_HOSTS    # restrict impact to one dependency
              value: "postgres.staging.svc"
        probe:
          - name: checkout-slo
            type: promProbe
            mode: Edge
            promProbe/inputs:
              endpoint: http://prometheus.monitoring.svc:9090
              query: sum(rate(http_requests_total{service="checkout",code=~"5.."}[1m])) / sum(rate(http_requests_total{service="checkout"}[1m]))
              comparator:
                criteria: "<"
                value: "0.01"
            runProperties:
              probeTimeout: 10s
              interval: 15s
              retry: 1
```
What this tests: client timeouts, retry budgets, circuit breakers on the payment path.

## 3. Resource Pressure (CPU and Memory)

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: worker-resource-pressure
  namespace: staging-workers
spec:
  engineState: active
  appinfo:
    appns: staging-workers
    applabel: app=worker-service
    appkind: deployment
  chaosServiceAccount: pod-hog-sa
  experiments:
    - name: pod-cpu-hog
      spec:
        components:
          env:
            - name: CPU_CORES
              value: "2"
            - name: TOTAL_CHAOS_DURATION
              value: "120"
    - name: pod-memory-hog
      spec:
        components:
          env:
            - name: MEMORY_CONSUMPTION   # MiB
              value: "500"
```
Both hogs run for the experiment default duration unless TOTAL_CHAOS_DURATION is set (shown for the CPU hog).
Validates: CPU limits and throttling impact on latency, HPA reaction, OOMKill handling and restart backoff, queue consumer rebalancing.

## 4. Chaos Mesh Equivalents

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: payment-packet-loss
  namespace: chaos-mesh          # experiment object lives here; selector targets staging
spec:
  action: loss
  mode: fixed-percent
  value: "25"
  selector:
    namespaces: [staging]
    labelSelectors:
      app: payment-service
  loss:
    loss: "20"            # percent of packets
    correlation: "25"
  direction: to
  target:
    mode: all
    selector:
      namespaces: [staging]
      labelSelectors:
        app: postgres
  duration: "60s"
---
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-one-consumer
  namespace: chaos-mesh          # experiment object lives here; selector targets staging
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: [staging]
    labelSelectors:
      app: order-consumer
```
Recurring runs use the Chaos Mesh `Schedule` kind; multi-step runs use `Workflow`.

## Other Experiments Worth Running

| Fault | Tool / experiment | Validates |
|---|---|---|
| Node drain | Litmus `node-drain` | PodDisruptionBudgets, anti-affinity, rescheduling time |
| DNS errors | Litmus `pod-dns-error`, Chaos Mesh `DNSChaos` | DNS caching, fallback, error handling |
| Disk fill | Litmus `disk-fill` | Eviction thresholds, log rotation, alerting |
| Clock skew | Chaos Mesh `TimeChaos` | Token expiry, lease and lock logic |
| HTTP fault injection | Chaos Mesh `HTTPChaos`, Istio fault injection | Client error handling for specific routes |
| AZ outage | AWS FIS, Azure Chaos Studio | Multi-AZ failover, data replication |

## Running Safely

1. Confirm dashboards and alerts show steady state before injecting.
2. Announce in the incident channel; name the abort owner.
3. Start at the smallest blast radius (one pod, one dependency, short duration).
4. Watch SLO burn rate live; abort on the predefined condition:
   ```bash
   kubectl patch chaosengine api-gateway-pod-delete -n staging --type merge -p '{"spec":{"engineState":"stop"}}'
   kubectl delete networkchaos payment-packet-loss -n chaos-mesh
   ```
5. Record verdict, observed metrics, and follow-up tickets.
6. Expand scope only after fixes land and the experiment passes repeatedly.

## Pitfalls
- Running without a measurable hypothesis turns chaos into random breakage.
- Granting the chaos ServiceAccount cluster-admin; scope RBAC per experiment.
- Forgetting `DESTINATION_HOSTS`/target selectors, so latency hits every egress including monitoring.
- Probes that check the same pod being killed instead of the user-facing service.
- Leaving schedules enabled after the game day.

## Checklist
- [ ] Hypothesis, steady-state metric and abort condition written down
- [ ] Least-privilege ServiceAccount per experiment
- [ ] Probes attached (HTTP and Prometheus)
- [ ] Blast radius limited by label, percentage and duration
- [ ] Stop procedure tested before the run
- [ ] Results and remediation tracked
