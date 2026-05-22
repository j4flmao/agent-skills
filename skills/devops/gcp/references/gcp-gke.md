# GCP GKE

## Cluster Creation (Autopilot)

```bash
# Autopilot cluster (no node management)
gcloud container clusters create-auto gke-prod \
  --region us-central1 \
  --project my-project \
  --release-channel regular

# Get credentials
gcloud container clusters get-credentials gke-prod --region us-central1
```

## Cluster Creation (Standard)

```bash
# Standard cluster with multi-zone
gcloud container clusters create gke-prod \
  --region us-central1 \
  --node-locations us-central1-a,us-central1-b,us-central1-c \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10 \
  --workload-pool my-project.svc.id.goog \
  --network default \
  --subnetwork default
```

## Node Pools

```bash
# System pool
gcloud container node-pools create system-pool \
  --cluster gke-prod \
  --region us-central1 \
  --machine-type e2-standard-4 \
  --num-nodes 3 \
  --node-labels node-pool-type=system \
  --node-taints node-pool-type=system:NoSchedule

# User pool with autoscaling
gcloud container node-pools create user-pool \
  --cluster gke-prod \
  --region us-central1 \
  --machine-type e2-standard-8 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 20 \
  --node-labels node-pool-type=user
```

## Workload Identity

```bash
# Create IAM service account
gcloud iam service-accounts create myapp-sa \
  --project my-project

# Bind K8s SA to IAM SA
gcloud iam service-accounts add-iam-policy-binding \
  myapp-sa@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[myapp/myapp-sa]"
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: myapp
  annotations:
    iam.gke.io/gcp-service-account: myapp-sa@my-project.iam.gserviceaccount.com
```

## Networking

```bash
# VPC with subnet
gcloud compute networks create gke-vpc --subnet-mode custom
gcloud compute networks subnets create gke-subnet \
  --network gke-vpc \
  --region us-central1 \
  --range 10.0.0.0/16 \
  --secondary-range pods=10.1.0.0/16,services=10.2.0.0/20

# Cloud NAT
gcloud compute routers nats create gke-nat \
  --router gke-router \
  --region us-central1 \
  --auto-allocate-nat-external-ips
```

## Monitoring

```bash
# Enable managed monitoring
gcloud container clusters update gke-prod \
  --region us-central1 \
  --monitoring=SYSTEM,POD \
  --logging=SYSTEM,WORKLOAD

# Cloud Monitoring dashboards via Terraform
```

## GKE Gateway Controller

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external-http
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
  - name: http
    protocol: HTTP
    port: 80
```
