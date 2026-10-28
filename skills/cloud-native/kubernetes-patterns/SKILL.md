---
name: cloud-native-kubernetes-patterns
description: >
  Use this skill when the user says 'k8s patterns', 'sidecar container', 'native sidecar', 'ambassador pattern', 'pod disruption budget', 'topology spread', 'pod anti-affinity', 'taints and tolerations', 'graceful shutdown kubernetes', 'admission webhook', 'validatingadmissionpolicy'. Applies structural (sidecar, ambassador, adapter, init), scheduling/resilience (PDB, topology spread, affinity, taints), lifecycle (probes, graceful shutdown) and admission patterns with correct current-API YAML. Do NOT use for: writing operators (cloud-native-k8s-operators), control-plane internals (kubernetes-internals), autoscaling (devops-kubernetes-autoscaling).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, kubernetes, sidecar, pdb, scheduling, admission, graceful-shutdown]
---

# Kubernetes Workload Patterns

## Purpose
Design pods and their placement so workloads survive node drains, zone failures, and rollouts with zero dropped requests. Uses current stable APIs: native sidecar containers, `policy/v1` PodDisruptionBudgets, topology spread constraints, and CEL-based ValidatingAdmissionPolicy.

## Agent Protocol

### Trigger
"k8s patterns", "sidecar", "native sidecar", "ambassador", "PDB", "topology spread", "anti-affinity", "taints", "graceful shutdown", "admission webhook", "ValidatingAdmissionPolicy".

### Input Context
- Workload type (stateless API, worker, stateful), replica count, zones.
- Cluster version (native sidecars need ≥ 1.29 default-on; GA in 1.33).
- Policies the platform must enforce.

### Output Artifact
Annotated manifests. No file unless requested.

### Response Format
```
Pattern: {name} — why
Manifest: {YAML}
Failure mode covered: {node drain|zone loss|rollout|bad config}
```

### Completion Criteria
- [ ] Replicas spread across zones and nodes.
- [ ] PDB allows at least one eviction (otherwise drains block).
- [ ] Graceful shutdown timing consistent: preStop + app drain < terminationGracePeriodSeconds.

## Structural Patterns
| Pattern | Use | Implementation |
|---|---|---|
| Init container | One-shot setup before app starts (migrations check, config render) | `initContainers` (run to completion, in order) |
| Sidecar | Helper running alongside app for pod lifetime (proxy, log shipper, OTel agent) | **Native sidecar**: init container with `restartPolicy: Always` — starts before app, stays up, stopped after app, doesn't block Job completion |
| Ambassador | Sidecar proxying outbound calls (retries, mTLS, connection pooling) | Envoy/Cloud SQL Auth Proxy as native sidecar |
| Adapter | Normalizes app output (metrics format, logs) | Exporter sidecar |

```yaml
spec:
  initContainers:
    - name: cloud-sql-proxy
      image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1
      restartPolicy: Always            # native sidecar
      args: ["--port=5432", "my-project:europe-west1:orders-db"]
      startupProbe:
        tcpSocket: { port: 5432 }
      resources:
        requests: { cpu: 50m, memory: 64Mi }
  containers:
    - name: app
      image: registry.example.com/orders:1.12.0
```

## Resilience and Placement

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: api }
spec:
  replicas: 6
  selector: { matchLabels: { app: api } }
  strategy:
    rollingUpdate: { maxUnavailable: 0, maxSurge: 25% }
  template:
    metadata: { labels: { app: api } }
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector: { matchLabels: { app: api } }
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector: { matchLabels: { app: api } }
      terminationGracePeriodSeconds: 45
      containers:
        - name: api
          image: registry.example.com/api:3.4.1
          ports: [{ containerPort: 8080 }]
          readinessProbe:
            httpGet: { path: /readyz, port: 8080 }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /livez, port: 8080 }
            periodSeconds: 10
            failureThreshold: 3
          lifecycle:
            preStop:
              sleep: { seconds: 10 }   # built-in sleep action (beta, on by default since 1.30; GA in 1.34); use exec sleep on older clusters
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits: { memory: 256Mi }
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: api }
spec:
  maxUnavailable: 1
  selector: { matchLabels: { app: api } }
```
- **Topology spread** is preferred over pod anti-affinity for even distribution; hard `requiredDuringScheduling` anti-affinity on hostname limits replicas to node count.
- **PDB** only limits *voluntary* disruptions via the Eviction API (drains, cluster-autoscaler scale-down). It does not protect against node crashes. `minAvailable: 100%` or `maxUnavailable: 0` blocks drains forever.
- **Taints/tolerations** repel pods from nodes (GPU, dedicated tenants); tolerations alone don't attract — pair with node affinity or `nodeSelector`.

## Graceful Shutdown Sequence
1. Pod marked Terminating; endpoints controller removes it from EndpointSlices (propagation to kube-proxy/ingress takes seconds).
2. `preStop` hook runs (the sleep covers propagation delay so no new traffic arrives at a closing server).
3. SIGTERM sent to containers; app stops accepting, drains in-flight requests, closes pools.
4. After `terminationGracePeriodSeconds` (counted from step 1, including preStop), SIGKILL.

Liveness probes must not check dependencies (DB down → mass restarts). Use readiness for dependency-aware gating, startupProbe for slow boots.

## Admission Control
| Need | Use |
|---|---|
| Validate fields (no root, required labels, image registry) | `ValidatingAdmissionPolicy` (CEL, in-process, GA in 1.30) — no webhook to operate |
| Mutate/inject (sidecars, defaults) | `MutatingAdmissionWebhook`, or MutatingAdmissionPolicy (CEL; beta in recent releases) |
| Rich policy library, reports | Kyverno or OPA Gatekeeper |

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata: { name: require-nonroot }
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    - expression: >-
        object.spec.template.spec.containers.all(c,
          has(c.securityContext) && has(c.securityContext.runAsNonRoot) &&
          c.securityContext.runAsNonRoot == true)
      message: "all containers must set securityContext.runAsNonRoot=true"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata: { name: require-nonroot }
spec:
  policyName: require-nonroot
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchExpressions:
        - { key: kubernetes.io/metadata.name, operator: NotIn, values: [kube-system] }
```
Webhooks: set `timeoutSeconds` low, exclude `kube-system`, and run ≥2 replicas — a `failurePolicy: Fail` webhook that is down blocks all matching API writes.

## Anti-Patterns
- Removed APIs: `policy/v1beta1` PDB and PodSecurityPolicy (removed in 1.25) — use `policy/v1` and Pod Security Admission labels.
- Classic sidecar as a regular container in a Job → Job never completes.
- CPU limits on latency-sensitive services causing CFS throttling; prefer requests + memory limits (decide per workload).
- `maxUnavailable: 0` and `maxSurge: 0` together (invalid).

## Checklist
- [ ] Zone + host spread; PDB permits ≥1 eviction.
- [ ] Probes separate liveness/readiness/startup.
- [ ] preStop + grace period aligned with load balancer deregistration.
- [ ] Pod Security Admission `restricted` on app namespaces.
- [ ] Policies via ValidatingAdmissionPolicy or Kyverno/Gatekeeper.

## References
- `references/admission-webhooks.md`
- `references/advanced-scheduling-affinity.md`
- `references/operator-pattern-internals.md`
