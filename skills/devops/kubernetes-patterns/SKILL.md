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

## When to Use This Skill
- Deploying to Kubernetes
- Reviewing K8s manifests
- Setting up HPA and scaling
- Configuring service discovery
- Managing secrets

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
      maxUnavailable: 0  # Zero-downtime
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: ghcr.io/org/app:v1.2.3
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          startupProbe:       # For slow-starting apps (e.g., JVM)
            httpGet:
              path: /health/startup
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 30
          livenessProbe:      # Restart if stuck
            httpGet:
              path: /health/live
              port: 3000
            periodSeconds: 15
            timeoutSeconds: 3
          readinessProbe:     # Remove from Service if not ready
            httpGet:
              path: /health/ready
              port: 3000
            periodSeconds: 10
            timeoutSeconds: 3
```

### Step 2: Service + Ingress
```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP  # Internal — Ingress handles external

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
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
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80
```

### Step 3: ConfigMap and Secrets
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: production
  LOG_LEVEL: info
  API_URL: https://api.example.com

---
# Secrets managed externally (SealedSecrets, External Secrets Operator)
# NEVER commit raw secrets to git
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault
  target:
    name: app-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: /production/app/database-url
    - secretKey: JWT_SECRET
      remoteRef:
        key: /production/app/jwt-secret
```

### Step 4: Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
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
```

### Step 5: Namespace Strategy
| Namespace | Purpose | Services | 
|-----------|---------|----------|
| `staging` | Pre-production testing | Full stack, lower resources |
| `production` | Live traffic | Full stack, production resources |
| `monitoring` | Prometheus, Grafana | Observability tools |
| `ingress-nginx` | Ingress controller | Shared ingress infrastructure |

## Rules & Constraints
- Always set resource requests AND limits — never one without the other
- All three probes: startup, liveness, readiness — each serves a different purpose
- Secrets are NEVER committed to git — use External Secrets Operator or SealedSecrets
- Images must use specific version tags (`v1.2.3`) not `latest`
- PodDisruptionBudget for production deployments
- Use `readOnlyRootFilesystem: true` for security where possible

## Output Format
Kubernetes YAML manifests with annotations explaining each section.

## References
No separate reference file — all Kubernetes patterns are inline in this skill.

## Handoff
After completing this skill:
- Next skill: **observability** — configure monitoring, logging, and tracing for the K8s deployment
- Pass context: namespace strategy, probe configuration, HPA settings
