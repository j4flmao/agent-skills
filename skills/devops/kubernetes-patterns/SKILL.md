---
name: kubernetes-patterns
description: >
  Use this skill when the user says 'Kubernetes', 'K8s', 'kubectl', 'Deployment',
  'Service', 'Ingress', 'ConfigMap', 'Secret', 'pod', 'namespace', 'helm',
  'resource limits', or when deploying to or managing Kubernetes. Covers:
  resource definitions (Deployment, Service, Ingress, ConfigMap, Secret), resource
  requests and limits, probes (liveness, readiness, startup), HPA, namespace
  strategy, and secrets management. Do NOT use this for: Dockerfiles, CI/CD
  pipelines, or infrastructure provisioning with Terraform.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, kubernetes, phase-5]
---

# Kubernetes Patterns

## Purpose
Design Kubernetes resources following production best practices for reliability, security, and scalability.

## Agent Protocol

### Trigger
Exact user phrases: "Kubernetes", "K8s", "kubectl", "Deployment", "Service", "Ingress", "ConfigMap", "Secret", "pod", "namespace", "helm", "resource limits".

### Input Context
Before activating, verify:
- The application's resource requirements are known (CPU, memory).
- The deployment environment is known (namespace strategy).
- The service discovery and ingress requirements are understood.

### Output Artifact
Writes K8s YAML manifest files (Deployment, Service, Ingress, etc.).

### Response Format
Kubernetes YAML manifests with annotations explaining each section.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of Kubernetes concepts.

### Completion Criteria
This skill is complete when:
- [ ] Deployment manifest includes all three probes (startup, liveness, readiness).
- [ ] Resource requests AND limits are set.
- [ ] Service and Ingress are configured.
- [ ] Secrets reference external operators (not hardcoded).
- [ ] HPA is configured (if scale > 3 replicas).
- [ ] Namespace strategy is applied.

### Max Response Length
Direct file write. No response text.

## Quick Start
Always set resource requests AND limits. Configure all three probes (liveness, readiness, startup). Use namespaces per environment. Secrets via external operator, not git.

## Decision Tree: Workload Type
| Workload | Resource Type | Scaling | Storage |
|----------|--------------|---------|---------|
| Stateless web app | Deployment | HPA | None or PVC |
| Stateful DB | StatefulSet | VPA or manual | PVC with backup |
| Batch job | Job/CronJob | None or Keda | EmptyDir or PVC |
| Daemon (logging, monitoring) | DaemonSet | Node-scoped | HostPath or emptyDir |
| Sidecar (mesh, proxy) | Part of pod or SidecarSet | Parent workload | Shared volume |

## Core Workflow

### Step 1: Deployment with Probes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: production
  labels:
    app: app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      terminationGracePeriodSeconds: 60
      serviceAccountName: app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: app
          image: ghcr.io/org/app:v1.2.3
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http
            - containerPort: 9090
              name: metrics
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          startupProbe:
            httpGet:
              path: /health/startup
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 30
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            periodSeconds: 15
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            periodSeconds: 10
            timeoutSeconds: 3
            successThreshold: 1
            failureThreshold: 3
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: config-volume
              mountPath: /app/config
      volumes:
        - name: tmp
          emptyDir: {}
        - name: config-volume
          configMap:
            name: app-config
            items:
              - key: config.yaml
                path: config.yaml
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - app
              topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: app
```

### Step 2: Service with Selector
```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
  namespace: production
  labels:
    app: app
spec:
  selector:
    app: app
  ports:
    - name: http
      port: 80
      targetPort: http
    - name: metrics
      port: 9090
      targetPort: metrics
  type: ClusterIP
---
# Headless service for StatefulSet
apiVersion: v1
kind: Service
metadata:
  name: app-headless
spec:
  clusterIP: None
  selector:
    app: app
  ports:
    - port: 3000
      targetPort: 3000
```

### Step 3: Ingress with TLS
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

### Step 4: ConfigMap and Secrets
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  NODE_ENV: production
  LOG_LEVEL: info
  API_URL: https://api.example.com
  config.yaml: |
    database:
      pool: 10
      timeout: 30s
    cache:
      ttl: 300
---
# External Secrets Operator — NEVER commit raw secrets
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: app-secrets
    creationPolicy: Owner
    deletionPolicy: Retain
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: /production/app/database-url
    - secretKey: JWT_SECRET
      remoteRef:
        key: /production/app/jwt-secret
    - secretKey: ENCRYPTION_KEY
      remoteRef:
        key: /production/app/encryption-key
        property: key
---
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "auth/kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: "external-secrets"
```

### Step 5: PodDisruptionBudget
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: app
---
# Alternative: maxUnavailable
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb-max
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: app
```

### Step 6: HorizontalPodAutoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 3
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
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 4
        periodSeconds: 60
      selectPolicy: Max
```

### Step 7: StatefulSet with PVC
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
  namespace: production
spec:
  serviceName: db-headless
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
      - name: db
        image: postgres:16
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2
            memory: 4Gi
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 100Gi
```

### Step 8: NetworkPolicy
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  - from:
    - podSelector:
        matchLabels:
          app: monitoring
    ports:
    - protocol: TCP
      port: 9090
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
  - to:
    - podSelector:
        matchLabels:
          app: db
    ports:
    - protocol: TCP
      port: 5432
```

### Step 9: ResourceQuota per Namespace
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    persistentvolumeclaims: 10
    pods: "50"
    services: "10"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
  - default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 250m
      memory: 256Mi
    type: Container
```

### Step 10: Namespace Strategy
| Namespace | Purpose | RBAC | Resource Quota |
|-----------|---------|------|----------------|
| `production` | Live traffic | Read-only for devs | Production limits |
| `staging` | Pre-production | Write for devs | 50% of production |
| `development` | Dev testing | Full access for devs | Low limits |
| `monitoring` | Prometheus, Grafana | Ops access | Medium limits |
| `ingress-nginx` | Ingress controllers | Admin only | High limits |
| `cert-manager` | TLS cert management | Admin only | Low limits |

### Step 11: Pod Security Standards (PSA)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
# For workloads that need privileged access
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: latest
```

## Rules & Constraints
- Always set resource requests AND limits — never one without the other
- All three probes: startup, liveness, readiness — each serves a different purpose
- Secrets are NEVER committed to git — use External Secrets Operator or SealedSecrets
- Images must use specific version tags (`v1.2.3`) not `latest`
- PodDisruptionBudget for production deployments
- Use `readOnlyRootFilesystem: true` for security where possible
- Always set `runAsNonRoot: true` in securityContext
- Use podAntiAffinity for multi-replica deployments
- Set `terminationGracePeriodSeconds` for graceful shutdown
- Use named ports instead of hardcoded port numbers
- Enable NetworkPolicy for production namespaces
- Use `IfNotPresent` imagePullPolicy for predictable behavior

## Production Considerations
- Set up cluster autoscaler or Karpenter for node-level scaling.
- Use PDB to prevent all replicas from being evicted simultaneously.
- Enable pod topology spread constraints for zone-level HA.
- Use readiness probe gates for dependencies (e.g., database check).
- Set HPA behavior to prevent scale-down thrashing.
- Use Kustomize or Helm for environment-specific configuration.
- Implement pod priority classes for critical vs best-effort workloads.
- Use init containers for pre-flight checks (schema migrations, dependency wait).
- Configure securityContext at pod level with `runAsNonRoot` and `fsGroup`.

## Anti-Patterns
- Using `latest` tag for images — non-reproducible deployments.
- No resource limits — pods can exhaust node resources.
- Only liveness probe, no readiness — pods serve traffic before ready.
- Liveness and readiness on same endpoint — defeats their purpose.
- Raw secrets in ConfigMaps or git — security breach waiting.
- No PDB — cluster operations can evict all replicas.
- Single replica for production services — no HA.
- No podAntiAffinity — all pods on same node, single point of failure.
- Hardcoded values in manifests instead of ConfigMaps.
- Using HostNetwork or privileged mode without explicit need.

## References
  - references/k8s-operations.md — Kubernetes Operations Reference
  - references/k8s-resources.md — Kubernetes Resources Reference
  - references/k8s-scheduling.md — Kubernetes Scheduling
  - references/k8s-stateful-workloads.md — Kubernetes Stateful Workloads
  - references/kubernetes-patterns-advanced.md — Kubernetes Patterns Advanced Topics
  - references/kubernetes-patterns-fundamentals.md — Kubernetes Patterns Fundamentals
## Handoff
After completing this skill:
- Next skill: **observability** — configure monitoring, logging, and tracing for the K8s deployment
- Pass context: namespace strategy, probe configuration, HPA settings
