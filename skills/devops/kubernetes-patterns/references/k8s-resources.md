# Kubernetes Core Resources Reference

Production-ready manifests for the core resources of a typical web workload: Deployment, Service, ingress (Ingress and Gateway API), configuration, secrets, autoscaling, disruption budgets, and network policy. Each example notes the settings that most often cause incidents when missing.

## Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: production
  labels: { app.kubernetes.io/name: app, app.kubernetes.io/version: "1.2.3" }
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  selector:
    matchLabels: { app.kubernetes.io/name: app }
  template:
    metadata:
      labels: { app.kubernetes.io/name: app }
    spec:
      serviceAccountName: app
      automountServiceAccountToken: false
      terminationGracePeriodSeconds: 30
      securityContext:
        runAsNonRoot: true
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: app
          image: ghcr.io/org/app:1.2.3          # immutable tag or digest, never :latest
          ports: [{ name: http, containerPort: 3000 }]
          envFrom: [{ configMapRef: { name: app-config } }]
          env:
            - name: DATABASE_URL
              valueFrom: { secretKeyRef: { name: app-secrets, key: DATABASE_URL } }
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits: { memory: 512Mi }
          readinessProbe:
            httpGet: { path: /ready, port: http }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /healthz, port: http }
            periodSeconds: 10
            failureThreshold: 3
          startupProbe:
            httpGet: { path: /healthz, port: http }
            failureThreshold: 30
            periodSeconds: 2
          lifecycle:
            preStop: { sleep: { seconds: 5 } }   # let endpoints update before shutdown
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
```

Notes:
- `maxUnavailable: 0` + readiness probe = no capacity loss during rollouts.
- CPU limits are optional; many teams set CPU requests only to avoid CFS throttling, and always set a memory limit.
- The `sleep` preStop action is built in (beta and enabled by default from 1.30); on older clusters use `exec: { command: ["sleep", "5"] }` (requires a `sleep` binary in the image).
- Readiness checks dependencies needed to serve; liveness checks only the process, to avoid restart storms.

## Service

```yaml
apiVersion: v1
kind: Service
metadata: { name: app, namespace: production }
spec:
  type: ClusterIP
  selector: { app.kubernetes.io/name: app }
  ports:
    - { name: http, port: 80, targetPort: http, protocol: TCP }
```

Use named target ports so container port changes do not require Service edits. Headless services (`clusterIP: None`) give per-pod DNS for StatefulSets.

## Ingress and Gateway API

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls: [{ hosts: [app.example.com], secretName: app-tls }]
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend: { service: { name: app, port: { name: http } } }
```

The community ingress-nginx controller has been retired by Kubernetes SIG Network (maintenance ended in early 2026). For new work prefer the Gateway API (`gateway.networking.k8s.io/v1`) with a maintained implementation, or another supported Ingress controller:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: { name: app, namespace: production }
spec:
  parentRefs: [{ name: public, namespace: gateway }]
  hostnames: ["app.example.com"]
  rules:
    - backendRefs: [{ name: app, port: 80 }]
```

## ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: app-config, namespace: production }
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_URL: "https://api.example.com"
```

Environment variables from ConfigMaps are read at container start; changing the ConfigMap does not restart pods. Use a checksum annotation (Helm/Kustomize `configMapGenerator`) to roll pods on change, or mount as files for live reload.

## Secrets

Do not commit Secret manifests with real values. Sync from a secret manager instead:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata: { name: app-secrets, namespace: production }
spec:
  refreshInterval: 1h
  secretStoreRef: { name: aws-secrets-manager, kind: ClusterSecretStore }
  target: { name: app-secrets }
  data:
    - secretKey: DATABASE_URL
      remoteRef: { key: prod/app/database-url }
```

Enable encryption at rest for Secrets in etcd (KMS provider on managed clusters) and restrict `get/list` on secrets via RBAC.

## HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: app, namespace: production }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: app }
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies: [{ type: Percent, value: 50, periodSeconds: 60 }]
```

- Utilization is relative to requests, so requests must be set.
- Memory is a poor HPA signal for most runtimes (memory rarely drops after scale-out); prefer CPU, request rate, or queue depth (KEDA).
- Remove `spec.replicas` from GitOps-managed Deployments that an HPA controls, or the two will fight.

## PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: app, namespace: production }
spec:
  maxUnavailable: 1
  selector:
    matchLabels: { app.kubernetes.io/name: app }
```

`maxUnavailable` keeps working when replicas scale; `minAvailable` equal to the replica count blocks node drains entirely.

## NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: app, namespace: production }
spec:
  podSelector:
    matchLabels: { app.kubernetes.io/name: app }
  policyTypes: [Ingress, Egress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: gateway }
      ports: [{ port: 3000 }]
  egress:
    - to:
        - podSelector:
            matchLabels: { app.kubernetes.io/name: postgres }
      ports: [{ port: 5432 }]
    - to:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: kube-system }
          podSelector:
            matchLabels: { k8s-app: kube-dns }
      ports: [{ port: 53, protocol: UDP }, { port: 53, protocol: TCP }]
```

- Once a pod is selected by any policy with `Egress`, all other egress is denied, including DNS; always allow DNS explicitly.
- NetworkPolicy requires a CNI that enforces it (Calico, Cilium, etc.).
- Start with a default-deny policy per namespace, then add allows.

## Checklist

- [ ] Immutable image tags, resource requests, memory limits
- [ ] Startup, readiness, liveness probes with distinct purposes
- [ ] Non-root, read-only root filesystem, dropped capabilities
- [ ] Secrets synced from a manager, not committed
- [ ] HPA with scale-down stabilization; no `replicas` conflict with GitOps
- [ ] PDB using `maxUnavailable`
- [ ] Default-deny NetworkPolicies with explicit DNS egress
