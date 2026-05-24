# DOKS (DigitalOcean Kubernetes)

## Cluster Creation

```hcl
resource "digitalocean_kubernetes_cluster" "main" {
  name    = "production-doks"
  region  = "nyc3"
  version = "1.30.5"

  node_pool {
    name       = "worker-pool"
    size       = "s-4vcpu-8gb-amd"
    node_count = 3
    auto_scale = false
    tags       = ["production", "worker"]
    labels = {
      "node.kubernetes.io/role" = "worker"
    }
  }

  maintenance_policy {
    day        = "sunday"
    start_time = "04:00"
  }

  # Enable HA control plane
  ha = true

  # VPC network
  vpc_uuid = digitalocean_vpc.main.id

  # Cluster autoscaler
  auto_upgrade = false
  surge_upgrade = true

  registry_integration = true
}

# Get kubeconfig
data "digitalocean_kubernetes_cluster" "main" {
  name = digitalocean_kubernetes_cluster.main.name
}

output "kubeconfig" {
  value     = data.digitalocean_kubernetes_cluster.main.kube_config[0].raw_config
  sensitive = true
}
```

## Node Pools

```hcl
# Add a dedicated node pool for system workloads
resource "digitalocean_kubernetes_node_pool" "system" {
  cluster_id = digitalocean_kubernetes_cluster.main.id
  name       = "system-pool"
  size       = "s-2vcpu-4gb-amd"
  node_count = 2
  auto_scale = false
  tags       = ["system"]
  labels = {
    "node.kubernetes.io/role" = "system"
  }
  taints {
    key    = "CriticalAddonsOnly"
    value  = "true"
    effect = "NoSchedule"
  }
}

# Add GPU node pool
resource "digitalocean_kubernetes_node_pool" "gpu" {
  cluster_id = digitalocean_kubernetes_cluster.main.id
  name       = "gpu-pool"
  size       = "gpu-2vcpu-8gb"
  node_count = 1
  auto_scale = false
  tags       = ["gpu"]
  labels = {
    "accelerator" = "nvidia"
  }
}

# Autoscaling node pool
resource "digitalocean_kubernetes_node_pool" "autoscale" {
  cluster_id = digitalocean_kubernetes_cluster.main.id
  name       = "autoscale-pool"
  size       = "s-4vcpu-8gb-amd"
  auto_scale = true
  min_nodes  = 3
  max_nodes  = 10
  tags       = ["autoscaled"]
}
```

## Autoscaling

### Cluster Autoscaler

```yaml
# DOKS cluster autoscaler is built-in
# Deploy sample workload with HPA
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
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
---
# Cluster autoscaler will add nodes when pods are Pending
# due to resource constraints
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

## Uptime SLA

```yaml
# DOKS clusters with HA control plane get 99.95% SLA
# Enable HA during cluster creation:
# doctl kubernetes cluster create production-doks --ha

# Check HA status:
# doctl kubernetes cluster get production-doks --format Ha
```

## Container Registry

```yaml
# Push images to DO Container Registry (DCR)
# doctl registry login

# Build and push
# docker build -t registry.digitalocean.com/myapp/api:latest .
# docker push registry.digitalocean.com/myapp/api:latest
---
# Use in Kubernetes
apiVersion: v1
kind: Secret
metadata:
  name: do-registry
  namespace: default
data:
  .dockerconfigjson: <base64-docker-config>
type: kubernetes.io/dockerconfigjson
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      imagePullSecrets:
      - name: do-registry
      containers:
      - name: api
        image: registry.digitalocean.com/myapp/api:latest
        ports:
        - containerPort: 3000
```

## App Platform (Serverless Containers)

```yaml
# .do/app.yaml
name: my-app
region: nyc
services:
- name: api
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/api-repo
  build_command: npm install && npm run build
  run_command: npm start
  http_port: 3000
  instance_count: 3
  instance_size_slug: professional-s
  health_check:
    http_path: /health
    initial_delay_seconds: 10
    period_seconds: 30
  envs:
  - key: NODE_ENV
    value: production
  alerts:
  - rule: DEPLOYMENT_FAILED
  - rule: DOMAIN_FAILED
static_sites:
- name: frontend
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/frontend-repo
  build_command: npm run build
  output_dir: dist
  routes:
  - path: /
  catchall_document: index.html
databases:
- engine: PG
  name: app-db
  num_nodes: 2
  production: true
  version: "16"
```

## CLI Commands

```bash
# Create cluster
doctl kubernetes cluster create production-doks \
  --region nyc3 --version 1.30.5 \
  --node-pool "name=worker-pool;size=s-4vcpu-8gb-amd;count=3;tag=worker" \
  --ha --vpc-uuid <vpc-id>

# List clusters
doctl kubernetes cluster list

# Get kubeconfig
doctl kubernetes cluster kubeconfig save production-doks

# Add node pool
doctl kubernetes node-pool create production-doks \
  --name autoscale-pool --size s-4vcpu-8gb-amd \
  --auto-scale --min-nodes 3 --max-nodes 10

# Scale node pool
doctl kubernetes node-pool update production-doks <pool-id> --count 5

# Upgrade cluster
doctl kubernetes cluster upgrade production-doks --version 1.31.0

# Delete cluster
doctl kubernetes cluster delete production-doks

# Registry login
doctl registry login

# List registry repositories
doctl registry repository list

# Delete old images
doctl registry garbage-collection start
```

## Integration with DO Load Balancer

```yaml
# DOKS automatically provisions DigitalOcean Load Balancers
# for Services of type LoadBalancer
---
apiVersion: v1
kind: Service
metadata:
  name: web
  annotations:
    service.beta.kubernetes.io/do-loadbalancer-protocol: "http"
    service.beta.kubernetes.io/do-loadbalancer-tls-passthrough: "false"
    service.beta.kubernetes.io/do-loadbalancer-certificate-id: "<cert-id>"
    service.beta.kubernetes.io/do-loadbalancer-sticky-sessions-type: "cookies"
    service.beta.kubernetes.io/do-loadbalancer-healthcheck-path: "/health"
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 80
  selector:
    app: web
```

## Best Practices

- Enable HA control plane for production clusters (99.95% SLA)
- Use separate node pools for system and application workloads
- Taint system node pools with `CriticalAddonsOnly` for priority workloads
- Enable cluster autoscaler for dynamic capacity management
- Use Container Registry with automated garbage collection
- Configure maintenance windows for off-peak upgrades
- Use surge upgrades to maintain capacity during node rotation
- Integrate with VPC for private network traffic
- Use Node Pool labels and taints for workload isolation
- Enable registry integration for seamless image pulling
- Use HorizontalPodAutoscaler for application-level scaling
