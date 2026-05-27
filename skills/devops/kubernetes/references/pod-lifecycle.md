# Kubernetes Pod Lifecycle and Management

## Overview
Pods are the smallest deployable units in Kubernetes. Understanding pod lifecycle, probes, init containers, container states, and termination is essential for reliable application deployment.

## Pod Phases

### Pod Lifecycle States
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lifecycle-demo
spec:
  restartPolicy: Always
  containers:
    - name: app
      image: nginx:alpine
      # Pod phases:
      #   Pending - Accepted but not yet running
      #   Running - All containers running
      #   Succeeded - All containers terminated successfully
      #   Failed - At least one container terminated with error
      #   Unknown - State could not be determined
```

### Container States
```yaml
# Container States:
#   Waiting - Not yet running (e.g., pulling image)
#   Running - Container is executing
#   Terminated - Container finished execution (exit code)

# Example of container status fields
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: app
      image: myapp:latest
      # State management through probes
```

## Init Containers

### Sequential Initialization
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-demo
spec:
  initContainers:
    - name: init-db
      image: busybox:1.28
      command:
        - sh
        - -c
        - |
          until nc -z db-service 5432; do
            echo "Waiting for database..."
            sleep 2
          done
    - name: setup-data
      image: busybox:1.28
      command:
        - sh
        - -c
        - |
          echo "Running data migrations..."
          wget -qO- http://migration-service/run
  containers:
    - name: app
      image: myapp:latest
      ports:
        - containerPort: 8080
```

## Probes

### Liveness Probe
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: app
      image: myapp:latest
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
          httpHeaders:
            - name: X-Health-Check
              value: "true"
        initialDelaySeconds: 10
        periodSeconds: 10
        timeoutSeconds: 3
        successThreshold: 1
        failureThreshold: 3
```

### Readiness Probe
```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
        successThreshold: 2
        failureThreshold: 3
      # Readiness determines if pod receives traffic
      # If probe fails, pod is removed from Service endpoints
```

### Startup Probe
```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      startupProbe:
        httpGet:
          path: /startup
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 5
        failureThreshold: 30  # 30 * 5 = 150s max startup time
      # Startup probe disables liveness/readiness until success
      # Useful for slow-starting applications
```

### Probe Types
```yaml
# HTTP Probe
livenessProbe:
  httpGet:
    path: /health
    port: 8080
    scheme: HTTPS

# TCP Probe
readinessProbe:
  tcpSocket:
    port: 3306
  initialDelaySeconds: 15
  periodSeconds: 10

# Command Probe
livenessProbe:
  exec:
    command:
      - cat
      - /tmp/healthy
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Pod Lifecycle Hooks

### PostStart and PreStop
```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      lifecycle:
        postStart:
          exec:
            command:
              - /bin/sh
              - -c
              - |
                echo "PostStart hook running"
                /usr/local/bin/register-service
        preStop:
          httpGet:
            path: /shutdown
            port: 8080
            scheme: HTTP
      # Termination grace period
      terminationGracePeriodSeconds: 60
```

### Graceful Shutdown
```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      lifecycle:
        preStop:
          exec:
            command:
              - /bin/sh
              - -c
              - |
                # Send SIGTERM to application
                kill -SIGTERM $(pidof myapp)
                # Wait for graceful shutdown
                sleep 10
                # Force kill if still running
                kill -SIGKILL $(pidof myapp) 2>/dev/null || true
      terminationGracePeriodSeconds: 30
```

## Resource Management

### Resource Requests and Limits
```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"
          # ephemeral-storage: "1Gi"
```

### Quality of Service Classes
```yaml
# Guaranteed - requests == limits for all containers
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# Burstable - requests < limits for at least one container
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# BestEffort - no requests or limits set
# (no resources block defined)
```

## Restart Policies

### Pod Restart Policy
```yaml
spec:
  restartPolicy: Always        # Default. Restart after any termination
  # restartPolicy: OnFailure   # Restart only on non-zero exit codes
  # restartPolicy: Never       # Never restart container

  containers:
    - name: sidecar
      image: sidecar:latest
      # Restart policy applies to all containers in pod
```

## Pod Disruption Budgets

### PDB Configuration
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb
spec:
  minAvailable: 2
  # maxUnavailable: 1
  selector:
    matchLabels:
      app: myapp
```

## Tolerations and Node Affinity

### Pod Scheduling
```yaml
spec:
  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
    - key: "node.kubernetes.io/not-ready"
      operator: "Exists"
      effect: "NoExecute"
      tolerationSeconds: 60

  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: "topology.kubernetes.io/zone"
                operator: "In"
                values:
                  - us-east-1a
                  - us-east-1b
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: app
                  operator: In
                  values:
                    - myapp
            topologyKey: kubernetes.io/hostname
```

## Key Points
- Pod phases: Pending, Running, Succeeded, Failed, Unknown
- Init containers run sequentially before main containers
- Liveness probes restart unhealthy containers
- Readiness probes control traffic routing
- Startup probes delay liveness for slow-starting apps
- PostStart/PreStop hooks enable lifecycle events
- Resource requests schedule pods, limits constrain usage
- QoS classes: Guaranteed > Burstable > BestEffort
- PDBs protect against voluntary disruptions
- Tolerations allow scheduling on tainted nodes
- Node/pod affinity controls placement decisions
- terminationGracePeriodSeconds sets kill timeout
- Probe types: HTTP, TCP, and command execution
- Restart policies: Always, OnFailure, Never
