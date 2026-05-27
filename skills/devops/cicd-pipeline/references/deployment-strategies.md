# Deployment Strategies

## Purpose

Deployment strategies define how new software versions are rolled out to production with minimal risk, zero downtime, and fast rollback capability. This reference covers rolling, blue-green, canary deployments, feature flags, deployment gates, approval workflows, health checks, and deployment orchestration with tools like ArgoCD and Spinnaker.

## Deployment Patterns

### Rolling Deployment

Updates instances gradually, one at a time (or in small batches). Old and new versions coexist during the rollout.

```yaml
# Kubernetes — rolling update
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1       # Max pods unavailable during update
      maxSurge: 1              # Extra pods created above desired count
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest
          readinessProbe:       # Wait until pod is ready before continuing
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

```
Timeline:
  t0: 10 pods on v1
  t1: 1 pod on v2, 9 on v1
  t2: 2 pods on v2, 8 on v1
  t3: 3 pods on v2, 7 on v1
  ...
  t10: 10 pods on v2

Rollback: Reverse the process (one pod at a time)
```

### Blue-Green Deployment

Two identical environments (blue = current, green = new). Switch traffic from blue to green atomically.

```yaml
# Kubernetes with Service selector switch
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
    version: blue  # Switch to 'green' to cut over

# Or use Istio VirtualService for gradual switch
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp.example.com
  http:
    - route:
        - destination:
            host: myapp
            subset: blue  # Switch to green for cutover
          weight: 100
```

```yaml
# Blue-green deployment script
name: Blue-Green Deploy

jobs:
  deploy:
    steps:
      - name: Deploy to inactive environment
        run: |
          # Determine which environment is inactive
          CURRENT=$(kubectl get svc myapp -o jsonpath='{.spec.selector.version}')
          if [ "$CURRENT" == "blue" ]; then
            NEW="green"
          else
            NEW="blue"
          fi

          # Deploy to inactive environment
          kubectl apply -f k8s/deployment-$NEW.yaml

          # Wait for deployment to be ready
          kubectl rollout status deployment/myapp-$NEW --timeout=5m

          # Run smoke tests against inactive environment
          ./smoke-test.sh $NEW

      - name: Switch traffic
        run: |
          CURRENT=$(kubectl get svc myapp -o jsonpath='{.spec.selector.version}')
          if [ "$CURRENT" == "blue" ]; then
            kubectl patch svc myapp -p '{"spec":{"selector":{"version":"green"}}}'
          else
            kubectl patch svc myapp -p '{"spec":{"selector":{"version":"blue"}}}'
          fi

      - name: Verify production
        run: |
          sleep 10
          ./smoke-test.sh production
```

### Canary Deployment

Route a small percentage of traffic to the new version, gradually increase as confidence grows.

```yaml
# Istio canary deployment
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp.example.com
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"         # Internal canary header
      route:
        - destination:
            host: myapp
            subset: canary
          weight: 100
    - route:
        - destination:
            host: myapp
            subset: stable
          weight: 95                # 95% to stable
        - destination:
            host: myapp
            subset: canary
          weight: 5                 # 5% to canary
```

```yaml
# Automated canary progression
canary:
  stages:
    - traffic: 5%
      duration: "10m"
      metrics:
        error_rate: "< 0.1%"
        latency_p99: "< 500ms"
    - traffic: 25%
      duration: "20m"
      metrics:
        error_rate: "< 0.1%"
        latency_p99: "< 500ms"
    - traffic: 50%
      duration: "30m"
      metrics:
        error_rate: "< 0.05%"
        latency_p99: "< 400ms"
    - traffic: 100%
      duration: "0m"
      action: "promote"
  rollback-criteria:
    error_rate: "> 0.5%"     # Rollback immediately
    latency_p99: "> 1s"       # Rollback if latency spikes
    any_5xx: "rollback"       # Any HTTP 5xx = rollback
```

### Feature Flags

Decouple deployment from release — deploy code with features behind flags, toggle on gradually.

```typescript
// LaunchDarkly / Flagsmith / Unleash
import { useFlags } from 'launchdarkly-react-client-sdk'

function CheckoutButton() {
  const { newCheckoutFlow } = useFlags()

  return newCheckoutFlow ? <NewCheckout /> : <LegacyCheckout />
}
```

```
Feature Flag States:
  Off:  Feature not visible to anyone (code is deployed but dormant)
  %:    Feature visible to X% of users (canary-by-user)
  On:   Feature visible to all users
  Kill: Emergency off switch (immediate rollback without redeploy)
```

### Deployment Strategy Comparison

| Strategy | Downtime | Risk | Rollback Speed | Complexity | Traffic Control |
|----------|----------|------|----------------|------------|-----------------|
| Rolling | None | Medium | Medium (gradual) | Low | Pod-level |
| Blue-Green | None | Low | Instant (DNS/SVC switch) | Medium | Environment-level |
| Canary | None | Very Low | Fast (stop routing) | High | Percentage-based |
| Recreate | Yes | High | Slow (full rebuild) | Low | None |
| Feature Flags | None | Very Low | Instant (flag toggle) | Medium | User/group-based |

## Deployment Gates

### Manual Approval Gates

```yaml
# GitHub Environments with required reviewers
environments:
  staging:
    type: environment
  production:
    type: environment
    required_reviewers:
      - devops-leads
      - security-team
    wait_timer: 300  # 5 min cool-down
    prevent_self_review: true

# GitLab CI — manual job
deploy-production:
  stage: deploy
  environment: production
  when: manual  # Must be triggered manually
  only:
    - main
  allow_failure: false
```

### Automated Approval Gates

```yaml
# Spinnaker pipeline with automated gates
gates:
  - name: "Automated Testing"
    type: "test"
    tests:
      - "unit-tests"
      - "integration-tests"
      - "e2e-tests"

  - name: "Security Scan"
    type: "judgment"
    provider: "checkmarx"
    failOnError: true

  - name: "Performance Regression"
    type: "performance"
    metric: "p99-latency"
    threshold: "< 500ms"
    baseline: "last-deployment"

  - name: "Manual Approval"
    type: "manual"
    users: ["devops-leads"]
    fallback: "skip-on-weekend"
```

## Rollback Automation

### Automatic Rollback Triggers

```yaml
# Kubernetes — progress deadline
apiVersion: apps/v1
kind: Deployment
spec:
  progressDeadlineSeconds: 300  # Rollback if not progressing in 5 min
  replicas: 10
  revisionHistoryLimit: 5        # Keep last 5 revisions for rollback

# Rollback command
kubectl rollout undo deployment/myapp
kubectl rollout undo deployment/myapp --to-revision=3

# GitLab CI — automatic rollback on failure
deploy-production:
  script:
    - ./deploy.sh
  after_script:
    - |
      if [ $CI_JOB_STATUS == "failed" ]; then
        echo "Deployment failed, initiating rollback..."
        ./rollback.sh
      fi
```

### Rollback Strategies

| Technique | Speed | Data Safety | Complexity |
|-----------|-------|-------------|------------|
| Blue-Green DNS switch | <1s | Safe (old env intact) | Low |
| Kubernetes rollout undo | 1-5m | Safe (old pods restart) | Low |
| Database migration revert | 1-30m | Depends on migration | Medium |
| Feature flag toggle | <1s | Safe (code already there) | Low |
| PITR (db restore) | 15-60m | Data loss since backup | High |

### Rollback Script

```bash
#!/bin/bash
# rollback.sh — Automated rollback script

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "[$TIMESTAMP] Initiating rollback for $ENVIRONMENT"

# Step 1: Stop the deployment
echo "Stopping deployment..."
kubectl rollout undo deployment/myapp-$ENVIRONMENT

# Step 2: Monitor rollback progress
kubectl rollout status deployment/myapp-$ENVIRONMENT --timeout=5m
if [ $? -ne 0 ]; then
  echo "Rollback failed — manual intervention required"
  exit 1
fi

# Step 3: Verify health checks
echo "Verifying health checks..."
for i in {1..30}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$ENVIRONMENT.example.com/healthz)
  if [ "$STATUS" == "200" ]; then
    echo "Health check passed"
    break
  fi
  sleep 5
done

# Step 4: Run smoke tests
echo "Running smoke tests..."
./smoke-test.sh $ENVIRONMENT
if [ $? -ne 0 ]; then
  echo "Smoke tests failed — previous version may be broken too"
  echo "Manual intervention required"
  exit 1
fi

# Step 5: Notify team
echo "Rollback complete — notifying team..."
./notify-slack.sh "Rollback to previous version completed for $ENVIRONMENT"

exit 0
```

## Health Checks During Deployment

### Readiness and Liveness Probes

```yaml
# Kubernetes probes
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
            successThreshold: 1
          livenessProbe:
            httpGet:
              path: /livez
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 30
            failureThreshold: 3
          startupProbe:          # Slow-starting containers
            httpGet:
              path: /startupz
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 5
            failureThreshold: 30  # 150 seconds to start
```

### Deployment Validation Script

```bash
#!/bin/bash
# validate-deploy.sh — Health check validation

SERVICE=$1
EXPECTED_REPLICAS=$2
MAX_WAIT=${3:-300}

echo "Validating deployment of $SERVICE..."

# Check pod count
for i in $(seq 1 $MAX_WAIT); do
  READY=$(kubectl get deployment $SERVICE -o jsonpath='{.status.readyReplicas}')
  if [ "$READY" == "$EXPECTED_REPLICAS" ]; then
    echo "All $EXPECTED_REPLICAS pods ready"
    break
  fi
  if [ $i -eq $MAX_WAIT ]; then
    echo "Timeout waiting for pods to be ready"
    exit 1
  fi
  sleep 5
done

# Check endpoint health
ENDPOINT="https://$SERVICE.example.com/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)
if [ "$STATUS" != "200" ]; then
  echo "Health check failed: HTTP $STATUS"
  exit 1
fi

# Check downstream dependencies
echo "Checking dependencies..."
curl -s https://$SERVICE.example.com/health/ready | jq '.dependencies | to_entries[] | select(.value != "UP")'
if [ $? -eq 0 ]; then
  echo "Some dependencies are not ready"
  exit 1
fi

echo "Deployment validation passed"
exit 0
```

## Zero-Downtime Deployment

### Pre-conditions for Zero Downtime

1. **Database migrations are backward-compatible** — old code works with new schema
2. **Multiple replicas are running** — at least 2 replicas to absorb rolling updates
3. **Graceful shutdown is configured** — pods drain connections before stopping
4. **Readiness probes are properly configured** — new pods don't receive traffic until ready
5. **Session affinity is handled** — sticky sessions may break during rolling updates

### Graceful Shutdown Configuration

```typescript
// Node.js graceful shutdown
import { createServer } from 'http'

const server = createServer(app)

// Kubernetes sends SIGTERM before terminating
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully')

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed')
  })

  // Wait for in-flight requests to complete (max 30s)
  await new Promise(resolve => setTimeout(resolve, 30000))

  // Close database connections
  await pool.end()

  process.exit(0)
})
```

```yaml
# Kubernetes — preStop hook for graceful shutdown
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - |
                    sleep 5  # Wait for service endpoint updates
                    kill -SIGTERM 1
          terminationGracePeriodSeconds: 45  # Must be > preStop + drain time
```

## Deployment Orchestration

### ArgoCD (GitOps)

```yaml
# Application manifest
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/myapp-config
    path: overlays/production
    targetRevision: HEAD
  destination:
    namespace: production
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true           # Remove resources not in Git
      selfHeal: true        # Revert manual changes
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true      # Prune after sync completes
  # Sync waves for ordered deployment
  sync:
    waves:
      - name: "1-database"
        resources: ["ConfigMap", "Secret"]
      - name: "2-backend"
        resources: ["Deployment", "Service"]
      - name: "3-frontend"
        resources: ["Ingress"]
```

### Spinnaker

```yaml
# Spinnaker pipeline definition
pipeline:
  name: "Deploy to Production"
  stages:
    - name: "Bake Image"
      type: "bake"
      package: "myapp"
      version: "${trigger.version}"

    - name: "Deploy to Staging"
      type: "deploy"
      clusters:
        - account: "staging"
          application: "myapp"
          capacity:
            desired: 2

    - name: "Integration Tests"
      type: "test"
      tests: ["smoke", "integration"]

    - name: "Manual Judgment"
      type: "manualJudgment"
      instructions: "Confirm deploy to production"
      notFound: "pagerduty"

    - name: "Deploy Canary"
      type: "canary"
      canary:
        loadBalancers: ["myapp-prod"]
        deployments: ["myapp-canary"]
        analysis:
          metricProviders: ["prometheus", "datadog"]
          lookbackDuration: "30m"
        intervals:
          - traffic: 10%
            duration: "10m"
          - traffic: 50%
            duration: "20m"

    - name: "Deploy to Production"
      type: "deploy"
      clusters:
        - account: "production"
          application: "myapp"
          strategy: "highlander"  # Blue-green
```

## Key Points

- Rolling updates are the default for Kubernetes — gradual with no downtime.
- Blue-green provides instant rollback (DNS or service selector switch).
- Canary deployments route small traffic percentages and require metric-based promotion.
- Feature flags decouple deployment from release — toggle features on/off without redeploying.
- Automated rollback must trigger on error rate, latency, and health check failures.
- Health checks (readiness, liveness, startup) prevent routing traffic to unhealthy pods.
- Graceful shutdown (SIGTERM + preStop hook) ensures in-flight requests complete.
- Database migrations must be backward-compatible for zero-downtime deployments.
- ArgoCD uses GitOps — the Git repository is the single source of truth for cluster state.
- Spinnaker provides advanced deployment strategies with canary analysis and automated rollback.
